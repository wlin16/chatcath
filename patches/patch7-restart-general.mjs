// patch 7: settings dialog → "General" pane gets a "Restart DSH" row (zh/en), so a
// plugin install/update can be applied without touching the terminal. Injects one
// <script> into dsh-web-frontend's index.html. Idempotent (data-id marker).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ID = "chatcath-restart-general";
const SCRIPT = `    <script data-id="${ID}">
    /* LOCAL PATCH (chatcath). Adds a "Restart DSH" row at the end of Settings → General.
     * Click twice to confirm → POST /dsh-market/restart (dshmarket, allowRestart: true in
     * cordis.patch.yml) → poll /dsh-market/status until the boot id changes → reload. */
    (function () {
      var T = {
        zh: { title: '重启 DSH', desc: '重新启动本地服务,页面会自动刷新;安装或更新插件后需要', btn: '重启', confirm: '再点一次确认', busy: '正在重启…', fail: '重启失败', timeout: '超时' },
        en: { title: 'Restart DSH', desc: 'Restart the local service; the page reloads by itself. Needed after installing or updating plugins', btn: 'Restart', confirm: 'Click again to confirm', busy: 'Restarting…', fail: 'Restart failed', timeout: 'timed out' }
      };
      var GENERAL = { 'General': 'en', '通用设置': 'zh', '通用': 'zh' };
      var armed = 0, busy = false;
      function activeGeneral() {
        var nav = document.querySelector('[role="dialog"] nav'); if (!nav) return null;
        var buttons = nav.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
          var b = buttons[i], t = (b.textContent || '').trim();
          if (!(t in GENERAL)) continue;
          var active = b.getAttribute('aria-current') === 'true' || b.getAttribute('aria-current') === 'page' || /active/i.test(b.className);
          return active ? { lang: GENERAL[t], nav: nav } : null;
        }
        return null;
      }
      function currentBoot() {
        return fetch('/dsh-market/status', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { return j && typeof j.boot === 'string' ? j.boot : null; }).catch(function () { return null; });
      }
      function waitForNewBoot(oldBoot, setLabel, L) {
        var deadline = Date.now() + 90000;
        (function poll() {
          if (Date.now() > deadline) { setLabel(L.fail + ': ' + L.timeout); busy = false; return; }
          setTimeout(function () {
            if (oldBoot === null) { fetch('/', { cache: 'no-store', redirect: 'manual' }).then(function () { location.reload(); }).catch(poll); return; }
            currentBoot().then(function (b) { if (b !== null && b !== oldBoot) location.reload(); else poll(); });
          }, 1500);
        })();
      }
      function doRestart(btn, setLabel, L) {
        busy = true; setLabel(L.busy); btn.disabled = true;
        currentBoot().then(function (oldBoot) {
          return fetch('/dsh-market/restart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
            .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
            .then(function (x) {
              if (x.status === 202 && x.body && x.body.ok === true) { setTimeout(function () { waitForNewBoot(oldBoot, setLabel, L); }, 2500); return; }
              setLabel(L.fail + ': ' + ((x.body && x.body.error) || ('HTTP ' + x.status))); btn.disabled = false; busy = false;
            });
        }).catch(function (e) { setLabel(L.fail + ': ' + e); btn.disabled = false; busy = false; });
      }
      function mount() {
        var g = activeGeneral();
        var existing = document.querySelector('[data-chatcath-restart]');
        if (!g) { if (existing) existing.remove(); return; }
        var dialog = g.nav.closest('[role="dialog"]'); if (!dialog) return;
        var section = dialog.querySelector('[class*="_section"]'); if (!section) return;
        var sampleRow = section.querySelector('[class*="_row"]'); if (!sampleRow) return;
        var L = T[g.lang];
        if (existing) {
          if (existing.__lang !== g.lang && !busy) { existing.remove(); existing = null; }
          else { if (section.lastElementChild !== existing) section.appendChild(existing); return; }
        }
        var cls = function (sel) { var e = sampleRow.querySelector(sel); return e ? e.className : ''; };
        var row = document.createElement('div'); row.className = sampleRow.className; row.setAttribute('data-chatcath-restart', '1'); row.__lang = g.lang;
        var text = document.createElement('div'); text.className = cls('[class*="_rowText"]');
        var title = document.createElement('div'); title.className = cls('[class*="_title"]'); title.textContent = L.title;
        var desc = document.createElement('div'); desc.className = cls('[class*="_desc"]') || cls('[class*="_title"]'); desc.textContent = L.desc;
        if (!cls('[class*="_desc"]')) { desc.style.fontSize = '12px'; desc.style.opacity = '0.7'; }
        text.appendChild(title); text.appendChild(desc);
        var control = document.createElement('span'); control.style.marginLeft = 'auto';
        var btn = document.createElement('button'); btn.type = 'button';
        var sampleBtn = dialog.querySelector('[class*="_selector"]');
        if (sampleBtn) btn.className = sampleBtn.className;
        btn.style.cursor = 'pointer';
        var label = document.createElement('span'); label.textContent = L.btn; btn.appendChild(label);
        var setLabel = function (t) { label.textContent = t; };
        btn.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (btn.disabled) return;
          var now = Date.now();
          if (now - armed > 5000) { armed = now; setLabel(L.confirm); setTimeout(function () { if (label.textContent === L.confirm) setLabel(L.btn); }, 5000); return; }
          armed = 0; doRestart(btn, setLabel, L);
        });
        control.appendChild(btn); row.appendChild(text); row.appendChild(control);
        section.appendChild(row);
      }
      var scheduled = false;
      var obs = new MutationObserver(function () {
        if (scheduled) return; scheduled = true;
        setTimeout(function () { scheduled = false; try { mount(); } catch (e) { console.warn('chatcath restart row:', e); } }, 0);
      });
      function start() { obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] }); try { mount(); } catch (e) {} }
      if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    })();
    </script>
`;

export function applyPatch7(nodeModules) {
  const p = join(nodeModules, "@deepseek-ai", "dsh-web-frontend", "dist", "index.html");
  if (!existsSync(p)) return "  patch 7    index.html      dsh-web-frontend 未安装,跳过";
  let s = readFileSync(p, "utf8");
  const already = s.includes(`data-id="${ID}"`) && s.includes(SCRIPT);
  if (already) return "  patch 7    index.html      通用设置里的「重启 DSH」行(已打)";
  s = s.replace(new RegExp(`[ \\t]*<script data-id="${ID}">[\\s\\S]*?</script>\\n`), "");
  s = s.replace(/[ \t]*<script data-id="dsh-restart-button">[\s\S]*?<\/script>\n/, "");
  const anchor = '    <script type="module"';
  if (!s.includes(anchor)) return "  patch 7    index.html      锚点缺失(上游改版?),跳过";
  s = s.replace(anchor, SCRIPT + anchor);
  writeFileSync(p, s);
  return "  patch 7    index.html      通用设置里的「重启 DSH」行(中/英)";
}
