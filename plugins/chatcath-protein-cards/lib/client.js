window.__ModuleLoader__.load({
	id: "chatcath-protein-cards",
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
		var molstarPromise;
		var store = { active: null, listeners: /* @__PURE__ */ new Set(), set(v) {
		  this.active = v;
		  this.listeners.forEach((f) => f());
		}, close() {
		  this.active = null;
		  this.listeners.forEach((f) => f());
		} };
		var api = async (url) => {
		  const r = await fetch(url);
		  if (!r.ok) throw new Error(`HTTP ${r.status}`);
		  return r.json();
		};
		function loadMolstar() {
		  if (molstarPromise) return molstarPromise;
		  molstarPromise = new Promise((ok, no) => {
		    if (window.molstar) return ok(window.molstar);
		    if (!document.querySelector("[data-protein-molstar-css]")) {
		      const l = document.createElement("link");
		      l.rel = "stylesheet";
		      l.href = "https://cdn.jsdelivr.net/npm/molstar@5.11.0/build/viewer/molstar.css";
		      l.dataset.proteinMolstarCss = "1";
		      document.head.appendChild(l);
		    }
		    const existing = document.querySelector("[data-protein-molstar-js]");
		    if (existing) {
		      existing.addEventListener("load", () => ok(window.molstar));
		      return;
		    }
		    const s = document.createElement("script");
		    s.src = "https://cdn.jsdelivr.net/npm/molstar@5.11.0/build/viewer/molstar.js";
		    s.dataset.proteinMolstarJs = "1";
		    s.onload = () => ok(window.molstar);
		    s.onerror = () => no(new Error("Mol* CDN load failed"));
		    document.head.appendChild(s);
		  });
		  return molstarPromise;
		}
		var call = (name, args) => ({ head: { name }, args });
		var prop = (n) => call("structure-query.atom-property.macromolecular." + n, {});
		var eq = (a, b) => call("core.rel.eq", [a, b]);
		var group = (x) => call("structure-query.generator.atom-groups", x);
		var merge = (x) => x.length === 1 ? x[0] : call("structure-query.combinator.merge", x);
		var chainExpr = (ids) => merge(ids.map((id) => group({ "chain-test": eq(prop("auth_asym_id"), id) })));
		var residueExpr = (rs) => merge(rs.map((r) => group({ "chain-test": eq(prop("auth_asym_id"), r.chain), "residue-test": eq(prop("auth_seq_id"), r.resSeq) })));
		async function loadStyled(viewer, d, text) {
		  const p = viewer.plugin, r = d.style, raw = await p.builders.data.rawData({ data: text, label: d.name }), traj = await p.builders.structure.parseTrajectory(raw, "pdb"), model = await p.builders.structure.createModel(traj, { modelIndex: 0 }), root = await p.builders.structure.createStructure(model, { name: "model", params: {} });
		  async function add(expr, key, type, color) {
		    const c = await p.builders.structure.tryCreateComponentFromExpression(root, expr, key, { label: key });
		    if (c) await p.builders.structure.representation.addRepresentation(c, { type, color: color === "chain" ? "chain-id" : "uniform", colorParams: color === "chain" ? {} : { value: color }, typeParams: { alpha: 0.6 } });
		  }
		  if (r.antigenChains.length) await add(chainExpr(r.antigenChains), "Antigen", r.antigenRepresentation === "surface" ? "molecular-surface" : r.antigenRepresentation, 10206165);
		  if (r.antibodyChains.length) await add(chainExpr(r.antibodyChains), "Antibody", r.antibodyRepresentation, "chain");
		  if (r.epitopeResidues.length) {
		    await add(residueExpr(r.epitopeResidues), "Selected residues", "ball-and-stick", parseInt(r.epitopeColor.slice(1), 16));
		    viewer.structureInteractivity({ elements: { items: r.epitopeResidues.map((x) => ({ auth_asym_id: x.chain, auth_seq_id: x.resSeq })) }, action: ["select", "focus"] });
		  }
		}
		function Thumbnail({ d }) {
		  const ref = (0, import_react.useRef)();
		  (0, import_react.useEffect)(() => {
		    const c = ref.current, pts = [];
		    d.chains.forEach((x) => x.residues.forEach((y) => pts.push(y)));
		    if (!c || !pts.length) return;
		    const w = c.width = c.clientWidth || 220, h = c.height = 120, g = c.getContext("2d");
		    let X = 0, Y = 0;
		    pts.forEach((q) => {
		      X += q.x;
		      Y += q.y;
		    });
		    X /= pts.length;
		    Y /= pts.length;
		    let radius = 1;
		    pts.forEach((q) => radius = Math.max(radius, Math.hypot(q.x - X, q.y - Y)));
		    const k = Math.min(w, h) * 0.4 / radius;
		    g.clearRect(0, 0, w, h);
		    let n = 0;
		    d.chains.forEach((ch) => {
		      let last;
		      ch.residues.forEach((q) => {
		        const now = { x: w / 2 + (q.x - X) * k, y: h / 2 - (q.y - Y) * k };
		        if (last) {
		          g.strokeStyle = `hsl(${215 - 215 * n / pts.length} 80% 55%)`;
		          g.lineWidth = 2;
		          g.beginPath();
		          g.moveTo(last.x, last.y);
		          g.lineTo(now.x, now.y);
		          g.stroke();
		        }
		        last = now;
		        n++;
		      });
		    });
		  }, [d]);
		  return /* @__PURE__ */ import_react.default.createElement("canvas", { ref, className: "pc-thumb" });
		}
		function Molstar({ d }) {
		  const ref = (0, import_react.useRef)(), viewer = (0, import_react.useRef)();
		  const [msg, setMsg] = (0, import_react.useState)("\u52A0\u8F7D Mol*\u2026");
		  (0, import_react.useEffect)(() => {
		    let dead = false;
		    loadMolstar().then(async (m) => {
		      const v = await m.Viewer.create(ref.current, { layoutIsExpanded: false, layoutShowControls: true, layoutShowSequence: true, layoutShowLeftPanel: false, layoutShowLog: false, viewportShowExpand: false, viewportShowSelectionMode: true });
		      viewer.current = v;
		      const z = await api("/api/protein-cards/text/" + encodeURIComponent(d.id));
		      if (d.style.antigenChains.length) await loadStyled(v, d, z.text);
		      else await v.loadStructureFromData(z.text, "pdb");
		      if (!dead) setMsg("\u70B9\u51FB\u7ED3\u6784\u6216\u5E8F\u5217\u6B8B\u57FA\u53EF\u53CC\u5411\u8054\u52A8");
		    }).catch((e) => !dead && setMsg("Mol* \u9519\u8BEF\uFF1A" + e.message));
		    return () => {
		      dead = true;
		      if (viewer.current) try {
		        viewer.current.dispose();
		      } catch {
		      }
		    };
		  }, [d.id]);
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "pc-ms-wrap" }, /* @__PURE__ */ import_react.default.createElement("div", { ref, className: "pc-ms" }), /* @__PURE__ */ import_react.default.createElement("small", null, msg));
		}
		function Drawer() {
		  const [, tick] = (0, import_react.useState)(0);
		  (0, import_react.useEffect)(() => {
		    const f = () => tick((x) => x + 1);
		    store.listeners.add(f);
		    return () => store.listeners.delete(f);
		  }, []);
		  const d = store.active;
		  if (!d) return null;
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "pc-overlay", onClick: (e) => e.target === e.currentTarget && store.close() }, /* @__PURE__ */ import_react.default.createElement("aside", { className: "pc-drawer" }, /* @__PURE__ */ import_react.default.createElement("header", null, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("b", null, d.name), /* @__PURE__ */ import_react.default.createElement("small", null, d.title)), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => store.close() }, "\u2715")), /* @__PURE__ */ import_react.default.createElement("main", null, /* @__PURE__ */ import_react.default.createElement(Molstar, { d }), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("h3", null, "Description"), String(d.description || d.title || "\u6682\u65E0\u63CF\u8FF0").split("\n").map((x, i) => /* @__PURE__ */ import_react.default.createElement("p", { key: i }, x))))));
		}
		function Grid(props) {
		  const [data, setData] = (0, import_react.useState)(null);
		  (0, import_react.useEffect)(() => {
		    let live = true, n = 0;
		    const go = () => api("/api/protein-cards/call/" + encodeURIComponent(props.callId)).then((r) => {
		      if (!live) return;
		      r.entries.length ? setData(r.entries) : n++ < 40 && setTimeout(go, 300);
		    }).catch(() => n++ < 40 && setTimeout(go, 300));
		    go();
		    return () => {
		      live = false;
		    };
		  }, [props.callId]);
		  if (!data) return /* @__PURE__ */ import_react.default.createElement("small", null, "\u89E3\u6790 PDB\u2026");
		  return /* @__PURE__ */ import_react.default.createElement("div", { className: "pc-grid" }, data.map((d) => /* @__PURE__ */ import_react.default.createElement("article", { className: "pc-card", key: d.id, onClick: () => store.set(d) }, /* @__PURE__ */ import_react.default.createElement(Thumbnail, { d }), /* @__PURE__ */ import_react.default.createElement("div", { className: "pc-info" }, /* @__PURE__ */ import_react.default.createElement("b", null, d.name), /* @__PURE__ */ import_react.default.createElement("small", null, d.title), /* @__PURE__ */ import_react.default.createElement("div", { className: "pc-chips" }, /* @__PURE__ */ import_react.default.createElement("span", null, d.total, " aa"), /* @__PURE__ */ import_react.default.createElement("span", null, d.chains.length, " chains"), /* @__PURE__ */ import_react.default.createElement("span", { className: "epi" }, d.style.epitopeResidues.length, " selected"))))));
		}
		var inject = ["slots"];
		function apply(ctx) {
		  ctx.effect(() => ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({ name: "tool.call.toolview", key: "protein_cards" }, Grid)));
		  ctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "protein-cards-inspector", order: 90 }, Drawer)));
		  ctx.effect(() => {
		    const tag = document.createElement("style");
		    tag.textContent = `.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}.pc-card{overflow:hidden;border:1px solid #ffffff22;border-radius:12px;background:var(--dsw-alias-bg-layer-1,#19191f);cursor:pointer}.pc-card:hover{border-color:#4f8cff}.pc-thumb{display:block;width:100%;height:120px;background:radial-gradient(circle,#ffffff10,#0004)}.pc-info{padding:9px}.pc-info small{display:block;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:4px 0 8px}.pc-chips{display:flex;gap:5px}.pc-chips span{font-size:10px;border:1px solid #ffffff20;border-radius:20px;padding:2px 6px}.pc-chips .epi{color:#ff6666}.pc-overlay{position:fixed;inset:0;z-index:500;background:#0005}.pc-drawer{position:absolute;right:0;top:0;bottom:0;width:min(900px,56vw);min-width:560px;background:var(--dsw-alias-bg-base,#131318);border-left:1px solid #ffffff22;box-shadow:-12px 0 40px #0008;display:flex;flex-direction:column}.pc-drawer header{z-index:1002;display:flex;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid #ffffff20}.pc-drawer header small{display:block;color:#999}.pc-drawer header button{border:0;background:#ffffff12;color:#ddd;border-radius:6px;width:32px;height:32px;cursor:pointer}.pc-drawer main{padding:12px 16px 24px;overflow:auto}.pc-ms-wrap{border:1px solid #ffffff22;border-radius:10px;overflow:hidden}.pc-ms{position:relative;height:620px}.pc-ms .msp-plugin{position:absolute;inset:0}.pc-ms .msp-layout-right{display:none!important}.pc-ms .msp-layout-main,.pc-ms .msp-layout-top,.pc-ms .msp-layout-bottom{right:0!important}.pc-ms .msp-layout-bottom{left:0!important;width:auto!important}.pc-ms-wrap>small{display:block;padding:6px;color:#aaa}@media(max-width:900px){.pc-drawer{width:80vw;min-width:0}}`;
		    document.head.appendChild(tag);
		    return () => tag.remove();
		  });
		}

		return module.exports;
	}
});
