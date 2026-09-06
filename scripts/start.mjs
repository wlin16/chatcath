// `pnpm start <args>` — boot this repository as the profile "chatcath".
// The harness only boots profiles living under $DSH_HOME/profiles/<name>, so on first run we
// link ~/.dsh/profiles/chatcath -> this directory; settings, credentials and sessions
// then live in ~/.dsh.
import { existsSync, lstatSync, mkdirSync, readlinkSync, realpathSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const PROFILE = process.env.CHATCATH_PROFILE || "chatcath";
const root = realpathSync(dirname(dirname(fileURLToPath(import.meta.url))));
const dshHome = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(homedir(), ".dsh");
const bin = join(root, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) { console.error(`chatCATH: 需要 Node >= 22,当前 ${process.versions.node}`); process.exit(1); }
if (!existsSync(bin)) { console.error("chatCATH: 先运行 pnpm install"); process.exit(1); }

const profiles = join(dshHome, "profiles");
mkdirSync(profiles, { recursive: true });
const link = join(profiles, PROFILE);
let st; try { st = lstatSync(link); } catch {}
if (st !== undefined) {
  if (!st.isSymbolicLink()) {
    console.error(`chatCATH: ${link} 已存在且不是软链接。请移走它,或用 CHATCATH_PROFILE=<别的名字> 运行。`);
    process.exit(1);
  }
  let target; try { target = realpathSync(link); } catch {}
  if (target !== root) { unlinkSync(link); st = undefined; }
}
if (st === undefined) { symlinkSync(root, link); console.log(`chatCATH: 工作目录 ${root}`); }

// `pnpm start web ...`: "web" is the upstream alias for --profile web and refuses
// --profile, so drop it — this profile is the web app already. Remaining flags reach the app.
const args = process.argv.slice(2);
if (args[0] === "web") args.shift();
const portIdx = args.indexOf("--port");
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 3080;

// "Restart chatCATH" in Settings → General replaces the server with a detached
// process, so our child exits. Follow the replacement: keep this command attached to
// whatever listens on the port next, so Ctrl-C still stops the service.
const listeningPids = () => {
  const r = spawnSync("lsof", ["-tiTCP:" + port, "-sTCP:LISTEN"], { encoding: "utf8" });
  return (r.stdout || "").split("\n").map(Number).filter((n) => Number.isInteger(n) && n > 0);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let following = null;
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => {
  if (following !== null) { try { process.kill(following, "SIGTERM"); } catch {} process.exit(0); }
  child.kill(sig);
});
const child = spawn(process.execPath, [bin, "--profile", PROFILE, ...args], {
  stdio: ["inherit", "pipe", "inherit"],
  env: { ...process.env, DSH_HOME: dshHome },
});
// Terminal output carries the product name, not the harness's.
child.stdout.on("data", (d) => process.stdout.write(String(d).replace(/^dsh web: /gm, "chatCATH: ").replace(/\bdsh\b/g, "chatCATH")));
child.on("exit", async (code, signal) => {
  const ownPid = child.pid;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const pid = listeningPids().find((p) => p !== ownPid);
    if (pid !== undefined) {
      following = pid;
      console.log(`chatCATH: 服务已重启(pid ${pid}),继续跟随;Ctrl-C 可停止`);
      let misses = 0;
      while (misses < 3) { await sleep(2000); misses = listeningPids().includes(pid) ? 0 : misses + 1; }
      console.log("chatCATH: 服务已停止");
      process.exit(0);
    }
  }
  process.exit(code ?? (signal ? 1 : 0));
});
