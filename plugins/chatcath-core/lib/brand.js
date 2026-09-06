// chatCATH branding. Everything the user sees says chatCATH: <title>, favicon, PWA
// manifest, the sidebar wordmark, the empty-state headline, the first-run notice, and a
// text scrub over UI chrome (dialogs, nav, header) for the remaining product-name strings.
// Model names (e.g. "DeepSeek-V3") are never touched — only the product phrase and the
// bare acronym.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PRODUCT = "chatCATH";
const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
/** Official CATH wordmark (cathdb.info, transparent PNG) and favicon. */
export const LOGO_PNG = readFileSync(join(ASSETS, "cath-logo.png"));
export const FAVICON_PNG = readFileSync(join(ASSETS, "cath-favicon.png"));
const LOGO_URI = "/chatcath/logo.png";


export const MANIFEST = JSON.stringify({
  id: "/", name: PRODUCT, short_name: PRODUCT, start_url: "/", scope: "/", display: "fullscreen",
  icons: [{ src: "/favicon.png", sizes: "196x196", type: "image/png", purpose: "any" }],
}, null, 2);


export const BRAND_HEAD = `<link rel="icon" type="image/png" href="/favicon.png" data-chatcath="icon" />
<style data-id="chatcath-brand">
/* React owns the DOM below; branding is CSS-only (hide + pseudo-element) so React never sees a changed tree. */
button.dcu-brand svg, [class*="dcu-brand"] > svg { display: none !important; }
button.dcu-brand::before, [class*="dcu-brand"]::before {
  content: "chat"; display: inline-flex; align-items: center; height: 24px; margin-right: 4px;
  font: 700 17px/1 Inter, ui-sans-serif, system-ui, sans-serif; letter-spacing: .2px; color: inherit; white-space: nowrap;
}
button.dcu-brand::after, [class*="dcu-brand"]::after {
  content: ""; display: inline-block; width: 60px; height: 26px;
  background: url("${LOGO_URI}") center / contain no-repeat;
}
[class*="_fishHitbox"] { display: none !important; }
[class*="_headlineText"] { display: inline-flex !important; align-items: center; gap: 2px; }
[class*="_headlineText"]::after { content: ""; display: inline-block; width: 96px; height: 42px; background: url("${LOGO_URI}") center / contain no-repeat; }
</style>
<script data-id="chatcath-brand">
(function () {
  var P = '${PRODUCT}';
  var NOTICE = {
    en: { title: 'Welcome to ' + P, p1: P + ' is an AI research agent built for protein science. It is currently available to members of the CATH group only.', p2: 'It can read and analyse structures, sequences and papers, run tools in your workspace, and keep every result in the conversation. Feedback from the group is welcome — the agent evolves with your projects.' },
    zh: { title: '欢迎使用 ' + P, p1: P + ' 是专为蛋白质科学研究打造的 AI 研究助手,目前仅面向 CATH 课题组成员开放。', p2: '它可以阅读并分析结构、序列和文献,在你的工作区中运行工具,并把所有结果保留在对话里。欢迎课题组成员反馈,助手会随着大家的课题持续演进。' }
  };
  var HERO = { en: { badge: 'CATH group', text: 'chat' }, zh: { badge: 'CATH 课题组', text: 'chat' } };
  var zh = function (sample) { return /[\\u4e00-\\u9fff]/.test(sample || ''); };
  var uiZh = function () { var n = document.querySelector('[class*="dcu-root"], nav, aside, main') || document.body; return zh((n.innerText || '').slice(0, 2000)); };
  // Only ever change text-node values; never add/remove/replace elements React renders.
  function setText(el, value) {
    if (!el) return;
    var t = null;
    for (var i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].nodeType === 3) { t = el.childNodes[i]; break; }
    if (t === null) return;
    if (t.nodeValue !== value) t.nodeValue = value;
    for (var j = 0; j < el.childNodes.length; j++) { var c = el.childNodes[j]; if (c !== t && c.nodeType === 3 && c.nodeValue.trim()) c.nodeValue = ''; }
  }
  function fixTitle() {
    var t = document.title, n = t.replace(/DeepSeek Harness/g, P).replace(/\\bDSH\\b/g, P);
    if (n !== t) document.title = n;
  }
  function fixHero() {
    var text = document.querySelector('[class*="_headlineText"]'); if (!text) return;
    var L = HERO[uiZh() ? 'zh' : 'en'];
    setText(text, L.text);
    setText(text.parentElement.querySelector('[class*="_previewBadge"]'), L.badge);
  }
  function fixNotice() {
    var dialogs = document.querySelectorAll('[role="dialog"]');
    for (var i = 0; i < dialogs.length; i++) {
      var d = dialogs[i], h = d.querySelector('h1,h2,h3'); if (!h) continue;
      var all = h.textContent + (d.textContent || '');
      if (!/Internal Testing Notice|内部测试|内测声明|DeepSeek Harness|Welcome to chatCATH|欢迎使用 chatCATH/.test(all)) continue;
      var L = NOTICE[zh(all) ? 'zh' : 'en'];
      setText(h, L.title);
      var ps = d.querySelectorAll('p');
      if (ps[0]) setText(ps[0], L.p1);
      if (ps[1]) setText(ps[1], L.p2);
      for (var j = 2; j < ps.length; j++) setText(ps[j], '');
    }
  }
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|PRE|CODE)$/;
  function scrub(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var v = n.nodeValue; if (!v || !/DeepSeek Harness|\\bDSH\\b|Harness developers/.test(v)) return NodeFilter.FILTER_SKIP;
      for (var e = n.parentElement; e; e = e.parentElement) { if (SKIP.test(e.tagName) || e.isContentEditable) return NodeFilter.FILTER_REJECT; }
      return NodeFilter.FILTER_ACCEPT; } });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) {
      var v = nodes[i].nodeValue, n = v.replace(/DeepSeek Harness/g, P).replace(/\\bDSH\\b/g, P).replace(/Harness developers/g, P + ' users');
      if (n !== v) nodes[i].nodeValue = n;
    }
  }
  function run() {
    fixTitle(); fixHero(); fixNotice();
    var chrome = document.querySelectorAll('[role="dialog"], nav, header, aside, [class*="dcu-head"], [class*="_headline"]');
    for (var i = 0; i < chrome.length; i++) scrub(chrome[i]);
  }
  var scheduled = false;
  var obs = new MutationObserver(function () { if (scheduled) return; scheduled = true; setTimeout(function () { scheduled = false; try { run(); } catch (e) { console.warn('chatcath brand:', e); } }, 0); });
  function start() { obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true }); try { run(); } catch (e) {} }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
</script>
`;
