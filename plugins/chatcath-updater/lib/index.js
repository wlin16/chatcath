// chatcath-updater — host side.
//   GET  /chatcath/update/status  current commit, whether an update run is in progress
//   GET  /chatcath/update/check   git fetch, compare HEAD with the upstream branch
//   POST /chatcath/update/apply   git pull --ff-only, pnpm install (async; poll status)
// Routes registered on webServer are not behind the session cookie, so every route
// is limited to loopback callers and mutations additionally require a same-origin
// Origin/Referer — the same policy dshmarket uses for /dsh-market/restart.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SETTINGS_UI } from "./ui.js";

export const name = "chatcath-updater";
export const inject = ["webServer"];

const ROOT = dirname(dirname(dirname(realpathSync(fileURLToPath(import.meta.url)))));
const op = { state: "idle", step: "", log: [], startedAt: 0, finishedAt: 0, error: null };

const loopback = (a) => a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
function trusted(req, mutation) {
  if (!loopback(req.socket.remoteAddress)) return false;
  if (req.headers.forwarded !== undefined || req.headers["x-forwarded-for"] !== undefined) return false;
  if (!mutation) return true;
  const host = req.headers.host; if (!host) return false;
  const src = req.headers.origin ?? req.headers.referer; if (!src) return false;
  try { return new URL(src).host === host; } catch { return false; }
}
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };

const env = () => ({ ...process.env, PATH: [dirname(process.execPath), process.env.PATH ?? ""].join(":"), GIT_TERMINAL_PROMPT: "0" });
function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", env: env(), timeout: 60000 });
  if (r.error) throw new Error(`git: ${r.error.message}`);
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || `git ${args[0]} failed`).trim());
  return r.stdout.trim();
}
function current() {
  const [sha, date, subject] = git(["log", "-1", "--format=%h%n%cs%n%s"]).split("\n");
  return { sha, date, subject };
}
function pnpmCommand() {
  for (const c of [["pnpm"], ["corepack", "pnpm"]]) {
    const r = spawnSync(c[0], [...c.slice(1), "--version"], { cwd: ROOT, encoding: "utf8", env: env(), timeout: 30000 });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}
function run(cmd, args, label) {
  return new Promise((resolve, reject) => {
    op.step = label; op.log.push(`$ ${[cmd, ...args].join(" ")}`);
    const p = spawn(cmd, args, { cwd: ROOT, env: env(), stdio: ["ignore", "pipe", "pipe"] });
    const tail = (d) => { for (const line of String(d).split(/\r?\n/)) if (line.trim()) op.log.push(line.slice(0, 300)); if (op.log.length > 200) op.log.splice(0, op.log.length - 200); };
    p.stdout.on("data", tail); p.stderr.on("data", tail);
    p.on("error", reject);
    p.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${label}: ${cmd} exited with ${code}`)));
  });
}

function check() {
  if (!existsSync(join(ROOT, ".git"))) throw new Error("not a git checkout: " + ROOT);
  git(["fetch", "--quiet"]);
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const dirty = git(["status", "--porcelain", "--untracked-files=no"]) !== "";
  const commits = git(["log", "--format=%h%x09%cs%x09%s", "HEAD..@{u}"]).split("\n").filter(Boolean)
    .map((l) => { const [sha, date, subject] = l.split("\t"); return { sha, date, subject }; });
  return { root: ROOT, upstream, current: current(), dirty, behind: commits.length, commits, checkedAt: Date.now() };
}

async function apply() {
  op.state = "running"; op.step = ""; op.log = []; op.error = null; op.startedAt = Date.now(); op.finishedAt = 0;
  try {
    if (git(["status", "--porcelain", "--untracked-files=no"]) !== "") throw new Error("local changes present; commit or stash them first / 本地有未提交修改");
    await run("git", ["pull", "--ff-only", "--quiet"], "pull");
    const pnpm = pnpmCommand();
    if (pnpm === null) throw new Error("pnpm not found on PATH (npm i -g pnpm)");
    await run(pnpm[0], [...pnpm.slice(1), "install", "--reporter=append-only"], "install");
    op.state = "done"; op.step = "done";
  } catch (e) {
    op.state = "failed"; op.error = e instanceof Error ? e.message : String(e); op.log.push("!! " + op.error);
  } finally { op.finishedAt = Date.now(); }
}

export function apply_routes(ctx) {
  const routes = [
    { kind: "exact", path: "/chatcath/update/status", handler: (req, res) => {
      if (!trusted(req, false)) return json(res, 403, { error: "loopback only" });
      let cur = null; try { cur = current(); } catch (e) { return json(res, 200, { ok: false, error: String(e.message), op }); }
      json(res, 200, { ok: true, root: ROOT, current: cur, op });
    } },
    { kind: "exact", path: "/chatcath/update/check", handler: (req, res) => {
      if (!trusted(req, false)) return json(res, 403, { error: "loopback only" });
      try { json(res, 200, { ok: true, ...check() }); } catch (e) { json(res, 200, { ok: false, error: e.message }); }
    } },
    { kind: "exact", path: "/chatcath/update/apply", handler: (req, res) => {
      if (req.method !== "POST") { res.writeHead(405, { allow: "POST" }); return res.end(); }
      if (!trusted(req, true)) return json(res, 403, { error: "same-origin loopback requests only" });
      if (op.state === "running") return json(res, 409, { ok: false, error: "update already running", op });
      void apply();
      json(res, 202, { ok: true, op });
    } },
  ];
  for (const r of routes) ctx.effect(() => ctx.webServer.register(r), `chatcath-updater: ${r.path}`);
  ctx.effect(() => ctx.webServer.tapIndex((html) => {
    const anchor = '<script type="module"';
    const at = html.indexOf(anchor);
    return at === -1 ? html : html.slice(0, at) + SETTINGS_UI + html.slice(at);
  }), "chatcath-updater: settings ui");
}
export { apply_routes as apply };
