'use strict';
/* ================= 3D 작도 (공간 페이지) =================
   좌표공간의 점·선분·직선·평면·구, 돌려 보기, 교점·교선·단면.
   장면은 그 페이지 문서의 doc.space 에 담는다: 되돌리기·저장·페이지 복제가 2D 와 같은 길로 간다. */
function spaceNew() { return { v: 1, objs: [], nid: 1, cam: { az: -0.72, el: 0.42, s: 46, px: 0, py: 0 }, R: 5, alg: true }; }
const SP = () => doc.space;
let G3 = new Map(), spSel = [], spPick = [], spTool = 'move', spDrag = null, spHover = null, spCursor = null;
const SP_GREEK = 'αβγδεζηθικλμνξοπρστυφχψω';
const SP_COL = { point: '#1d4ed8', segment: '#334155', line: '#334155', plane: '#0ea5e9', sphere: '#f59e0b', circle: '#dc2626' };

/* ---- 벡터 ---- */
const v3 = (x, y, z) => ({ x, y, z });
const vA = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z), vS = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z), vK = (a, k) => v3(a.x * k, a.y * k, a.z * k);
const vD = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z, vX = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const vL = a => Math.sqrt(vD(a, a)), vN = a => { const l = vL(a); return l > 1e-12 ? vK(a, 1 / l) : null; };
const ok3 = p => p && isFinite(p.x) && isFinite(p.y) && isFinite(p.z);

/* ---- 이름 ---- */
function spName(t) {
  const used = new Set(SP().objs.map(o => o.name));
  const pick = list => { for (let r = 0; ; r++) for (const c of list) { const n = r ? c + r : c; if (!used.has(n)) return n; } };
  if (t === 'point') return pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
  if (t === 'plane') return pick(SP_GREEK.split('').filter(c => c !== 'ο'));
  if (t === 'sphere') return pick(['S', 'T', 'U']);
  if (t === 'circle') return pick(['c', 'd', 'e']);
  if (t === 'line') return pick(['l', 'm', 'n', 'k']);
  return pick(['s', 'r', 'q']);
}
const spObj = id => SP().objs.find(o => o.id === id);
const spByName = n => SP().objs.find(o => o.name === n);
function spAdd(o) { const S = SP(); o.id = S.nid++; if (!o.name) o.name = spName(o.t); S.objs.push(o); spCompute(); return o; }

/* ---- 계산 ---- */
function spIntersect(a, b) { // 두 도형의 교집합: 점 목록, 직선, 원
  const A = G3.get(a.id), B = G3.get(b.id); if (!A || !B) return null;
  const T = o => o.t === 'segment' ? 'line' : o.t;
  let [p, q, P, Q] = [a, b, A, B]; const order = ['plane', 'sphere', 'line', 'circle'];
  if (order.indexOf(T(p)) > order.indexOf(T(q))) [p, q, P, Q] = [q, p, Q, P];
  const tp = T(p), tq = T(q);
  if (tp === 'plane' && tq === 'plane') { const d = vX(P.n, Q.n); if (vL(d) < 1e-9) return null; const dd = vD(d, d); const pt = vK(vA(vK(vX(Q.n, d), P.d), vK(vX(d, P.n), Q.d)), 1 / dd); return { kind: 'line', P: pt, d: vN(d) }; }
  if (tp === 'plane' && tq === 'sphere') { const dist = vD(P.n, Q.C) - P.d; if (Math.abs(dist) > Q.r + 1e-9) return null; return { kind: 'circle', C: vS(Q.C, vK(P.n, dist)), n: P.n, r: Math.sqrt(Math.max(0, Q.r * Q.r - dist * dist)) }; }
  if (tp === 'plane' && tq === 'line') { const den = vD(P.n, Q.d); if (Math.abs(den) < 1e-12) return null; const t = (P.d - vD(P.n, Q.P)) / den; if (Q.seg && (t < -1e-9 || t > 1 + 1e-9)) return { kind: 'points', pts: [] }; return { kind: 'points', pts: [vA(Q.P, vK(Q.d, t))] }; }
  if (tp === 'sphere' && tq === 'sphere') { const dv = vS(Q.C, P.C), D = vL(dv); if (D < 1e-12 || D > P.r + Q.r || D < Math.abs(P.r - Q.r)) return null; const x = (D * D + P.r * P.r - Q.r * Q.r) / (2 * D), n = vK(dv, 1 / D); return { kind: 'circle', C: vA(P.C, vK(n, x)), n, r: Math.sqrt(Math.max(0, P.r * P.r - x * x)) }; }
  if (tp === 'sphere' && tq === 'line') { const f = vS(Q.P, P.C), a2 = vD(Q.d, Q.d), b2 = 2 * vD(f, Q.d), c2 = vD(f, f) - P.r * P.r, disc = b2 * b2 - 4 * a2 * c2; if (disc < 0) return { kind: 'points', pts: [] }; const s = Math.sqrt(disc); return { kind: 'points', pts: [(-b2 - s) / (2 * a2), (-b2 + s) / (2 * a2)].filter(t => !Q.seg || (t >= -1e-9 && t <= 1 + 1e-9)).map(t => vA(Q.P, vK(Q.d, t))) }; }
  if (tp === 'line' && tq === 'line') { const w = vS(P.P, Q.P), a1 = vD(P.d, P.d), b1 = vD(P.d, Q.d), c1 = vD(Q.d, Q.d), d1 = vD(P.d, w), e1 = vD(Q.d, w), den = a1 * c1 - b1 * b1; if (Math.abs(den) < 1e-12) return null; const s = (b1 * e1 - c1 * d1) / den, t = (a1 * e1 - b1 * d1) / den; const X = vA(P.P, vK(P.d, s)), Y = vA(Q.P, vK(Q.d, t)); if (vL(vS(X, Y)) > 1e-6 * Math.max(1, vL(X))) return { kind: 'points', pts: [] }; if ((P.seg && (s < -1e-9 || s > 1 + 1e-9)) || (Q.seg && (t < -1e-9 || t > 1 + 1e-9))) return { kind: 'points', pts: [] }; return { kind: 'points', pts: [X] }; }
  if (tp === 'plane' && tq === 'circle') { const L = spIntersect({ t: 'plane', id: -1 }, { t: 'plane', id: -2 }); return L; }
  return null;
}
function spCompute() {
  const S = SP(); G3 = new Map(); if (!S) return;
  for (const o of S.objs) {
    const g = id => G3.get(id); let r = null;
    try {
      if (o.t === 'point') {
        if (o.k === 'free') r = v3(o.x, o.y, o.z);
        else if (o.k === 'mid') { const a = g(o.p[0]), b = g(o.p[1]); if (a && b) r = vK(vA(a, b), 0.5); }
        else if (o.k === 'int') { const I = spIntersect(spObj(o.p[0]), spObj(o.p[1])); if (I && I.kind === 'points' && I.pts[o.i || 0]) r = I.pts[o.i || 0]; }
      } else if (o.t === 'segment' || o.t === 'line') {
        if (o.k === 'pp') { const I = spIntersect(spObj(o.p[0]), spObj(o.p[1])); if (I && I.kind === 'line') r = { P: I.P, d: I.d, seg: false }; }
        else { const a = g(o.p[0]), b = g(o.p[1]); if (a && b && vL(vS(b, a)) > 1e-12) r = { P: a, d: vS(b, a), seg: o.t === 'segment' }; }
      } else if (o.t === 'plane') {
        if (o.k === 'eq') { const n0 = v3(o.a, o.b, o.c), l = vL(n0); if (l > 1e-12) r = { n: vK(n0, 1 / l), d: o.d / l }; }
        else { const a = g(o.p[0]), b = g(o.p[1]), c = g(o.p[2]); if (a && b && c) { const n = vN(vX(vS(b, a), vS(c, a))); if (n) r = { n, d: vD(n, a) }; } }
      } else if (o.t === 'sphere') {
        if (o.k === 'eq') r = { C: v3(o.cx, o.cy, o.cz), r: o.r };
        else { const c = g(o.p[0]); if (c) { const rr = o.k === 'cr' ? o.r : (g(o.p[1]) ? vL(vS(g(o.p[1]), c)) : NaN); if (rr > 0) r = { C: c, r: rr }; } }
      } else if (o.t === 'circle') { const I = spIntersect(spObj(o.p[0]), spObj(o.p[1])); if (I && I.kind === 'circle' && I.r > 1e-9) r = I; }
    } catch (e) { r = null; }
    if (r) G3.set(o.id, r);
  }
}

/* ---- 보기(사영) ---- */
function spBasis() {
  const c = SP().cam, ca = Math.cos(c.az), sa = Math.sin(c.az), ce = Math.cos(c.el), se = Math.sin(c.el);
  return { v: v3(ce * ca, ce * sa, se), r: v3(-sa, ca, 0), u: v3(-se * ca, -se * sa, ce), ox: W / 2 + c.px, oy: H / 2 + c.py, s: c.s };
}
let SPB = null;
const spP = P => ({ x: SPB.ox + SPB.s * vD(P, SPB.r), y: SPB.oy - SPB.s * vD(P, SPB.u), z: vD(P, SPB.v) });
function spRay(sx, sy) { const Q = vA(vK(SPB.r, (sx - SPB.ox) / SPB.s), vK(SPB.u, (SPB.oy - sy) / SPB.s)); return { Q, v: SPB.v }; }
function spRayPlane(sx, sy, n, d) { const { Q, v } = spRay(sx, sy), den = vD(n, v); if (Math.abs(den) < 1e-6) return null; return vA(Q, vK(v, (d - vD(n, Q)) / den)); }
function spClipLine(P, d, seg) { // 상자 [-R,R]^3 안의 부분
  const R = SP().R; let t0 = seg ? 0 : -1e9, t1 = seg ? 1 : 1e9;
  for (const k of ['x', 'y', 'z']) { if (Math.abs(d[k]) < 1e-12) { if (P[k] < -R || P[k] > R) return null; continue; } let a = (-R - P[k]) / d[k], b = (R - P[k]) / d[k]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
  if (seg) { t0 = 0; t1 = 1; } else if (t0 > t1) return null;
  return [vA(P, vK(d, t0)), vA(P, vK(d, t1))];
}
function spPlanePoly(n, d) { // 평면과 상자가 만나는 다각형
  const R = SP().R, C = []; for (const x of [-R, R]) for (const y of [-R, R]) for (const z of [-R, R]) C.push(v3(x, y, z));
  const pts = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const a = C[i], b = C[j], diff = [a.x !== b.x, a.y !== b.y, a.z !== b.z].filter(Boolean).length; if (diff !== 1) continue; const fa = vD(n, a) - d, fb = vD(n, b) - d; if (fa * fb > 0 || Math.abs(fa - fb) < 1e-12) continue; pts.push(vA(a, vK(vS(b, a), fa / (fa - fb)))); }
  if (pts.length < 3) return null;
  const c = vK(pts.reduce(vA, v3(0, 0, 0)), 1 / pts.length), e1 = vN(Math.abs(n.x) < 0.9 ? vX(n, v3(1, 0, 0)) : vX(n, v3(0, 1, 0))), e2 = vX(n, e1);
  return pts.map(p => ({ p, a: Math.atan2(vD(vS(p, c), e2), vD(vS(p, c), e1)) })).sort((x, y) => x.a - y.a).map(x => x.p);
}
function spCircle(C, n, r, N = 96) { const e1 = vN(Math.abs(n.x) < 0.9 ? vX(n, v3(1, 0, 0)) : vX(n, v3(0, 1, 0))), e2 = vX(n, e1), out = []; for (let i = 0; i <= N; i++) { const t = i / N * TAU; out.push(vA(C, vA(vK(e1, r * Math.cos(t)), vK(e2, r * Math.sin(t))))); } return out; }

/* ---- 보이기 ---- */
const spFmt = x => { const v = Math.abs(x) < 5e-10 ? 0 : +x.toFixed(2); return String(v).replace('-', '−'); };
const spPt = p => `(${spFmt(p.x)}, ${spFmt(p.y)}, ${spFmt(p.z)})`;
function spEqText(o, g) {
  if (o.t === 'plane') {
    let a, b, c, d; if (o.k === 'eq') ({ a, b, c, d } = o); else { const n = g.n; const m = Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)); let k = 1 / m; for (const cand of [1, 2, 3, 4, 5, 6]) { const kk = cand / m; if ([n.x, n.y, n.z, g.d].every(x => Math.abs(x * kk - Math.round(x * kk)) < 1e-6)) { k = kk; break; } } a = n.x * k; b = n.y * k; c = n.z * k; d = g.d * k; }
    let s = ''; [[a, 'x'], [b, 'y'], [c, 'z']].forEach(([k, v]) => { if (Math.abs(k) < 1e-9) return; const ab = Math.abs(k), cf = Math.abs(ab - 1) < 1e-9 ? '' : spFmt(ab); s += (s ? (k < 0 ? ' − ' : ' + ') : (k < 0 ? '−' : '')) + cf + v; });
    return (s || '0') + ' = ' + spFmt(d);
  }
  if (o.t === 'sphere') { const t = (v, c) => Math.abs(c) < 1e-9 ? v + '²' : `(${v} ${c > 0 ? '−' : '+'} ${spFmt(Math.abs(c))})²`; return `${t('x', g.C.x)} + ${t('y', g.C.y)} + ${t('z', g.C.z)} = ${spFmt(g.r * g.r)}`; }
  return '';
}
function spAlgLines() {
  const L = [];
  for (const o of SP().objs) {
    if (o.hidden) continue; const g = G3.get(o.id);
    if (!g) { L.push({ o, s: o.name + ' : 정의되지 않음' }); continue; }
    if (o.t === 'point') L.push({ o, s: `${o.name} = ${spPt(g)}` });
    else if (o.t === 'segment') L.push({ o, s: `${spObj(o.p[0]).name}${spObj(o.p[1]).name} = ${spFmt(vL(g.d))}` });
    else if (o.t === 'line') L.push({ o, s: `${o.name} : (x, y, z) = ${spPt(g.P)} + t${spPt(vN(g.d))}` });
    else if (o.t === 'plane' || o.t === 'sphere') L.push({ o, s: `${o.name} : ${spEqText(o, g)}` });
    else if (o.t === 'circle') L.push({ o, s: `${o.name} : 중심 ${spPt(g.C)}, 반지름 ${spFmt(g.r)}` });
  }
  return L;
}
function drawSpace() {
  const S = SP(); spCompute(); SPB = spBasis(); const R = S.R, sz = bigUI ? 1.45 : 1;
  const ink = THEME.ink || '#1f2937', mute = THEME.muted || '#94a3b8', grid = THEME.grid || 'rgba(100,116,139,.18)';
  const line = (a, b, st, w, dash) => { const A = spP(a), B = spP(b); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.strokeStyle = st; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // xy 평면 격자와 축
  for (let i = -R; i <= R; i++) { line(v3(i, -R, 0), v3(i, R, 0), grid, 1); line(v3(-R, i, 0), v3(R, i, 0), grid, 1); }
  ctx.font = `${12 * sz}px ${getComputedStyle(document.body).fontFamily}`; ctx.fillStyle = mute; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const axes = [['x', v3(1, 0, 0), '#dc2626'], ['y', v3(0, 1, 0), '#16a34a'], ['z', v3(0, 0, 1), '#2563eb']];
  for (const [nm, e, c] of axes) {
    line(vK(e, -R), vK(e, R + 0.6), c, 1.6 * sz);
    const T = spP(vK(e, R + 0.6)), B = spP(vK(e, R + 0.2)), dx = T.x - B.x, dy = T.y - B.y, L = Math.hypot(dx, dy) || 1;
    ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(T.x - dx / L * 9 - dy / L * 4, T.y - dy / L * 9 + dx / L * 4); ctx.lineTo(T.x - dx / L * 9 + dy / L * 4, T.y - dy / L * 9 - dx / L * 4); ctx.fillStyle = c; ctx.fill();
    ctx.font = `italic 600 ${15 * sz}px "Times New Roman", serif`; ctx.fillText(nm, T.x + dx / L * 12, T.y + dy / L * 12);
    ctx.font = `${11 * sz}px sans-serif`; ctx.fillStyle = mute;
    const step = SPB.s < 28 ? 2 : 1;
    for (let i = -R; i <= R; i += step) { if (!i) continue; const p = spP(vK(e, i)); ctx.fillText(String(i).replace('-', '−'), p.x + (nm === 'z' ? -12 : 0), p.y + (nm === 'z' ? 0 : 11)); }
  }
  const O = spP(v3(0, 0, 0)); ctx.fillText('O', O.x - 10, O.y + 10);
  // 면(평면·구)은 먼 것부터, 그다음 선, 맨 위에 점
  const faces = [], curves = [], pts = []; const selS = new Set(spSel), pickS = new Set(spPick);
  for (const o of S.objs) {
    if (o.hidden) continue; const g = G3.get(o.id); if (!g) continue; const hot = selS.has(o.id) || pickS.has(o.id) || spHover === o.id, col = o.color || ((o.t === 'segment' || o.t === 'line') ? ink : SP_COL[o.t]);
    if (o.t === 'plane') { const poly = spPlanePoly(g.n, g.d); if (!poly) continue; const pp = poly.map(spP); faces.push({ z: -1e6 + pp.reduce((s, p) => s + p.z, 0) / pp.length, draw: () => { ctx.beginPath(); pp.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.globalAlpha = hot ? 0.34 : 0.2; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = hot ? 2.4 : 1.2; ctx.stroke(); const c = pp.reduce((s, p) => ({ x: s.x + p.x / pp.length, y: s.y + p.y / pp.length }), { x: 0, y: 0 }); spLabel(o.name, pp[0].x + (c.x - pp[0].x) * 0.15, pp[0].y + (c.y - pp[0].y) * 0.15, col); } }); }
    else if (o.t === 'sphere') { const c = spP(g.C), rr = g.r * SPB.s; faces.push({ z: c.z, draw: () => { const gr = ctx.createRadialGradient(c.x - rr * 0.35, c.y - rr * 0.4, rr * 0.05, c.x, c.y, rr); gr.addColorStop(0, rgba(col, 0.15) || col); gr.addColorStop(1, rgba(col, 0.45) || col); ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, TAU); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = hot ? 2.6 : 1.4; ctx.stroke(); const eq = spCircle(g.C, v3(0, 0, 1), g.r, 72).map(spP); for (let i = 1; i < eq.length; i++) { const back = (eq[i].z + eq[i - 1].z) / 2 < c.z; ctx.beginPath(); ctx.moveTo(eq[i - 1].x, eq[i - 1].y); ctx.lineTo(eq[i].x, eq[i].y); ctx.strokeStyle = rgba(col, back ? 0.35 : 0.8) || col; ctx.setLineDash(back ? [4, 4] : []); ctx.lineWidth = 1; ctx.stroke(); } ctx.setLineDash([]); spLabel(o.name, c.x + rr * 0.72, c.y - rr * 0.78, col); } }); }
    else if (o.t === 'segment' || o.t === 'line') { const cl = spClipLine(g.P, g.d, g.seg); if (!cl) continue; curves.push(() => { line(cl[0], cl[1], col, (hot ? 3.2 : 2) * sz); if (o.t === 'line') { const m = spP(vK(vA(cl[0], cl[1]), 0.5)); spLabel(o.name, m.x + 6, m.y - 10, col); } }); }
    else if (o.t === 'circle') { const ring = spCircle(g.C, g.n, g.r).map(spP); curves.push(() => { ctx.beginPath(); ring.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.globalAlpha = 0.14; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = (hot ? 3.4 : 2.4) * sz; ctx.stroke(); spLabel(o.name, ring[0].x + 6, ring[0].y - 8, col); }); }
    else if (o.t === 'point') { const p = spP(g); pts.push(() => { const r = (o.k === 'free' ? 4.6 : 4) * sz; if (hot) { ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, TAU); ctx.strokeStyle = THEME.sel || '#f59e0b'; ctx.lineWidth = 2; ctx.stroke(); } ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = o.k === 'free' ? col : '#64748b'; ctx.fill(); ctx.strokeStyle = THEME.paper || '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); spLabel(o.name, p.x + 9, p.y - 10, ink); }); }
  }
  faces.sort((a, b) => a.z - b.z).forEach(f => f.draw()); curves.forEach(f => f()); pts.forEach(f => f());
  // 만드는 중인 도형 미리보기
  if (spPick.length && spCursor && ['segment', 'line', 'sphere', 'plane'].includes(spTool)) { const a = spP(G3.get(spPick[spPick.length - 1]) || v3(0, 0, 0)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(spCursor.x, spCursor.y); ctx.strokeStyle = THEME.hover || '#0ea5e9'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
  // 대수 창: 좌표·방정식
  if (S.alg) {
    const L = spAlgLines(); if (L.length) {
      const fs = 13.5 * sz, lh = fs * 1.55; ctx.font = `${fs}px ${getComputedStyle(document.body).fontFamily}`; const w = Math.min(W * 0.6, Math.max(...L.map(l => ctx.measureText(l.s).width)) + 24), h = L.length * lh + 14;
      ctx.fillStyle = rgba(THEME.paper || '#ffffff', 0.92) || '#fff'; ctx.strokeStyle = THEME.chipLine || THEME.grid || '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); const top = bigUI ? 74 : 56; ctx.roundRect ? ctx.roundRect(10, top, w, h, 8) : ctx.rect(10, top, w, h); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; L.forEach((l, i) => { ctx.fillStyle = selS.has(l.o.id) ? (THEME.accent || '#2563eb') : (l.o.color || ((l.o.t === 'segment' || l.o.t === 'line') ? ink : SP_COL[l.o.t])); ctx.fillText(l.s, 22, top + 7 + lh * (i + 0.5), w - 20); });
    }
  }
  ctx.restore(); refreshSpaceStatus();
}
function spLabel(s, x, y, col) { if (!s) return; ctx.save(); ctx.font = `italic ${15 * (bigUI ? 1.3 : 1)}px "Times New Roman", serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = THEME.paper || '#fff'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore(); }

/* ---- 고르기 ---- */
function spHit(sx, sy, filter = () => true) {
  spCompute(); SPB = spBasis(); const tol = hitTol(9), P = { x: sx, y: sy }; let best = null;
  const consider = (o, d, rank, z) => { if (!filter(o)) return; const key = rank * 1e6 + d - z * 1e-3; if (!best || key < best.key) best = { o, key }; };
  for (const o of SP().objs) {
    if (o.hidden) continue; const g = G3.get(o.id); if (!g) continue;
    if (o.t === 'point') { const p = spP(g), d = Math.hypot(p.x - sx, p.y - sy); if (d < tol + 2) consider(o, d, 0, p.z); }
    else if (o.t === 'segment' || o.t === 'line') { const cl = spClipLine(g.P, g.d, g.seg); if (!cl) continue; const a = spP(cl[0]), b = spP(cl[1]), d = distSeg(P, a, b); if (d < tol) consider(o, d, 1, (a.z + b.z) / 2); }
    else if (o.t === 'circle') { const ring = spCircle(g.C, g.n, g.r, 64).map(spP); let d = 1e9; for (let i = 1; i < ring.length; i++) d = Math.min(d, distSeg(P, ring[i - 1], ring[i])); if (d < tol) consider(o, d, 1, 0); }
    else if (o.t === 'sphere') { const c = spP(g.C), d = Math.hypot(c.x - sx, c.y - sy); if (d < g.r * SPB.s) consider(o, d, 2, c.z); }
    else if (o.t === 'plane') { const poly = spPlanePoly(g.n, g.d); if (!poly) continue; const pp = poly.map(spP); let inside = false; for (let i = 0, j = pp.length - 1; i < pp.length; j = i++) if ((pp[i].y > sy) !== (pp[j].y > sy) && sx < (pp[j].x - pp[i].x) * (sy - pp[i].y) / (pp[j].y - pp[i].y) + pp[i].x) inside = !inside; if (inside) consider(o, 0, 3, pp.reduce((s, p) => s + p.z, 0) / pp.length); }
  }
  return best ? best.o : null;
}
function distSeg(P, A, B) { const dx = B.x - A.x, dy = B.y - A.y, L = dx * dx + dy * dy; const t = L ? clamp(((P.x - A.x) * dx + (P.y - A.y) * dy) / L, 0, 1) : 0; return Math.hypot(P.x - A.x - t * dx, P.y - A.y - t * dy); }
const spSnapV = x => Math.abs(x - Math.round(x)) < 0.18 ? Math.round(x) : +x.toFixed(2); // 정수 가까이면 정수에 붙임
function spPointAt(sx, sy) { // 누른 자리의 점: 있던 점, 누른 평면 위, 아니면 xy 평면 위
  const h = spHit(sx, sy); if (h && h.t === 'point') return h.id;
  let X = null; if (h && h.t === 'plane') { const g = G3.get(h.id); X = spRayPlane(sx, sy, g.n, g.d); }
  if (!X) { X = spRayPlane(sx, sy, v3(0, 0, 1), 0); const R = SP().R + 0.5; if (!X || Math.abs(X.x) > R || Math.abs(X.y) > R) X = spRayPlane(sx, sy, SPB.v, 0); } if (!X) return null; { const R = SP().R; X = v3(clamp(X.x, -R, R), clamp(X.y, -R, R), clamp(X.z, -R, R)); } // 상자 밖 바닥 대신 화면과 나란한 평면 위
  const onView = !(h && h.t === 'plane') && Math.abs(X.z) > 1e-9;
  const onPlane = h && h.t === 'plane';
  return spAdd({ t: 'point', k: 'free', x: onPlane ? +X.x.toFixed(3) : spSnapV(X.x), y: onPlane ? +X.y.toFixed(3) : spSnapV(X.y), z: onPlane ? +X.z.toFixed(3) : onView ? spSnapV(X.z) : 0 }).id;
}

/* ---- 도구와 손 입력 ---- */
const SP_TOOLS = [
  ['move', '선택·돌려 보기 — 빈 곳을 끌면 돌려 보기, 점을 끌면 수평 이동(Shift: 위아래)', '<path d="M5 3l13 8-6 1.5L9 19z" fill="currentColor"/>'],
  ['point', '점 — xy 평면(또는 누른 평면) 위에 점', '<circle cx="12" cy="12" r="3.6" fill="currentColor"/>'],
  ['segment', '선분 — 두 점', '<path d="M5 18L19 6" stroke="currentColor" stroke-width="2"/><circle cx="5" cy="18" r="2.2" fill="currentColor"/><circle cx="19" cy="6" r="2.2" fill="currentColor"/>'],
  ['line', '직선 — 두 점', '<path d="M2 21L22 3" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="15.6" r="2" fill="currentColor"/><circle cx="16" cy="8.4" r="2" fill="currentColor"/>'],
  ['plane', '평면 — 세 점', '<path d="M3 16l6-9h12l-6 9z" fill="currentColor" opacity=".35" stroke="currentColor" stroke-width="1.6"/>'],
  ['sphere', '구 — 중심, 구 위의 점', '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="8" ry="2.8" fill="none" stroke="currentColor" stroke-width="1.2"/>'],
  ['cut', '교점·교선·단면 — 두 도형을 차례로 누르기', '<circle cx="11" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2 16l8-8h12l-8 8z" fill="currentColor" opacity=".3"/><ellipse cx="11" cy="12" rx="6.4" ry="1.8" fill="none" stroke="currentColor" stroke-width="2"/>'],
];
function spSetTool(id) { spTool = id; spPick = []; document.querySelectorAll('.sp3 [data-sp]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sp === id)); const t = SP_TOOLS.find(x => x[0] === id); if (t) { const h = document.getElementById('status-hint'); if (h) h.textContent = t[1]; } requestDraw(); }
function spaceToolbox(tb) {
  const wrap = el('div', { class: 'sp3' });
  for (const [id, name, ico] of SP_TOOLS) { const b = el('button', { class: 'tool', 'data-sp': id, title: name, 'aria-label': name, 'aria-pressed': String(id === spTool), onclick: () => spSetTool(id) }); b.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${ico}</svg>`; wrap.append(b); if (id === 'move' || id === 'sphere') wrap.append(el('div', { class: 'tsep' })); }
  const v = el('button', { class: 'tool', title: '처음 보기로 (돌린 방향·크기 되돌리기)', 'aria-label': '처음 보기로', onclick: () => { Object.assign(SP().cam, spaceNew().cam); requestDraw(); } }); v.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const a = el('button', { class: 'tool', title: '대수 창(좌표·방정식) 보이기/숨기기', 'aria-label': '대수 창', onclick: () => { SP().alg = !SP().alg; requestDraw(); } }); a.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M17 5H7l6 7-6 7h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  wrap.append(el('div', { class: 'tsep' }), v, a); tb.append(wrap);
}
function spaceUI() { // 3D 페이지이면 도구상자·명령 입력을 바꾼다
  const on = !!(doc && doc.space); document.body.classList.toggle('space', on);
  let box = document.getElementById('sp3cmd');
  if (!box) {
    box = el('form', { id: 'sp3cmd', onsubmit: e => { e.preventDefault(); const i = box.querySelector('input'); if (spCommand(i.value)) i.value = ''; } }, el('input', { type: 'text', 'aria-label': '3D 명령', placeholder: '명령: A=(1,2,3) · 평면 x+y+z=3 · 평면 ABC · 구 A 2 · 구 x^2+y^2+z^2=9 · 선분 AB · 단면 α S', autocomplete: 'off', spellcheck: 'false' }));
    box.addEventListener('pointerdown', e => e.stopPropagation()); $('#stage').append(box);
  }
  box.hidden = !on; spSel = []; spPick = []; if (on) { spCompute(); spSetTool(spTool); }
}
function spDeleteSel() {
  if (!spSel.length) return false; snap(); const S = SP(), gone = new Set(spSel);
  let grew = true; while (grew) { grew = false; for (const o of S.objs) if (!gone.has(o.id) && (o.p || []).some(id => gone.has(id))) { gone.add(o.id); grew = true; } }
  S.objs = S.objs.filter(o => !gone.has(o.id)); spSel = []; spCompute(); requestDraw(); return true;
}
function spaceKey(e) {
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); spDeleteSel(); return true; }
  if (e.key === 'Escape') { if (spPick.length) spPick = []; else if (spTool !== 'move') spSetTool('move'); else spSel = []; requestDraw(); return true; }
  return false;
}
const spTouches = new Map();
function spacePointer(type, e) {
  const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; SPB = spBasis(); const S = SP(), cam = S.cam;
  if (e.pointerType === 'touch') { if (type === 'up' || type === 'cancel') spTouches.delete(e.pointerId); else spTouches.set(e.pointerId, { x: sx, y: sy }); }
  if (type === 'wheel') { e.preventDefault(); cam.s = clamp(cam.s * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), 8, 600); requestDraw(); return; }
  if (spTouches.size >= 2) { // 두 손가락: 확대·축소, 함께 끌면 이동
    const [a, b] = [...spTouches.values()], c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    if (!spDrag || spDrag.mode !== 'pinch') { if (spDrag && spDrag.snapLen != null && undoStack.length > spDrag.snapLen) { const s0 = undoStack[spDrag.snapLen]; undoStack.length = spDrag.snapLen; restore(s0); } spPick = []; spDrag = { mode: 'pinch', c, d, s: cam.s, px: cam.px, py: cam.py }; }
    else { cam.s = clamp(spDrag.s * d / spDrag.d, 8, 600); cam.px = spDrag.px + c.x - spDrag.c.x; cam.py = spDrag.py + c.y - spDrag.c.y; requestDraw(); }
    return;
  }
  if (type === 'down') {
    closeMenus(); closeContext(); try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    if (spDrag && spDrag.mode === 'pinch') return;
    const snapLen = undoStack.length;
    if (e.button === 1 || e.button === 2 || e.ctrlKey || spaceDown) { spDrag = { mode: 'pan', sx, sy, px: cam.px, py: cam.py }; return; }
    if (spTool === 'move') {
      const h = spHit(sx, sy);
      if (h && h.t === 'point' && h.k === 'free') { spSel = [h.id]; spDrag = { mode: 'pt', id: h.id, sx, sy, z0: h.z, x0: h.x, y0: h.y, moved: false, snapLen }; return; }
      spDrag = { mode: 'orbit', sx, sy, az: cam.az, el: cam.el, moved: false, hit: h ? h.id : null }; return;
    }
    snap(); const base = snapLen;
    if (spTool === 'point') { const id = spPointAt(sx, sy); if (id) spSel = [id]; spDrag = { mode: 'none', snapLen: base }; requestDraw(); return; }
    if (spTool === 'cut') {
      const h = spHit(sx, sy, o => o.t !== 'point'); if (!h) { undoStack.pop(); toast('평면·구·직선을 차례로 누르세요'); return; }
      undoStack.pop(); spPick.push(h.id); if (spPick.length === 2) { const [a, b] = spPick.map(spObj); spPick = []; spCut(a, b); } requestDraw(); spDrag = { mode: 'none' }; return;
    }
    const need = { segment: 2, line: 2, sphere: 2, plane: 3 }[spTool];
    const id = spPointAt(sx, sy); if (!id) { undoStack.pop(); return; }
    if (spPick.length) undoStack.pop(); // 한 도형을 만드는 동안은 되돌리기 한 번으로
    if (!spPick.includes(id)) spPick.push(id);
    if (spPick.length >= need) { const p = spPick.slice(0, need); spPick = []; const o = spTool === 'sphere' ? spAdd({ t: 'sphere', k: 'cp', p }) : spAdd({ t: spTool, k: '2p', p }); spSel = [o.id]; }
    spDrag = { mode: 'none', snapLen: base }; requestDraw(); return;
  }
  if (type === 'move') {
    spCursor = { x: sx, y: sy };
    if (!spDrag) { const h = spHit(sx, sy); const nid = h ? h.id : null; if (nid !== spHover || spPick.length) { spHover = nid; requestDraw(); } return; }
    const d = spDrag;
    if (d.mode === 'orbit') { if (Math.hypot(sx - d.sx, sy - d.sy) > 3) d.moved = true; cam.az = d.az - (sx - d.sx) * 0.008; cam.el = clamp(d.el + (sy - d.sy) * 0.008, -1.55, 1.55); requestDraw(); }
    else if (d.mode === 'pan') { cam.px = d.px + sx - d.sx; cam.py = d.py + sy - d.sy; requestDraw(); }
    else if (d.mode === 'pt') {
      const o = spObj(d.id); if (!d.moved) { if (Math.hypot(sx - d.sx, sy - d.sy) < 3) return; snap(); d.moved = true; }
      if (e.shiftKey || Math.abs(SPB.v.z) < 0.12) { const uz = SPB.u.z || 1; o.z = spSnapV(d.z0 - (sy - d.sy) / (SPB.s * uz)); }
      else { const X = spRayPlane(sx, sy, v3(0, 0, 1), o.z); if (X) { o.x = spSnapV(X.x); o.y = spSnapV(X.y); } }
      spCompute(); requestDraw();
    }
    return;
  }
  if (type === 'up' || type === 'cancel') {
    const d = spDrag; spDrag = null; if (!d) return;
    if (d.mode === 'orbit' && !d.moved) { spSel = d.hit ? [d.hit] : []; requestDraw(); }
    if (d.mode === 'pinch' && spTouches.size) spDrag = { mode: 'pinch-rest' };
    scheduleSave(); refreshSpaceStatus();
  }
}
const SP_KO = { point: '점', segment: '선분', line: '직선', plane: '평면', sphere: '구', circle: '원' };
function spTitle(o) { return SP_KO[o.t] + ' ' + (o.t === 'segment' && o.k === '2p' ? o.p.map(id => (spObj(id) || {}).name).join('') : o.name); }
function refreshSpaceStatus() { const os = spSel.map(spObj).filter(Boolean); try { $('#status-sel').textContent = !os.length ? '선택 없음' : '선택: ' + os.map(spTitle).join(', '); } catch (e) { } }
function spCut(a, b) {
  const I = spIntersect(a, b); if (!I) { toast(`${a.name}, ${b.name} 은(는) 만나지 않습니다`); return; }
  snap();
  if (I.kind === 'circle') { const o = spAdd({ t: 'circle', k: 'cut', p: [a.id, b.id] }); spSel = [o.id]; toast(`단면: 원 ${o.name} (반지름 ${spFmt(I.r)})`); }
  else if (I.kind === 'line') { const o = spAdd({ t: 'line', k: 'pp', p: [a.id, b.id] }); spSel = [o.id]; toast('교선: 직선 ' + o.name); }
  else if (I.kind === 'points') { if (!I.pts.length) { undoStack.pop(); toast('교점이 없습니다'); return; } spSel = I.pts.map((_, i) => spAdd({ t: 'point', k: 'int', p: [a.id, b.id], i }).id); toast('교점 ' + spSel.map(id => spObj(id).name).join(', ')); }
  requestDraw();
}

/* ---- 명령 입력 ---- */
function spExpr(src) { // x, y, z 의 식 → 함수
  let s = String(src).replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/²/g, '^2').replace(/³/g, '^3').replace(/\s+/g, ''); let i = 0;
  const peek = () => s[i], num = () => { const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(i)); i += m[0].length; return +m[0]; };
  function atom() {
    const c = peek();
    if (c === '(') { i++; const f = sum(); if (s[i] !== ')') throw new Error(')'); i++; return f; }
    if (/[\d.]/.test(c)) { const v = num(); return () => v; }
    if (s.startsWith('sqrt', i)) { i += 4; const f = atom(); return (x, y, z) => Math.sqrt(f(x, y, z)); }
    if (s.startsWith('pi', i) || c === 'π') { i += c === 'π' ? 1 : 2; return () => Math.PI; }
    if (c === 'x') { i++; return x => x; } if (c === 'y') { i++; return (x, y) => y; } if (c === 'z') { i++; return (x, y, z) => z; }
    throw new Error('알 수 없는 글자 ' + c);
  }
  function pow() { const a = atom(); if (peek() === '^') { i++; const b = unary(); return (x, y, z) => Math.pow(a(x, y, z), b(x, y, z)); } return a; }
  function unary() { if (peek() === '-') { i++; const f = unary(); return (x, y, z) => -f(x, y, z); } if (peek() === '+') { i++; return unary(); } return pow(); }
  function prod() { let f = unary(); for (;;) { const c = peek(); if (c === '*' || c === '/') { i++; const g = unary(), a = f; f = c === '*' ? (x, y, z) => a(x, y, z) * g(x, y, z) : (x, y, z) => a(x, y, z) / g(x, y, z); } else if (c && /[\d.(xyzsπp]/.test(c)) { const g = unary(), a = f; f = (x, y, z) => a(x, y, z) * g(x, y, z); } else return f; } }
  function sum() { let f = prod(); for (;;) { const c = peek(); if (c !== '+' && c !== '-') return f; i++; const g = prod(), a = f; f = c === '+' ? (x, y, z) => a(x, y, z) + g(x, y, z) : (x, y, z) => a(x, y, z) - g(x, y, z); } }
  const f = sum(); if (i < s.length) throw new Error('식을 끝까지 읽지 못했습니다'); return f;
}
function spEquation(src) { // 평면 또는 구의 방정식
  const [l, r] = String(src).split('='); if (r == null) throw new Error('= 가 없습니다');
  const L = spExpr(l), Rr = spExpr(r), F = (x, y, z) => L(x, y, z) - Rr(x, y, z), f0 = F(0, 0, 0);
  const qx = (F(1, 0, 0) + F(-1, 0, 0)) / 2 - f0, qy = (F(0, 1, 0) + F(0, -1, 0)) / 2 - f0, qz = (F(0, 0, 1) + F(0, 0, -1)) / 2 - f0;
  const lx = (F(1, 0, 0) - F(-1, 0, 0)) / 2, ly = (F(0, 1, 0) - F(0, -1, 0)) / 2, lz = (F(0, 0, 1) - F(0, 0, -1)) / 2;
  const near = (a, b) => Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));
  const test = (x, y, z) => qx * x * x + qy * y * y + qz * z * z + lx * x + ly * y + lz * z + f0;
  if (![[1.3, -0.7, 2.1], [-2.2, 1.9, 0.4], [0.6, 3.1, -1.7]].every(([x, y, z]) => near(F(x, y, z), test(x, y, z)))) throw new Error('평면(1차식)이나 구(x², y², z² 계수가 같은 식)가 아닙니다');
  if (Math.abs(qx) < 1e-12 && Math.abs(qy) < 1e-12 && Math.abs(qz) < 1e-12) { if (Math.abs(lx) + Math.abs(ly) + Math.abs(lz) < 1e-12) throw new Error('x, y, z 가 없습니다'); return { t: 'plane', k: 'eq', a: +lx.toFixed(10), b: +ly.toFixed(10), c: +lz.toFixed(10), d: +(-f0).toFixed(10) }; }
  if (!near(qx, qy) || !near(qy, qz)) throw new Error('구의 방정식은 x², y², z² 의 계수가 같아야 합니다');
  const cx = -lx / (2 * qx), cy = -ly / (2 * qx), cz = -lz / (2 * qx), r2 = cx * cx + cy * cy + cz * cz - f0 / qx;
  if (!(r2 > 0)) throw new Error('반지름이 양수가 아닙니다'); return { t: 'sphere', k: 'eq', cx: +cx.toFixed(10), cy: +cy.toFixed(10), cz: +cz.toFixed(10), r: +Math.sqrt(r2).toFixed(10) };
}
function spCommand(text) {
  const t = String(text || '').trim(); if (!t || !SP()) return false;
  const names = s => (s.match(/[A-Z][0-9′']*|[α-ω][0-9]*|[a-z][0-9]*/g) || []);
  const need = (list, n, what) => { const os = list.map(spByName); if (os.length !== n || os.some(o => !o)) throw new Error(`${what}: 이름 ${n}개가 필요합니다 (${list.join(', ') || '없음'})`); return os; };
  const ptArg = s => { const m = /^\(\s*([^,()]+),([^,()]+),([^,()]+)\)$/.exec(s.trim()); if (m) { const v = m.slice(1).map(x => spExpr(x)(0, 0, 0)); return spAdd({ t: 'point', k: 'free', x: v[0], y: v[1], z: v[2] }).id; } const o = spByName(s.trim()); if (o && o.t === 'point') return o.id; throw new Error('점을 찾을 수 없습니다: ' + s); };
  try {
    snap(); let m, made = null;
    if ((m = /^([A-Z][0-9′']*)?\s*=?\s*(\([^()]*\))$/.exec(t))) { if (m[1] && spByName(m[1])) { const o = spByName(m[1]); if (o.t !== 'point' || o.k !== 'free') throw new Error(m[1] + ' 은(는) 이미 다른 도형의 이름입니다'); const v = /^\(([^,]+),([^,]+),([^,]+)\)$/.exec(m[2].replace(/\s/g, '')); if (!v) throw new Error('좌표를 읽지 못했습니다'); [o.x, o.y, o.z] = v.slice(1).map(x => spExpr(x)(0, 0, 0)); made = o; } else { const id = ptArg(m[2]); if (m[1]) spObj(id).name = m[1]; made = spObj(id); } }
    else if ((m = /^(선분|직선)\s*(.+)$/.exec(t))) { const [a, b] = need(names(m[2]), 2, m[1]); made = spAdd({ t: m[1] === '선분' ? 'segment' : 'line', k: '2p', p: [a.id, b.id] }); }
    else if ((m = /^중점\s*(.+)$/.exec(t))) { const [a, b] = need(names(m[1]), 2, '중점'); made = spAdd({ t: 'point', k: 'mid', p: [a.id, b.id] }); }
    else if ((m = /^(교점|교선|단면|교원)\s*(.+)$/.exec(t))) { const [a, b] = need(names(m[2]), 2, m[1]); undoStack.pop(); spCut(a, b); return true; }
    else if ((m = /^평면\s*(.+)$/.exec(t))) { const rest = m[1].trim(); if (rest.includes('=')) made = spAdd(spEquation(rest)); else { const [a, b, c] = need(names(rest), 3, '평면'); made = spAdd({ t: 'plane', k: '3p', p: [a.id, b.id, c.id] }); } }
    else if ((m = /^구\s*(.+)$/.exec(t))) {
      const rest = m[1].trim();
      if (rest.includes('=')) made = spAdd(spEquation(rest));
      else { const mm = /^(\([^()]*\)|[A-Z][0-9′']*)\s*,?\s*(.+)$/.exec(rest); if (!mm) throw new Error('구: 중심과 반지름(또는 구 위의 점)을 쓰세요'); const c = ptArg(mm[1]), arg = mm[2].trim(); const po = spByName(arg); made = po && po.t === 'point' ? spAdd({ t: 'sphere', k: 'cp', p: [c, po.id] }) : spAdd({ t: 'sphere', k: 'cr', p: [c], r: spExpr(arg)(0, 0, 0) }); }
    }
    else if (t.includes('=') && /[xyz]/.test(t)) made = spAdd(spEquation(t));
    else throw new Error('알 수 없는 명령입니다');
    spCompute(); spSel = made ? [made.id] : []; requestDraw(); refreshSpaceStatus(); return true;
  } catch (e) { if (undoStack.length) { const s0 = undoStack.pop(); restore(s0); } toast('명령을 실행하지 못했습니다: ' + e.message); return false; }
}
function addSpacePage() {
  const d = newDoc(); d.space = spaceNew();
  addPage(pageName('3D 공간'), d); spSetTool('move');
  toast('3D 페이지: 빈 곳을 끌면 돌려 보기, 왼쪽 도구나 위쪽 명령 입력으로 점·평면·구를 만드세요');
}
