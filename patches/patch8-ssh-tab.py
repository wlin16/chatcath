#!/usr/bin/env python3
"""patch 8: dsh-ssh-ops client.js — SSH tab in the session header gets role="tab" so it
takes codex-ui's tab styling (instead of floating), and the English UI ("Chat") matches too."""
import sys, io, os
p = os.path.join(sys.argv[1], "dsh-ssh-ops", "lib", "client.js")
if not os.path.exists(p):
    print("  patch 8    dsh-ssh-ops     未安装,跳过"); sys.exit(0)
s = io.open(p, encoding='utf8').read()
s = s.replace('"var(--dsw-alias-label, currentColor)"', '"var(--dsw-alias-label-tertiary, currentColor)"')
if '__dshSshTabRole' in s:
    io.open(p, 'w', encoding='utf8').write(s); print("  patch 8    dsh-ssh-ops     SSH 标签页对齐(已打)"); sys.exit(0)
a1 = 'button.dataset.dshSshOpsTab = "true";'
a2 = 'text.includes("conversation") && text.includes("trajectory")'
if a1 not in s or a2 not in s:
    print("  patch 8    dsh-ssh-ops     锚点缺失(上游改版?),跳过"); sys.exit(0)
s = s.replace(a1, a1 + ' button.setAttribute("role", "tab"); button.setAttribute("aria-selected", "false"); /* LOCAL PATCH __dshSshTabRole */', 1)
s = s.replace(a2, '(text.includes("conversation") || text.includes("chat")) && text.includes("trajectory")', 1)
io.open(p, 'w', encoding='utf8').write(s)
print("  patch 8    dsh-ssh-ops     SSH 标签页对齐 + 英文界面匹配")
