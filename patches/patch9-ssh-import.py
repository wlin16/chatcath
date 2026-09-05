#!/usr/bin/env python3
"""LOCAL PATCH 9 for dsh-ssh-ops: import ~/.ssh/config as a selectable list.

Upstream behaviour: "从 ~/.ssh/config 导入" fills the temporary-connect form with
the FIRST host only and tells the user to add the rest by hand.

This patch:
  host  (lib/index.js)   new sshOps method `sshConfigImportProfiles`
                         -> creates one SSH resource per chosen host and, when
                            IdentityFile (or a default ~/.ssh/id_*) is readable,
                            stores the key straight into the credential store.
                            Key material never leaves the host.
  wire  (lib/remote.js, lib/typert.js)  request/result schemas + descriptor row
  client(lib/client.js)  checkbox list with 全选 / 填入 / 默认用户名 / 导入私钥

Idempotent: every file carries the marker __dshSshConfigImportProfiles.
Usage: dsh-patch9-ssh-import.py <plugin-dir>
"""
import io
import sys
from pathlib import Path

MARK = "__dshSshConfigImportProfiles"
root = Path(sys.argv[1])


def rw(path):
    return io.open(path, encoding="utf8").read()


def save(path, text):
    io.open(path, "w", encoding="utf8").write(text)


def patch_host():
    p = root / "lib/index.js"
    s = rw(p)
    if MARK in s:
        return "已打"
    anchor = "    if (current !== null) hosts.push(current);\n    return { ok: true, value: { hosts } };\n  }\n"
    if anchor not in s:
        return "锚点缺失"
    method = anchor + r'''  /* LOCAL PATCH ''' + MARK + r''' — 按名单批量导入 ~/.ssh/config 为 SSH 资源,私钥在宿主机直接写入凭据库 */
  async sshConfigImportProfiles(request) {
    const parsed = await this.sshConfigImport();
    if (!parsed.ok) return parsed;
    const { readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const os = await import("node:os");
    const wanted = new Set(Array.isArray(request?.names) ? request.names : []);
    const defaultUsername = String(request?.defaultUsername ?? "").trim() || os.default.userInfo().username;
    const importKeys = request?.importKeys !== false;
    const existingNames = new Set([...this.requireProfileTable().entries()].map(([, record2]) => record2.name));
    const defaultKeys = ["id_ed25519", "id_ecdsa", "id_rsa"].map((file2) => join(os.default.homedir(), ".ssh", file2));
    const readKey = (path) => {
      try {
        if (!path || !existsSync(path)) return "";
        const text = readFileSync(path, "utf8");
        return text.length > 1024 * 1024 || !text.includes("PRIVATE KEY") ? "" : text;
      } catch {
        return "";
      }
    };
    const imported = [];
    const skipped = [];
    for (const entry of parsed.value.hosts) {
      if (!wanted.has(entry.name)) continue;
      if (existingNames.has(entry.name)) {
        skipped.push({ name: entry.name, reason: "exists" });
        continue;
      }
      let key = "";
      if (importKeys) {
        key = readKey(entry.identityFile);
        if (!key) for (const candidate of defaultKeys) { key = readKey(candidate); if (key) break; }
      }
      const saved = await this.profileSave({
        name: entry.name,
        host: entry.host,
        port: entry.port,
        username: entry.username || defaultUsername,
        authKind: key ? "key" : "password",
        hostKeyMode: DEFAULT_HOST_KEY_MODE,
        groupId: null
      });
      if (!saved.ok) {
        skipped.push({ name: entry.name, reason: saved.error?.message ?? "save-failed" });
        continue;
      }
      let keyStored = false;
      if (key) {
        try {
          await this.ctx.credentials.set(credentialRef(saved.value.credentialRefs.privateKey), key);
          keyStored = true;
        } catch {
        }
      }
      existingNames.add(entry.name);
      imported.push({ name: entry.name, profileId: saved.value.profile.profileId, authKind: key ? "key" : "password", keyStored, proxyJump: entry.proxyJump });
    }
    return { ok: true, value: { imported, skipped } };
  }
'''
    s = s.replace(anchor, method, 1)
    save(p, s)
    return "已打"


def patch_wire(name, indent="", mark=MARK):
    """Insert wire schemas + descriptor row. `indent` = line prefix used by that
    bundle (client.js indents everything with two tabs)."""
    p = root / name
    s = rw(p)
    if mark in s:
        return "已打"
    a1 = indent + "var sshConfigImportRequestSchema = external_exports.object({});\n"
    a2 = 'def("sshConfigImport", sshConfigImportRequestSchema, "SshConfigImportRequest", sshConfigImportResultSchema, "SshConfigImportResult"),\n'
    if a1 not in s or a2 not in s:
        return "锚点缺失"
    schemas = a1 + '''/* LOCAL PATCH ''' + mark + ''' */
var sshConfigImportProfilesRequestSchema = external_exports.object({
  names: external_exports.array(external_exports.string()),
  defaultUsername: external_exports.string().optional(),
  importKeys: external_exports.boolean().optional()
});
var sshConfigImportProfilesResultSchema = resultSchema(
  external_exports.object({
    imported: external_exports.array(external_exports.object({
      name: external_exports.string(),
      profileId: external_exports.string(),
      authKind: external_exports.string(),
      keyStored: external_exports.boolean(),
      proxyJump: external_exports.string()
    })),
    skipped: external_exports.array(external_exports.object({ name: external_exports.string(), reason: external_exports.string() }))
  })
);
'''
    if indent:
        head, body = schemas.split("\n", 1)
        schemas = head + "\n" + "".join(indent + line + "\n" for line in body.rstrip("\n").split("\n"))
    row = a2 + indent + '  def("sshConfigImportProfiles", sshConfigImportProfilesRequestSchema, "SshConfigImportProfilesRequest", sshConfigImportProfilesResultSchema, "SshConfigImportProfilesResult"),\n'
    s = s.replace(a1, schemas, 1).replace(a2, row, 1)
    save(p, s)
    return "已打"


def patch_client():
    p = root / "lib/client.js"
    s = rw(p)
    if MARK in s:
        return "已打"
    fn_start = s.find("const importSshConfig = async () => {")
    fn_end = s.find("const submit = async () => {", fn_start)
    render_anchor = r'"\u4ECE ~/.ssh/config \u5BFC\u5165")), '
    if fn_start < 0 or fn_end < 0 or render_anchor not in s:
        return "锚点缺失"
    ind = "\t\t  "
    new_fn = f'''/* LOCAL PATCH {MARK}: 列表多选导入 */
{ind}const [importList, setImportList] = useState4(null);
{ind}const importSshConfig = async () => {{
{ind}  setBusy(true);
{ind}  setError(null);
{ind}  setStatus("正在读取 ~/.ssh/config…");
{ind}  try {{
{ind}    const result = await api.sshConfigImport();
{ind}    setStatus(null);
{ind}    if (!result || !result.hosts || result.hosts.length === 0) {{
{ind}      setError("~/.ssh/config 里没有可导入的主机（Host * 会被跳过）");
{ind}      return;
{ind}    }}
{ind}    const existing = new Set(profiles.map((p) => p.name));
{ind}    setImportList({{ hosts: result.hosts, existing, selected: new Set(result.hosts.filter((h) => !existing.has(h.name)).map((h) => h.name)), defaultUsername: "", importKeys: true }});
{ind}  }} catch (err) {{
{ind}    setStatus(null);
{ind}    setError(`导入失败：${{err?.message ?? String(err)}}`);
{ind}  }} finally {{
{ind}    setBusy(false);
{ind}  }}
{ind}}};
{ind}const importToggle = (name) => setImportList((s) => {{
{ind}  if (!s) return s;
{ind}  const selected = new Set(s.selected);
{ind}  if (selected.has(name)) selected.delete(name); else selected.add(name);
{ind}  return {{ ...s, selected }};
{ind}}});
{ind}const importSelectAll = (on) => setImportList((s) => s ? {{ ...s, selected: new Set(on ? s.hosts.filter((h) => !s.existing.has(h.name)).map((h) => h.name) : []) }} : s);
{ind}const importFill = (h) => {{
{ind}  setForm((f) => ({{ ...f, name: h.name, host: h.host, port: String(h.port), username: h.username || "root", authKind: h.identityFile ? "key" : "password", privateKey: "", passphrase: "" }}));
{ind}  setImportList(null);
{ind}  setError(null);
{ind}  setStatus(`已填入「${{h.name}}」，请补充认证信息后连接。`);
{ind}}};
{ind}const importRun = async () => {{
{ind}  if (!importList || importList.selected.size === 0) return;
{ind}  setBusy(true);
{ind}  setError(null);
{ind}  setStatus(`正在导入 ${{importList.selected.size}} 台…`);
{ind}  try {{
{ind}    const value = await api.call("sshConfigImportProfiles", {{ names: [...importList.selected], defaultUsername: importList.defaultUsername, importKeys: importList.importKeys }});
{ind}    try {{ const fresh = await api.profileList(); setProfiles(fresh.profiles); }} catch {{}}
{ind}    const keyed = value.imported.filter((x) => x.keyStored).length;
{ind}    const noKey = value.imported.length - keyed;
{ind}    const parts = [`已导入 ${{value.imported.length}} 台为 SSH 资源`];
{ind}    if (keyed) parts.push(`${{keyed}} 台已带私钥`);
{ind}    if (noKey) parts.push(`${{noKey}} 台未找到私钥，请在 设置 → 插件 → SSH 资源 里补充`);
{ind}    if (value.skipped.length) parts.push(`跳过 ${{value.skipped.length}} 台（${{value.skipped.map((x) => x.name + (x.reason === "exists" ? "：已存在" : "：" + x.reason)).join("，")}}）`);
{ind}    setStatus(parts.join("；"));
{ind}    setImportList(null);
{ind}    if (value.imported[0]) setSelectedProfileId(value.imported[0].profileId);
{ind}  }} catch (err) {{
{ind}    setStatus(null);
{ind}    setError(`导入失败：${{err?.message ?? String(err)}}`);
{ind}  }} finally {{
{ind}    setBusy(false);
{ind}  }}
{ind}}};
{ind}'''
    row = "{ display: \"flex\", alignItems: \"center\", gap: 8, fontSize: 12, color: \"#9aa3af\" }"
    block = (
        'importList && /* LOCAL PATCH */ React4.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, border: "1px solid #2a303a", borderRadius: 6, padding: 8, background: "#101418" } }, '
        f'React4.createElement("div", {{ style: {row} }}, '
        'React4.createElement("span", { style: { flex: 1 } }, `选择要导入为 SSH 资源的主机（${importList.selected.size}/${importList.hosts.length}）`), '
        'React4.createElement("button", { type: "button", onClick: () => importSelectAll(true), disabled: busy, style: panelStyles.btnTiny }, "全选"), '
        'React4.createElement("button", { type: "button", onClick: () => importSelectAll(false), disabled: busy, style: panelStyles.btnTiny }, "全不选")), '
        'React4.createElement("div", { style: { maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 } }, '
        'importList.hosts.map((h, idx) => { const exists = importList.existing.has(h.name); '
        'return React4.createElement("label", { key: h.name + "#" + idx, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: exists ? "#6b7280" : "#d7dbe2", padding: "2px 0", cursor: exists ? "default" : "pointer", minWidth: 0 } }, '
        'React4.createElement("input", { type: "checkbox", checked: importList.selected.has(h.name), disabled: exists || busy, onChange: () => importToggle(h.name) }), '
        'React4.createElement("span", { style: { fontWeight: 600, minWidth: 90, flex: "none" } }, h.name), '
        'React4.createElement("span", { style: { ...panelStyles.keyImportHint, flex: 1 }, title: h.identityFile || "" }, `${h.username || "(默认用户)"}@${h.host}:${h.port}${h.identityFile ? "  🔑" : ""}${h.proxyJump ? "  经 " + h.proxyJump : ""}${exists ? "  （已存在）" : ""}`), '
        'React4.createElement("button", { type: "button", onClick: () => importFill(h), disabled: busy, style: panelStyles.btnTiny, title: "只填入上方表单做临时连接" }, "填入")); })), '
        f'React4.createElement("div", {{ style: {row} }}, '
        'React4.createElement("span", { style: { whiteSpace: "nowrap" } }, "默认用户名"), '
        'React4.createElement("input", { value: importList.defaultUsername, placeholder: "留空 = 宿主机当前用户（无 User 的主机用）", onChange: (e) => { const v = e.target.value; setImportList((s) => s ? { ...s, defaultUsername: v } : s); }, style: { ...panelStyles.input, flex: "1 1 120px", minWidth: 0 } }), '
        'React4.createElement("label", { style: { display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", cursor: "pointer", whiteSpace: "nowrap" } }, '
        'React4.createElement("input", { type: "checkbox", checked: importList.importKeys, onChange: (e) => { const v = e.target.checked; setImportList((s) => s ? { ...s, importKeys: v } : s); } }), "导入私钥到凭据库")), '
        'React4.createElement("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } }, '
        'React4.createElement("button", { type: "button", onClick: () => setImportList(null), disabled: busy, style: panelStyles.btnSecondary }, "取消"), '
        'React4.createElement("button", { type: "button", onClick: importRun, disabled: busy || importList.selected.size === 0, style: panelStyles.btnPrimary }, busy ? "导入中…" : `导入所选 ${importList.selected.size} 台`))), '
    )
    s = s[:fn_start] + new_fn + s[fn_end:]
    s = s.replace(render_anchor, render_anchor + block, 1)
    save(p, s)
    return "已打"


results = {
    "lib/index.js": patch_host(),
    "lib/remote.js": patch_wire("lib/remote.js"),
    "lib/typert.js": patch_wire("lib/typert.js"),
    "lib/client.js(wire)": patch_wire("lib/client.js", indent="\t\t", mark=MARK + "Wire"),
    "lib/client.js": patch_client(),
}
bad = [k for k, v in results.items() if v != "已打"]
print("  patch 9    dsh-ssh-ops     ~/.ssh/config 列表多选导入  " + ", ".join(f"{k}:{v}" for k, v in results.items()))
sys.exit(1 if bad else 0)
