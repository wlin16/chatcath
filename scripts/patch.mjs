// Apply local compatibility/UX patches to installed plugins. Idempotent; safe to rerun.
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyPatch10 } from "../patches/patch10-suggest-prompt.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nm = join(root, "node_modules");
if (!existsSync(join(nm, "@deepseek-ai", "dsh"))) {
  console.log("chatcath: node_modules 还没装好,跳过打补丁");
  process.exit(0);
}
console.log("chatcath: 打补丁");
console.log(applyPatch10(nm));
const py = ["python3", "python"].find((c) => spawnSync(c, ["--version"], { stdio: "ignore" }).status === 0);
if (py === undefined) {
  console.log("  patch 8/9  dsh-ssh-ops     需要 python3,未找到,跳过(不影响使用)");
} else {
  for (const [script, arg] of [
    ["patch8-ssh-tab.py", nm],
    ["patch9-ssh-import.py", join(nm, "dsh-ssh-ops")],
  ]) {
    const r = spawnSync(py, [join(root, "patches", script), arg], { encoding: "utf8" });
    process.stdout.write(r.stdout || "");
    if (r.status !== 0) process.stdout.write(`  ${script} 失败(上游改版?):${(r.stderr || "").trim().split("\n").pop()}\n`);
  }
}
