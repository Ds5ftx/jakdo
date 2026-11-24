'use strict';
const $ = (q, r = document) => r.querySelector(q);
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
let toastTimer = null;
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, ms); }

/* ================= 실행 취소 ================= */
let undoStack = [], redoStack = [];
function snap() { undoStack.push(serialize()); if (undoStack.length > 300) undoStack.shift(); redoStack.length = 0; scheduleSave(); }
function restore(s) { const keepSel = sel.slice(); loadDocJSON(s); sel = keepSel.filter(id => byId.has(id)); for (const id of [...anims.keys()]) if (!byId.has(id)) anims.delete(id); for (const id of [...traces.keys()]) if (!byId.has(id)) traces.delete(id); refresh(); }
function undo() { if (!undoStack.length) return toast('되돌릴 작업이 없습니다'); redoStack.push(serialize()); restore(undoStack.pop()); scheduleSave(); }
function redo() { if (!redoStack.length) return toast('다시 실행할 작업이 없습니다'); undoStack.push(serialize()); restore(redoStack.pop()); scheduleSave(); }
let saveTimer = null;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, serializeBook()); } catch (e) { } }, 600); }
function refresh() { dirty = true; requestDraw(); updateStatus(); }

/* ================= 생성 API ================= */
const P = (x, y, label) => { const o = add({ t: 'point', k: 'free', d: { x, y } }); giveLabel(o, doc.prefs.autoLabel); if (label) o.label = label; return o.id; };
function mkFree(w) { return P(w.x, w.y); }
function mkOn(path, t) { const o = add({ t: 'point', k: 'on', p: [path], d: { t } }); giveLabel(o, doc.prefs.autoLabel); return o.id; }
function mkInt(a, b, i) { const o = add({ t: 'point', k: 'int', p: [a, b], d: { i } }); giveLabel(o, doc.prefs.autoLabel); return o.id; }
function mkMid(s) { const o = add({ t: 'point', k: 'mid', p: [s] }); giveLabel(o, doc.prefs.autoLabel); return o.id; }
function mkStraight(type, a, b) { return giveLabel(add({ t: type, k: '2p', p: [a, b] })).id; }
function mkPar(P0, L) { return giveLabel(add({ t: 'line', k: 'par', p: [P0, L] })).id; }
function mkPerp(P0, L) { return giveLabel(add({ t: 'line', k: 'perp', p: [P0, L] })).id; }
function mkBis(A, V, B) { return giveLabel(add({ t: 'ray', k: 'bis', p: [A, V, B] })).id; }
function mkCircle(c, p) { return giveLabel(add({ t: 'circle', k: 'cp', p: [c, p] })).id; }
function mkCircleR(c, src) { return giveLabel(add({ t: 'circle', k: 'cr', p: [c, src] })).id; }
function mkArcOC(c, A, B) { return giveLabel(add({ t: 'arc', k: 'oc', p: [c, A, B] })).id; }
function mkArcCPP(c, A, B) { return giveLabel(add({ t: 'arc', k: 'cpp', p: [c, A, B] })).id; }
function mkArc3(A, B, C) { return giveLabel(add({ t: 'arc', k: '3p', p: [A, B, C] })).id; }
function mkPoly(ids, color) { const o = giveLabel(add({ t: 'polygon', k: 'pts', p: ids.slice() })); if (color) o.color = color; return o.id; }
function mkCInt(c) { return giveLabel(add({ t: 'cinterior', k: 'c', p: [c] })).id; }
function mkSector(a) { return giveLabel(add({ t: 'sector', k: 'a', p: [a] })).id; }
function mkArcSeg(a) { return giveLabel(add({ t: 'arcseg', k: 'a', p: [a] })).id; }
function mkLocus(d, t) { return add({ t: 'locus', k: 'l', p: [d, t], d: {} }).id; }
function nextScreenPos() {
  let y = 12; for (const o of doc.objs) if ((isScreenObj(o)) && o.d.sx < 260 && !o.hidden) { const h = o._bb ? o._bb.h : 24; y = Math.max(y, o.d.sy + h + 6); }
  if (y > H - 40) y = 12 + (doc.objs.length % 8) * 8; return { sx: 14, sy: y };
}
function mkValue(k, p, extra = {}) { const pos = nextScreenPos(); const o = add({ t: 'value', k, p: p.slice(), d: { ...pos, ...extra } }); giveLabel(o, false); o._bb = { x: pos.sx, y: pos.sy, w: 120, h: 24 }; return o.id; }
function mkParam(v, opts = {}) { const id = mkValue('param', [], { v, min: opts.min ?? 0, max: opts.max ?? 10, step: opts.step ?? 0.1, unit: opts.unit || 'none' }); if (opts.label) obj(id).label = opts.label; return id; }
function mkCalc(src) { const r = userExprToStored(src, false); return mkValue('calc', r.refs, { expr: r.stored }); }
function ensureCoord() {
  if (doc.coordId && obj(doc.coordId)) return doc.coordId;
  const c = toW(W / 2, H / 2); const ox = Math.round(c.x), oy = Math.round(c.y);
  const O = add({ t: 'point', k: 'free', d: { x: ox, y: oy } }); giveLabel(O, false); O.color = 'ink'; O.ps = 2; O.isOrigin = true;
  const U = add({ t: 'point', k: 'unit', p: [O.id], d: { u: 1 } }); giveLabel(U, false); U.color = 'ink'; U.ps = 1;
  const co = add({ t: 'coord', k: 'c', p: [O.id, U.id], d: { grid: true, form: 'square' } }); doc.coordId = co.id; return co.id;
}
function mkPlot(x, y, opt = {}) { const c = ensureCoord(); const d = { polar: !!opt.polar }; const p = [c]; if (typeof x === 'number') d.x = x; else { d.xV = x.v; p.push(x.v); } if (typeof y === 'number') d.y = y; else { d.yV = y.v; p.push(y.v); } const o = add({ t: 'point', k: 'plot', p, d }); giveLabel(o, doc.prefs.autoLabel); return o.id; }
function mkFunc(src, opts = {}) {
  const r = userExprToStored(src, true);
  const id = mkValue('func', r.refs, { expr: r.stored, form: opts.form || 'yx', notation: opts.notation || 'f' }); return id;
}
function mkFplotOf(fn, opts = {}) {
  const c = opts.coord || ensureCoord();
  const f = add({ t: 'fplot', k: 'fn', p: [c, fn], d: { fn, xmin: opts.xmin ?? null, xmax: opts.xmax ?? null } }); f.label = obj(fn).label;
  if (opts.color) f.color = opts.color; return f.id;
}
function mkFplot(src, opts = {}) { const c = ensureCoord(); const fn = mkFunc(src, opts); return mkFplotOf(fn, { ...opts, coord: c }); }
function mkParamPlot(fx, fy, opts = {}) { const c = opts.coord || ensureCoord(); const o = add({ t: 'fplot', k: 'param', p: [c, fx, fy], d: { tmin: opts.tmin ?? 0, tmax: opts.tmax ?? 1 } }); o.label = obj(fx).label + ',' + obj(fy).label; return o.id; }
function mkDerivative(fo) {
  const s = symbolicDerivative(fo); const lab = fo.label.replace(/′*$/, m => m + '′');
  const id = s != null ? mkValue('deriv', [...new Set([fo.id, ...[...(s.matchAll(/#(\d+)/g))].map(m => +m[1])])], { expr: s, form: fo.d.form || 'yx', base: fo.id }) : mkValue('deriv', [fo.id], { numeric: true, form: fo.d.form || 'yx' });
  const o = obj(id); o.label = doc.objs.some(x => x !== o && x.label === lab) ? o.label : lab; return id;
}
function mkXf(src, xf) {
  const s = obj(src); const refs = xfRefs(xf);
  const o = add({ t: s.t, k: 'xf', p: [src, ...refs], d: { xf: JSON.parse(JSON.stringify(xf)) }, color: s.color, w: s.w, dash: s.dash, ps: s.ps });
  if (s.label) { o.label = s.label.replace(/′*$/, m => m + '′'); o.showLabel = s.t === 'point' ? s.showLabel : false; }
  if (s.label && /′{3,}$/.test(o.label)) giveLabel(o, false);
  return o.id;
}
function moveToEnd(id) { // 참조 순서 보장
  const set = descendants([id]); const keep = doc.objs.filter(o => !set.has(o.id)), mv = doc.objs.filter(o => set.has(o.id));
  doc.objs = keep.concat(mv); reindex();
}

/* ================= 선택 분류 ================= */
function S() {
  const os = sel.map(obj).filter(Boolean), f = fn => os.filter(fn);
  return { os, n: os.length, pts: f(isPoint), str: f(isStraight), segs: f(o => o.t === 'segment'), circ: f(o => o.t === 'circle'), arcs: f(o => o.t === 'arc'),
    paths: f(isPath), ints: f(isInterior), vals: f(isValue), polys: f(o => o.t === 'polygon') };
}
function setSel(ids) { sel = [...new Set(ids)].filter(id => byId.has(id)); refresh(); }
function selName(o) { return (TYPE_KO[o.t] || o.t) + (o.label && o.t !== 'value' ? ' ' + disp(o.label) : ''); }
function updateStatus() {
  const s = S(); const tb = $('#status-sel');
  if (!s.n) tb.textContent = '선택 없음';
  else { const cnt = {}; for (const o of s.os) { const k = o.t === 'value' ? (o.k === 'param' ? '매개변수' : '값') : TYPE_KO[o.t]; cnt[k] = (cnt[k] || 0) + 1; } tb.textContent = '선택: ' + Object.entries(cnt).map(([k, v]) => k + ' ' + v + '개').join(', '); }
}

/* ================= 도구 ================= */
const TOOLS = [
  { id: 'arrow', name: '선택 화살표', key: 'Esc', vars: [['move', '이동 화살표'], ['rotate', '회전 화살표'], ['dilate', '확대 화살표']] },
  { id: 'point', name: '점 도구' },
  { id: 'compass', name: '컴퍼스 도구' },
  { id: 'straight', name: '직선자 도구', vars: [['segment', '선분'], ['ray', '반직선'], ['line', '직선']] },
  { id: 'polygon', name: '다각형 도구', vars: [['fill', '다각형 내부'], ['both', '내부와 변'], ['edges', '변만']] },
  { id: 'text', name: '텍스트 도구' },
  { id: 'marker', name: '표시 도구' },
  { id: 'info', name: '정보 도구' },
  { id: 'custom', name: '사용자 도구' },
  { id: 'hand', name: '화면 이동' },
];
const toolState = { id: 'arrow', v: { arrow: 'move', straight: 'segment', polygon: 'fill' } };
const HINT = {
  arrow: { move: '객체를 클릭해 선택하고 끌어서 움직입니다. 빈 곳을 끌면 범위 선택, 더블클릭하면 중심점·거울로 표시합니다.', rotate: '표시된 중심점을 기준으로 선택한 객체를 돌립니다.', dilate: '표시된 중심점을 기준으로 선택한 객체를 확대·축소합니다.' },
  point: '빈 곳, 경로 위, 교차하는 곳을 클릭해 점을 만듭니다.',
  compass: '중심을 누른 채 끌어 원 위의 점에서 놓습니다. 클릭-클릭도 됩니다.',
  straight: '한 점에서 다른 점까지 끌어 그립니다. 클릭-클릭도 됩니다.',
  polygon: '꼭짓점을 차례로 클릭하고 첫 점을 다시 클릭해 닫습니다.',
  text: '객체를 클릭하면 레이블이 보이거나 숨겨집니다. 레이블을 클릭하면 이름을 바꾸고, 빈 곳을 클릭하면 글상자를 만듭니다.',
  marker: '선분 가운데를 클릭하면 눈금, 두 선이 만나는 각 안쪽을 클릭하면 각 표시가 생깁니다.',
  info: '객체를 클릭하면 정의와 부모·자식 관계를 보여 줍니다.',
  custom: '사용자 도구 단추에서 도구를 고르고 주어진 것을 차례로 클릭합니다.',
  hand: '끌어서 화면을 옮깁니다. 휠로 확대·축소합니다.',
};
function setTool(id, variant) {
  cancelPending(); toolState.id = id; if (variant) toolState.v[id] = variant;
  document.querySelectorAll('.tool').forEach(b => { b.setAttribute('aria-pressed', b.dataset.tool === id); });
  const t = TOOLS.find(t => t.id === id); const vb = $(`.tool[data-tool="${id}"]`);
  if (vb) vb.querySelector('.tico').innerHTML = svg(ICON[t.vars ? id + ':' + toolState.v[id] : id]);
  const h = HINT[id]; $('#status-hint').textContent = doc && doc.prefs.hints === false ? '' : typeof h === 'string' ? h : h[toolState.v[id]];
  cv.style.cursor = id === 'hand' ? 'grab' : id === 'arrow' ? 'default' : id === 'text' ? 'text' : 'crosshair';
  closeFlyout(); requestDraw();
  if (id === 'custom') { ctoolMatched = []; ctoolHint(); } else if (typeof ctoolMatched !== 'undefined') ctoolMatched = [];
}
let pending = null, polyPts = [], cursorS = null;
function cancelPending() { pending = null; polyPts = []; overlay = null; hoverCand = null; requestDraw(); }

// 점 후보 찾기
function snapW(w) { if (doc.prefs.snap && doc.coordId && G[doc.coordId]) { const c = G[doc.coordId], q = wToC(c, w); return cToW(c, Math.round(q.x), Math.round(q.y)); } return w; }
function candidateAt(sx, sy, exclude = []) {
  if (dirty) recompute();
  const tol = touchMode ? 14 : 8;
  let bp = null, bd = tol;
  for (const o of doc.objs) { if (o.t !== 'point' || o.hidden || exclude.includes(o.id)) continue; const g = G[o.id]; if (!okp(g)) continue; const d = vdist(toS(g), { x: sx, y: sy }); if (d < bd) { bd = d; bp = o; } }
  if (bp) return { kind: 'pt', id: bp.id, s: toS(G[bp.id]) };
  const near = nearPaths(sx, sy, tol).slice(0, 6);
  let best = null; bd = tol;
  for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
    const a = near[i].o, b = near[j].o; if (!canIntersect(a) || !canIntersect(b)) continue;
    rawIntersections(a, G[a.id], b, G[b.id]).forEach((r, idx) => { if (r && r.ok) { const s = toS(r.p), d = vdist(s, { x: sx, y: sy }); if (d < bd) { bd = d; best = { kind: 'int', a: a.id, b: b.id, i: idx, s }; } } });
  }
  if (best) return best;
  if (near.length) { const o = near[0].o, g = G[o.id], t = pathProj(o, g, toW(sx, sy)), p = pathAt(o, g, t); if (okp(p)) return { kind: 'on', path: o.id, t, s: toS(p) }; }
  const w = snapW(toW(sx, sy)); return { kind: 'free', w, s: toS(w) };
}
function realize(c) {
  if (c.kind === 'pt') return c.id;
  if (c.kind === 'int') { const ex = doc.objs.find(o => o.t === 'point' && o.k === 'int' && o.d.i === c.i && o.p[0] === c.a && o.p[1] === c.b); if (ex) return ex.id; return mkInt(c.a, c.b, c.i); }
  if (c.kind === 'on') return mkOn(c.path, c.t);
  return mkFree(c.w);
}
function drawCand(c, ctx) {
  if (!c) return; ctx.save();
  ctx.beginPath(); ctx.arc(c.s.x, c.s.y, c.kind === 'int' ? 7 : 5, 0, TAU); ctx.strokeStyle = THEME.hover; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke();
  if (c.kind === 'int') { ctx.beginPath(); ctx.moveTo(c.s.x - 4, c.s.y - 4); ctx.lineTo(c.s.x + 4, c.s.y + 4); ctx.moveTo(c.s.x + 4, c.s.y - 4); ctx.lineTo(c.s.x - 4, c.s.y + 4); ctx.stroke(); }
  ctx.restore();
}

/* ================= 포인터 입력 ================= */
let drag = null, lastClick = { t: 0, id: null }, spaceDown = false;
cv.addEventListener('contextmenu', e => { e.preventDefault(); openContext(e); });
cv.addEventListener('pointerdown', e => {
  touchMode = e.pointerType === 'touch'; closeMenus(); closeContext();
  const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; cursorS = { x: sx, y: sy };
  if (e.button === 2) return;
  cv.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.altKey || spaceDown || toolState.id === 'hand') { drag = { mode: 'pan', sx, sy, ox: view.ox, oy: view.oy }; cv.style.cursor = 'grabbing'; return; }
  const tool = toolState.id;
  if (tool === 'arrow') return arrowDown(sx, sy, e);
  if (tool === 'point') { const c = candidateAt(sx, sy); snap(); const id = realize(c); setSel([id]); hoverCand = null; return; }
  if (tool === 'compass' || tool === 'straight') {
    if (!pending) { const c = candidateAt(sx, sy); snap(); const id = realize(c); pending = { p1: id, sx, sy, moved: false, down: true }; refresh(); return; }
    pending.down = true; pending.second = true; return;
  }
  if (tool === 'polygon') return polygonClick(sx, sy);
  if (tool === 'text') return textClick(sx, sy, e);
  if (tool === 'marker') { drag = { mode: 'draw', sx, sy, pts: [toW(sx, sy)], len: 0 }; return; }
  if (tool === 'custom') return customToolDown(sx, sy);
  if (tool === 'info') return infoClick(sx, sy, e);
});
cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; cursorS = { x: sx, y: sy };
  if (drag) return dragMove(sx, sy, e);
  const tool = toolState.id;
  if (tool === 'arrow' || tool === 'text' || tool === 'info' || tool === 'marker') { const h = hitTest(sx, sy); const nid = h ? h.id : null; if (nid !== hoverId) { hoverId = nid; requestDraw(); balloonAt(sx, sy, nid); } }
  else if (tool === 'point' || tool === 'compass' || tool === 'straight' || tool === 'polygon' || (tool === 'custom' && ctool && nextGiven() && nextGiven().kind === 'point')) {
    hoverId = null; const ex = pending ? [pending.p1] : [];
    hoverCand = candidateAt(sx, sy, ex); if (pending) hoverCand = constrainCand(hoverCand, pending.p1); else if (tool === 'polygon' && polyPts.length) hoverCand = constrainCand(hoverCand, polyPts[polyPts.length - 1]); hoverId = hoverCand.kind === 'on' ? hoverCand.path : hoverCand.kind === 'pt' ? hoverCand.id : null;
    if (pending && pending.down && vdist({ x: sx, y: sy }, { x: pending.sx, y: pending.sy }) > 6) pending.moved = true;
    overlay = ctx2 => toolOverlay(ctx2); requestDraw();
  }
});
cv.addEventListener('pointerup', e => {
  const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
  if (drag) { dragEnd(sx, sy, e); return; }
  const tool = toolState.id;
  if ((tool === 'compass' || tool === 'straight') && pending) {
    pending.down = false;
    if (pending.moved || pending.second) finishTwoPoint(sx, sy);
  }
});
cv.addEventListener('pointerleave', () => { if (!drag) { hoverId = null; hoverCand = null; requestDraw(); } });
cv.addEventListener('wheel', e => {
  e.preventDefault(); const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
  const k = Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)); zoomAt(sx, sy, k);
}, { passive: false });
function zoomAt(sx, sy, k) { const ns = clamp(view.s * k, 3, 3000); k = ns / view.s; view.ox = sx - (sx - view.ox) * k; view.oy = sy - (sy - view.oy) * k; view.s = ns; dirty = true; requestDraw(); scheduleSave(); }

function toolOverlay(c2) {
  const tool = toolState.id, cand = hoverCand;
  if (pending && cursorS) {
    const A = toS(G[pending.p1]); const B = cand ? cand.s : cursorS;
    c2.strokeStyle = THEME.hover; c2.lineWidth = 1.6; c2.setLineDash([5, 4]); c2.beginPath();
    if (tool === 'compass') { const R = vdist(A, B); c2.arc(A.x, A.y, R, 0, TAU); }
    else { const type = toolState.v.straight, d = vsub(B, A), L = vlen(d); if (L > 1) { const u = vmul(d, 1 / L), far = 4000; const s0 = type === 'line' ? vsub(A, vmul(u, far)) : A, s1 = type === 'segment' ? B : vadd(A, vmul(u, far)); c2.moveTo(s0.x, s0.y); c2.lineTo(s1.x, s1.y); } }
    c2.stroke(); c2.setLineDash([]);
  }
  if (tool === 'polygon' && polyPts.length && cursorS) {
    const pts = polyPts.map(id => toS(G[id])); const B = cand ? cand.s : cursorS;
    c2.beginPath(); pts.forEach((p, i) => i ? c2.lineTo(p.x, p.y) : c2.moveTo(p.x, p.y)); c2.lineTo(B.x, B.y);
    if (pts.length >= 2) { c2.lineTo(pts[0].x, pts[0].y); c2.fillStyle = rgba(THEME.hover, 0.12) || 'transparent'; c2.fill(); }
    c2.strokeStyle = THEME.hover; c2.lineWidth = 1.6; c2.setLineDash([5, 4]); c2.stroke(); c2.setLineDash([]);
  }
  drawCand(cand, c2);
}
function finishTwoPoint(sx, sy) {
  const tool = toolState.id; const c = constrainCand(candidateAt(sx, sy, [pending.p1]), pending.p1);
  if (c.kind === 'free' && vdist(c.s, toS(G[pending.p1])) < 4) { pending.second = false; return; }
  const id2 = realize(c); let nid;
  if (tool === 'compass') nid = mkCircle(pending.p1, id2); else nid = mkStraight(toolState.v.straight, pending.p1, id2);
  pending = null; overlay = ctx2 => toolOverlay(ctx2); setSel([nid]);
}
function polygonClick(sx, sy) {
  let c = candidateAt(sx, sy); if (polyPts.length) c = constrainCand(c, polyPts[polyPts.length - 1]);
  if (polyPts.length >= 3 && c.kind === 'pt' && (c.id === polyPts[0] || c.id === polyPts[polyPts.length - 1])) return closePolygon();
  if (c.kind === 'pt' && polyPts.includes(c.id)) return;
  if (!polyPts.length) snap();
  polyPts.push(realize(c)); overlay = ctx2 => toolOverlay(ctx2); refresh();
}
function closePolygon() {
  const v = toolState.v.polygon, ids = polyPts.slice(); const made = [];
  if (v !== 'edges') made.push(mkPoly(ids));
  if (v !== 'fill') for (let i = 0; i < ids.length; i++) made.push(mkStraight('segment', ids[i], ids[(i + 1) % ids.length]));
  polyPts = []; setSel(made.slice(0, 1));
}

/* ---- 화살표 도구 ---- */
let calcInsertHook = null;
function arrowDown(sx, sy, e) {
  const h = hitTest(sx, sy); const now = performance.now();
  { const ph = pictureHandleAt(sx, sy); if (ph) { snap(); drag = { mode: 'picres', id: ph.id, moved: false }; return; } const chd = captionHandleAt(sx, sy); if (chd) { snap(); drag = { mode: 'capres', id: chd.id }; return; } }
  if (!h) { const c = candidateAt(sx, sy); if (c.kind === 'int') { snap(); setSel([realize(c)]); return; } }
  if (!h) { if (!e.shiftKey) setSel([]); drag = { mode: 'marquee', sx, sy, x: sx, y: sy, base: e.shiftKey ? sel.slice() : [] }; return; }
  const o = obj(h.id);
  if (calcInsertHook && (o.t === 'value' || o.t === 'fplot')) { calcInsertHook(o); return; }
  if (iterPick && o.t === 'point') { iterPick(o); return; }
  const dbl = now - lastClick.t < 380 && lastClick.id === h.id; lastClick = { t: now, id: h.id };
  if (dbl) { lastClick.t = 0; return doubleClick(o, h.part); }
  if (h.part === 'label') { snap(); drag = { mode: 'label', id: o.id, sx, sy, lo: { ...(o.lo || defaultLabelOffset(o)) }, moved: false }; return; }
  drag = { mode: 'press', id: o.id, sx, sy, was: sel.includes(o.id), shift: e.shiftKey, moved: false, t0: performance.now() };
}
function moveRoots(ids) {
  const roots = new Map(); const seen = new Set();
  const visit = id => {
    if (seen.has(id)) return; seen.add(id); const o = obj(id); if (!o) return;
    if (o.t === 'point' && (o.k === 'free' || o.k === 'on')) { if (!o.isOrigin || ids.includes(id) || true) roots.set(id, o.k === 'free' ? { x: o.d.x, y: o.d.y } : { ...G[id] }); return; }
    if (o.t === 'point' && (o.k === 'unit' || o.k === 'plot')) return;
    if (o.t === 'coord') { visit(o.p[0]); return; }
    for (const p of o.p) { const po = obj(p); if (po && po.t === 'value') continue; visit(p); }
  };
  ids.forEach(visit);
  return roots;
}
function dragMove(sx, sy, e) {
  const d = drag;
  if (d.mode === 'draw') { const w = toW(sx, sy), l = d.pts[d.pts.length - 1]; d.len += vdist(toS(l), { x: sx, y: sy }); if (vdist(toS(l), { x: sx, y: sy }) > 2) d.pts.push(w); overlay = c2 => { if (d.len < 6) return; c2.strokeStyle = THEME.ink; c2.lineWidth = 2; c2.lineJoin = 'round'; c2.beginPath(); d.pts.forEach((p, i) => { const q = toS(p); i ? c2.lineTo(q.x, q.y) : c2.moveTo(q.x, q.y); }); c2.stroke(); }; requestDraw(); return; }
  if (d.mode === 'picres') { const o = obj(d.id), g = G[o.id], w = toW(sx, sy); o.d.ww = Math.max(0.2, w.x - g.TL.x); dirty = true; requestDraw(); return; }
  if (d.mode === 'capres') { const o = obj(d.id); o.d.wrap = Math.max(40, sx - o._bb.x - 8); requestDraw(); return; }
  if (d.mode === 'pan') { view.ox = d.ox + sx - d.sx; view.oy = d.oy + sy - d.sy; dirty = true; requestDraw(); return; }
  if (d.mode === 'marquee') { d.x = sx; d.y = sy; marqueeSelect(d); return; }
  if (d.mode === 'label') { const o = obj(d.id); o.lo = { x: d.lo.x + sx - d.sx, y: d.lo.y + sy - d.sy }; d.moved = true; requestDraw(); return; }
  if (d.mode === 'press') {
    if (vdist({ x: sx, y: sy }, { x: d.sx, y: d.sy }) < (touchMode ? 6 : 3)) return;
    if (!d.was) { sel = d.shift ? [...sel, d.id] : [d.id]; }
    beginMove(d); d.moved = true;
  }
  if (d.mode === 'move') return moveTo(d, sx, sy);
}
function beginMove(d) {
  snap(); d.mode = 'move';
  const o = obj(d.id); const ids = sel.slice();
  d.screens = ids.map(obj).filter(x => x && isScreenObj(x)).map(x => ({ id: x.id, sx: x.d.sx, sy: x.d.sy }));
  d.frees = ids.map(obj).filter(x => x && (x.t === 'drawing' || (x.t === 'picture' && x.k === 'free'))).map(x => ({ id: x.id, pts: x.t === 'drawing' ? x.d.pts.map(p => ({ ...p })) : null, x: x.d.x, y: x.d.y }));
  const geo = ids.filter(id => !isScreenObj(obj(id)) && !['drawing'].includes(obj(id).t) && !(obj(id).t === 'picture' && obj(id).k === 'free'));
  if (o.t === 'point' && o.k === 'unit') { d.unit = o.id; d.roots = new Map(); return; }
  if (o.t === 'point' && o.k === 'on' && geo.length <= 1) { d.roots = new Map([[o.id, { ...G[o.id] }]]); }
  else d.roots = moveRoots(geo);
  d.w0 = toW(d.sx, d.sy);
  const v = toolState.v.arrow; d.center = (v !== 'move' && doc.marks.center != null) ? G[doc.marks.center] : null;
  if (v !== 'move' && !d.center) toast('먼저 중심점을 표시하세요 (변환 ▸ 중심점 표시, 또는 점을 더블클릭)');
  if (d.center) d.roots.delete(doc.marks.center);
}
function moveTo(d, sx, sy) {
  const w = toW(sx, sy);
  for (const s of d.screens) { const o = obj(s.id); o.d.sx = s.sx + sx - d.sx; o.d.sy = s.sy + sy - d.sy; if (o.d.peg != null && G[o.d.peg]) { const P0 = toS(G[o.d.peg]); o.d.pox = o.d.sx - P0.x; o.d.poy = o.d.sy - P0.y; } }
  for (const f0 of d.frees || []) { const o = obj(f0.id), dl = vsub(w, d.w0); if (f0.pts) o.d.pts = f0.pts.map(p => vadd(p, dl)); else { o.d.x = f0.x + dl.x; o.d.y = f0.y + dl.y; } }
  if (d.unit) { const o = obj(d.unit), O = G[o.p[0]]; o.d.u = Math.max(0.05, o.d.axis === 'y' ? w.y - O.y : w.x - O.x); dirty = true; recompute(); recordTraces(); requestDraw(); return; }
  let f;
  if (d.center) {
    const C = d.center;
    if (toolState.v.arrow === 'rotate') { const th = vang(vsub(w, C)) - vang(vsub(d.w0, C)), cs = Math.cos(th), sn = Math.sin(th); f = p => { const q = vsub(p, C); return { x: C.x + q.x * cs - q.y * sn, y: C.y + q.x * sn + q.y * cs }; }; }
    else { const k = vdist(w, C) / Math.max(1e-6, vdist(d.w0, C)); f = p => vadd(C, vmul(vsub(p, C), k)); }
  } else { const dl = vsub(w, d.w0); f = p => vadd(p, dl); }
  const onPts = [];
  for (const [id, p0] of d.roots) { const o = obj(id); if (o.k === 'free') { const q = d.roots.size === 1 && !d.center ? snapW(f(p0)) : f(p0); o.d.x = q.x; o.d.y = q.y; } else onPts.push([o, f(p0)]); }
  recompute();
  if (onPts.length) { for (const [o, q] of onPts) { const po = obj(o.p[0]), g = G[po.id]; if (g) o.d.t = pathProj(po, g, q); } recompute(); }
  recordTraces(); requestDraw();
}
function dragEnd(sx, sy, e) {
  const d = drag; drag = null;
  if (d.mode === 'draw') { overlay = null; if (d.len < 6) markerClick(d.sx, d.sy); else { snap(); const o = add({ t: 'drawing', k: 'free', d: { pts: d.pts.map(p => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) })) }, color: 'ink' }); setSel([o.id]); } requestDraw(); return; }
  if (d.mode === 'picres' || d.mode === 'capres') { scheduleSave(); return; }
  if (d.mode === 'pan') { cv.style.cursor = toolState.id === 'hand' ? 'grab' : 'default'; scheduleSave(); return; }
  if (d.mode === 'marquee') { requestDraw(); updateStatus(); d.done = true; marqueeBox = null; requestDraw(); return; }
  if (d.mode === 'label') { if (!d.moved) { undoStack.pop(); const o = obj(d.id); if (!sel.includes(o.id)) setSel([...sel, o.id]); } scheduleSave(); return; }
  if (d.mode === 'press') {
    const o = obj(d.id);
    if (o.t === 'button') { runButton(o); return; }
    if (d.was && !d.shift && sel.length === 1 && performance.now() - (d.t0 || 0) < 600) { const list = hitAll(sx, sy); if (list.length > 1) { const i = list.indexOf(d.id); setSel([list[(i + 1) % list.length]]); toast('겹친 객체: ' + selName(obj(sel[0]))); return; } }
    if (d.was && d.shift) setSel(sel.filter(x => x !== d.id)); else if (!d.was) setSel([...sel, d.id]);
    return;
  }
  if (d.mode === 'move') { scheduleSave(); updateStatus(); }
}
let marqueeBox = null;
function marqueeSelect(d) {
  const x0 = Math.min(d.sx, d.x), x1 = Math.max(d.sx, d.x), y0 = Math.min(d.sy, d.y), y1 = Math.max(d.sy, d.y);
  marqueeBox = { x0, x1, y0, y1 };
  const inBox = p => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
  const ids = [];
  for (const o of doc.objs) {
    if (o.hidden) continue; const g = G[o.id]; if (!g) continue; let ok = false;
    if (o.t === 'point') ok = inBox(toS(g));
    else if (o.t === 'segment') ok = inBox(toS(g.a)) && inBox(toS(g.b));
    else if (o.t === 'circle') { const c = toS(g.c), r = g.r * view.s; ok = inBox({ x: c.x - r, y: c.y - r }) && inBox({ x: c.x + r, y: c.y + r }); }
    else if (o.t === 'polygon') ok = g.pts.every(p => inBox(toS(p)));
    else if (o.t === 'arc') ok = inBox(toS(arcEnd(g, 0))) && inBox(toS(arcEnd(g, 1))) && inBox(toS(arcEnd(g, 0.5)));
    else if (isScreenObj(o) && o._bb) ok = inBox(o._bb) && inBox({ x: o._bb.x + o._bb.w, y: o._bb.y + o._bb.h });
    else if (o.t === 'amark') ok = inBox(toS(g.V));
    if (ok) ids.push(o.id);
  }
  sel = [...new Set([...d.base, ...ids])]; requestDraw();
}
function afterDraw() {
  if (marqueeBox && drag && drag.mode === 'marquee') { const b = marqueeBox; ctx.save(); ctx.strokeStyle = THEME.sel; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.strokeRect(b.x0 + 0.5, b.y0 + 0.5, b.x1 - b.x0, b.y1 - b.y0); ctx.fillStyle = rgba(THEME.sel, 0.07) || 'transparent'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.restore(); }
  drawPictureHandle(); drawCaptionHandle();
  if (iterHighlight != null && G[iterHighlight]) { const p = toS(G[iterHighlight]); ctx.save(); ctx.strokeStyle = THEME.hover; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, TAU); ctx.stroke(); ctx.restore(); }
  if (doc.marks.center != null && G[doc.marks.center]) { const p = toS(G[doc.marks.center]); ctx.save(); ctx.strokeStyle = THEME.sel; ctx.lineWidth = 1.2; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, TAU); ctx.stroke(); ctx.restore(); }
}
function doubleClick(o, part) {
  if (part === 'label') return inlineRename(o);
  if (o.t === 'button') return runButton(o);
  if (o.t === 'value') { if (o.k === 'param') return paramDialog(o); if (o.k === 'calc') return calcDialog(o); if (o.k === 'fdef') return functionDialog(obj(o.p[0])); return propsDialog([o]); }
  if (o.t === 'text') return inlineText(o);
  if (o.t === 'table') { snap(); addTableRow(o); refresh(); return; }
  if (o.t === 'iter') return iterProps(o);
  if (o.t === 'fplot') return o.d.fn != null ? functionDialog(obj(o.d.fn)) : o.k === 'param' ? propsDialog([o]) : functionDialog(o);
  if (o.t === 'coord') { doc.marks.coord = o.id; doc.coordId = o.id; toast('좌표계를 표시했습니다'); refresh(); return; }
  if (o.t === 'point') { doc.marks.center = o.id; toast('중심점으로 표시했습니다: ' + nm(o.id)); flash(o.id); return; }
  if (isStraight(o)) { doc.marks.mirror = o.id; toast('거울로 표시했습니다: ' + nm(o.id)); flash(o.id); return; }
  propsDialog([o]);
}
function flash(id) { const s0 = sel.slice(); let k = 0; const iv = setInterval(() => { sel = (k++ % 2) ? s0 : [...s0.filter(x => x !== id)]; requestDraw(); if (k > 5) { clearInterval(iv); sel = s0.includes(id) ? s0 : [...s0, id]; refresh(); } }, 110); }

/* ---- 텍스트 도구 ---- */
function textClick(sx, sy, e) {
  const h = hitTest(sx, sy);
  if (!h) return inlineText(null, sx, sy);
  const o = obj(h.id);
  if (o.t === 'text') return inlineText(o);
  if (h.part === 'label') return inlineRename(o);
  if (o.t === 'value' || o.t === 'button') return propsDialog([o]);
  snap(); if (!o.label) giveLabel(o, false); o.showLabel = !o.showLabel; refresh();
}
function overlayInput(x, y, value, multi, onDone, opts = {}) {
  const host = $('#stage'); const ta = el(multi ? 'textarea' : 'input', { class: 'inline-edit', style: `left:${x}px;top:${y}px`, 'aria-label': opts.aria || '내용 입력' });
  ta.value = value; if (multi) ta.rows = Math.max(2, value.split('\n').length);
  host.append(ta);
  let done = false; const fin = ok => { if (done) return; done = true; const v = ta.value; ta.remove(); onDone(ok ? v : null); };
  ta.addEventListener('keydown', ev => { ev.stopPropagation();
    if ((ev.ctrlKey || ev.metaKey) && opts.style) { const k = ev.key.toLowerCase(); const st = opts.style; if (k === 'b' || k === 'i' || k === 'u') { ev.preventDefault(); const key = { b: 'bold', i: 'italic', u: 'underline' }[k]; st[key] = !st[key]; ta.style.fontWeight = st.bold ? 600 : 400; ta.style.fontStyle = st.italic ? 'italic' : 'normal'; ta.style.textDecoration = st.underline ? 'underline' : 'none'; toast({ bold: '굵게', italic: '기울임', underline: '밑줄' }[key] + (st[key] ? ' 켬' : ' 끔')); return; } if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); insertAt(ta, ev.key === 'ArrowUp' ? '^{}' : '_{}'); ta.setSelectionRange(ta.selectionStart - 1, ta.selectionStart - 1); return; } if (ev.key === 'Enter') { ev.preventDefault(); fin(true); return; } }
    if (ev.key === 'Escape') fin(false); else if (ev.key === 'Enter' && (!multi || !ev.shiftKey)) { ev.preventDefault(); fin(true); } });
  ta.addEventListener('pointerdown', ev => ev.stopPropagation());
  setTimeout(() => { ta.focus(); ta.select(); ta.addEventListener('blur', () => fin(true)); }, 60);
}
function inlineText(o, sx, sy) {
  const x = o ? o.d.sx : sx, y = o ? o.d.sy : sy;
  const style = { bold: o ? !!o.d.bold : false, italic: o ? !!o.d.italic : false, underline: o ? !!o.d.underline : false };
  overlayInput(x, y, o ? textToEdit(o.d.text) : '', true, v => {
    if (v != null) v = textFromEdit(v);
    if (v == null) return; v = v.replace(/\s+$/, '');
    if (!o) { if (!v) return; snap(); const t = add({ t: 'text', k: 'cap', d: { text: v, sx: x, sy: y, size: doc.prefs.capSize || 15, font: doc.prefs.capFont || 'sans', ...style } }); setSel([t.id]); }
    else { snap(); if (!v) deleteObjs([o.id]); else { o.d.text = v; Object.assign(o.d, style); } refresh(); }
  }, { aria: '글상자 내용', style });
}
function inlineRename(o) {
  const b = o._lb || { x: 100, y: 100 };
  overlayInput(b.x, b.y - 2, o.label || '', false, v => { if (v == null || !v.trim()) return; snap(); o.label = v.trim(); o.showLabel = true; refresh(); }, { aria: '레이블 이름' });
}

/* ---- 표시 도구 ---- */
function markerClick(sx, sy) {
  const h = hitTest(sx, sy, o => o.t === 'amark' || isStraight(o) || o.t === 'point');
  if (h && obj(h.id).t === 'amark') { snap(); const o = obj(h.id); o.d.n = (o.d.n || 1) % 3 + 1; refresh(); return; }
  // 각: 근처 꼭짓점 찾기
  const P = { x: sx, y: sy };
  let best = null;
  for (const v of doc.objs) {
    if (v.t !== 'point' || v.hidden || !G[v.id]) continue; const V = toS(G[v.id]), d = vdist(V, P); if (d > 42 || d < 3) continue;
    const arms = [];
    for (const s of doc.objs) { if (!isStraight(s) || s.k !== '2p' || s.hidden || !G[s.id]) continue; const i = s.p.indexOf(v.id); if (i < 0) continue; const other = s.p[1 - i]; if (G[other]) arms.push({ pt: other, a: vang(vsub(G[other], G[v.id])) }); }
    if (arms.length < 2) continue;
    const w = toW(sx, sy), ca = vang(vsub(w, G[v.id]));
    arms.sort((a, b) => a.a - b.a);
    for (let i = 0; i < arms.length; i++) { const A = arms[i], B = arms[(i + 1) % arms.length]; const sw = mod(B.a - A.a, TAU) || TAU; if (mod(ca - A.a, TAU) <= sw) { if (!best || d < best.d) best = { d, A: A.pt, V: v.id, B: B.pt }; break; } }
  }
  if (best) {
    const ex = doc.objs.find(o => o.t === 'amark' && o.p[1] === best.V && ((o.p[0] === best.A && o.p[2] === best.B)));
    snap(); if (ex) ex.d.n = (ex.d.n || 1) % 3 + 1; else add({ t: 'amark', k: 'm', p: [best.A, best.V, best.B], d: { n: 1 } }); refresh(); return;
  }
  if (h && obj(h.id).t === 'segment') { snap(); const o = obj(h.id); o.d.ticks = ((o.d.ticks || 0) + 1) % 4; refresh(); return; }
  toast('선분 가운데나 두 선분이 만나는 각 안쪽을 클릭하세요');
}

/* ---- 정보 도구 ---- */
function describe(o) {
  const n = i => nm(o.p[i]);
  const xfName = x => ({ tr: '평행이동', rot: '회전', dil: '확대·축소', ref: '대칭이동' })[x.type];
  if (o.k === 'xf') return n(0) + '을(를) ' + xfName(o.d.xf) + '한 상';
  switch (o.t) {
    case 'point': return { term: '반복의 종점', cxf: n(0) + '의 사용자 변환 상', unitlen: '좌표계의 단위점', free: '자유점', on: n(0) + ' 위의 점', int: n(0) + '와(과) ' + n(1) + '의 교점', mid: '선분 ' + n(0) + '의 중점', unit: '좌표계의 단위점', plot: '좌표계에 그린 점' }[o.k] + (o.isOrigin ? ' (원점)' : '');
    case 'segment': case 'ray': case 'line': {
      const T = TYPE_KO[o.t];
      if (o.k === '2p') return '점 ' + n(0) + '와(과) ' + n(1) + '을(를) 잇는 ' + T;
      if (o.k === 'par') return '점 ' + n(0) + '을(를) 지나고 ' + n(1) + '에 평행한 직선';
      if (o.k === 'perp') return '점 ' + n(0) + '을(를) 지나고 ' + n(1) + '에 수직인 직선';
      if (o.k === 'bis') return '∠' + n(0) + n(1) + n(2) + '의 이등분선';
      break;
    }
    case 'circle': return o.k === 'cp' ? '중심이 ' + n(0) + '이고 점 ' + n(1) + '을(를) 지나는 원' : '중심이 ' + n(0) + '이고 반지름이 ' + (isStraight(obj(o.p[1])) ? 'm ' + n(1) : valueName(obj(o.p[1]))) + '인 원';
    case 'arc': return o.k === 'oc' ? '원 ' + n(0) + ' 위 ' + n(1) + '에서 ' + n(2) + '까지의 호' : o.k === 'cpp' ? '중심 ' + n(0) + ', ' + n(1) + '에서 ' + n(2) + '까지의 호' : '세 점 ' + n(0) + ', ' + n(1) + ', ' + n(2) + '을(를) 지나는 호';
    case 'polygon': return '다각형 ' + o.p.map(nm).join('') + '의 내부';
    case 'cinterior': return '원 ' + n(0) + '의 내부';
    case 'sector': return '호 ' + n(0) + '의 부채꼴 내부';
    case 'arcseg': return '호 ' + n(0) + '의 활꼴 내부';
    case 'locus': return o.k === 'cxf' ? n(0) + '의 사용자 변환 상 (표본 경로)' : o.p.length === 3 ? '점 ' + n(0) + '을(를) ' + n(1) + ' 위에서 움직일 때 ' + selName(obj(o.p[2])) + '의 자취' : (obj(o.p[0]).t === 'value' ? '매개변수 ' : '점 ') + n(0) + '이(가) 움직일 때 ' + selName(obj(o.p[1])) + '의 자취';
    case 'value': return valueText(o);
    case 'fplot': return o.k === 'param' ? '매개곡선 (' + nm(o.p[1]) + '(t), ' + nm(o.p[2]) + '(t))' : o.d.fn != null ? '함수 ' + nm(o.d.fn) + '의 그래프' : disp(o.label) + '(x) = ' + storedToDisplay(o.d.expr);
    case 'coord': return '직교좌표계';
    case 'text': return '글상자';
    case 'button': return '동작 버튼: ' + (o.d.text || '');
    case 'amark': return '∠' + n(0) + n(1) + n(2) + ' 표시';
    case 'iter': return '점 ' + o.d.pre.map(nm).join(', ') + '을(를) 원상으로 하는 반복 (' + o.d.maps.length + '개 사상, ' + (o.d.depthV != null ? valueName(obj(o.d.depthV)) : o.d.depth) + '회)';
    case 'table': return o.k === 'iter' ? '반복 값의 표' : '값 ' + o.p.length + '개의 표 (' + (o.d.rows || []).length + '행)';
    case 'tplot': return '표 데이터 그래프';
    case 'drawing': return '손그림 (점 ' + o.d.pts.length + '개)';
    case 'picture': return '그림' + (o.p.length && o.k !== 'xf' ? ' (점 ' + o.p.filter(id => obj(id) && obj(id).t === 'point').map(nm).join(', ') + '에 붙음)' : '') + (o.d.crop != null ? ', 다각형으로 자름' : '');
  }
  return TYPE_KO[o.t];
}
function infoClick(sx, sy, e) {
  const h = hitTest(sx, sy); const box = $('#infopop');
  if (!h) { box.hidden = true; return; }
  const o = obj(h.id);
  const parents = o.p.map(obj).filter(Boolean), kids = children(o.id);
  box.innerHTML = '';
  box.append(el('div', { class: 'ip-kind' }, selName(o)), el('div', { class: 'ip-def' }, describe(o)));
  if (parents.length) box.append(el('div', { class: 'ip-rel' }, el('b', {}, '부모 '), parents.map(selName).join(', ')));
  if (kids.length) box.append(el('div', { class: 'ip-rel' }, el('b', {}, '자식 '), kids.slice(0, 12).map(selName).join(', ') + (kids.length > 12 ? ' 외 ' + (kids.length - 12) + '개' : '')));
  if (o.t === 'point' && G[o.id]) { const c = toCoord(G[o.id], G); if (c) box.append(el('div', { class: 'ip-rel' }, el('b', {}, '좌표 '), '(' + fmt(c.x) + ', ' + fmt(c.y) + ')')); }
  box.hidden = false; const r = box.getBoundingClientRect();
  box.style.left = clamp(sx + 14, 4, W - r.width - 4) + 'px'; box.style.top = clamp(sy + 14, 4, H - r.height - 4) + 'px';
}

/* ================= 작도 명령 ================= */
function withSnap(fn) { return () => { snap(); const r = fn(); if (Array.isArray(r) && r.length) setSel(r); else refresh(); }; }
const C = {
  pointOn: withSnap(() => S().paths.map(o => { const g = G[o.id]; let t = { segment: 0.35, ray: 1, line: 0.5, circle: 0.1, cinterior: 0.1, arc: 0.4, polygon: 0.1, locus: 0.3 }[o.t] ?? 0.5; if (o.t === 'fplot') { const r = fplotRange(g); t = r[0] + (r[1] - r[0]) * 0.6; } else if (false) t = (toW(W * 0.6, 0).x - g.co.o.x) / g.co.u; return mkOn(o.id, t); })),
  midpoint: withSnap(() => S().segs.map(s => mkMid(s.id))),
  intersect: withSnap(() => {
    const [a, b] = S().os; const raw = rawIntersections(a, G[a.id], b, G[b.id]); const out = [];
    raw.forEach((r, i) => { if (r && r.ok && !doc.objs.some(o => o.t === 'point' && o.k === 'int' && o.p[0] === a.id && o.p[1] === b.id && o.d.i === i)) out.push(mkInt(a.id, b.id, i)); });
    if (!out.length) toast('지금 위치에서는 교점이 없습니다'); return out;
  }),
  straight: type => withSnap(() => { const p = S().pts.map(o => o.id), out = []; if (type === 'segment' && p.length >= 3) { for (let i = 0; i < p.length; i++) out.push(mkStraight('segment', p[i], p[(i + 1) % p.length])); } else for (let i = 0; i + 1 < p.length; i++) out.push(mkStraight(type, p[i], p[i + 1])); return out; })(),
  parperp: kind => withSnap(() => { const s = S(); const mk = kind === 'par' ? mkPar : mkPerp; if (s.str.length === 1) return s.pts.map(p => mk(p.id, s.str[0].id)); return s.str.map(l => mk(s.pts[0].id, l.id)); })(),
  bisector: withSnap(() => { const [A, V, B] = S().pts; return [mkBis(A.id, V.id, B.id)]; }),
  circleCP: withSnap(() => { const [c, p] = S().pts; return [mkCircle(c.id, p.id)]; }),
  circleCR: withSnap(() => { const s = S(); const src = s.os.filter(o => o.t === 'segment' || (o.t === 'value' && o.k !== 'fdef')); if (s.pts.length === 1) return src.map(r => mkCircleR(s.pts[0].id, r.id)); return s.pts.map(p => mkCircleR(p.id, src[0].id)); }),
  arcOn: withSnap(() => { const s = S(); if (s.circ.length) return [mkArcOC(s.circ[0].id, s.pts[0].id, s.pts[1].id)]; const [c, a, b] = s.pts; return [mkArcCPP(c.id, a.id, b.id)]; }),
  arc3: withSnap(() => { const [a, b, c] = S().pts; return [mkArc3(a.id, b.id, c.id)]; }),
  polyInt: withSnap(() => [mkPoly(S().pts.map(o => o.id))]),
  circInt: withSnap(() => S().circ.map(c => mkCInt(c.id))),
  sector: withSnap(() => S().arcs.map(a => mkSector(a.id))),
  arcseg: withSnap(() => S().arcs.map(a => mkArcSeg(a.id))),
  locus: withSnap(() => { const r = locusPair(); if (!r) return []; const id = add({ t: 'locus', k: 'l', p: r, d: {} }).id; return [id]; }),
};
function locusPair() {
  const s = S();
  if (s.n === 3) { const [P0, path, tgt] = s.os; if (P0.t === 'point' && P0.k === 'free' && isPath(path) && !descendants([P0.id]).has(path.id) && descendants([P0.id]).has(tgt.id)) return [P0.id, path.id, tgt.id]; return null; }
  if (s.n !== 2) return null;
  for (const [a, b] of [[s.os[0], s.os[1]], [s.os[1], s.os[0]]]) {
    const drv = (a.t === 'point' && a.k === 'on') || (a.t === 'value' && a.k === 'param');
    if (drv && descendants([a.id]).has(b.id) && b.t !== 'value' && b.t !== 'locus' && b.t !== 'text') return [a.id, b.id];
  }
  return null;
}
const can = {
  pointOn: () => { const s = S(); return s.n >= 1 && s.paths.length === s.n; },
  midpoint: () => { const s = S(); return s.n >= 1 && s.segs.length === s.n; },
  intersect: () => { const s = S(); return s.n === 2 && s.os.every(canIntersect); },
  straight: () => { const s = S(); return s.n >= 2 && s.pts.length === s.n; },
  twoPts: () => { const s = S(); return s.n === 2 && s.pts.length === 2; },
  parperp: () => { const s = S(); return s.n >= 2 && s.pts.length + s.str.length === s.n && (s.str.length === 1 || s.pts.length === 1); },
  bisector: () => { const s = S(); return s.n === 3 && s.pts.length === 3; },
  circleCR: () => { const s = S(); const src = s.os.filter(o => o.t === 'segment' || (o.t === 'value' && o.k !== 'fdef' && o.k !== 'coords' && o.k !== 'eq')); return s.pts.length >= 1 && src.length >= 1 && s.pts.length + src.length === s.n && (s.pts.length === 1 || src.length === 1); },
  arcOn: () => { const s = S(); return s.n === 3 && ((s.circ.length === 1 && s.pts.length === 2) || s.pts.length === 3); },
  polyInt: () => { const s = S(); return s.n >= 3 && s.pts.length === s.n; },
  circInt: () => { const s = S(); return s.n >= 1 && s.circ.length === s.n; },
  arcs: () => { const s = S(); return s.n >= 1 && s.arcs.length === s.n; },
  locus: () => !!locusPair(),
};

/* ================= 변환 ================= */
const XF_OK = o => ['point', 'segment', 'ray', 'line', 'circle', 'arc', 'polygon', 'cinterior', 'sector', 'arcseg', 'picture'].includes(o.t);
function markDesc(k) {
  const m = doc.marks[k]; if (m == null) return null;
  if (k === 'center' || k === 'mirror') return obj(m) ? nm(m) : null;
  if (k === 'vector') return nm(m[0]) + ' → ' + nm(m[1]);
  if (k === 'angle') return m.pts ? '∠' + m.pts.map(nm).join('') : valueName(obj(m.val));
  if (k === 'ratio') return m.pts ? '배율 ' + m.pts.map(nm).join('') : m.segs ? 'm ' + nm(m.segs[0]) + ' / m ' + nm(m.segs[1]) : valueName(obj(m.val));
  if (k === 'dist') return valueName(obj(m.val));
  return null;
}
const markCmd = {
  center: () => { doc.marks.center = S().pts[0].id; toast('중심점 표시: ' + markDesc('center')); refresh(); },
  mirror: () => { doc.marks.mirror = S().str[0].id; toast('거울 표시: ' + markDesc('mirror')); refresh(); },
  angle: () => { const s = S(); doc.marks.angle = s.pts.length === 3 ? { pts: s.pts.map(o => o.id) } : s.os[0].t === 'amark' ? { pts: s.os[0].p.slice() } : { val: s.vals[0].id }; toast('각 표시: ' + markDesc('angle')); },
  ratio: () => { const s = S(); doc.marks.ratio = s.pts.length === 3 ? { pts: s.pts.map(o => o.id) } : s.segs.length === 2 ? { segs: s.segs.map(o => o.id) } : { val: s.vals[0].id }; toast('비율 표시: ' + markDesc('ratio')); },
  vector: () => { doc.marks.vector = S().pts.map(o => o.id); toast('벡터 표시: ' + markDesc('vector')); },
  dist: () => { doc.marks.dist = { val: S().vals[0].id }; toast('거리 표시: ' + markDesc('dist')); },
};
function applyXf(xf) {
  const src = S().os.filter(XF_OK); if (!src.length) return toast('변환할 수 있는 객체를 선택하세요');
  snap(); const out = src.map(o => mkXf(o.id, xf)); setSel(out);
}

/* ================= 측정 ================= */
const M = (k, list, extra) => withSnap(() => list().map(p => mkValue(k, p, extra)));
function needCoord(fn) { return () => { snap(); ensureCoord(); const r = fn(); setSel(r); }; }
const measure = {
  len: M('len', () => S().segs.map(o => [o.id])),
  dist: M('dist', () => { const s = S(); return s.pts.length === 2 ? [[s.pts[0].id, s.pts[1].id]] : [[s.pts[0].id, s.str[0].id]]; }),
  perim: M('perim', () => S().ints.filter(o => o.t !== 'cinterior').map(o => [o.id])),
  circum: M('circum', () => S().os.filter(o => o.t === 'circle' || o.t === 'cinterior').map(o => [o.id])),
  angle: M('angle', () => { const s = S(); if (s.os[0] && s.os[0].t === 'amark') return [s.os[0].p.slice()]; return [s.pts.map(o => o.id)]; }),
  area: M('area', () => S().os.filter(o => isInterior(o) || o.t === 'circle').map(o => [o.id])),
  arcang: M('arcang', () => S().os.filter(o => ['arc', 'sector', 'arcseg'].includes(o.t)).map(o => [o.id])),
  arclen: M('arclen', () => S().os.filter(o => ['arc', 'sector', 'arcseg'].includes(o.t)).map(o => [o.id])),
  radius: M('radius', () => S().os.filter(o => ['circle', 'cinterior', 'arc', 'sector', 'arcseg'].includes(o.t)).map(o => [o.id])),
  ratio: withSnap(() => { const s = S(); return s.pts.length === 3 ? [mkValue('ratio3', s.pts.map(o => o.id))] : [mkValue('ratio', [s.segs[0].id, s.segs[1].id])]; }),
  ptval: M('ptval', () => S().pts.filter(o => o.k === 'on').map(o => [o.id])),
  coords: needCoord(() => S().pts.map(o => mkValue('coords', [o.id, doc.coordId]))),
  x: needCoord(() => S().pts.map(o => mkValue('x', [o.id, doc.coordId]))),
  y: needCoord(() => S().pts.map(o => mkValue('y', [o.id, doc.coordId]))),
  coorddist: needCoord(() => { const p = S().pts; return [mkValue('coorddist', [p[0].id, p[1].id, doc.coordId])]; }),
  slope: needCoord(() => S().str.map(o => mkValue('slope', [o.id, doc.coordId]))),
  eq: needCoord(() => S().os.filter(o => isStraight(o) || o.t === 'circle').map(o => mkValue('eq', [o.id, doc.coordId]))),
};
const canM = {
  len: () => { const s = S(); return s.n >= 1 && s.segs.length === s.n; },
  dist: () => { const s = S(); return s.n === 2 && (s.pts.length === 2 || (s.pts.length === 1 && s.str.length === 1)); },
  perim: () => { const s = S(); return s.n >= 1 && s.os.every(o => o.t === 'polygon' || o.t === 'sector' || o.t === 'arcseg'); },
  circum: () => { const s = S(); return s.n >= 1 && s.os.every(o => o.t === 'circle' || o.t === 'cinterior'); },
  angle: () => { const s = S(); return (s.n === 3 && s.pts.length === 3) || (s.n === 1 && s.os[0].t === 'amark'); },
  area: () => { const s = S(); return s.n >= 1 && s.os.every(o => isInterior(o) || o.t === 'circle'); },
  arc: () => { const s = S(); return s.n >= 1 && s.os.every(o => ['arc', 'sector', 'arcseg'].includes(o.t)); },
  radius: () => { const s = S(); return s.n >= 1 && s.os.every(o => ['circle', 'cinterior', 'arc', 'sector', 'arcseg'].includes(o.t)); },
  ratio: () => { const s = S(); return (s.n === 2 && s.segs.length === 2) || (s.n === 3 && s.pts.length === 3); },
  ptval: () => { const s = S(); return s.n >= 1 && s.pts.length === s.n && s.pts.every(o => o.k === 'on'); },
  pts: () => { const s = S(); return s.n >= 1 && s.pts.length === s.n; },
  slope: () => { const s = S(); return s.n >= 1 && s.str.length === s.n; },
  eq: () => { const s = S(); return s.n >= 1 && s.os.every(o => isStraight(o) || o.t === 'circle'); },
};

/* ================= 표시 속성 ================= */
function setProp(fn) { const s = S().os; if (!s.length) return; snap(); s.forEach(fn); refresh(); }
function toggleLabels() { const s = S().os.filter(o => o.t !== 'value' && o.t !== 'text' && o.t !== 'button'); if (!s.length) return; snap(); const show = !s.every(o => o.showLabel); s.forEach(o => { if (!o.label) giveLabel(o, false); o.showLabel = show; }); refresh(); }
function hideSel() { const s = S().os; if (!s.length) return; snap(); s.forEach(o => o.hidden = true); sel = []; refresh(); }
function showAllHidden() { snap(); const ids = []; for (const o of doc.objs) if (o.hidden && o.t !== 'coord') { o.hidden = false; ids.push(o.id); } setSel(ids); toast(ids.length ? '숨긴 객체 ' + ids.length + '개를 보이게 했습니다' : '숨긴 객체가 없습니다'); }
function toggleTrace() { const s = S().os.filter(o => o.t === 'point' || isStraight(o) || o.t === 'circle' || o.t === 'arc' || o.t === 'polygon' || o.t === 'cinterior'); if (!s.length) return; snap(); const on = !s.every(o => o.trace); s.forEach(o => { o.trace = on; if (!on) traces.delete(o.id); }); toast(on ? '자취 켜기: 끌거나 움직이면 흔적이 남습니다' : '자취 끄기'); refresh(); }

/* ================= 애니메이션 ================= */
const anims = new Map(); const moves = new Map(); let speedK = 1, animRAF = null, lastT = 0;
function animatable(o) { return (o.t === 'point' && (o.k === 'on' || o.k === 'free')) || (o.t === 'value' && o.k === 'param'); }
function startAnim(ids) { let n = 0; for (const id of ids) { const o = obj(id); if (o && animatable(o)) { anims.set(id, { dir: 1 }); n++; } } if (!n) return toast('경로 위의 점이나 매개변수를 선택하세요'); kick(); }
function stopAnim(ids) { if (ids) ids.forEach(id => anims.delete(id)); else { anims.clear(); moves.clear(); } for (const o of doc.objs) if (o.t === 'button' && o.d.act === 'anim') o._running = o.p.some(id => anims.has(id)); updateMotion(); requestDraw(); scheduleSave(); }
function kick() { updateMotion(); if (!animRAF) { lastT = performance.now(); animRAF = requestAnimationFrame(step); } }
function step(ts) {
  if (animPaused) { animRAF = null; return; }
  const dt = Math.min(0.05, (ts - lastT) / 1000); lastT = ts;
  for (const [id, a] of anims) {
    const o = obj(id); if (!o) { anims.delete(id); continue; }
    if (o.t === 'value') { const d = o.d, span = (d.max - d.min) || 1; d.v += a.dir * span / 5 * dt * speedK * (a.speed || 1); if (d.v > d.max) { d.v = d.max; a.dir = -1; if (a.once) anims.delete(id); } if (d.v < d.min) { d.v = d.min; a.dir = 1; if (a.once) anims.delete(id); } continue; }
    if (o.t === 'point' && o.k === 'free') { stepFreePoint(o, a, dt); continue; }
    const po = obj(o.p[0]), g = G[po.id]; if (!g) continue;
    const L = Math.max(1e-6, pathLength(po, g)); const dtp = a.dir * 3.2 * speedK * (a.speed || 1) * dt / L;
    let t = o.d.t + dtp;
    if (['circle', 'cinterior', 'polygon'].includes(po.t)) t = mod(t, 1);
    else if (po.t === 'ray' || po.t === 'line' || po.t === 'fplot') { const r = driverRange(o, G); if (r) { if (t > r[1]) { t = r[1]; a.dir = -1; } if (t < r[0]) { t = r[0]; a.dir = 1; } } }
    else { if (t > 1) { t = 1; a.dir = -1; if (a.once) anims.delete(id); } if (t < 0) { t = 0; a.dir = 1; if (a.once) anims.delete(id); } }
    o.d.t = t;
  }
  for (const [id, m] of moves) {
    const o = obj(id), tg = G[m.to]; if (!o || !tg) { moves.delete(id); continue; }
    const p = { x: o.d.x, y: o.d.y }, d = vsub(tg, p), L = vlen(d), sp = m.speed === 0 ? Infinity : (m.speed ?? 6) * speedK * dt;
    if (L <= sp) { o.d.x = tg.x; o.d.y = tg.y; moves.delete(id); } else { o.d.x += d.x / L * sp; o.d.y += d.y / L * sp; }
  }
  recompute(); recordTraces(); draw();
  if (anims.size || moves.size) animRAF = requestAnimationFrame(step); else { animRAF = null; updateMotion(); }
}
function updateMotion() { const m = $('#motion'); const show = !!(anims.size || moves.size || motionPinned); if (show) buildMotion(); m.hidden = !show; }
let motionPinned = false;
function runButton(o) {
  if (runButtonExt(o)) return;
  if (o.d.act === 'hide') { const show = o.p.every(id => obj(id) && obj(id).hidden); snap(); o.p.forEach(id => { const t = obj(id); if (t) t.hidden = !show; }); o.d.text = o.d.text.replace(/(숨기기|보이기)$/, show ? '숨기기' : '보이기'); refresh(); }
  else if (o.d.act === 'anim') { if (o.p.some(id => anims.has(id))) { stopAnim(o.p); o._running = false; } else { startAnim(o.p); o.p.forEach(id => { const a = anims.get(id); if (a) { a.speed = o.d.speed || 1; a.dir = o.d.dir || 1; a.once = !!o.d.once; } }); o._running = true; } requestDraw(); }
  else if (o.d.act === 'link') followLink(o);
  else if (o.d.act === 'move') { snap(); const [a, b] = o.p; if (obj(a) && obj(a).k === 'free') { moves.set(a, { to: b, speed: o.d.speed ?? 6 }); kick(); } }
}

/* ================= 편집 ================= */
let clip = null;
function copySel() {
  const ids = S().os.filter(o => o.t !== 'coord').map(o => o.id); if (!ids.length) return;
  for (const o of doc.objs) if (o.k === 'fdef' && ids.includes(o.p[0]) && !ids.includes(o.id)) ids.push(o.id);
  const anc = ancestors(ids); const coordSet = new Set(); if (doc.coordId) { coordSet.add(doc.coordId); obj(doc.coordId).p.forEach(p => coordSet.add(p)); }
  const set = new Set([...ids, ...anc].filter(id => !coordSet.has(id)));
  clip = { coord: doc.coordId ? [doc.coordId, ...obj(doc.coordId).p] : null, objs: doc.objs.filter(o => set.has(o.id)).map(o => JSON.parse(JSON.stringify(o, (k, v) => k[0] === '_' ? undefined : v))), sel: ids };
  toast('복사했습니다 (' + clip.objs.length + '개)');
}
function paste() {
  if (!clip) return toast('복사한 객체가 없습니다'); snap();
  const map = new Map(); const out = [];
  if (clip.coord && (!doc.coordId || doc.coordId !== clip.coord[0]) && clip.objs.some(o => o.p.some(p => clip.coord.includes(p)) || o.k === 'plot')) {
    const c = ensureCoord(); const co = obj(c); map.set(clip.coord[0], c); map.set(clip.coord[1], co.p[0]); map.set(clip.coord[2], co.p[1]);
  }
  for (const c of clip.objs) {
    const o = JSON.parse(JSON.stringify(c)); const old = o.id; delete o.id;
    o.p = o.p.map(p => map.get(p) ?? p);
    if (o.k === 'xf') { const x = o.d.xf; for (const k of ['c', 'm', 'dxV', 'dyV', 'distV', 'angV', 'rV']) if (x[k] != null) x[k] = map.get(x[k]) ?? x[k]; for (const k of ['vec', 'angP', 'rS']) if (x[k]) x[k] = x[k].map(p => map.get(p) ?? p); }
    if (o.d.expr) o.d.expr = o.d.expr.replace(/#(\d+)/g, (_, id) => '#' + (map.get(+id) ?? id));
    for (const k of ['xV', 'yV']) if (o.d[k] != null) o.d[k] = map.get(o.d[k]) ?? o.d[k];
    if (o.k === 'free') { o.d.x += 1; o.d.y -= 1; }
    if (o.d.sx != null) { o.d.sx += 24; o.d.sy += 24; }
    const keep = o.label && !doc.objs.some(x => x.label === o.label); add(o); if (o.label && !keep) giveLabel(o, o.showLabel);
    map.set(old, o.id); if (clip.sel.includes(old)) out.push(o.id);
  }
  setSel(out);
}
function deleteSel() { if (!sel.length) return; snap(); deleteObjs(sel.slice()); sel = []; refresh(); }
function selectAll() { const f = { point: isPoint, straight: isStraight, compass: o => o.t === 'circle', polygon: isInterior, text: o => o.t === 'text' }[toolState.id]; setSel(doc.objs.filter(o => !o.hidden && o.t !== 'coord' && (!f || f(o))).map(o => o.id)); }
function selectParents() { const s = new Set(); sel.forEach(id => obj(id).p.forEach(p => s.add(p))); setSel([...s]); }
function selectChildren() { const s = new Set(); sel.forEach(id => children(id).forEach(c => s.add(c.id))); setSel([...s]); }
function makeButton(act) {
  const s = S(); snap(); const pos = nextScreenPos();
  if (act === 'hide') { if (!s.n) return toast('숨기거나 보일 객체를 선택하세요'); const b = add({ t: 'button', k: 'b', p: s.os.map(o => o.id), d: { act, sx: pos.sx, sy: pos.sy, text: '객체 숨기기' } }); setSel([b.id]); }
  else if (act === 'anim') { const t = s.os.filter(animatable); if (!t.length) return toast('경로 위의 점이나 매개변수를 선택하세요'); const b = add({ t: 'button', k: 'b', p: t.map(o => o.id), d: { act, sx: pos.sx, sy: pos.sy, text: '애니메이션' } }); setSel([b.id]); }
  else if (act === 'move') { if (s.pts.length !== 2 || s.pts[0].k !== 'free') return toast('움직일 자유점과 도착점을 차례로 선택하세요'); const b = add({ t: 'button', k: 'b', p: [s.pts[0].id, s.pts[1].id], d: { act, sx: pos.sx, sy: pos.sy, text: nm(s.pts[0].id) + ' → ' + nm(s.pts[1].id) + ' 이동' } }); setSel([b.id]); }
}

/* ================= 파일 ================= */
let downloadsNS = null;
(async () => { try { if (window.claude && window.claude.use) downloadsNS = await window.claude.use('downloads'); } catch (e) { } })();
async function saveFile(filename, data, mime) {
  if (downloadsNS) { try { await downloadsNS.save({ filename, data }); toast('저장했습니다: ' + filename); return; } catch (e) { if (e && e.code === 'declined') return; } }
  try { const blob = data instanceof Blob ? data : new Blob([data], { type: mime }); const a = el('a', { href: URL.createObjectURL(blob), download: filename }); document.body.append(a); a.click(); a.remove(); }
  catch (e) { toast('이 화면에서는 파일 저장을 할 수 없습니다. 보관함을 이용하세요.'); }
}
function stamp() { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()); }
function fileSave() { saveFile('작도-' + stamp() + '.json', serializeBook(), 'application/json'); }
function fileOpen() { const inp = el('input', { type: 'file', accept: '.json,application/json' }); inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const n = appendBook(parseBook(r.result)); toast('‘' + f.name + '’의 페이지 ' + n + '개를 열었습니다'); } catch (e) { toast('파일을 열 수 없습니다: ' + e.message); } }; r.readAsText(f); }; inp.click(); }
function exportPNG() { if (doc.prefs.exportFormat === 'svg') return exportSVG(); exportPNGScaled(); }
function archiveList() { try { return JSON.parse(localStorage.getItem('jakdo-archive') || '[]'); } catch (e) { return []; } }
function archiveSet(a) { try { localStorage.setItem('jakdo-archive', JSON.stringify(a)); return true; } catch (e) { toast('브라우저 저장소를 사용할 수 없습니다'); return false; } }

/* ================= 키보드 ================= */
document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select,[contenteditable]')) return;
  const k = e.key, mod_ = e.ctrlKey || e.metaKey;
  if (k === ' ') { spaceDown = true; return; }
  if (mod_) {
    const map = { z: e.shiftKey ? redo : undo, y: redo, a: selectAll, c: copySel, v: paste, x: () => { copySel(); deleteSel(); }, l: () => can.straight() && C.straight('segment'), m: () => can.midpoint() && C.midpoint(), i: () => can.intersect() && C.intersect(), p: () => can.polyInt() && C.polyInt(), k: toggleLabels, h: hideSel, t: toggleTrace, b: eraseTraces, s: fileSave, o: fileOpen, '=': () => calcDialog(), '+': () => calcDialog(), e: () => exportPNG() };
    const f = map[k.toLowerCase()]; if (f) { e.preventDefault(); f(); }
    return;
  }
  if (k === 'Escape') { if (dlgStack.length) { dlgStack[dlgStack.length - 1](false); return; } if (pending || polyPts.length) return cancelPending(); if (toolState.id !== 'arrow') return setTool('arrow'); setSel([]); $('#infopop').hidden = true; return; }
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteSel(); return; }
  if (e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); const i = TOOLS.findIndex(t => t.id === toolState.id); setTool(TOOLS[mod(i + (k === 'ArrowDown' ? 1 : -1), TOOLS.length)].id); return; }
  if (e.shiftKey && (k === 'ArrowLeft' || k === 'ArrowRight')) { const t = TOOLS.find(t => t.id === toolState.id); if (t.vars) { e.preventDefault(); const i = t.vars.findIndex(v => v[0] === toolState.v[t.id]); setTool(t.id, t.vars[mod(i + (k === 'ArrowRight' ? 1 : -1), t.vars.length)][0]); } return; }
  if ((k === '+' || k === '=' || k === '-' || k === '_') && S().os.some(o => o.t === 'iter' && o.d.depthV == null)) { e.preventDefault(); snap(); S().os.filter(o => o.t === 'iter').forEach(o => { o.d.depth = clamp(o.d.depth + (k === '+' || k === '=' ? 1 : -1), 0, 400); }); toast('반복 횟수: ' + S().os.find(o => o.t === 'iter').d.depth); refresh(); return; }
  if ((k === '+' || k === '=' || k === '-' || k === '_') && S().os.some(o => o.t === 'fplot' || o.t === 'locus')) { e.preventDefault(); snap(); const up = k === '+' || k === '='; S().os.filter(o => o.t === 'fplot' || o.t === 'locus').forEach(o => { const cur = o.d.n || (o.t === 'fplot' ? 400 : 300); o.d.n = Math.round(clamp(up ? cur * 1.5 : cur / 1.5, 10, 5000)); }); toast('표본 수: ' + S().os.find(o => o.d.n).d.n); refresh(); return; }
  if (k === '+' || k === '=' || k === '-' || k === '_') { const ps = S().os.filter(o => o.t === 'value' && o.k === 'param'); if (ps.length) { e.preventDefault(); snap(); ps.forEach(o => { o.d.v = +(o.d.v + (k === '-' || k === '_' ? -1 : 1) * (o.d.step || 0.1)).toFixed(10); }); refresh(); } return; }
  if (k.startsWith('Arrow') && sel.length) {
    const roots = moveRoots(sel.filter(id => !isScreenObj(obj(id)))); if (!roots.size) return; e.preventDefault(); snap();
    const dl = (e.altKey ? 0.1 : 1) / view.s, dv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[k];
    for (const [id] of roots) { const o = obj(id); if (o.k === 'free') { o.d.x += dv[0] * dl; o.d.y += dv[1] * dl; } }
    refresh(); recordTraces(); return;
  }
});
document.addEventListener('keyup', e => { if (e.key === ' ') spaceDown = false; });
