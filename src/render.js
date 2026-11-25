'use strict';
/* ================= 화면/뷰 ================= */
const cv = document.getElementById('cv'); let ctx = cv.getContext('2d');
let W = 800, H = 600, DPR = 1;
const view = { ox: 400, oy: 300, s: PXCM };
const toS = p => ({ x: view.ox + p.x * view.s, y: view.oy - p.y * view.s });
const toW = (x, y) => ({ x: (x - view.ox) / view.s, y: (view.oy - y) / view.s });
viewBoundsFn = () => { const a = toW(0, H), b = toW(W, 0); return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }; };

const PALETTE = { ink: null, red: '#d6303c', orange: '#e07a12', gold: '#c49a00', green: '#2c9a48', teal: '#118a8f', blue: '#2f6ad9', purple: '#8646d4', magenta: '#c93c96', gray: '#7f8a99' };
const PAL_KO = { ink: '먹색', red: '빨강', orange: '주황', gold: '노랑', green: '초록', teal: '청록', blue: '파랑', purple: '보라', magenta: '자홍', gray: '회색' };
let THEME = {};
function readTheme() {
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  THEME = { _paper: null, paper: v('--paper'), ink: v('--ink'), grid: v('--grid'), axis: v('--axis'), sel: v('--sel'), hover: v('--hover'), muted: v('--muted'), chip: v('--chip'), chipLine: v('--chip-line'), btn: v('--btn-bg'), btnInk: v('--btn-ink') };
}
const col = c => (c && c[0] === '#') ? c : (PALETTE[c] || THEME.ink);
function colOf(o) { if (o && o.pc && typeof paramColor === 'function') { const c = paramColor(o); if (c) return c; } return col(o && o.color); }
function rgba(hex, a) { if (!hex || hex[0] !== '#') return hex; const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

const FONT_LABEL = 'italic 600 16px "STIX Two Text", "Times New Roman", serif';
const FONT_VAL = '14px "IBM Plex Sans KR", system-ui, sans-serif';

function resize() {
  const r = cv.parentElement.getBoundingClientRect(); DPR = (doc && doc.prefs && doc.prefs.hiDPI === false) ? 1 : (window.devicePixelRatio || 1);
  const nw = Math.max(50, r.width), nh = Math.max(50, r.height);
  if (W && H && (nw !== W || nh !== H)) { view.ox += (nw - W) / 2; view.oy += (nh - H) / 2; }
  W = nw; H = nh; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  dirty = true; requestDraw();
}

/* ================= 자취(trace) ================= */
const traces = new Map();
function recordTraces() {
  for (const o of doc.objs) {
    if (!o.trace || o.hidden) continue; const g = G[o.id]; if (!g) { const a = traces.get(o.id); if (a && a.length && a[a.length - 1]) a.push(null); continue; }
    let s = null;
    if (o.t === 'point') s = { x: g.x, y: g.y };
    else if (isStraight(o)) s = { a: { ...g.a }, b: { ...g.b } };
    else if (o.t === 'circle' || o.t === 'cinterior') s = { c: { ...g.c }, r: g.r };
    else if (o.t === 'arc') s = { c: { ...g.c }, r: g.r, s: g.s, w: g.w };
    else if (o.t === 'polygon') s = { pts: g.pts.map(p => ({ ...p })) };
    else if (o.t === 'fplot') s = { pts: fplotSamples(g, 200).map(q => q.p && { x: q.p.x, y: q.p.y }), fp: 1 };
    if (!s) continue;
    let a = traces.get(o.id); if (!a) traces.set(o.id, a = []);
    const last = a[a.length - 1];
    if (last && JSON.stringify({ ...last, _at: 0 }) === JSON.stringify({ ...s, _at: 0 })) continue;
    s._at = performance.now(); a.push(s); if (a.length > 6000) a.splice(0, a.length - 6000);
  }
  collectTables();
}
function eraseTraces() { traces.clear(); requestDraw(); }

/* ================= 그리기 ================= */
let drawQueued = false;
function requestDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(draw); } }
let showHiddenGhost = false;
let overlay = null; // 도구 미리보기 콜백

function lineRange(g, type) {
  const b = viewBoundsFn(), d = vsub(g.b, g.a), dd = vdot(d, d);
  const ts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => vdot(vsub({ x, y }, g.a), d) / dd);
  let t0 = Math.min(...ts), t1 = Math.max(...ts); if (type === 'ray') t0 = 0; if (type === 'segment') { t0 = 0; t1 = 1; }
  return [t0, Math.max(t0, t1)];
}
function setStroke(o, extraW = 0, color) {
  ctx.strokeStyle = color || colOf(o);
  ctx.lineWidth = [1, 1.25, 2.2, 3.6][o.w || 2] + extraW;
  ctx.setLineDash(extraW ? [] : o.dash === 1 ? [7, 5] : o.dash === 2 ? [1, 2.5] : []);
  ctx.lineCap = 'round';
}
function pathStraight(g, type) { const [t0, t1] = lineRange(g, type); const A = toS(lerp(g.a, g.b, t0)), B = toS(lerp(g.a, g.b, t1)); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
function pathCircle(g) { const c = toS(g.c); ctx.moveTo(c.x + g.r * view.s, c.y); ctx.arc(c.x, c.y, Math.abs(g.r * view.s), 0, TAU); }
function pathArc(g) { const c = toS(g.c), p = toS(arcEnd(g, 0)); ctx.moveTo(p.x, p.y); ctx.arc(c.x, c.y, g.r * view.s, -g.s, -(g.s + g.w), g.w > 0); }
function pathPoly(pts, close) { pts.forEach((p, i) => { const q = toS(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); if (close) ctx.closePath(); }
function pathSector(g) { const c = toS(g.c); ctx.moveTo(c.x, c.y); const p = toS(arcEnd(g, 0)); ctx.lineTo(p.x, p.y); ctx.arc(c.x, c.y, g.r * view.s, -g.s, -(g.s + g.w), g.w > 0); ctx.closePath(); }
function pathArcSeg(g) { const p = toS(arcEnd(g, 0)), c = toS(g.c); ctx.moveTo(p.x, p.y); ctx.arc(c.x, c.y, g.r * view.s, -g.s, -(g.s + g.w), g.w > 0); ctx.closePath(); }
function pathGeom(t, g) {
  if (t === 'segment' || t === 'ray' || t === 'line') pathStraight(g, t);
  else if (t === 'circle') pathCircle(g); else if (t === 'arc') pathArc(g);
  else if (t === 'polygon') pathPoly(g.pts, true); else if (t === 'cinterior') pathCircle(g);
  else if (t === 'sector') pathSector(g); else if (t === 'arcseg') pathArcSeg(g);
}
function pathFplot(g) {
  const b = viewBoundsFn(); let pen = false, prevY = null;
  const xs0 = g.xmin != null ? Math.max(b.x0, g.co.o.x + g.xmin * g.co.u) : b.x0, xs1 = g.xmax != null ? Math.min(b.x1, g.co.o.x + g.xmax * g.co.u) : b.x1;
  const step = 1.5 / view.s;
  for (let wx = xs0; wx <= xs1 + step * 0.5; wx += step) {
    const xx = Math.min(wx, xs1), x = (xx - g.co.o.x) / g.co.u, y = g.f(x);
    if (!isFinite(y)) { pen = false; continue; }
    const p = toS({ x: xx, y: g.co.o.y + y * g.co.uy });
    if (p.y < -4 * H || p.y > 5 * H) { pen = false; prevY = null; continue; }
    if (pen && prevY != null && Math.abs(p.y - prevY) > H * 1.2) pen = false;
    pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); pen = true; prevY = p.y;
  }
}
function pathLocus(o, g) {
  if (g.polys) { if (o.d && o.d.disc) { for (const q of g.polys) for (const p of q) { const s2 = toS(p); ctx.moveTo(s2.x + 1.6, s2.y); ctx.arc(s2.x, s2.y, 1.6, 0, TAU); } return; } for (const q of g.polys) pathPoly(q, false); return; }
  for (const it of g.items) {
    if (g.kind === 'point') continue;
    if (g.kind === 'segment' || g.kind === 'ray' || g.kind === 'line') pathStraight(it, g.kind);
    else if (g.kind === 'circle' || g.kind === 'cinterior') pathCircle(it);
    else if (g.kind === 'arc') pathArc(it); else if (g.kind === 'polygon') pathPoly(it.pts, true);
    else if (g.kind === 'fplot') { let pen = false; for (const p of it.pts) { if (!p) { pen = false; continue; } const q = toS(p); pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); pen = true; } }
  }
}

function niceStep(px) { const raw = 46 / px; const p = Math.pow(10, Math.floor(Math.log10(raw))); for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p; return 10 * p; }
function drawGrid(co, o) {
  const b = viewBoundsFn(), O = toS(co.o), u = co.u * view.s; const step = niceStep(u);
  ctx.save(); ctx.lineWidth = 1; ctx.setLineDash([]);
  const gx0 = Math.ceil((b.x0 - co.o.x) / co.u / step) * step, gx1 = (b.x1 - co.o.x) / co.u;
  const gy0 = Math.ceil((b.y0 - co.o.y) / co.u / step) * step, gy1 = (b.y1 - co.o.y) / co.u;
  if (o.d.grid !== false) {
    ctx.strokeStyle = THEME.grid; ctx.beginPath();
    if (o.d.dots) { ctx.fillStyle = THEME.axis; for (let x = gx0; x <= gx1; x += step) for (let y = gy0; y <= gy1; y += step) { const sx = O.x + x * u, sy = O.y - y * u; ctx.fillRect(sx - 1, sy - 1, 2, 2); } }
    else {
      for (let x = gx0; x <= gx1; x += step) { const sx = Math.round(O.x + x * u) + 0.5; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); }
      for (let y = gy0; y <= gy1; y += step) { const sy = Math.round(O.y - y * u) + 0.5; ctx.moveTo(0, sy); ctx.lineTo(W, sy); }
      ctx.stroke();
    }
  }
  ctx.strokeStyle = THEME.axis; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, O.y); ctx.lineTo(W, O.y); ctx.moveTo(O.x, 0); ctx.lineTo(O.x, H); ctx.stroke();
  ctx.fillStyle = THEME.axis; ctx.beginPath(); ctx.moveTo(W - 2, O.y); ctx.lineTo(W - 11, O.y - 4); ctx.lineTo(W - 11, O.y + 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(O.x, 2); ctx.lineTo(O.x - 4, 11); ctx.lineTo(O.x + 4, 11); ctx.fill();
  ctx.font = '11px "IBM Plex Sans KR", system-ui, sans-serif'; ctx.fillStyle = THEME.muted;
  const lab = v => { const s = +v.toFixed(6); return String(s).replace('-', '−'); };
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let x = gx0; x <= gx1; x += step) { if (Math.abs(x) < step / 2) continue; const sx = O.x + x * u; ctx.beginPath(); ctx.moveTo(sx, O.y - 3); ctx.lineTo(sx, O.y + 3); ctx.stroke(); ctx.fillText(lab(x), sx, clamp(O.y + 5, 2, H - 14)); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let y = gy0; y <= gy1; y += step) { if (Math.abs(y) < step / 2) continue; const sy = O.y - y * u; ctx.beginPath(); ctx.moveTo(O.x - 3, sy); ctx.lineTo(O.x + 3, sy); ctx.stroke(); ctx.fillText(lab(y), clamp(O.x - 6, 22, W - 2), sy); }
  ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('0', O.x - 5, O.y + 4);
  ctx.restore();
}

function labelAnchor(o, g) {
  if (!g) return null;
  if (o.t === 'point') return toS(g);
  if (isStraight(o)) { if (o.t === 'segment') return toS(lerp(g.a, g.b, 0.5)); const [t0, t1] = lineRange(g, o.t); return toS(lerp(g.a, g.b, o.t === 'ray' ? Math.min(1.5, t1 * 0.6) : clamp(0.5, t0 + (t1 - t0) * 0.15, t1 - (t1 - t0) * 0.15))); }
  if (o.t === 'circle') return toS(vadd(g.c, vpol(g.r, Math.PI / 4)));
  if (o.t === 'arc') return toS(arcEnd(g, 0.5));
  if (o.t === 'polygon') { const c = g.pts.reduce((a, p) => vadd(a, p), { x: 0, y: 0 }); return toS(vmul(c, 1 / g.pts.length)); }
  if (o.t === 'cinterior' || o.t === 'sector' || o.t === 'arcseg') return toS(g.c);
  if (o.t === 'fplot') { const [t0, t1] = fplotRange(g); for (const f of [0.8, 0.6, 0.4, 0.2]) { const p = fplotAt(g, t0 + (t1 - t0) * f); if (p) { const q = toS(p); if (q.x > 0 && q.x < W && q.y > 0 && q.y < H) return q; } } return null; }
  return null;
}
function defaultLabelOffset(o) { return o.t === 'point' ? { x: 7, y: -16 } : isInterior(o) ? { x: -6, y: -8 } : { x: 6, y: -18 }; }

function drawPointMark(p, o, selected, hover) {
  const r = [0, 2.6, 3.7, 5.2][o.ps || 2];
  if (selected) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, TAU); ctx.strokeStyle = THEME.sel; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.stroke(); }
  if (hover) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, TAU); ctx.fillStyle = rgba(THEME.hover, 0.28) || THEME.hover; ctx.fill(); }
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = colOf(o); ctx.fill();
  ctx.lineWidth = 1.4; ctx.strokeStyle = THEME.paper; ctx.setLineDash([]); ctx.stroke();
}

function screenBoxDraw(o, lines, opts = {}) {
  ctx.font = opts.font || FONT_VAL; const lh = opts.lh || 19, pad = opts.pad ?? 5;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2, h = lines.length * lh + pad * 2 - 4;
  const x = o.d.sx, y = o.d.sy; o._bb = { x, y, w, h };
  return { x, y, w, h, lh, pad };
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

let hoverId = null, hoverCand = null;
function draw() {
  drawQueued = false;
  if (dirty) recompute();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (THEME._paper == null) THEME._paper = THEME.paper; THEME.paper = doc.prefs.bg || THEME._paper;
  applyPalette();
  if (!exportNoBg) { ctx.fillStyle = THEME.paper; ctx.fillRect(0, 0, W, H); } else ctx.clearRect(0, 0, W, H);
  const selSet = new Set(sel);
  const ordObjs = doc.objs.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
  const vis = o => !o.hidden || showHiddenGhost;
  // 좌표계
  for (const co of doc.objs) if (co.t === 'coord' && !co.hidden && G[co.id]) drawCoord(G[co.id], co);
  // 자취
  if (doc.prefs.fade > 0) { const lim = performance.now() - doc.prefs.fade * 1000; for (const [id, arr] of traces) { let k = 0; while (k < arr.length && arr[k] && arr[k]._at < lim) k++; if (k) arr.splice(0, k); } if ([...traces.values()].some(a => a.length)) setTimeout(requestDraw, 200); }
  for (const [id, arr] of traces) {
    const o = obj(id); if (!o) continue; const c = colOf(o);
    ctx.save(); ctx.setLineDash([]);
    if (o.t === 'point') {
      ctx.strokeStyle = rgba(c, 0.75); ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.beginPath(); let prev = null; const b = viewBoundsFn(), jump = (b.x1 - b.x0) / 4;
      for (const p of arr) { if (!p) { prev = null; continue; } const q = toS(p); if (prev && vdist(prev, p) < jump) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); prev = p; }
      ctx.stroke();
    } else {
      ctx.strokeStyle = rgba(c, 0.32); ctx.lineWidth = 1; ctx.beginPath();
      for (const s of arr) if (s) { if (s.fp) { let pen = false; for (const p of s.pts) { if (!p) { pen = false; continue; } const q = toS(p); pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); pen = true; } } else pathGeom(o.t === 'cinterior' ? 'circle' : o.t, s); }
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const o of ordObjs) { if (o.t === 'picture' && vis(o) && G[o.id]) (o.k === 'cxf' ? drawMeshPicture : drawPicture)(o, G[o.id], selSet.has(o.id), hoverId === o.id); }
  for (const o of ordObjs) { if (o.t !== 'locus' || !vis(o) || !G[o.id] || G[o.id].kind !== 'picture') continue; const g = G[o.id]; for (const it of g.items) drawPicture({ d: {}, alpha: 0.5 }, { ...it, src: g.src }, false, false); }
  // 내부
  for (const o of ordObjs) {
    if (!isInterior(o) || !vis(o)) continue; const g = G[o.id]; if (!g) continue;
    ctx.beginPath(); pathGeom(o.t, g); ctx.fillStyle = rgba(colOf(o), o.hidden ? 0.08 : (o.alpha ?? 0.26)); ctx.fill('evenodd');
    if (selSet.has(o.id) || hoverId === o.id) {
      ctx.save(); ctx.clip('evenodd'); ctx.strokeStyle = rgba(selSet.has(o.id) ? THEME.sel : THEME.hover, 0.55) || THEME.sel; ctx.lineWidth = 1.2; ctx.setLineDash([]);
      ctx.beginPath(); for (let k = -H; k < W + H; k += 9) { ctx.moveTo(k, 0); ctx.lineTo(k + H, H); } ctx.stroke(); ctx.restore();
    }
  }
  for (const o of ordObjs) { if (o.t === 'iter' && vis(o) && G[o.id]) drawIter(o, G[o.id], selSet.has(o.id)); }
  // 경로 객체 (선택 강조 먼저)
  const paths = ordObjs.filter(o => vis(o) && (isStraight(o) || o.t === 'circle' || o.t === 'arc' || o.t === 'locus' || o.t === 'fplot') && G[o.id]);
  for (const o of paths) {
    const g = G[o.id], hi = selSet.has(o.id) ? THEME.sel : hoverId === o.id ? THEME.hover : null; if (!hi) continue;
    ctx.save(); ctx.globalAlpha = selSet.has(o.id) ? 0.55 : 0.4; setStroke(o, 6, hi); ctx.beginPath();
    if (o.t === 'locus') pathLocus(o, g); else if (o.t === 'fplot') pathFplotGeneral(g, o); else pathGeom(o.t, g);
    ctx.stroke(); ctx.restore();
  }
  for (const o of paths) {
    const g = G[o.id]; ctx.save(); if (o.hidden) ctx.globalAlpha = 0.25;
    if (o.t === 'locus' && g.kind === 'picture') { ctx.restore(); continue; }
    if (o.t === 'locus' && g.items) { ctx.globalAlpha *= g.kind === 'point' ? 1 : 0.55; setStroke(o); ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.6); }
    else setStroke(o);
    ctx.beginPath();
    if (o.t === 'locus') pathLocus(o, g); else if (o.t === 'fplot') pathFplotGeneral(g, o); else pathGeom(o.t, g);
    ctx.stroke();
    if (o.t === 'segment' && o.d.ticks) drawTicks(g, o.d.ticks, colOf(o));
    ctx.restore();
  }
  for (const o of ordObjs) { if (o.t === 'drawing' && vis(o)) drawingPathDraw(o, null, selSet.has(o.id) ? THEME.sel : hoverId === o.id ? THEME.hover : null); }
  // 각 표시
  for (const o of ordObjs) { if (o.t !== 'amark' || !vis(o)) continue; const g = G[o.id]; if (g) drawAngleMark(o, g, selSet.has(o.id) || hoverId === o.id); }
  for (const o of ordObjs) { if (o.t !== 'tplot' || !vis(o)) continue; ctx.save(); for (const p of tplotPoints(o)) { const q = toS(p); ctx.beginPath(); ctx.arc(q.x, q.y, selSet.has(o.id) ? 5 : 3.6, 0, TAU); ctx.fillStyle = colOf(o); ctx.fill(); ctx.strokeStyle = selSet.has(o.id) ? THEME.sel : THEME.paper; ctx.lineWidth = 1.4; ctx.stroke(); } ctx.restore(); }
  // 점
  for (const o of ordObjs) {
    if (o.t !== 'point' || !vis(o)) continue; const g = G[o.id]; if (!okp(g)) continue;
    const p = toS(g); if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue;
    ctx.save(); if (o.hidden) ctx.globalAlpha = 0.3; drawPointMark(p, o, selSet.has(o.id), hoverId === o.id); ctx.restore();
  }
  // 레이블
  ctx.font = labelFont(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  for (const o of ordObjs) {
    o._lb = null;
    if (!o.showLabel || !o.label || o.hidden) continue; const a = labelAnchor(o, G[o.id]); if (!a) continue;
    ctx.font = objLabelFont(o); const lsz = (o.lf && o.lf.size) || doc.prefs.labelSize || 16;
    const off = o.lo || defaultLabelOffset(o), txt = disp(o.label), w = ctx.measureText(txt).width;
    const x = a.x + off.x, y = a.y + off.y + lsz * 0.88;
    o._lb = { x, y: y - lsz * 0.88, w, h: lsz * 1.12 };
    ctx.fillStyle = THEME.paper; ctx.globalAlpha = 0.7; ctx.fillRect(x - 1, y - lsz * 0.82, w + 2, lsz * 1.06); ctx.globalAlpha = 1;
    ctx.fillStyle = selSet.has(o.id) && hitPartSel === 'label' ? THEME.sel : col(o.lf && o.lf.color ? o.lf.color : o.t === 'point' || isInterior(o) ? 'ink' : o.color);
    ctx.fillText(txt, x, y);
  }
  // 화면 객체
  for (const o of ordObjs) { if (!isScreenObj(o) || (o.hidden && !showHiddenGhost)) continue; drawScreenObj(o, selSet.has(o.id), hoverId === o.id); }
  if (overlay) { ctx.save(); overlay(ctx); ctx.restore(); }
  if (typeof afterDraw === 'function') afterDraw();
}
let hitPartSel = null;
function drawTicks(g, n, c) {
  const A = toS(g.a), B = toS(g.b), M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, d = vnorm(vsub(B, A)); if (!d) return;
  const pp = vperp(d); ctx.setLineDash([]); ctx.lineWidth = 1.6; ctx.strokeStyle = c; ctx.beginPath();
  for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 5; const C = vadd(M, vmul(d, off)); ctx.moveTo(C.x + pp.x * 6, C.y + pp.y * 6); ctx.lineTo(C.x - pp.x * 6, C.y - pp.y * 6); }
  ctx.stroke();
}
function drawAngleMark(o, g, hi) {
  const V = toS(g.V), aA = vang(vsub(g.A, g.V)), aB = vang(vsub(g.B, g.V)); const sweep = mod(aB - aA, TAU);
  const right = Math.abs(sweep - Math.PI / 2) < 1e-4;
  ctx.save(); ctx.setLineDash([]); ctx.lineWidth = hi ? 2.6 : 1.5; ctx.strokeStyle = hi ? THEME.sel : colOf(o);
  const fillC = rgba(col(o.color === 'ink' ? 'gold' : o.color), 0.18);
  if (right && (o.d.n || 1) === 1) {
    const s = 13, u = { x: Math.cos(aA), y: -Math.sin(aA) }, v = { x: Math.cos(aB), y: -Math.sin(aB) };
    ctx.beginPath(); ctx.moveTo(V.x + u.x * s, V.y + u.y * s); ctx.lineTo(V.x + (u.x + v.x) * s, V.y + (u.y + v.y) * s); ctx.lineTo(V.x + v.x * s, V.y + v.y * s);
    ctx.stroke(); ctx.lineTo(V.x, V.y); ctx.closePath(); ctx.fillStyle = fillC; ctx.fill();
  } else {
    for (let k = 0; k < (o.d.n || 1); k++) {
      const R = (o.d.r || 20) + k * 4.5; ctx.beginPath(); ctx.arc(V.x, V.y, R, -aA, -(aA + sweep), true); ctx.stroke();
      if (k === 0) { ctx.lineTo(V.x, V.y); ctx.closePath(); ctx.fillStyle = fillC; ctx.fill(); }
    }
  }
  if (o.d.dir && !(right && (o.d.n || 1) === 1)) { const R0 = (o.d.r || 20) + ((o.d.n || 1) - 1) * 4.5, ae = aA + sweep; const E = { x: V.x + R0 * Math.cos(ae), y: V.y - R0 * Math.sin(ae) }; const tg = { x: -Math.sin(ae), y: -Math.cos(ae) }; const nv = { x: Math.cos(ae), y: -Math.sin(ae) }; ctx.beginPath(); ctx.moveTo(E.x + tg.x * 2, E.y + tg.y * 2); ctx.lineTo(E.x - tg.x * 7 + nv.x * 3.5, E.y - tg.y * 7 + nv.y * 3.5); ctx.lineTo(E.x - tg.x * 7 - nv.x * 3.5, E.y - tg.y * 7 - nv.y * 3.5); ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); }
  o._arc = { V, R: o.d.r || 20, a0: aA, sw: sweep };
  ctx.restore();
}
function drawScreenObj(o, selected, hover) {
  ctx.save(); if (o.hidden) ctx.globalAlpha = 0.35;
  if (o.t === 'value') {
    const txt = valueText(o), isParam = o.k === 'param';
    const vf = valueFont(o), vsz = o.d.size || doc.prefs.valSize || 14; const b = screenBoxDraw(o, [txt], { pad: isParam ? 7 : 4, font: vf, lh: vsz * 1.36 });
    if (isParam) { roundRect(b.x, b.y, b.w, b.h, 4); ctx.fillStyle = THEME.chip; ctx.fill(); ctx.strokeStyle = THEME.chipLine; ctx.lineWidth = 1; ctx.stroke(); }
    if (selected || hover) { roundRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4, 4); ctx.strokeStyle = selected ? THEME.sel : THEME.hover; ctx.lineWidth = selected ? 2 : 1.2; ctx.setLineDash(selected ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]); }
    if (!isParam) { ctx.globalAlpha *= 0.82; ctx.fillStyle = THEME.paper; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.globalAlpha = o.hidden ? 0.35 : 1; }
    ctx.fillStyle = colOf(o); ctx.textBaseline = 'top'; ctx.font = vf; ctx.fillText(txt, b.x + b.pad, b.y + b.pad + 1);
  } else if (o.t === 'text') { ctx.restore(); drawRichText(o, selected, hover); return;
  } else if (o.t === 'text_old') {
    const lines = (o.d.text || '').split('\n'); const fs = o.d.size || 15;
    const b = screenBoxDraw(o, lines, { font: `${o.d.bold ? 600 : 400} ${fs}px "IBM Plex Sans KR", system-ui, sans-serif`, lh: fs * 1.4, pad: 3 });
    if (selected || hover) { ctx.strokeStyle = selected ? THEME.sel : THEME.hover; ctx.lineWidth = selected ? 2 : 1; ctx.setLineDash([3, 3]); ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); ctx.setLineDash([]); }
    ctx.globalAlpha *= 0.82; ctx.fillStyle = THEME.paper; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.globalAlpha = o.hidden ? 0.35 : 1;
    ctx.fillStyle = colOf(o); ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, b.x + b.pad, b.y + b.pad + i * b.lh));
  } else if (o.t === 'table') { ctx.restore(); drawTable(o, selected, hover); return;
  } else if (o.t === 'button') {
    const txt = o.d.text || '버튼'; ctx.font = '600 13px "IBM Plex Sans KR", system-ui, sans-serif';
    const w = ctx.measureText(txt).width + 34, h = 28, x = o.d.sx, y = o.d.sy; o._bb = { x, y, w, h };
    roundRect(x, y, w, h, 6); ctx.fillStyle = THEME.btn; ctx.fill(); ctx.strokeStyle = selected ? THEME.sel : THEME.chipLine; ctx.lineWidth = selected ? 2 : 1; ctx.stroke();
    ctx.fillStyle = THEME.btnInk; ctx.beginPath();
    const ix = x + 10, iy = y + h / 2;
    if (o.d.act === 'anim') { if (o._running) { ctx.fillRect(ix, iy - 5, 3.5, 10); ctx.fillRect(ix + 6, iy - 5, 3.5, 10); } else { ctx.moveTo(ix, iy - 6); ctx.lineTo(ix + 10, iy); ctx.lineTo(ix, iy + 6); ctx.fill(); } }
    else if (o.d.act === 'link') { ctx.strokeStyle = THEME.btnInk; ctx.lineWidth = 1.6; ctx.strokeRect(ix, iy - 6, 8, 11); ctx.beginPath(); ctx.moveTo(ix + 5, iy - 1); ctx.lineTo(ix + 12, iy - 1); ctx.moveTo(ix + 9, iy - 4); ctx.lineTo(ix + 12, iy - 1); ctx.lineTo(ix + 9, iy + 2); ctx.stroke(); }
    else if (o.d.act === 'move') { ctx.moveTo(ix, iy - 5); ctx.lineTo(ix + 10, iy); ctx.lineTo(ix, iy + 5); ctx.lineTo(ix + 3, iy); ctx.fill(); }
    else { ctx.arc(ix + 5, iy, 5, 0, TAU); ctx.lineWidth = 1.6; ctx.strokeStyle = THEME.btnInk; ctx.stroke(); ctx.beginPath(); ctx.arc(ix + 5, iy, 2, 0, TAU); ctx.fill(); }
    ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 26, y + h / 2 + 1);
  }
  ctx.restore();
}

/* ================= 선택 판정 ================= */
let touchMode = false;
function distSeg(p, a, b) { const d = vsub(b, a), dd = vdot(d, d); const t = dd < 1e-9 ? 0 : clamp(vdot(vsub(p, a), d) / dd, 0, 1); return vdist(p, lerp(a, b, t)); }
function hitDist(o, g, P) {
  if (!g) return Infinity;
  if (o.t === 'point') return vdist(P, toS(g));
  if (isStraight(o)) {
    const A = toS(g.a), B = toS(g.b), d = vsub(B, A), dd = vdot(d, d); let t = vdot(vsub(P, A), d) / dd;
    if (o.t === 'segment') t = clamp(t, 0, 1); if (o.t === 'ray') t = Math.max(0, t);
    return vdist(P, lerp(A, B, t));
  }
  if (o.t === 'circle') { return Math.abs(vdist(P, toS(g.c)) - g.r * view.s); }
  if (o.t === 'arc') { const w = toW(P.x, P.y); if (!onArc(g, vang(vsub(w, g.c)))) return Math.min(vdist(P, toS(arcEnd(g, 0))), vdist(P, toS(arcEnd(g, 1)))); return Math.abs(vdist(P, toS(g.c)) - g.r * view.s); }
  if (o.t === 'locus') {
    let best = Infinity;
    if (g.polys) for (const q of g.polys) for (let i = 0; i + 1 < q.length; i++) best = Math.min(best, distSeg(P, toS(q[i]), toS(q[i + 1])));
    else if (g.items) for (const it of g.items) { if (g.kind === 'fplot') { let prev = null; for (const p of it.pts) { if (!p) { prev = null; continue; } const q = toS(p); if (prev) best = Math.min(best, distSeg(P, prev, q)); prev = q; } continue; } const fake = { t: g.kind }; if (g.kind !== 'polygon') best = Math.min(best, hitDist(fake, it, P)); }
    return best;
  }
  if (o.t === 'fplot') {
    const hg = hitFplot(g, P); if (hg != null) return hg;
    let best = Infinity, prev = null;
    for (let dx = -8; dx <= 8; dx += 1) {
      const w = toW(P.x + dx, 0).x, x = (w - g.co.o.x) / g.co.u; if (g.xmin != null && (x < g.xmin || x > g.xmax)) { prev = null; continue; }
      const y = g.f(x); if (!isFinite(y)) { prev = null; continue; }
      const q = toS({ x: w, y: g.co.o.y + y * g.co.uy }); if (prev) best = Math.min(best, distSeg(P, prev, q)); prev = q;
    }
    return best;
  }
  if (o.t === 'iter') return hitIter(o, g, P);
  if (o.t === 'drawing') return hitDrawing(o, P);
  if (o.t === 'tplot') { let b = Infinity; for (const p of tplotPoints(o)) b = Math.min(b, vdist(P, toS(p))); return b; }
  if (o.t === 'amark' && o._arc) { const a = o._arc; const d = vdist(P, a.V); return d < a.R + 8 && d > 4 ? (() => { const ang = Math.atan2(-(P.y - a.V.y), P.x - a.V.x); return mod(ang - a.a0, TAU) <= a.sw ? Math.abs(d - a.R) * 0.5 : Infinity; })() : Infinity; }
  return Infinity;
}
function insideInterior(o, g, P) {
  if (!g) return false; const w = toW(P.x, P.y);
  if (o.t === 'polygon') { let c = false; const p = g.pts; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i].y > w.y) !== (p[j].y > w.y) && w.x < (p[j].x - p[i].x) * (w.y - p[i].y) / (p[j].y - p[i].y) + p[i].x) c = !c; return c; }
  if (o.t === 'cinterior') return vdist(w, g.c) <= g.r;
  if (o.t === 'sector') return vdist(w, g.c) <= g.r && onArc(g, vang(vsub(w, g.c)));
  if (o.t === 'arcseg') { if (vdist(w, g.c) > g.r) return false; const A = arcEnd(g, 0), B = arcEnd(g, 1), M = arcEnd(g, 0.5); return Math.sign(vcross(vsub(B, A), vsub(w, A))) === Math.sign(vcross(vsub(B, A), vsub(M, A))); }
  return false;
}
// 반환 {id, part} 또는 null
function hitTest(sx, sy, filter = () => true) {
  if (dirty) recompute();
  const P = { x: sx, y: sy }, tol = touchMode ? 14 : 7;
  const vis = o => (!o.hidden || showHiddenGhost) && filter(o);
  const objs = doc.objs;
  for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (isScreenObj(o) && vis(o) && o._bb) { const b = o._bb; if (sx >= b.x - 2 && sx <= b.x + b.w + 2 && sy >= b.y - 2 && sy <= b.y + b.h + 2) return { id: o.id, part: 'obj' }; } }
  for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (o._lb && vis(o) && filter(o, 'label')) { const b = o._lb; if (sx >= b.x - 2 && sx <= b.x + b.w + 2 && sy >= b.y - 1 && sy <= b.y + b.h + 1) return { id: o.id, part: 'label' }; } }
  let best = null, bd = tol + 1;
  for (const o of objs) { if (o.t !== 'point' || !vis(o)) continue; const d = hitDist(o, G[o.id], P); if (d < bd) { bd = d; best = o; } }
  if (best) return { id: best.id, part: 'obj' };
  bd = tol - 1;
  for (const o of objs) { if (!(isStraight(o) || o.t === 'circle' || o.t === 'arc' || o.t === 'locus' || o.t === 'fplot' || o.t === 'amark' || o.t === 'iter' || o.t === 'tplot' || o.t === 'drawing') || !vis(o)) continue; const d = hitDist(o, G[o.id], P); if (d < bd) { bd = d; best = o; } }
  if (best) return { id: best.id, part: 'obj' };
  for (const o of objs) { if (o.t !== 'coord' || o.hidden || o.d.axes === false || !filter(o) || !G[o.id]) continue; const O = toS(G[o.id].o); if (Math.min(Math.abs(sy - O.y), Math.abs(sx - O.x)) < tol - 2) return { id: o.id, part: 'obj' }; }
  for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (isInterior(o) && vis(o) && insideInterior(o, G[o.id], P)) return { id: o.id, part: 'obj' }; }
  for (const cx of [false, true]) for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (o.t === 'picture' && (o.k === 'cxf') === cx && vis(o) && G[o.id] && insidePicture(G[o.id], P)) return { id: o.id, part: 'obj' }; } // 원래 그림을 먼저 (변환된 상은 그다음)
  return null;
}
function nearPaths(sx, sy, tol) {
  const P = { x: sx, y: sy }; const out = [];
  for (const o of doc.objs) { if (o.hidden || !(canIntersect(o) || o.t === 'locus' || o.t === 'fplot' || o.t === 'polygon' || o.t === 'cinterior')) continue; const g = G[o.id]; if (!g) continue;
    let d; if (o.t === 'polygon') { d = Infinity; for (let i = 0; i < g.pts.length; i++) d = Math.min(d, distSeg(P, toS(g.pts[i]), toS(g.pts[(i + 1) % g.pts.length]))); } else if (o.t === 'cinterior') d = hitDist({ t: 'circle' }, g, P); else d = hitDist(o, g, P);
    if (d <= tol) out.push({ o, d }); }
  return out.sort((a, b) => a.d - b.d);
}
