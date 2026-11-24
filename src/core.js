'use strict';
const BOOT_HTML = document.documentElement.outerHTML;
let STORE_KEY = 'jakdo-book';
/* ================= 수학 유틸 ================= */
const TAU = Math.PI * 2, D2R = Math.PI / 180, PXCM = 37.795;
const vadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y }), vsub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const vmul = (a, k) => ({ x: a.x * k, y: a.y * k }), vlen = a => Math.hypot(a.x, a.y);
const vdot = (a, b) => a.x * b.x + a.y * b.y, vcross = (a, b) => a.x * b.y - a.y * b.x;
const vdist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vnorm = a => { const l = vlen(a); return l < 1e-12 ? null : { x: a.x / l, y: a.y / l }; };
const vperp = a => ({ x: -a.y, y: a.x }), vang = a => Math.atan2(a.y, a.x);
const vpol = (r, t) => ({ x: r * Math.cos(t), y: r * Math.sin(t) });
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const mod = (a, m) => ((a % m) + m) % m;
const okp = p => !!p && isFinite(p.x) && isFinite(p.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= 문서 모델 ================= */
let doc = null, byId = new Map(), G = {}, sel = [], dirty = true;
const TYPE_KO = { point: '점', segment: '선분', ray: '반직선', line: '직선', circle: '원', arc: '호', polygon: '다각형 내부', cinterior: '원 내부', sector: '부채꼴 내부', arcseg: '활꼴 내부', locus: '자취', value: '값', fplot: '함수 그래프', coord: '좌표계', text: '텍스트', button: '동작 버튼', amark: '각 표시', iter: '반복 상', table: '표', tplot: '표 데이터 그래프', drawing: '손그림', picture: '그림' };
const isPoint = o => !!o && o.t === 'point';
const isStraight = o => !!o && (o.t === 'segment' || o.t === 'ray' || o.t === 'line');
const isCircleLike = o => !!o && (o.t === 'circle' || o.t === 'arc');
const isInterior = o => !!o && ['polygon', 'cinterior', 'sector', 'arcseg'].includes(o.t);
const isPath = o => !!o && (isStraight(o) || ['circle', 'arc', 'polygon', 'cinterior', 'sector', 'arcseg', 'locus', 'fplot'].includes(o.t));
const isValue = o => !!o && o.t === 'value';
const isScreenObj = o => !!o && (o.t === 'value' || o.t === 'text' || o.t === 'button' || o.t === 'table');

function newDoc() {
  return { v: 1, objs: [], nid: 1, cnt: {}, marks: {}, coordId: null,
    prefs: { deg: true, prec: 2, unit: 'cm', snap: false, autoLabel: true } };
}
function reindex() { byId = new Map(doc.objs.map(o => [o.id, o])); }
function obj(id) { return byId.get(id); }

function add(o) {
  o.id = doc.nid++; o.p = o.p || []; o.d = o.d || {};
  if (o.w == null && o.ps == null && o.dash == null && typeof applyToolDefaults === 'function') applyToolDefaults(o);
  if (o.w == null) o.w = 2; if (o.dash == null) o.dash = 0; if (o.ps == null) o.ps = 2;
  if (o.color == null) o.color = defaultColor(o);
  doc.objs.push(o); byId.set(o.id, o); dirty = true; return o;
}
function defaultColor(o) {
  const pc = k => (typeof prefColor === 'function' ? prefColor(k) : null);
  if (o.t === 'point') return pc('point') || 'red';
  if (isInterior(o)) return pc('interior') || ['gold', 'blue', 'green', 'magenta', 'orange', 'teal'][(o.id || 0) % 6];
  if (o.t === 'locus') return pc('locus') || 'purple';
  if (o.t === 'fplot') return pc('plot') || 'blue';
  if (isStraight(o)) return pc('straight') || 'ink';
  if (o.t === 'circle' || o.t === 'arc') return pc('circle') || 'ink';
  if (o.t === 'text') return pc('text') || 'ink';
  return 'ink';
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const subDigits = s => String(s).replace(/\d/g, d => SUBS[+d]);
function nextLabel(kind) {
  const uniq = l => doc.objs.some(o => o.label === l && (o.t === 'value' || o.t === 'fplot')) && ['f', 't', 'm'].includes(kind) ? nextLabel(kind) : l;
  const c = doc.cnt; c[kind] = (c[kind] || 0) + 1; const n = c[kind];
  const seq = (L) => n <= L.length ? L[n - 1] : L[(n - 1) % L.length] + Math.floor((n - 1) / L.length);
  if (kind === 'P') return seq('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (kind === 'L') return seq('jklmnopqrstuvwxyz');
  if (kind === 'f') return uniq(seq('fghkuvw'));
  return uniq(kind + n);
}
function labelKind(o) {
  if (o.t === 'point') return 'P'; if (isStraight(o)) return 'L';
  if (o.t === 'circle') return 'c'; if (o.t === 'arc') return 'a';
  if (isInterior(o)) return 'p'; if (o.t === 'fplot') return 'f';
  if (o.t === 'value') return o.k === 'param' ? 't' : ['func', 'deriv', 'data'].includes(o.k) ? 'f' : 'm';
  return 'x';
}
function giveLabel(o, show) { o.label = nextLabel(labelKind(o)); o.showLabel = !!show || (doc.prefs.labelAll && o.t !== 'value' && o.t !== 'fplot' && !o.hidden && show !== false && o.t !== 'point'); return o; }
const disp = s => subDigits(s || '');
function nm(id) {
  const o = obj(id); if (!o) return '?';
  if (isStraight(o) && o.k === '2p' && !o.showLabel) return nm(o.p[0]) + nm(o.p[1]);
  return disp(o.label);
}

/* ================= 의존 관계 ================= */
function children(id) { return doc.objs.filter(o => o.p.includes(id)); }
function descendants(ids) {
  const set = new Set(ids);
  for (const o of doc.objs) if (!set.has(o.id) && o.p.some(p => set.has(p))) set.add(o.id);
  return set;
}
function ancestors(ids) {
  const set = new Set(); const st = [...ids];
  while (st.length) { const id = st.pop(); const o = obj(id); if (!o) continue; for (const p of o.p) if (!set.has(p)) { set.add(p); st.push(p); } }
  return set;
}
function deleteObjs(ids) {
  const kill = descendants(ids);
  // 버튼은 대상 하나가 없어져도 남은 대상이 있으면 유지
  doc.objs = doc.objs.filter(o => !kill.has(o.id) || (o.t === 'button' && !ids.includes(o.id) && o.p.some(p => !kill.has(p))));
  for (const o of doc.objs) if (o.t === 'button') o.p = o.p.filter(p => !kill.has(p));
  if (doc.coordId && kill.has(doc.coordId)) doc.coordId = (doc.objs.find(o => o.t === 'coord') || {}).id ?? null;
  for (const o of doc.objs) if (o.t === 'picture' && kill.has(o.d.crop)) delete o.d.crop;
  if (doc.cxf) doc.cxf = doc.cxf.filter(t => !kill.has(t.pre) && !kill.has(t.img));
  for (const k of Object.keys(doc.marks)) { const m = doc.marks[k]; const ids2 = Array.isArray(m) ? m : (m && (m.ids || [m.id])); if (ids2 && ids2.some(i => kill.has(i))) delete doc.marks[k]; }
  reindex(); sel = sel.filter(id => byId.has(id)); dirty = true;
}

/* ================= 경로 매개화 ================= */
function arcEnd(g, t) { return vadd(g.c, vpol(g.r, g.s + g.w * t)); }
function onStraight(t, type) { return type === 'segment' ? (t >= -1e-9 && t <= 1 + 1e-9) : type === 'ray' ? t >= -1e-9 : true; }
function onArc(g, a) { if (Math.abs(g.w) >= TAU - 1e-9) return true; const rel = mod((a - g.s) * Math.sign(g.w), TAU); return rel <= Math.abs(g.w) + 1e-9; }
function polyLens(pts, closed) {
  const L = [0]; const n = pts.length; const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) L.push(L[i] + vdist(pts[i], pts[(i + 1) % n]));
  return L;
}
function polyAt(pts, closed, t) {
  const L = polyLens(pts, closed), tot = L[L.length - 1]; if (tot < 1e-12) return pts[0];
  let s = (closed ? mod(t, 1) : clamp(t, 0, 1)) * tot; const n = pts.length;
  for (let i = 0; i < L.length - 1; i++) if (s <= L[i + 1] || i === L.length - 2) { const seg = L[i + 1] - L[i]; return lerp(pts[i], pts[(i + 1) % n], seg < 1e-12 ? 0 : (s - L[i]) / seg); }
  return pts[0];
}
function polyProj(pts, closed, p) {
  const L = polyLens(pts, closed), tot = L[L.length - 1] || 1; const n = pts.length;
  let best = 1e18, bt = 0;
  for (let i = 0; i < L.length - 1; i++) {
    const a = pts[i], b = pts[(i + 1) % n], d = vsub(b, a), dd = vdot(d, d);
    const u = dd < 1e-12 ? 0 : clamp(vdot(vsub(p, a), d) / dd, 0, 1);
    const q = lerp(a, b, u), dist = vdist(p, q);
    if (dist < best) { best = dist; bt = (L[i] + u * (L[i + 1] - L[i])) / tot; }
  }
  return bt;
}
function locusPts(g) { // 경로로서의 자취: 가장 긴 연결 성분
  if (!g || !g.polys || !g.polys.length) return null;
  let b = g.polys[0]; for (const q of g.polys) if (q.length > b.length) b = q; return b;
}
function pathAt(o, g, t) {
  if (!g) return null;
  switch (o.t) {
    case 'segment': return lerp(g.a, g.b, clamp(t, 0, 1));
    case 'ray': return lerp(g.a, g.b, Math.max(0, t));
    case 'line': return lerp(g.a, g.b, t);
    case 'circle': case 'cinterior': return vadd(g.c, vpol(g.r, TAU * t));
    case 'arc': case 'sector': case 'arcseg': return arcEnd(g, clamp(t, 0, 1));
    case 'polygon': return polyAt(g.pts, true, t);
    case 'locus': { const p = locusPts(g); return p && p.length > 1 ? polyAt(p, false, t) : null; }
    case 'fplot': return fplotAt(g, t);
  }
  return null;
}
function pathProj(o, g, p) {
  switch (o.t) {
    case 'segment': case 'ray': case 'line': {
      const d = vsub(g.b, g.a); let t = vdot(vsub(p, g.a), d) / vdot(d, d);
      if (o.t === 'segment') t = clamp(t, 0, 1); if (o.t === 'ray') t = Math.max(0, t); return t;
    }
    case 'circle': case 'cinterior': return mod(vang(vsub(p, g.c)) / TAU, 1);
    case 'arc': case 'sector': case 'arcseg': {
      const W = Math.abs(g.w); const rel = mod((vang(vsub(p, g.c)) - g.s) * Math.sign(g.w), TAU);
      if (rel <= W) return rel / W; return (rel - W < TAU - rel) ? 1 : 0;
    }
    case 'polygon': return polyProj(g.pts, true, p);
    case 'locus': { const q = locusPts(g); return q && q.length > 1 ? polyProj(q, false, p) : 0; }
    case 'fplot': return fplotProj(g, p);
  }
  return 0;
}
function pathLength(o, g) {
  switch (o.t) {
    case 'segment': return vdist(g.a, g.b);
    case 'ray': case 'line': return vdist(g.a, g.b);
    case 'circle': case 'cinterior': return TAU * g.r;
    case 'arc': case 'sector': case 'arcseg': return Math.abs(g.w) * g.r;
    case 'polygon': { const L = polyLens(g.pts, true); return L[L.length - 1]; }
    case 'locus': { const q = locusPts(g); if (!q) return 1; const L = polyLens(q, false); return L[L.length - 1]; }
    case 'fplot': return fplotWorldLen(g);
  }
  return 1;
}

/* ================= 교점 ================= */
function lineParams(g) { return { a: g.a, d: vsub(g.b, g.a) }; }
function rawIntersections(oa, ga, ob, gb) {
  // 반환: [{p, ok}] 고정 길이
  const S = isStraight, C = o => o.t === 'circle' || o.t === 'arc';
  if (S(oa) && S(ob)) {
    const A = lineParams(ga), B = lineParams(gb), den = vcross(A.d, B.d);
    if (Math.abs(den) < 1e-12) return [null];
    const w = vsub(B.a, A.a), t = vcross(w, B.d) / den, u = vcross(w, A.d) / den;
    return [{ p: vadd(A.a, vmul(A.d, t)), ok: onStraight(t, oa.t) && onStraight(u, ob.t) }];
  }
  if (S(oa) && C(ob)) return lineCircle(oa, ga, ob, gb, false);
  if (C(oa) && S(ob)) return lineCircle(ob, gb, oa, ga, true);
  if (C(oa) && C(ob)) {
    const d = vdist(ga.c, gb.c), r1 = ga.r, r2 = gb.r;
    if (d < 1e-12 || d > r1 + r2 + 1e-12 || d < Math.abs(r1 - r2) - 1e-12) return [null, null];
    const e = vmul(vsub(gb.c, ga.c), 1 / d), a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const base = vadd(ga.c, vmul(e, a)), pe = vperp(e);
    return [vadd(base, vmul(pe, h)), vadd(base, vmul(pe, -h))].map(p => ({ p,
      ok: (oa.t !== 'arc' || onArc(ga, vang(vsub(p, ga.c)))) && (ob.t !== 'arc' || onArc(gb, vang(vsub(p, gb.c)))) }));
  }
  return curveIntersections(oa, ga, ob, gb);
}
function lineCircle(ol, gl, oc, gc) {
  const L = lineParams(gl), f = vsub(L.a, gc.c);
  const A = vdot(L.d, L.d), B = 2 * vdot(f, L.d), Cc = vdot(f, f) - gc.r * gc.r, disc = B * B - 4 * A * Cc;
  if (disc < -1e-12 || A < 1e-15) return [null, null];
  const sq = Math.sqrt(Math.max(0, disc)), ts = [(-B - sq) / (2 * A), (-B + sq) / (2 * A)];
  return ts.map(t => { const p = vadd(L.a, vmul(L.d, t)); return { p, ok: onStraight(t, ol.t) && (oc.t !== 'arc' || onArc(gc, vang(vsub(p, gc.c)))) }; });
}
const canIntersect = o => isStraight(o) || o.t === 'circle' || o.t === 'arc' || o.t === 'fplot' || o.t === 'locus' || o.t === 'polygon';

/* ================= 변환 ================= */
function valNum(id, Gx) { const g = Gx[id]; return g && isFinite(g.v) ? g.v : NaN; }
function valAsDist(id, Gx) { const g = Gx[id]; if (!g) return NaN; return g.u === 'dist' ? g.raw : g.v; }
function valAsAngle(id, Gx) { const g = Gx[id]; if (!g) return NaN; return g.u === 'angle' ? g.raw : g.v * (doc.prefs.deg ? D2R : 1); }
function signedAngle(A, V, B) { return Math.atan2(vcross(vsub(A, V), vsub(B, V)), vdot(vsub(A, V), vsub(B, V))); }

function buildMap(x, Gx) {
  const P = id => Gx[id];
  if (x.type === 'tr') {
    let v;
    if (x.vec) { const A = P(x.vec[0]), B = P(x.vec[1]); if (!A || !B) return null; v = vsub(B, A); }
    else if (x.mode === 'rect') { const dx = x.dxV != null ? valAsDist(x.dxV, Gx) : x.dx, dy = x.dyV != null ? valAsDist(x.dyV, Gx) : x.dy; v = { x: dx, y: dy }; }
    else {
      const r = x.distV != null ? valAsDist(x.distV, Gx) : x.dist;
      let th = x.angV != null ? valAsAngle(x.angV, Gx) : x.angP ? (P(x.angP[0]) && P(x.angP[1]) && P(x.angP[2]) ? signedAngle(P(x.angP[0]), P(x.angP[1]), P(x.angP[2])) : NaN) : x.ang * D2R;
      v = vpol(r, th);
    }
    if (!okp(v)) return null;
    return { f: p => vadd(p, v), det: 1, k: 1 };
  }
  if (x.type === 'rot') {
    const C = P(x.c); if (!C) return null;
    const th = x.angV != null ? valAsAngle(x.angV, Gx) : x.angP ? (P(x.angP[0]) && P(x.angP[1]) && P(x.angP[2]) ? signedAngle(P(x.angP[0]), P(x.angP[1]), P(x.angP[2])) : NaN) : x.ang * D2R;
    if (!isFinite(th)) return null; const cs = Math.cos(th), sn = Math.sin(th);
    return { f: p => { const q = vsub(p, C); return { x: C.x + q.x * cs - q.y * sn, y: C.y + q.x * sn + q.y * cs }; }, det: 1, k: 1 };
  }
  if (x.type === 'dil') {
    const C = P(x.c); if (!C) return null;
    let r;
    if (x.rV != null) r = valNum(x.rV, Gx);
    else if (x.rS) { const s1 = P(x.rS[0]), s2 = P(x.rS[1]); if (!s1 || !s2) return null; r = vdist(s1.a, s1.b) / vdist(s2.a, s2.b); }
    else if (x.rP) { const a = P(x.rP[0]), b = P(x.rP[1]), c = P(x.rP[2]); if (!a || !b || !c) return null; const d = vsub(b, a); r = vdot(vsub(c, a), d) / vdot(d, d); }
    else r = x.r;
    if (!isFinite(r)) return null;
    return { f: p => vadd(C, vmul(vsub(p, C), r)), det: 1, k: Math.abs(r) };
  }
  if (x.type === 'ref') {
    const L = P(x.m); if (!L) return null; const d = vnorm(vsub(L.b, L.a)); if (!d) return null;
    return { f: p => { const q = vsub(p, L.a), t = vdot(q, d); const foot = vadd(L.a, vmul(d, t)); return vsub(vmul(foot, 2), p); }, det: -1, k: 1 };
  }
  return null;
}
function xfRefs(x) {
  const r = [];
  if (x.vec) r.push(...x.vec); if (x.c != null) r.push(x.c); if (x.m != null) r.push(x.m);
  for (const k of ['dxV', 'dyV', 'distV', 'angV', 'rV']) if (x[k] != null) r.push(x[k]);
  if (x.angP) r.push(...x.angP); if (x.rS) r.push(...x.rS); if (x.rP) r.push(...x.rP);
  return r;
}
function xformGeom(t, g, M) {
  const f = M.f;
  switch (t) {
    case 'point': return f(g);
    case 'segment': case 'ray': case 'line': return { a: f(g.a), b: f(g.b) };
    case 'circle': case 'cinterior': return { c: f(g.c), r: g.r * M.k };
    case 'arc': case 'sector': case 'arcseg': { const c = f(g.c), p0 = f(arcEnd(g, 0)); return { c, r: g.r * M.k, s: vang(vsub(p0, c)), w: g.w * M.det }; }
    case 'polygon': return { pts: g.pts.map(f) };
  }
  return null;
}

/* ================= 수식 파서 ================= */
const FN = {
  sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, sqrt: 1, abs: 1, ln: 1, log: 1, exp: 1, sgn: 1, round: 1, trunc: 1, floor: 1, ceil: 1
};
function tokenize(s) {
  const T = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; if (s[j] === 'e' && /[0-9+-]/.test(s[j + 1] || '') && !/[a-z]/i.test(s[j + 2] || '')) { j += 2; while (/[0-9]/.test(s[j] || '')) j++; } T.push({ k: 'n', v: parseFloat(s.slice(i, j)) }); i = j; continue; }
    if (c === '#') { let j = i + 1; while (/[0-9]/.test(s[j] || '')) j++; T.push({ k: 'r', v: +s.slice(i + 1, j) }); i = j; continue; }
    if (/[A-Za-z_πͰ-Ͽ]/.test(c)) { let j = i; while (j < s.length && /[A-Za-z_0-9₀-₉πͰ-Ͽ]/.test(s[j])) j++; T.push({ k: 'i', v: s.slice(i, j).replace(/[₀-₉]/g, d => SUBS.indexOf(d)) }); i = j; continue; }
    const ops = { '·': '*', '×': '*', '÷': '/', '−': '-' };
    if (c === '°') { T.push({ k: 'i', v: '°' }); i++; continue; }
    if ('+-*/^(),|'.includes(c) || ops[c]) { T.push({ k: 'o', v: ops[c] || c }); i++; continue; }
    throw new Error('알 수 없는 문자: ' + c);
  }
  return T;
}
function parseExpr(src, resolve) {
  const T = tokenize(src); let i = 0;
  const peek = () => T[i], eat = v => { if (T[i] && T[i].v === v) { i++; return true; } return false; };
  function expr() { let a = term(); for (;;) { if (eat('+')) a = ['+', a, term()]; else if (eat('-')) a = ['-', a, term()]; else return a; } }
  function term() {
    let a = unary();
    for (;;) {
      if (eat('*')) a = ['*', a, unary()]; else if (eat('/')) a = ['/', a, unary()];
      else { const t = peek(); if (t && (t.k === 'n' || t.k === 'i' || t.k === 'r' || t.v === '(')) a = ['*', a, unary()]; else return a; }
    }
  }
  function unary() { if (eat('-')) return ['neg', unary()]; if (eat('+')) return unary(); return power(); }
  function power() { const b = primary(); if (eat('^')) return ['^', b, unary()]; return b; }
  function primary() {
    const t = T[i++]; if (!t) throw new Error('수식이 끝나지 않았습니다');
    if (t.k === 'n') return ['n', t.v];
    if (t.k === 'r') { const fo = obj(t.v); if (isFnObj(fo) && peek() && peek().v === '(') { i++; const a = expr(); if (!eat(')')) throw new Error('괄호가 닫히지 않았습니다'); return ['call', t.v, a]; } return ['r', t.v]; }
    if (t.v === '(') { const a = expr(); if (!eat(')')) throw new Error('괄호가 닫히지 않았습니다'); return a; }
    if (t.v === '|') { const a = expr(); if (!eat('|')) throw new Error('| 가 닫히지 않았습니다'); return ['f', 'abs', a]; }
    if (t.k === 'i') {
      const id = t.v;
      if (FN[id]) { if (!eat('(')) throw new Error(id + ' 다음에 ( 가 필요합니다'); const a = expr(); if (!eat(')')) throw new Error('괄호가 닫히지 않았습니다'); return ['f', id, a]; }
      if (id === 'pi' || id === 'π') return ['n', Math.PI];
      if (typeof UNIT_TOK !== 'undefined' && UNIT_TOK.includes(id) && !doc.objs.some(o => o.label === id && o.t === 'value')) return ['u', id];
      if (id === 'e') return ['n', Math.E];
      const r = resolve(id); if (r == null) throw new Error('알 수 없는 이름: ' + id);
      if (r[0] === 'r' && isFnObj(obj(r[1]))) { if (!eat('(')) throw new Error(id + ' 다음에 ( 가 필요합니다'); const a = expr(); if (!eat(')')) throw new Error('괄호가 닫히지 않았습니다'); return ['call', r[1], a]; }
      return r;
    }
    throw new Error('예상하지 못한 기호: ' + t.v);
  }
  const a = expr(); if (i < T.length) throw new Error('예상하지 못한 기호: ' + T[i].v); return a;
}
function evalAst(a, env) {
  switch (a[0]) {
    case 'n': return a[1];
    case 'r': return env.ref(a[1]);
    case 'x': return env.x;
    case 'u': return unitConst(a[1]);
    case '+': return evalAst(a[1], env) + evalAst(a[2], env);
    case '-': return evalAst(a[1], env) - evalAst(a[2], env);
    case '*': return evalAst(a[1], env) * evalAst(a[2], env);
    case '/': return evalAst(a[1], env) / evalAst(a[2], env);
    case '^': return Math.pow(evalAst(a[1], env), evalAst(a[2], env));
    case 'neg': return -evalAst(a[1], env);
    case 'call': return env.call ? env.call(a[1], evalAst(a[2], env)) : NaN;
    case 'f': {
      const v = evalAst(a[2], env), k = env.trig;
      switch (a[1]) {
        case 'sin': return Math.sin(v * k); case 'cos': return Math.cos(v * k); case 'tan': return Math.tan(v * k);
        case 'asin': return Math.asin(v) / k; case 'acos': return Math.acos(v) / k; case 'atan': return Math.atan(v) / k;
        case 'sqrt': return Math.sqrt(v); case 'abs': return Math.abs(v); case 'ln': return Math.log(v); case 'log': return Math.log10(v);
        case 'exp': return Math.exp(v); case 'sgn': return Math.sign(v); case 'round': return Math.round(v); case 'trunc': return Math.trunc(v);
        case 'floor': return Math.floor(v); case 'ceil': return Math.ceil(v);
      }
    }
  }
  return NaN;
}
function astRefs(a, out = new Set()) { if (!Array.isArray(a)) return out; if (a[0] === 'r') out.add(a[1]); for (const c of a.slice(1)) if (Array.isArray(c)) astRefs(c, out); return out; }
// 사용자 입력(레이블 사용) → 저장 형식(#id)
function userExprToStored(src, allowX) {
  const look = id => doc.objs.find(o => (o.t === 'value' || o.t === 'fplot') && o.label === id);
  const ast = parseExpr(src, id => { if (allowX && id === 'x') return ['x']; const v = look(id); return v ? ['r', v.id] : null; });
  const stored = src.replace(/[A-Za-z_π][A-Za-z_0-9₀-₉′']*/g, w => { const id = w.replace(/[₀-₉]/g, d => SUBS.indexOf(d)).replace(/'/g, '′'); if (FN[id]) return w; const v = look(id); return v ? '#' + v.id + ' ' : w; });
  return { stored, refs: [...astRefs(ast)] };
}
function storedToUser(s) { return s.replace(/#(\d+) ?/g, (_, id) => { const o = obj(+id); return o ? o.label : '?'; }); }
function storedToDisplay(s) {
  return s.replace(/#(\d+)\s*(?=\()/g, (m, id) => { const o = obj(+id); return o && isFnObj(o) ? disp(o.label) : m; }).replace(/#(\d+)/g, (_, id) => { const o = obj(+id); if (!o) return '?'; if (isFnObj(o)) return disp(o.label); const n = valueName(o); return /\s/.test(n) ? '(' + n + ')' : n; })
    .replace(/\bpi\b/g, 'π').replace(/\s*\*\s*/g, '·').replace(/\s*([+\-/^])\s*/g, ' $1 ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/ \^ /g, '^').replace(/\s+/g, ' ').trim();
}
function compileStored(o, Gx, allowX) {
  if (!o._ast || o._astSrc !== o.d.expr) {
    o._ast = parseExpr(o.d.expr, id => (allowX && id === 'x') ? ['x'] : null);
    o._astSrc = o.d.expr;
  }
  return o._ast;
}

/* ================= 기하 계산 ================= */
function compute(o, Gx) {
  try { const g = COMP[o.t](o, Gx); return g; } catch (e) { return null; }
}
const PG = (o, Gx, i) => Gx[o.p[i]];

const COMP = {
  point(o, Gx) {
    const d = o.d;
    switch (o.k) {
      case 'free': return { x: d.x, y: d.y };
      case 'on': { const po = obj(o.p[0]), g = PG(o, Gx, 0); return g ? pathAt(po, g, d.t) : null; }
      case 'int': {
        const oa = obj(o.p[0]), ob = obj(o.p[1]), ga = PG(o, Gx, 0), gb = PG(o, Gx, 1); if (!ga || !gb) return null;
        const r = rawIntersections(oa, ga, ob, gb)[d.i]; return r && r.ok ? r.p : null;
      }
      case 'mid': { const g = PG(o, Gx, 0); return g ? lerp(g.a, g.b, 0.5) : null; }
      case 'onv': { const po = obj(o.p[0]), g = PG(o, Gx, 0), v = valNum(o.p[1], Gx); return g && isFinite(v) ? pathAt(po, g, v) : null; }
      case 'term': { const g = PG(o, Gx, 0); return g && g.term && g.term[d.i] ? { ...g.term[d.i] } : null; }
      case 'cxf': { const g = PG(o, Gx, 0); if (!g) return null; const q = cxfMapper(o.p[1], o.p[2], Gx)(g); return okp(q) ? { x: q.x, y: q.y } : null; }
      case 'xf': { const g = PG(o, Gx, 0); const M = buildMap(d.xf, Gx); return g && M ? xformGeom('point', g, M) : null; }
      case 'unit': { const g = PG(o, Gx, 0); return g ? (d.axis === 'y' ? { x: g.x, y: g.y + d.u } : { x: g.x + d.u, y: g.y }) : null; }
      case 'unitlen': { const g = PG(o, Gx, 0), s = PG(o, Gx, 1), so = obj(o.p[1]); if (!g || !s) return null; const L = isStraight(so) ? vdist(s.a, s.b) : so.t === 'circle' ? s.r : valAsDist(so.id, Gx); return isFinite(L) && L > 0 ? { x: g.x + L, y: g.y } : null; }
      case 'plot': {
        const c = Gx[o.p[0]]; if (!c) return null;
        const x = d.xV != null ? valNum(d.xV, Gx) : d.x, y = d.yV != null ? valNum(d.yV, Gx) : d.y;
        if (d.polar) { const th = y * (doc.prefs.deg ? D2R : 1); return cToW(c, x * Math.cos(th), x * Math.sin(th)); }
        return cToW(c, x, y);
      }
    }
    return null;
  },
  segment: straight, ray: straight, line: straight,
  circle(o, Gx) {
    if (o.k === 'cp') { const c = PG(o, Gx, 0), p = PG(o, Gx, 1); return c && p ? { c, r: vdist(c, p) } : null; }
    if (o.k === 'cr') {
      const c = PG(o, Gx, 0), src = obj(o.p[1]), g = PG(o, Gx, 1); if (!c || !g) return null;
      const r = isStraight(src) ? vdist(g.a, g.b) : valAsDist(src.id, Gx); return isFinite(r) ? { c, r: Math.abs(r) } : null;
    }
    if (o.k === 'xf') { const g = PG(o, Gx, 0), M = buildMap(o.d.xf, Gx); return g && M ? xformGeom('circle', g, M) : null; }
    return null;
  },
  arc(o, Gx) {
    if (o.k === 'oc') {
      const C = PG(o, Gx, 0), A = PG(o, Gx, 1), B = PG(o, Gx, 2); if (!C || !A || !B) return null;
      const s = vang(vsub(A, C.c)), e = vang(vsub(B, C.c)); let w = mod(e - s, TAU); if (w < 1e-9) w = TAU;
      return { c: C.c, r: C.r, s, w };
    }
    if (o.k === 'cpp') {
      const c = PG(o, Gx, 0), A = PG(o, Gx, 1), B = PG(o, Gx, 2); if (!c || !A || !B) return null;
      const s = vang(vsub(A, c)), e = vang(vsub(B, c)); let w = mod(e - s, TAU); if (w < 1e-9) w = TAU;
      return { c, r: vdist(c, A), s, w };
    }
    if (o.k === '3p') {
      const A = PG(o, Gx, 0), B = PG(o, Gx, 1), C = PG(o, Gx, 2); if (!A || !B || !C) return null;
      const cc = circumcenter(A, B, C); if (!cc) return null;
      const sA = vang(vsub(A, cc)), sB = vang(vsub(B, cc)), sC = vang(vsub(C, cc));
      const wAC = mod(sC - sA, TAU), wAB = mod(sB - sA, TAU);
      return { c: cc, r: vdist(cc, A), s: sA, w: wAB < wAC ? wAC : wAC - TAU };
    }
    if (o.k === 'xf') { const g = PG(o, Gx, 0), M = buildMap(o.d.xf, Gx); return g && M ? xformGeom('arc', g, M) : null; }
    return null;
  },
  polygon(o, Gx) {
    if (o.k === 'xf') { const g = PG(o, Gx, 0), M = buildMap(o.d.xf, Gx); return g && M ? xformGeom('polygon', g, M) : null; }
    const pts = o.p.map(id => Gx[id]); return pts.every(Boolean) ? { pts } : null;
  },
  cinterior(o, Gx) {
    if (o.k === 'xf') { const g = PG(o, Gx, 0), M = buildMap(o.d.xf, Gx); return g && M ? xformGeom('cinterior', g, M) : null; }
    const g = PG(o, Gx, 0); return g ? { c: g.c, r: g.r } : null;
  },
  sector(o, Gx) { if (o.k === 'xf') { const g = PG(o, Gx, 0), M = buildMap(o.d.xf, Gx); return g && M ? xformGeom('sector', g, M) : null; } const g = PG(o, Gx, 0); return g ? { ...g } : null; },
  arcseg(o, Gx) { if (o.k === 'xf') { const g = PG(o, Gx, 0), M = buildMap(o.d.xf, Gx); return g && M ? xformGeom('arcseg', g, M) : null; } const g = PG(o, Gx, 0); return g ? { ...g } : null; },
  coord(o, Gx) {
    const O = PG(o, Gx, 0), U = PG(o, Gx, 1); if (!O || !U) return null;
    const ux = Math.max(1e-6, U.x - O.x); let uy = ux; const form = o.d.form || 'square';
    if (form === 'rect' && o.p[2] != null) { const V = PG(o, Gx, 2); if (V) uy = Math.max(1e-6, V.y - O.y); }
    return { o: O, u: ux, ux, uy, form };
  },
  fplot(o, Gx) {
    const co = PG(o, Gx, 0); if (!co) return null;
    if (o.k === 'param') { const a = Gx[o.p[1]], b = Gx[o.p[2]]; if (!a || !b || !a.f || !b.f) return null; return { co, form: 'param', fx: a.f, fy: b.f, tmin: o.d.tmin, tmax: o.d.tmax, n: o.d.n }; }
    if (o.d.fn != null) { const fg = Gx[o.d.fn], fo = obj(o.d.fn); if (!fg || !fg.f) return null; return { co, f: fg.f, form: fo.d.form || 'yx', xmin: o.d.xmin, xmax: o.d.xmax, n: o.d.n }; }
    const ast = compileStored(o, Gx, true);
    const env = { x: 0, trig: 1, ref: id => valNum(id, Gx), call: (id, x) => { const g = Gx[id]; if (!g || id === o.id) return NaN; const sv = env.x; const r = g.f(x); env.x = sv; return r; } };
    return { co, f: x => { env.x = x; return evalAst(ast, env); }, xmin: o.d.xmin, xmax: o.d.xmax };
  },
  locus(o, Gx) { return o.k === 'cxf' ? computeCxfLocus(o, Gx) : computeLocus(o, Gx); },
  iter(o, Gx) { return computeIter(o, Gx); }, picture(o, Gx) { return o.k === 'cxf' ? computeCxfPicture(o, Gx) : pictureFrame(o, Gx); }, drawing() { return {}; }, table() { return {}; }, tplot() { return {}; },
  value(o, Gx) { return computeValue(o, Gx); },
  text() { return {}; }, button() { return {}; },
  amark(o, Gx) { const A = PG(o, Gx, 0), V = PG(o, Gx, 1), B = PG(o, Gx, 2); return A && V && B ? { A, V, B } : null; },
};
function straight(o, Gx) {
  const d = o.d;
  switch (o.k) {
    case '2p': { const a = PG(o, Gx, 0), b = PG(o, Gx, 1); return a && b && vdist(a, b) > 1e-10 ? { a, b } : null; }
    case 'par': case 'perp': {
      const P = PG(o, Gx, 0), L = PG(o, Gx, 1); if (!P || !L) return null;
      let dir = vnorm(vsub(L.b, L.a)); if (!dir) return null; if (o.k === 'perp') dir = vperp(dir);
      return { a: P, b: vadd(P, dir) };
    }
    case 'bis': {
      const A = PG(o, Gx, 0), V = PG(o, Gx, 1), B = PG(o, Gx, 2); if (!A || !V || !B) return null;
      const u1 = vnorm(vsub(A, V)), u2 = vnorm(vsub(B, V)); if (!u1 || !u2) return null;
      let dir = vnorm(vadd(u1, u2)); if (!dir) dir = vperp(u1);
      return { a: V, b: vadd(V, dir) };
    }
    case 'xf': { const g = PG(o, Gx, 0), M = buildMap(d.xf, Gx); return g && M ? xformGeom(o.t, g, M) : null; }
  }
  return null;
}
function circumcenter(A, B, C) {
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y)); if (Math.abs(d) < 1e-12) return null;
  const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
  return { x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d, y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d };
}

/* ================= 측정값 ================= */
function toCoord(p, Gx, cid) { const c = Gx[cid ?? doc.coordId]; if (!c || !p) return null; const q = wToC(c, p); if (c.form === 'polar') { q.r = Math.hypot(q.x, q.y); q.th = Math.atan2(q.y, q.x); } return q; }
function polyArea(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }
function computeValue(o, Gx) {
  const g = i => PG(o, Gx, i), po = i => obj(o.p[i]);
  const D = raw => ({ raw, u: 'dist' }), A = raw => ({ raw, u: 'angle' }), AR = raw => ({ raw, u: 'area' }), N = v => ({ raw: v, v, u: 'none' });
  let r = null;
  switch (o.k) {
    case 'len': { const s = g(0); if (s) r = D(vdist(s.a, s.b)); break; }
    case 'dist': {
      const a = g(0), b = g(1); if (!a || !b) break;
      if (isStraight(po(1))) { const d = vnorm(vsub(b.b, b.a)); r = D(Math.abs(vcross(d, vsub(a, b.a)))); }
      else r = D(vdist(a, b)); break;
    }
    case 'perim': { const s = g(0), t = po(0); if (!s) break; if (t.t === 'polygon') { const L = polyLens(s.pts, true); r = D(L[L.length - 1]); } else if (t.t === 'sector') r = D(Math.abs(s.w) * s.r + 2 * s.r); else if (t.t === 'arcseg') r = D(Math.abs(s.w) * s.r + 2 * s.r * Math.sin(Math.min(Math.abs(s.w), TAU) / 2)); break; }
    case 'circum': { const s = g(0); if (s) r = D(TAU * s.r); break; }
    case 'radius': { const s = g(0); if (s) r = D(s.r); break; }
    case 'angle': { const a = g(0), v = g(1), b = g(2); if (a && v && b) { const sa = signedAngle(a, v, b); r = A(doc.prefs.directed ? sa : Math.abs(sa)); } break; }
    case 'area': {
      const s = g(0), t = po(0); if (!s) break;
      if (t.t === 'polygon') r = AR(polyArea(s.pts));
      else if (t.t === 'circle' || t.t === 'cinterior') r = AR(Math.PI * s.r * s.r);
      else if (t.t === 'sector') r = AR(s.r * s.r * Math.abs(s.w) / 2);
      else if (t.t === 'arcseg') { const w = Math.abs(s.w); r = AR(s.r * s.r * (w - Math.sin(w)) / 2); }
      break;
    }
    case 'arcang': { const s = g(0); if (s) r = A(Math.abs(s.w)); break; }
    case 'arclen': { const s = g(0); if (s) r = D(Math.abs(s.w) * s.r); break; }
    case 'ratio': { const a = g(0), b = g(1); if (a && b) r = N(vdist(a.a, a.b) / vdist(b.a, b.b)); break; }
    case 'coords': { const c = toCoord(g(0), Gx, coordOf(o)); if (c) { r = N(c.x); if (c.r != null) { r.polar = true; r.vx = c.r; r.vy = toDisplay(c.th, 'angle'); } else { r.vx = c.x; r.vy = c.y; } } break; }
    case 'x': { const c = toCoord(g(0), Gx, coordOf(o)); if (c) r = c.r != null ? N(c.r) : N(c.x); break; }
    case 'y': { const c = toCoord(g(0), Gx, coordOf(o)); if (c) r = c.r != null ? A(c.th) : N(c.y); break; }
    case 'coorddist': { const a = toCoord(g(0), Gx, coordOf(o)), b = toCoord(g(1), Gx, coordOf(o)); if (a && b) r = N(Math.hypot(a.x - b.x, a.y - b.y)); break; }
    case 'ratio3': { const a = g(0), b = g(1), c = g(2); if (a && b && c) { const d = vsub(b, a); r = N(vdot(vsub(c, a), d) / vdot(d, d)); } break; }
    case 'slope': { const s = g(0), co = Gx[coordOf(o)]; if (s) { const a = co ? wToC(co, s.a) : s.a, b = co ? wToC(co, s.b) : s.b; r = N((b.y - a.y) / (b.x - a.x)); } break; }
    case 'eq': {
      const s = g(0), t = po(0), cid = coordOf(o), co = Gx[cid]; if (!s || !co) break;
      if (isStraight(t)) { const a = toCoord(s.a, Gx, cid), b = toCoord(s.b, Gx, cid); r = N(NaN); r.eq = { line: true, a, b }; }
      else { const c = toCoord(s.c, Gx, cid), rr = s.r / co.ux; r = N(NaN); r.eq = { circle: true, c, r: rr, ellipse: co.ux !== co.uy, ry: s.r / co.uy }; }
      break;
    }
    case 'func': case 'deriv': case 'data': return computeFunc(o, Gx);
    case 'ptval': { const s = g(0); if (s) r = N(obj(o.p[0]).d.t); break; }
    case 'fdef': { if (g(0)) { r = N(NaN); r.fdef = true; } break; }
    case 'param': r = { raw: o.d.v, v: o.d.v, u: o.d.unit || 'none' }; if (r.u === 'dist') r.raw = o.d.v; if (r.u === 'angle') r.raw = o.d.v * (doc.prefs.deg ? D2R : 1); return r;
    case 'calc': {
      let ast; try { ast = compileStored(o, Gx, false); } catch (e) { return { v: NaN, u: 'none', err: e.message }; }
      const env = { trig: doc.prefs.deg ? D2R : 1, ref: id => valNum(id, Gx), call: (id, x) => { const g = Gx[id]; return g ? g.f(x) : NaN; } };
      { const val = evalAst(ast, env), un = calcUnit(ast); r = un === 'none' ? N(val) : { v: val, u: un, raw: fromDisplay(val, un) }; } break;
    }
  }
  if (!r) return null;
  if (r.v === undefined) r.v = toDisplay(r.raw, r.u);
  return r;
}
function toDisplay(raw, u) {
  const P = doc.prefs;
  if (u === 'dist') return P.unit === 'in' ? raw / 2.54 : P.unit === 'px' ? raw * PXCM : raw;
  if (u === 'area') return P.unit === 'in' ? raw / 6.4516 : P.unit === 'px' ? raw * PXCM * PXCM : raw;
  if (u === 'angle') return P.deg ? raw / D2R : raw;
  return raw;
}
function unitStr(u) {
  const P = doc.prefs;
  if (u === 'dist') return ' ' + (P.unit === 'in' ? 'in' : P.unit === 'px' ? 'px' : 'cm');
  if (u === 'area') return ' ' + (P.unit === 'in' ? 'in²' : P.unit === 'px' ? 'px²' : 'cm²');
  if (u === 'angle') return P.deg ? '°' : ' rad';
  return '';
}
function fmt(v, prec = doc.prefs.prec) { if (!isFinite(v)) return v === Infinity || v === -Infinity ? '∞' : '정의되지 않음'; const s = v.toFixed(prec); return s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s; }

function valueName(o) {
  const p = o.p, n = i => nm(p[i]);
  if (o.d && o.d.name && o.k !== 'calc') return disp(o.d.name);
  switch (o.k) {
    case 'len': return 'm ' + n(0);
    case 'dist': return isStraight(obj(p[1])) ? n(0) + '와 ' + n(1) + ' 사이 거리' : n(0) + n(1);
    case 'perim': return '둘레 ' + n(0);
    case 'circum': return '원주 ' + n(0);
    case 'radius': return '반지름 ' + n(0);
    case 'angle': return 'm∠' + n(0) + n(1) + n(2);
    case 'area': return '넓이 ' + n(0);
    case 'arcang': return '중심각 ' + n(0);
    case 'arclen': return '호의 길이 ' + n(0);
    case 'ratio': return 'm ' + n(0) + ' / m ' + n(1);
    case 'coords': return n(0);
    case 'x': return (G[coordOf(o)] && G[coordOf(o)].form === 'polar' ? 'r' : 'x') + '[' + n(0) + ']';
    case 'y': return (G[coordOf(o)] && G[coordOf(o)].form === 'polar' ? 'θ' : 'y') + '[' + n(0) + ']';
    case 'coorddist': return '좌표 거리 ' + n(0) + n(1);
    case 'ratio3': return n(0) + n(2) + ' / ' + n(0) + n(1);
    case 'func': case 'deriv': case 'data': return disp(o.label);
    case 'slope': return '기울기 ' + n(0);
    case 'eq': return n(0);
    case 'ptval': return n(0) + '의 경로 위치';
    case 'param': return disp(o.label);
    case 'fdef': return disp(obj(p[0]).label) + '(x)';
    case 'calc': return o.d.name ? disp(o.d.name) : storedToDisplay(o.d.expr);
  }
  return disp(o.label);
}
function valueText(o) {
  const g = G[o.id], name = valueName(o);
  if (['func', 'deriv', 'data'].includes(o.k)) return funcText(o);
  if (!g) return name + ' = 정의되지 않음';
  if (o.k === 'coords') return name + ' = (' + fmt(g.vx) + ', ' + fmt(g.vy) + (g.polar ? unitStr('angle') : '') + ')';
  if (g.isFn) return funcText(o);
  if (o.k === 'eq') {
    const e = g.eq;
    if (e.line) {
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      if (Math.abs(dx) < 1e-12) return name + ': x = ' + fmt(e.a.x);
      const m = dy / dx, c = e.a.y - m * e.a.x;
      return name + ': y = ' + fmt(m) + 'x ' + (c < 0 ? '− ' + fmt(-c) : '+ ' + fmt(c));
    }
    if (e.ellipse) return name + ': (x ' + (e.c.x < 0 ? '+ ' + fmt(-e.c.x) : '− ' + fmt(e.c.x)) + ')²/' + fmt(e.r * e.r) + ' + (y ' + (e.c.y < 0 ? '+ ' + fmt(-e.c.y) : '− ' + fmt(e.c.y)) + ')²/' + fmt(e.ry * e.ry) + ' = 1';
    const sx = e.c.x < 0 ? '(x + ' + fmt(-e.c.x) + ')²' : '(x − ' + fmt(e.c.x) + ')²', sy = e.c.y < 0 ? '(y + ' + fmt(-e.c.y) + ')²' : '(y − ' + fmt(e.c.y) + ')²';
    return name + ': ' + sx + ' + ' + sy + ' = ' + fmt(e.r * e.r);
  }
  if (g.err) return name + ' = 오류';
  const P = doc.prefs, pr = o.prec ?? (g.u === 'angle' ? P.precA : (g.u === 'dist' || g.u === 'area') ? P.precD : P.precO) ?? P.prec;
  if (o.k === 'fdef') { const f = obj(o.p[0]); return disp(f.label) + '(x) = ' + storedToDisplay(f.d.expr); }
  return name + ' = ' + fmt(g.v, pr) + unitStr(g.u);
}

/* ================= 자취 ================= */
let viewBoundsFn = () => ({ x0: -20, x1: 20, y0: -15, y1: 15 });
function driverRange(drv, Gx) {
  if (drv.t === 'value') { const d = drv.d; return [d.min ?? 0, d.max ?? 10, false]; }
  const po = obj(drv.p[0]), g = Gx[po.id]; if (!g) return null;
  if (po.t === 'circle' || po.t === 'cinterior' || po.t === 'polygon') return [0, 1, true];
  if (po.t === 'segment' || po.t === 'arc' || po.t === 'sector' || po.t === 'arcseg' || po.t === 'locus') return [0, 1, false];
  if (po.t === 'fplot') { const r = fplotRange(g); return [r[0], r[1], false]; }
  if (po.t === 'ray' || po.t === 'line') {
    const b = viewBoundsFn(), ts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => pathProj({ t: 'line' }, g, { x, y }));
    let t0 = Math.min(...ts), t1 = Math.max(...ts); const pad = (t1 - t0) * 0.5; t0 -= pad; t1 += pad;
    if (po.t === 'ray') t0 = Math.max(0, t0); if (t1 <= t0) return null; return [t0, t1, false];
  }
  return null;
}
function computeLocus(o, Gx) {
  const three = o.p.length === 3;
  const drv = obj(o.p[0]), tgt = obj(o.p[three ? 2 : 1]); if (!drv || !tgt) return null;
  const drvPath = three ? obj(o.p[1]) : (drv.t === 'point' ? obj(drv.p[0]) : null);
  const rng = three ? driverRange({ t: 'point', k: 'on', p: [drvPath.id] }, Gx) : driverRange(drv, Gx); if (!rng) return null;
  const down = descendants([drv.id]), up = ancestors([tgt.id]); up.add(tgt.id);
  const chain = doc.objs.filter(x => x.id !== drv.id && down.has(x.id) && up.has(x.id) && x.t !== 'locus');
  if (!chain.length && tgt.id !== drv.id) return null;
  const Gt = Object.assign({}, Gx);
  let [t0, t1, wrap] = rng; if (o.d.dom) { const a = clamp(o.d.dom[0], 0, 1), b = clamp(o.d.dom[1], 0, 1); const s0 = t0, sp = t1 - t0; t0 = s0 + sp * a; t1 = s0 + sp * b; if (a !== 0 || b !== 1) wrap = false; }
  const pointTarget = tgt.t === 'point';
  const n = pointTarget ? (o.d.n || doc.prefs.locusN || 300) : (o.d.n || 70);
  const sampleAt = t => {
    if (drv.t === 'value') { const raw = drv.d.unit === 'angle' ? t * (doc.prefs.deg ? D2R : 1) : t; Gt[drv.id] = { v: t, raw, u: drv.d.unit || 'none' }; }
    else Gt[drv.id] = pathAt(drvPath, Gx[drvPath.id], t);
    for (const c of chain) Gt[c.id] = compute(c, Gt);
    return Gt[tgt.id];
  };
  if (pointTarget) {
    const polys = []; let cur = [];
    const b = viewBoundsFn(), jump = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.25;
    let prev = null;
    const N = wrap ? n : n;
    for (let i = 0; i <= N; i++) {
      const t = t0 + (t1 - t0) * i / N; const p = sampleAt(t);
      if (!okp(p)) { if (cur.length > 1) polys.push(cur); cur = []; prev = null; continue; }
      const q = { x: p.x, y: p.y };
      if (prev && vdist(prev, q) > jump) {
        // 간단한 세분: 중간 표본 4개로 확인
        let ok = true, last = prev;
        for (let k = 1; k <= 4; k++) { const m = sampleAt(t0 + (t1 - t0) * (i - 1 + k / 5) / N); if (!okp(m) || vdist(last, m) > jump) { ok = false; break; } cur.push({ x: m.x, y: m.y }); last = m; }
        if (!ok) { if (cur.length > 1) polys.push(cur); cur = []; }
      }
      cur.push(q); prev = q;
    }
    if (cur.length > 1) polys.push(cur);
    return { polys };
  }
  const items = [];
  if (tgt.t === 'picture') { for (let i = 0; i <= n; i++) { const g = sampleAt(t0 + (t1 - t0) * i / n); if (g && g.TL) items.push({ TL: { ...g.TL }, TR: { ...g.TR }, BL: { ...g.BL } }); } return { kind: 'picture', items, src: Gx[tgt.id] && Gx[tgt.id].src }; }
  if (tgt.t === 'fplot') { for (let i = 0; i <= n; i++) { const g = sampleAt(t0 + (t1 - t0) * i / n); if (g) items.push({ pts: fplotSamples(g, 160).map(s => s.p) }); } return { kind: 'fplot', items }; }
  for (let i = 0; i <= n; i++) { const g = sampleAt(t0 + (t1 - t0) * i / n); if (g) items.push(JSON.parse(JSON.stringify(g))); }
  return { kind: tgt.t, items };
}

/* ================= 전체 재계산 ================= */
function recompute() { G = {}; for (const o of doc.objs) G[o.id] = compute(o, G); dirty = false; }

/* ================= 직렬화 ================= */
function serialize() { return JSON.stringify(doc, (k, v) => k[0] === '_' ? undefined : v); }
function loadDocJSON(s) {
  const d = typeof s === 'string' ? JSON.parse(s) : s;
  if (!d || !Array.isArray(d.objs)) throw new Error('작도 파일 형식이 아닙니다');
  const base = newDoc(); doc = Object.assign(base, d); doc.prefs = Object.assign(newDoc().prefs, d.prefs || {});
  reindex(); sel = []; dirty = true;
}
