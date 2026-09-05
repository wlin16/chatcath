// patch 10: @studyzy/dsh-suggest-prompt 1.0.x targets dsh 0.1.1; 0.1.2 moved three APIs.
//   deepFreeze                               dsh-llm                    -> dsh-util-values
//   installSettingsSection/settingsNamespace dsh-settings               -> SettingsProvider#installSection
//   createSnapshotStore (browser)            dsh-client-runtime/client  -> dsh-client-store
// Idempotent (marker __dshCompat012); skips when the plugin is absent or anchors changed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MARK = "__dshCompat012";
export function applyPatch10(nodeModules) {
  const root = join(nodeModules, "@studyzy", "dsh-suggest-prompt", "lib");
  if (!existsSync(root)) return "  patch 10   suggest-prompt  未安装,跳过";
  const rw = (file, fn) => {
    const p = join(root, file);
    const s = readFileSync(p, "utf8");
    if (s.includes(MARK)) return "已打";
    const n = fn(s);
    if (n === null) return "锚点缺失";
    writeFileSync(p, n);
    return "已打(新)";
  };
  const host = (s) => {
    const a = 'import { BlockAssembler, ReasoningEffortId, createUserMessage, deepFreeze } from "@deepseek-ai/dsh-llm";\n';
    const b = 'import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";\n';
    if (!s.includes(a) || !s.includes(b)) return null;
    return s
      .replace(a, 'import { BlockAssembler, ReasoningEffortId, createUserMessage } from "@deepseek-ai/dsh-llm";\nimport { deepFreeze } from "@deepseek-ai/dsh-util-values";\n')
      .replace(b, `// ${MARK}: dsh 0.1.2 moved installSettingsSection onto SettingsProvider#installSection
const settingsNamespace = (value) => {
\tif (!/^[a-z][a-z0-9-]*$/.test(value)) throw new TypeError(\`settings namespace "\${value}" must match /^[a-z][a-z0-9-]*$/\`);
\treturn value;
};
const installSettingsSection = (ctx, ns, schema, entry, hooks) => {
\tctx.inject(["settings"], (sctx) => {
\t\tsctx.settings.installSection(ctx, ns, schema, entry, hooks);
\t});
};
`);
  };
  const client = (s) => {
    const a = 'require("@deepseek-ai/dsh-client-runtime/client")';
    if (!s.includes(a)) return null;
    return s.replace(a, `require("@deepseek-ai/dsh-client-store") /* ${MARK} */`);
  };
  const r1 = rw("index.js", host), r2 = rw("client.js", client);
  return `  patch 10   suggest-prompt  0.1.2 接口兼容  index.js:${r1}, client.js:${r2}`;
}
