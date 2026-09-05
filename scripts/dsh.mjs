// `pnpm dsh <args>` — boot this repository as the dsh profile "chatcath".
// dsh only boots profiles living under $DSH_HOME/profiles/<name>, so on first run we
// link ~/.dsh/profiles/chatcath -> this directory; settings, credentials and sessions
// then live in ~/.dsh exactly like a stock dsh install.
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
if (major < 22) { console.error(`chatcath: 需要 Node >= 22,当前 ${process.versions.node}`); process.exit(1); }
if (!existsSync(bin)) { console.error("chatcath: 先运行 pnpm install"); process.exit(1); }

const profiles = join(dshHome, "profiles");
mkdirSync(profiles, { recursive: true });
const link = join(profiles, PROFILE);
let st; try { st = lstatSync(link); } catch {}
if (st !== undefined) {
  if (!st.isSymbolicLink()) {
    console.error(`chatcath: ${link} 已存在且不是软链接。请移走它,或用 CHATCATH_PROFILE=<别的名字> 运行。`);
    process.exit(1);
  }
  let target; try { target = realpathSync(link); } catch {}
  if (target !== root) { unlinkSync(link); st = undefined; }
}
if (st === undefined) { symlinkSync(root, link); console.log(`chatcath: ${link} -> ${root}`); }

// `pnpm dsh web ...` mirrors upstream; "web" is dsh's alias for --profile web and refuses
// --profile, so drop it — this profile is the web app already. Remaining flags reach the app.
const args = process.argv.slice(2);
if (args[0] === "web") args.shift();
const portIdx = args.indexOf("--port");
const port = portIdx >= 0 ? Number(args[portIdx + 1]) : 3080;

// "Restart DSH" in Settings → General (dshmarket) replaces the server with a detached
// process, so our child exits. Follow the replacement: keep this command attached to
// whatever listens on the port next, so Ctrl-C still stops the service.
const listeningPid = () => {
  const r = spawnSync("lsof", ["-tiTCP:" + port, "-sTCP:LISTEN"], { encoding: "utf8" });
  const pid = Number((r.stdout || "").trim().split("\n")[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let following = null;
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => {
  if (following !== null) { try { process.kill(following, "SIGTERM"); } catch {} process.exit(0); }
  child.kill(sig);
});
const child = spawn(process.execPath, [bin, "--profile", PROFILE, ...args], {
  stdio: "inherit",
  env: { ...process.env, DSH_HOME: dshHome },
});
child.on("exit", async (code, signal) => {
  const ownPid = child.pid;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const pid = listeningPid();
    if (pid !== null && pid !== ownPid) {
      following = pid;
      console.log(`chatcath: dsh 已在后台重启(pid ${pid}),继续跟随;Ctrl-C 可停止`);
      while (listeningPid() === pid) await sleep(2000);
      console.log("chatcath: dsh 已停止");
      process.exit(0);
    }
  }
  process.exit(code ?? (signal ? 1 : 0));
});
