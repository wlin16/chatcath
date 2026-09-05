// Injected into index.html by the host (webServer.tapIndex). Adds two rows at the end of
// Settings → General: "Check for updates" and "Restart DSH". Labels follow the UI language.
export const SETTINGS_UI = `<script data-id="chatcath-settings">
(function () {
  var T = {
    zh: { upd: '检查更新', updDesc: function (c) { return '当前版本 ' + c.sha + ' · ' + c.date; }, checking: '检查中…', latest: '已是最新', behind: function (n) { return '有 ' + n + ' 个新版本'; },
          doUpdate: '立即更新', updating: '更新中…', pull: '正在拉取代码…', install: '正在安装依赖…', updDone: '更新完成,正在重启…', updFail: '更新失败', manual: '更新完成,请在终端重新运行 pnpm dsh web', dirty: '本地有未提交修改,无法自动更新',
          rst: '重启 DSH', rstDesc: '重新启动本地服务,页面会自动刷新;安装或更新插件后需要', rstBtn: '重启', confirm: '再点一次确认', busy: '正在重启…', fail: '重启失败', timeout: '超时' },
    en: { upd: 'Check for updates', updDesc: function (c) { return 'Current version ' + c.sha + ' · ' + c.date; }, checking: 'Checking…', latest: 'Up to date', behind: function (n) { return n + ' new version' + (n > 1 ? 's' : '') + ' available'; },
          doUpdate: 'Update now', updating: 'Updating…', pull: 'Pulling code…', install: 'Installing dependencies…', updDone: 'Updated, restarting…', updFail: 'Update failed', manual: 'Updated; run pnpm dsh web again in the terminal', dirty: 'Local uncommitted changes; cannot auto-update',
          rst: 'Restart DSH', rstDesc: 'Restart the local service; the page reloads by itself. Needed after installing or updating plugins', rstBtn: 'Restart', confirm: 'Click again to confirm', busy: 'Restarting…', fail: 'Restart failed', timeout: 'timed out' }
  };
  var GENERAL = { 'General': 'en', '通用设置': 'zh', '通用': 'zh' };
  var state = { armed: 0, busy: false, lang: null, checked: null, phase: 'idle' };
  var api = function (path, opts) { return fetch(path, Object.assign({ cache: 'no-store' }, opts || {})).then(function (r) { return r.json().then(function (j) { j.__status = r.status; return j; }); }); };

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
    return api('/dsh-market/status').then(function (j) { return typeof j.boot === 'string' ? j.boot : null; }).catch(function () { return null; });
  }
  function waitForNewBoot(oldBoot, onFail) {
    var deadline = Date.now() + 120000;
    (function poll() {
      if (Date.now() > deadline) { onFail(); return; }
      setTimeout(function () {
        if (oldBoot === null) { fetch('/', { cache: 'no-store', redirect: 'manual' }).then(function () { location.reload(); }).catch(poll); return; }
        currentBoot().then(function (b) { if (b !== null && b !== oldBoot) location.reload(); else poll(); });
      }, 1500);
    })();
  }
  function restart(L, setLabel, setDesc, btn) {
    state.busy = true; setLabel(L.busy); btn.disabled = true;
    return currentBoot().then(function (oldBoot) {
      return api('/dsh-market/restart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(function (x) {
        if (x.__status === 202 && x.ok === true) { setTimeout(function () { waitForNewBoot(oldBoot, function () { setLabel(L.fail + ': ' + L.timeout); btn.disabled = false; state.busy = false; }); }, 2500); return true; }
        setLabel(L.fail + ': ' + (x.error || ('HTTP ' + x.__status))); btn.disabled = false; state.busy = false; return false;
      });
    }).catch(function (e) { setLabel(L.fail + ': ' + e); btn.disabled = false; state.busy = false; return false; });
  }

  function makeRow(section, sampleRow, sampleBtn, key, title, desc, btnText) {
    var cls = function (sel) { var e = sampleRow.querySelector(sel); return e ? e.className : ''; };
    var row = document.createElement('div'); row.className = sampleRow.className; row.setAttribute('data-chatcath', key);
    var text = document.createElement('div'); text.className = cls('[class*="_rowText"]');
    var t = document.createElement('div'); t.className = cls('[class*="_title"]'); t.textContent = title;
    var d = document.createElement('div'); d.className = cls('[class*="_desc"]') || cls('[class*="_title"]'); d.textContent = desc;
    if (!cls('[class*="_desc"]')) { d.style.fontSize = '12px'; d.style.opacity = '0.7'; }
    text.appendChild(t); text.appendChild(d);
    var control = document.createElement('span'); control.style.marginLeft = 'auto'; control.style.flexShrink = '0';
    var btn = document.createElement('button'); btn.type = 'button'; if (sampleBtn) btn.className = sampleBtn.className; btn.style.cursor = 'pointer';
    var label = document.createElement('span'); label.textContent = btnText; btn.appendChild(label);
    control.appendChild(btn); row.appendChild(text); row.appendChild(control); section.appendChild(row);
    return { row: row, btn: btn, setLabel: function (s) { label.textContent = s; }, setDesc: function (s) { d.textContent = s; } };
  }

  function mountUpdate(section, sampleRow, sampleBtn, L) {
    var r = makeRow(section, sampleRow, sampleBtn, 'update', L.upd, '…', L.upd);
    api('/chatcath/update/status').then(function (s) {
      if (s.ok && s.current) r.setDesc(L.updDesc(s.current));
      else r.setDesc(s.error || '');
      if (s.op && s.op.state === 'running') { state.phase = 'updating'; follow(); }
    }).catch(function () {});
    function follow() {
      r.btn.disabled = true; r.setLabel(L.updating);
      (function poll() {
        setTimeout(function () {
          api('/chatcath/update/status').then(function (s) {
            var o = s.op || {};
            if (o.state === 'running') { r.setDesc(o.step === 'install' ? L.install : L.pull); poll(); return; }
            if (o.state === 'done') {
              r.setDesc(L.updDone); state.phase = 'idle';
              restart(L, r.setLabel, r.setDesc, r.btn).then(function (ok) { if (!ok) r.setDesc(L.manual); });
              return;
            }
            r.setDesc(L.updFail + ': ' + (o.error || '')); r.btn.disabled = false; r.setLabel(L.upd); state.phase = 'idle'; state.checked = null;
          }).catch(poll);
        }, 1500);
      })();
    }
    r.btn.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (r.btn.disabled || state.busy) return;
      if (state.checked && state.checked.behind > 0) {
        if (state.checked.dirty) { r.setDesc(L.dirty); return; }
        state.phase = 'updating';
        api('/chatcath/update/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(function (x) {
          if (x.__status === 202 || x.__status === 409) { follow(); return; }
          r.setDesc(L.updFail + ': ' + (x.error || ('HTTP ' + x.__status))); state.phase = 'idle';
        }).catch(function (e) { r.setDesc(L.updFail + ': ' + e); state.phase = 'idle'; });
        return;
      }
      r.btn.disabled = true; r.setLabel(L.checking);
      api('/chatcath/update/check').then(function (c) {
        r.btn.disabled = false;
        if (!c.ok) { r.setDesc(L.updFail + ': ' + c.error); r.setLabel(L.upd); return; }
        state.checked = c;
        if (c.behind === 0) { r.setDesc(L.latest + ' · ' + c.current.sha + ' · ' + c.current.date); r.setLabel(L.upd); return; }
        var subjects = c.commits.slice(0, 3).map(function (k) { return k.sha + ' ' + k.subject; }).join(' / ');
        r.setDesc(L.behind(c.behind) + (c.dirty ? ' — ' + L.dirty : '') + ':' + subjects + (c.commits.length > 3 ? ' …' : ''));
        r.setLabel(L.doUpdate);
      }).catch(function (e) { r.btn.disabled = false; r.setDesc(L.updFail + ': ' + e); r.setLabel(L.upd); });
    });
    return r;
  }
  function mountRestart(section, sampleRow, sampleBtn, L) {
    var r = makeRow(section, sampleRow, sampleBtn, 'restart', L.rst, L.rstDesc, L.rstBtn);
    r.btn.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (r.btn.disabled || state.busy) return;
      var now = Date.now();
      if (now - state.armed > 5000) { state.armed = now; r.setLabel(L.confirm); setTimeout(function () { if (r.btn.textContent === L.confirm) r.setLabel(L.rstBtn); }, 5000); return; }
      state.armed = 0; restart(L, r.setLabel, r.setDesc, r.btn);
    });
  }

  function mount() {
    var g = activeGeneral();
    var rows = document.querySelectorAll('[data-chatcath]');
    if (!g) { if (!state.busy && state.phase === 'idle') for (var i = 0; i < rows.length; i++) rows[i].remove(); return; }
    var dialog = g.nav.closest('[role="dialog"]'); if (!dialog) return;
    var section = dialog.querySelector('[class*="_section"]'); if (!section) return;
    var sampleRow = section.querySelector('[class*="_row"]'); if (!sampleRow) return;
    if (rows.length) {
      if (state.lang !== g.lang && !state.busy && state.phase === 'idle') { for (var j = 0; j < rows.length; j++) rows[j].remove(); state.checked = null; }
      else { for (var k = 0; k < rows.length; k++) if (rows[k].parentNode !== section) section.appendChild(rows[k]); return; }
    }
    state.lang = g.lang;
    var L = T[g.lang], sampleBtn = dialog.querySelector('[class*="_selector"]');
    mountUpdate(section, sampleRow, sampleBtn, L);
    mountRestart(section, sampleRow, sampleBtn, L);
  }
  var scheduled = false;
  var obs = new MutationObserver(function () {
    if (scheduled) return; scheduled = true;
    setTimeout(function () { scheduled = false; try { mount(); } catch (e) { console.warn('chatcath settings rows:', e); } }, 0);
  });
  function start() { obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'class'] }); try { mount(); } catch (e) {} }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
</script>
`;
