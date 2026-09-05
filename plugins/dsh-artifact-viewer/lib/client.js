window.__ModuleLoader__.load({
	id: "dsh-artifact-viewer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name in all)
		    __defProp(target, name, { get: all[name], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
		  // If the importer is in node compatibility mode or this is not an ESM
		  // file that has been converted to a CommonJS file using a Babel-
		  // compatible transform (i.e. "__esModule" has not been set), then set
		  // "default" to the CommonJS "module.exports" for node compatibility.
		  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
		  mod
		));
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

		// src/client.jsx
		var client_exports = {};
		__export(client_exports, {
		  apply: () => apply,
		  inject: () => inject
		});
		module.exports = __toCommonJS(client_exports);
		var import_react = __toESM(require("react"), 1);
		var store = { active: null, subs: /* @__PURE__ */ new Set(), set(x) {
		  this.active = x;
		  this.subs.forEach((f) => f());
		}, close() {
		  this.active = null;
		  this.subs.forEach((f) => f());
		} };
		var icon = { fasta: "\u{1F9EC}", csv: "\u25A6", tsv: "\u25A6", docx: "W", pptx: "P", pdf: "PDF", text: "TXT" };
		function Fasta({ a }) {
		  const [q, setQ] = (0, import_react.useState)(""), [pick, setPick] = (0, import_react.useState)(0), rs = a.data.records || [], r = rs[pick] || { sequence: "" };
		  const seq = r.sequence || "", hits = (0, import_react.useMemo)(() => {
		    const o = /* @__PURE__ */ new Set(), s = q.toUpperCase();
		    if (!s) return o;
		    let i = seq.indexOf(s);
		    while (i >= 0) {
		      for (let j = i; j < i + s.length; j++) o.add(j);
		      i = seq.indexOf(s, i + 1);
		    }
		    return o;
		  }, [seq, q]);
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "av-fasta" }, /* @__PURE__ */ import_react.default.createElement("aside", null, rs.map((x, i) => /* @__PURE__ */ import_react.default.createElement("button", { className: i === pick ? "on" : "", onClick: () => setPick(i), key: i }, /* @__PURE__ */ import_react.default.createElement("b", null, x.id), /* @__PURE__ */ import_react.default.createElement("small", null, x.length, " residues")))), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("div", { className: "av-bar" }, /* @__PURE__ */ import_react.default.createElement("b", null, r.id), /* @__PURE__ */ import_react.default.createElement("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "\u641C\u7D22 motif\u2026" })), /* @__PURE__ */ import_react.default.createElement("p", { className: "av-desc" }, r.description), /* @__PURE__ */ import_react.default.createElement("div", { className: "av-seq" }, [...seq].map((aa, i) => /* @__PURE__ */ import_react.default.createElement("span", { className: hits.has(i) ? "hit" : "", title: `${aa}${i + 1}`, key: i }, aa)))));
		}
		function Table({ a }) {
		  const { header, rows } = a.data, [filter, setFilter] = (0, import_react.useState)(""), [sort, setSort] = (0, import_react.useState)(null), [page, setPage] = (0, import_react.useState)(0), size = 100;
		  const data = (0, import_react.useMemo)(() => {
		    let x = rows;
		    if (filter) x = x.filter((r) => r.some((c) => String(c).toLowerCase().includes(filter.toLowerCase())));
		    if (sort !== null) x = [...x].sort((a2, b) => String(a2[sort] ?? "").localeCompare(String(b[sort] ?? ""), void 0, { numeric: true }));
		    return x;
		  }, [rows, filter, sort]);
		  const pages = Math.max(1, Math.ceil(data.length / size)), view = data.slice(page * size, page * size + size);
		  return /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { className: "av-bar" }, /* @__PURE__ */ import_react.default.createElement("input", { value: filter, onChange: (e) => {
		    setFilter(e.target.value);
		    setPage(0);
		  }, placeholder: "\u7B5B\u9009\u6240\u6709\u5217\u2026" }), /* @__PURE__ */ import_react.default.createElement("span", null, data.length, " rows"), /* @__PURE__ */ import_react.default.createElement("button", { disabled: !page, onClick: () => setPage((p) => p - 1) }, "\u2039"), /* @__PURE__ */ import_react.default.createElement("span", null, page + 1, "/", pages), /* @__PURE__ */ import_react.default.createElement("button", { disabled: page + 1 >= pages, onClick: () => setPage((p) => p + 1) }, "\u203A")), /* @__PURE__ */ import_react.default.createElement("div", { className: "av-tablewrap" }, /* @__PURE__ */ import_react.default.createElement("table", null, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", null, header.map((h, i) => /* @__PURE__ */ import_react.default.createElement("th", { onClick: () => setSort(i), key: i }, h, sort === i ? " \u2191" : "")))), /* @__PURE__ */ import_react.default.createElement("tbody", null, view.map((r, i) => /* @__PURE__ */ import_react.default.createElement("tr", { key: i }, header.map((_, j) => /* @__PURE__ */ import_react.default.createElement("td", { key: j }, r[j]))))))));
		}
		function Word({ a }) {
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "av-word-page" }, (a.data?.blocks || []).map((b, i) => b.type === "table" ? /* @__PURE__ */ import_react.default.createElement("table", { key: i }, /* @__PURE__ */ import_react.default.createElement("tbody", null, b.rows.map((r, j) => /* @__PURE__ */ import_react.default.createElement("tr", { key: j }, r.map((c, k) => /* @__PURE__ */ import_react.default.createElement("td", { key: k }, c)))))) : import_react.default.createElement(/^Heading1$/i.test(b.style) ? "h1" : /^Heading2$/i.test(b.style) ? "h2" : "p", { key: i }, b.text)));
		}
		function Slides({ a }) {
		  const [pick, setPick] = (0, import_react.useState)(0), slides = a.data?.slides || [], slide = slides[pick] || { blocks: [] };
		  const maxX = Math.max(1, ...slide.blocks.map((b) => b.x + b.w)), maxY = Math.max(1, ...slide.blocks.map((b) => b.y + b.h));
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "av-slides" }, /* @__PURE__ */ import_react.default.createElement("aside", null, slides.map((s, i) => /* @__PURE__ */ import_react.default.createElement("button", { className: i === pick ? "on" : "", onClick: () => setPick(i), key: i }, /* @__PURE__ */ import_react.default.createElement("span", null, i + 1), /* @__PURE__ */ import_react.default.createElement("small", null, s.text.slice(0, 80) || `Slide ${i + 1}`)))), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("div", { className: "av-slidebar" }, /* @__PURE__ */ import_react.default.createElement("button", { disabled: !pick, onClick: () => setPick((x) => x - 1) }, "\u2039"), /* @__PURE__ */ import_react.default.createElement("b", null, "Slide ", pick + 1, " / ", slides.length), /* @__PURE__ */ import_react.default.createElement("button", { disabled: pick + 1 >= slides.length, onClick: () => setPick((x) => x + 1) }, "\u203A")), /* @__PURE__ */ import_react.default.createElement("div", { className: "av-slide-canvas" }, slide.blocks.map((b) => /* @__PURE__ */ import_react.default.createElement("div", { className: "av-slide-block", style: { left: `${100 * b.x / maxX}%`, top: `${100 * b.y / maxY}%`, width: `${Math.max(12, 100 * b.w / maxX)}%`, minHeight: `${Math.max(8, 100 * b.h / maxY)}%` }, key: b.id }, b.text)))));
		}
		function Preview({ a }) {
		  if (a.type === "fasta") return /* @__PURE__ */ import_react.default.createElement(Fasta, { a });
		  if (a.type === "csv" || a.type === "tsv") return /* @__PURE__ */ import_react.default.createElement(Table, { a });
		  if (a.type === "docx") return /* @__PURE__ */ import_react.default.createElement(Word, { a });
		  if (a.type === "pptx") return /* @__PURE__ */ import_react.default.createElement(Slides, { a });
		  if (a.type === "pdf") return /* @__PURE__ */ import_react.default.createElement("div", { className: "av-notice" }, "PDF \u539F\u751F\u9884\u89C8\u5C06\u5728\u72EC\u7ACB\u9002\u914D\u5668\u4E2D\u63D0\u4F9B\u3002");
		  return /* @__PURE__ */ import_react.default.createElement("pre", null, a.data?.text);
		}
		function Drawer() {
		  const [, tick] = (0, import_react.useState)(0);
		  (0, import_react.useEffect)(() => {
		    const f = () => tick((x) => x + 1);
		    store.subs.add(f);
		    return () => store.subs.delete(f);
		  }, []);
		  const a = store.active;
		  if (!a) return null;
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "av-overlay", onClick: (e) => e.target === e.currentTarget && store.close() }, /* @__PURE__ */ import_react.default.createElement("aside", { className: "av-drawer" }, /* @__PURE__ */ import_react.default.createElement("header", null, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("b", null, a.name), /* @__PURE__ */ import_react.default.createElement("small", null, a.summary)), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => store.close() }, "\u2715")), /* @__PURE__ */ import_react.default.createElement("main", null, /* @__PURE__ */ import_react.default.createElement(Preview, { a }))));
		}
		function Grid({ block }) {
		  const data = (0, import_react.useMemo)(() => {
		    if (!block || !("content" in block) || !Array.isArray(block.content)) return null;
		    for (const part of block.content) {
		      if (part?.type !== "text") continue;
		      try {
		        const value = JSON.parse(part.text);
		        if (value?.kind === "dsh-artifact-cards" && Array.isArray(value.entries)) return value.entries;
		      } catch {
		      }
		    }
		    return null;
		  }, [block]);
		  if (!data) return /* @__PURE__ */ import_react.default.createElement("small", null, "\u51C6\u5907\u6587\u4EF6\u9884\u89C8\u2026");
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "av-grid" }, data.map((a) => /* @__PURE__ */ import_react.default.createElement("article", { className: "av-card " + a.type, onClick: () => store.set(a), key: a.id }, /* @__PURE__ */ import_react.default.createElement("div", { className: "av-icon" }, icon[a.type] || "FILE"), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("b", null, a.name), /* @__PURE__ */ import_react.default.createElement("small", null, a.summary), /* @__PURE__ */ import_react.default.createElement("em", null, a.type.toUpperCase(), " \xB7 ", (a.size / 1024).toFixed(1), " KB")))));
		}
		var inject = ["slots"];
		function apply(ctx) {
		  ctx.effect(() => ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({ name: "tool.call.toolview", key: "artifact_cards" }, Grid)));
		  ctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "artifact-viewer", order: 91 }, Drawer)));
		  ctx.effect(() => {
		    const s = document.createElement("style");
		    s.textContent = `.av-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.av-card{display:flex;gap:12px;align-items:center;padding:13px;border:1px solid #ffffff22;border-radius:12px;background:var(--dsw-alias-bg-layer-1,#19191f);cursor:pointer}.av-card:hover{border-color:#4f8cff;transform:translateY(-1px)}.av-icon{width:48px;height:48px;border-radius:10px;display:grid;place-items:center;background:#4f8cff20;color:#8bb1ff;font-weight:800}.av-card b,.av-card small,.av-card em{display:block}.av-card small{color:#aaa;margin:3px 0}.av-card em{font-size:10px;color:#777}.av-overlay{position:fixed;inset:0;z-index:510;background:#0005;pointer-events:auto}.av-drawer{position:absolute;right:0;top:0;bottom:0;width:min(980px,60vw);min-width:600px;background:var(--dsw-alias-bg-base,#131318);border-left:1px solid #ffffff22;box-shadow:-12px 0 40px #0008;display:flex;flex-direction:column}.av-drawer header{display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #ffffff20}.av-drawer header small{display:block;color:#999}.av-drawer header button{border:0;background:#ffffff12;color:#ddd;border-radius:6px;width:32px;height:32px}.av-drawer main{flex:1;overflow:auto;padding:14px}.av-fasta{display:grid;grid-template-columns:220px 1fr;gap:14px}.av-fasta aside{display:flex;flex-direction:column;gap:4px}.av-fasta aside button{text-align:left;padding:8px;border:1px solid #ffffff14;background:transparent;color:inherit}.av-fasta aside button.on{border-color:#4f8cff;background:#4f8cff18}.av-fasta aside small{display:block;color:#999}.av-bar{display:flex;align-items:center;gap:8px;margin-bottom:10px}.av-bar input{flex:1;padding:7px 9px;background:#ffffff0d;border:1px solid #ffffff22;color:inherit;border-radius:6px}.av-desc{color:#aaa}.av-seq{font:13px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}.av-seq span{padding:1px}.av-seq span:hover{background:#4f8cff55}.av-seq span.hit{background:#ff3b3b;color:white}.av-tablewrap{overflow:auto;max-height:calc(100vh - 150px)}.av-table{width:100%}.av-tablewrap table{border-collapse:collapse;font-size:12px}.av-tablewrap th{position:sticky;top:0;background:#24242b;cursor:pointer}.av-tablewrap th,.av-tablewrap td{padding:6px 9px;border:1px solid #ffffff18;white-space:nowrap}.av-word-page{box-sizing:border-box;max-width:760px;min-height:900px;margin:0 auto;padding:64px 72px;background:#fff;color:#1f2530;box-shadow:0 3px 24px #0006;font:15px/1.65 Georgia,serif}.av-word-page h1{font:700 28px/1.3 Arial,sans-serif}.av-word-page h2{font:700 21px/1.3 Arial,sans-serif;margin-top:26px}.av-word-page table{width:100%;border-collapse:collapse;margin:18px 0}.av-word-page td{border:1px solid #aeb8c7;padding:8px}.av-slides{display:grid;grid-template-columns:190px 1fr;gap:14px}.av-slides aside{display:flex;flex-direction:column;gap:7px}.av-slides aside button{display:grid;grid-template-columns:24px 1fr;gap:6px;text-align:left;padding:8px;border:1px solid #ffffff20;background:#ffffff08;color:inherit;border-radius:7px}.av-slides aside button.on{border-color:#4f8cff;background:#4f8cff1f}.av-slides aside small{max-height:45px;overflow:hidden}.av-slidebar{display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:10px}.av-slide-canvas{position:relative;aspect-ratio:16/9;background:linear-gradient(145deg,#172036,#2b3d69);color:white;box-shadow:0 4px 24px #0008;overflow:hidden}.av-slide-block{position:absolute;box-sizing:border-box;padding:8px;white-space:pre-wrap;font:600 clamp(12px,1.5vw,28px)/1.3 Arial,sans-serif}.av-notice{padding:30px;border:1px dashed #ffffff30}.av-drawer pre{white-space:pre-wrap}@media(max-width:900px){.av-drawer{width:85vw;min-width:0}.av-fasta{grid-template-columns:1fr}}`;
		    document.head.appendChild(s);
		    return () => s.remove();
		  });
		}

		return module.exports;
	}
});
