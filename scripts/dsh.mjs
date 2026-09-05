// `pnpm dsh <args>` — boot this repository as the dsh profile "science".
// dsh only boots profiles living under $DSH_HOME/profiles/<name>, so on first run we
// link ~/.dsh/profiles/science -> this directory; settings, credentials and sessions
// then live in ~/.dsh exactly like a stock dsh install.
import { existsSync, lstatSync, mkdirSync, readlinkSync, realpathSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const PROFILE = process.env.DSH_SCIENCE_PROFILE || "science";
const root = realpathSync(dirname(dirname(fileURLToPath(import.meta.url))));
const dshHome = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(homedir(), ".dsh");
const bin = join(root, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) { console.error(`dsh-science: 需要 Node >= 22,当前 ${process.versions.node}`); process.exit(1); }
if (!existsSync(bin)) { console.error("dsh-science: 先运行 pnpm install"); process.exit(1); }

const profiles = join(dshHome, "profiles");
mkdirSync(profiles, { recursive: true });
const link = join(profiles, PROFILE);
let st; try { st = lstatSync(link); } catch {}
if (st !== undefined) {
  if (!st.isSymbolicLink()) {
    console.error(`dsh-science: ${link} 已存在且不是软链接。请移走它,或用 DSH_SCIENCE_PROFILE=<别的名字> 运行。`);
    process.exit(1);
  }
  let target; try { target = realpathSync(link); } catch {}
  if (target !== root) { unlinkSync(link); st = undefined; }
}
if (st === undefined) { symlinkSync(root, link); console.log(`dsh-science: ${link} -> ${root}`); }

// `pnpm dsh web ...` mirrors upstream; "web" is dsh's alias for --profile web and refuses
// --profile, so drop it — this profile is the web app already. Remaining flags reach the app.
const args = process.argv.slice(2);
if (args[0] === "web") args.shift();
const child = spawn(process.execPath, [bin, "--profile", PROFILE, ...args], {
  stdio: "inherit",
  env: { ...process.env, DSH_HOME: dshHome },
});
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
