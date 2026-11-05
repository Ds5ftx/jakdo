'use strict';
/* ================= 좌표계 도우미 ================= */
const cToW = (co, x, y) => ({ x: co.o.x + x * co.ux, y: co.o.y + y * co.uy });
const wToC = (co, p) => ({ x: (p.x - co.o.x) / co.ux, y: (p.y - co.o.y) / co.uy });
function coordOf(o) { const last = o.p[o.p.length - 1]; const lo = obj(last); return lo && lo.t === 'coord' ? last : doc.coordId; }
const isFnObj = o => !!o && (o.t === 'fplot' || (o.t === 'value' && ['func', 'deriv', 'data'].includes(o.k)));
const FORM_VAR = { yx: 'x', xy: 'y', rt: 'θ' };

/* ================= 함수 그래프 매개화 ================= */
function fplotRange(g) {
  const b = viewBoundsFn();
  if (g.form === 'param') return [g.tmin ?? 0, g.tmax ?? 1];
  if (g.form === 'rt') return [g.xmin ?? 0, g.xmax ?? TAU];
  if (g.form === 'xy') { const a = wToC(g.co, { x: 0, y: b.y0 }).y, c = wToC(g.co, { x: 0, y: b.y1 }).y; return [g.xmin != null ? Math.max(g.xmin, a) : a, g.xmax != null ? Math.min(g.xmax, c) : c]; }
  const a = wToC(g.co, { x: b.x0, y: 0 }).x, c = wToC(g.co, { x: b.x1, y: 0 }).x;
  return [g.xmin != null ? Math.max(g.xmin, a) : a, g.xmax != null ? Math.min(g.xmax, c) : c];
}
function fplotAt(g, t) {
  let x, y;
  if (g.form === 'param') { x = g.fx(t); y = g.fy(t); }
  else { const v = g.f(t); if (g.form === 'xy') { x = v; y = t; } else if (g.form === 'rt') { x = v * Math.cos(t); y = v * Math.sin(t); } else { x = t; y = v; } }
  return isFinite(x) && isFinite(y) ? cToW(g.co, x, y) : null;
}
function fplotSamples(g, n) {
  const [t0, t1] = fplotRange(g); n = n || g.n || 400; const out = [];
  if (!(t1 > t0)) return out;
  for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; out.push({ t, p: fplotAt(g, t) }); }
  return out;
}
function fplotProj(g, p) {
  if (g.form === 'yx' || !g.form) return wToC(g.co, p).x;
  if (g.form === 'xy') return wToC(g.co, p).y;
  const S = fplotSamples(g, 300); let best = Infinity, bt = 0;
  for (const s of S) if (s.p) { const d = vdist(s.p, p); if (d < best) { best = d; bt = s.t; } }
  const [t0, t1] = fplotRange(g); let h = (t1 - t0) / 300;
  for (let k = 0; k < 30; k++) { h /= 2; for (const c of [bt - h, bt + h]) { const q = fplotAt(g, c); if (q) { const d = vdist(q, p); if (d < best) { best = d; bt = c; } } } }
  return bt;
}
function fplotWorldLen(g) {
  if (g.form === 'yx' || !g.form) return g.co.ux; if (g.form === 'xy') return g.co.uy;
  const S = fplotSamples(g, 120); let L = 0; for (let i = 1; i < S.length; i++) if (S[i].p && S[i - 1].p) L += vdist(S[i].p, S[i - 1].p);
  const [t0, t1] = fplotRange(g); return Math.max(1e-6, L / Math.max(1e-9, t1 - t0));
}
function compileFn(id, Gx) { const g = Gx[id]; return g && g.f ? g.f : (() => NaN); }

/* ================= 함수 값 객체 (새 함수 / 도함수) ================= */
function computeFunc(o, Gx) {
  if (o.k === 'data') {
    const xs = o.d.xs, ys = o.d.ys;
    const f = x => { if (!(x >= xs[0] && x <= xs[xs.length - 1])) return NaN; let lo = 0, hi = xs.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; } const u = xs[hi] === xs[lo] ? 0 : (x - xs[lo]) / (xs[hi] - xs[lo]); return ys[lo] + (ys[hi] - ys[lo]) * u; };
    return { v: NaN, u: 'none', f, isFn: true };
  }
  if (o.k === 'deriv' && o.d.numeric) { const base = Gx[o.p[0]]; if (!base || !base.f) return null; const h = 1e-4; return { v: NaN, u: 'none', isFn: true, f: x => (base.f(x + h) - base.f(x - h)) / (2 * h) }; }
  const ast = compileStored(o, Gx, true);
  const env = { x: 0, trig: 1, ref: id => valNum(id, Gx), call: (id, x) => { const g = Gx[id]; if (!g || !g.f || id === o.id) return NaN; const sv = env.x; const r = g.f(x); env.x = sv; return r; } };
  return { v: NaN, u: 'none', isFn: true, f: x => { env.x = x; return evalAst(ast, env); } };
}
function funcText(o) {
  const v = FORM_VAR[o.d.form || 'yx'];
  if (o.k === 'data') return disp(o.label) + '(' + v + ') : 그림에서 정의된 함수';
  if (o.k === 'deriv' && o.d.numeric) return disp(o.label) + '(' + v + ') ≈ ' + disp(obj(o.p[0]) ? obj(o.p[0]).label : '?') + '의 도함수';
  let body = storedToDisplay(o.d.expr); if (v !== 'x') body = body.replace(/\bx\b/g, v);
  const lhs = o.d.notation === 'y' ? (o.d.form === 'xy' ? 'x' : o.d.form === 'rt' ? 'r' : 'y') : disp(o.label) + '(' + v + ')';
  return lhs + ' = ' + body;
}

/* ================= 기호 미분 ================= */
function expandCalls(a, depth = 0) {
  if (!Array.isArray(a)) return a;
  if (a[0] === 'call') {
    const fo = obj(a[1]); const arg = expandCalls(a[2], depth);
    if (!fo || depth > 8 || fo.k === 'data' || (fo.k === 'deriv' && fo.d.numeric)) throw new Error('nosym');
    const src = fo.t === 'fplot' ? fo.d.expr : fo.d.expr; const body = parseExpr(src, id => id === 'x' ? ['x'] : null);
    return substX(expandCalls(body, depth + 1), arg);
  }
  return [a[0], ...a.slice(1).map(c => Array.isArray(c) ? expandCalls(c, depth) : c)];
}
function substX(a, by) { if (!Array.isArray(a)) return a; if (a[0] === 'x') return by; return [a[0], ...a.slice(1).map(c => Array.isArray(c) ? substX(c, by) : c)]; }
const hasX = a => Array.isArray(a) && (a[0] === 'x' || a.slice(1).some(hasX));
const N0 = ['n', 0], N1 = ['n', 1];
const isN = (a, v) => a[0] === 'n' && (v === undefined || a[1] === v);
function S_(op, a, b) {
  if (op === '+') { if (isN(a, 0)) return b; if (isN(b, 0)) return a; if (isN(a) && isN(b)) return ['n', a[1] + b[1]]; }
  if (op === '-') { if (isN(b, 0)) return a; if (isN(a, 0)) return S_neg(b); if (isN(a) && isN(b)) return ['n', a[1] - b[1]]; }
  if (op === '*') { if (isN(a, 0) || isN(b, 0)) return N0; if (isN(a, 1)) return b; if (isN(b, 1)) return a; if (isN(a) && isN(b)) return ['n', a[1] * b[1]]; if (isN(b)) return ['*', b, a]; }
  if (op === '/') { if (isN(a, 0)) return N0; if (isN(b, 1)) return a; if (isN(a) && isN(b) && b[1] !== 0) return ['n', a[1] / b[1]]; }
  if (op === '^') { if (isN(b, 0)) return N1; if (isN(b, 1)) return a; if (isN(a) && isN(b)) return ['n', Math.pow(a[1], b[1])]; }
  return [op, a, b];
}
function S_neg(a) { if (isN(a)) return ['n', -a[1]]; if (a[0] === 'neg') return a[1]; return ['neg', a]; }
const F_ = (name, a) => ['f', name, a];
function diff(a) {
  switch (a[0]) {
    case 'n': case 'r': return N0;
    case 'x': return N1;
    case '+': case '-': return S_(a[0], diff(a[1]), diff(a[2]));
    case 'neg': return S_neg(diff(a[1]));
    case '*': return S_('+', S_('*', diff(a[1]), a[2]), S_('*', a[1], diff(a[2])));
    case '/': return S_('/', S_('-', S_('*', diff(a[1]), a[2]), S_('*', a[1], diff(a[2]))), S_('^', a[2], ['n', 2]));
    case '^': {
      const u = a[1], v = a[2];
      if (!hasX(v)) return S_('*', S_('*', v, S_('^', u, S_('-', v, N1))), diff(u));
      if (!hasX(u)) return S_('*', S_('*', F_('ln', u), a), diff(v));
      return S_('*', a, S_('+', S_('*', diff(v), F_('ln', u)), S_('/', S_('*', v, diff(u)), u)));
    }
    case 'f': {
      const u = a[2], du = diff(u); let d;
      switch (a[1]) {
        case 'sin': d = F_('cos', u); break; case 'cos': d = S_neg(F_('sin', u)); break;
        case 'tan': d = S_('/', N1, S_('^', F_('cos', u), ['n', 2])); break;
        case 'asin': d = S_('/', N1, F_('sqrt', S_('-', N1, S_('^', u, ['n', 2])))); break;
        case 'acos': d = S_neg(S_('/', N1, F_('sqrt', S_('-', N1, S_('^', u, ['n', 2]))))); break;
        case 'atan': d = S_('/', N1, S_('+', N1, S_('^', u, ['n', 2]))); break;
        case 'sqrt': d = S_('/', N1, S_('*', ['n', 2], F_('sqrt', u))); break;
        case 'abs': d = F_('sgn', u); break;
        case 'ln': d = S_('/', N1, u); break;
        case 'log': d = S_('/', N1, S_('*', u, F_('ln', ['n', 10]))); break;
        case 'exp': d = F_('exp', u); break;
        default: return N0;
      }
      return S_('*', d, du);
    }
  }
  throw new Error('nosym');
}
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
function astToStr(a, parent = 0, right = false) {
  switch (a[0]) {
    case 'n': { const v = a[1]; const s = Number.isInteger(v) ? String(v) : String(+v.toPrecision(12)); return v < 0 && parent > 0 ? '(' + s + ')' : s; }
    case 'r': return '#' + a[1] + ' ';
    case 'x': return 'x';
    case 'f': return a[1] + '(' + astToStr(a[2]) + ')';
    case 'call': return '#' + a[1] + ' (' + astToStr(a[2]) + ')';
    case 'neg': { const s = '-' + astToStr(a[1], PREC.neg); return parent > PREC.neg - 1 ? '(' + s + ')' : s; }
    default: {
      const p = PREC[a[0]]; const l = astToStr(a[1], p, false), r = astToStr(a[2], p + (a[0] === '-' || a[0] === '/' || a[0] === '^' ? 1 : 0), true);
      const s = l + (a[0] === '^' ? '^' : ' ' + a[0] + ' ') + r;
      return p < parent || (p === parent && right && a[0] !== '^') ? '(' + s + ')' : s;
    }
  }
}
function symbolicDerivative(fo) {
  try { const body = parseExpr(fo.d.expr, id => id === 'x' ? ['x'] : null); return astToStr(diff(expandCalls(body))); }
  catch (e) { return null; }
}

/* ================= 수치 교점 (자취·그래프·다각형) ================= */
function curvePolyline(o, g) {
  if (o.t === 'fplot') { const S = fplotSamples(g, 500); return { pts: S.map(s => s.p), ts: S.map(s => s.t) }; }
  if (o.t === 'locus' && g.polys) { const pts = [], ts = []; let k = 0; for (const q of g.polys) { for (const p of q) { pts.push(p); ts.push(k++); } pts.push(null); ts.push(k++); } return { pts, ts }; }
  if (o.t === 'polygon') { const pts = g.pts.concat([g.pts[0]]); return { pts, ts: pts.map((_, i) => i) }; }
  if (o.t === 'circle' || o.t === 'arc') { const n = 360, pts = [], ts = []; const W = o.t === 'arc' ? g.w : TAU, s0 = o.t === 'arc' ? g.s : 0; for (let i = 0; i <= n; i++) { pts.push(vadd(g.c, vpol(g.r, s0 + W * i / n))); ts.push(i); } return { pts, ts }; }
  if (isStraight(o)) { const [t0, t1] = lineRange(g, o.t); return { pts: [lerp(g.a, g.b, t0), lerp(g.a, g.b, t1)], ts: [t0, t1] }; }
  return null;
}
function signedFn(o, g) {
  if (isStraight(o)) { const d = vsub(g.b, g.a); return { s: p => vcross(d, vsub(p, g.a)), ok: p => { const t = vdot(vsub(p, g.a), d) / vdot(d, d); return onStraight(t, o.t); } }; }
  if (o.t === 'circle' || o.t === 'arc') return { s: p => vdist(p, g.c) - g.r, ok: p => o.t !== 'arc' || onArc(g, vang(vsub(p, g.c))) };
  return null;
}
function curveIntersections(oa, ga, ob, gb) {
  const out = [];
  // 다각형과 직선류: 직선 위 순서 (반직선이면 첫 교점)
  if ((oa.t === 'polygon' && isStraight(ob)) || (ob.t === 'polygon' && isStraight(oa))) {
    const [po, pg, so, sg] = oa.t === 'polygon' ? [oa, ga, ob, gb] : [ob, gb, oa, ga];
    const d = vsub(sg.b, sg.a), hits = [];
    for (let i = 0; i < pg.pts.length; i++) {
      const a = pg.pts[i], b = pg.pts[(i + 1) % pg.pts.length], e = vsub(b, a), den = vcross(d, e); if (Math.abs(den) < 1e-12) continue;
      const w = vsub(a, sg.a), t = vcross(w, e) / den, u = vcross(w, d) / den;
      if (u >= -1e-9 && u <= 1 + 1e-9 && onStraight(t, so.t)) hits.push({ t, p: vadd(sg.a, vmul(d, t)) });
    }
    hits.sort((x, y) => x.t - y.t);
    if (so.t === 'ray') return [hits.length ? { p: hits[0].p, ok: true } : null];
    return hits.map(h => ({ p: h.p, ok: true }));
  }
  // 그래프(F) × 직선/원: 매개변수에서 부호 변화 + 이분법
  const F = oa.t === 'fplot' ? [oa, ga, ob, gb] : ob.t === 'fplot' ? [ob, gb, oa, ga] : null;
  if (F) {
    const [fo, fg, xo, xg] = F; const sf = signedFn(xo, xg);
    if (sf) {
      const S = fplotSamples(fg, 600); const val = p => p ? sf.s(p) : NaN;
      for (let i = 1; i < S.length; i++) {
        const a = S[i - 1], b = S[i]; const va = val(a.p), vb = val(b.p);
        if (!isFinite(va) || !isFinite(vb) || Math.sign(va) === Math.sign(vb)) { if (va === 0 && a.p && sf.ok(a.p)) out.push({ p: a.p, ok: true }); continue; }
        if (a.p && b.p && vdist(a.p, b.p) > 5) continue;
        let lo = a.t, hi = b.t, vlo = va;
        for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2, vm = val(fplotAt(fg, m)); if (!isFinite(vm)) break; if (Math.sign(vm) === Math.sign(vlo)) { lo = m; vlo = vm; } else hi = m; }
        const p = fplotAt(fg, (lo + hi) / 2); if (p) out.push({ p, ok: sf.ok(p) });
      }
      return out;
    }
    if (xo.t === 'fplot' && (fg.form || 'yx') === 'yx' && (xg.form || 'yx') === 'yx' && fg.co === xg.co) {
      const [t0, t1] = fplotRange(fg); const n = 800; const h = x => fg.f(x) - xg.f(x);
      let px = t0, pv = h(t0);
      for (let i = 1; i <= n; i++) {
        const x = t0 + (t1 - t0) * i / n, v = h(x);
        if (isFinite(v) && isFinite(pv) && Math.sign(v) !== Math.sign(pv) && Math.abs(v - pv) < 1e3) { let lo = px, hi = x, vl = pv; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2, vm = h(m); if (Math.sign(vm) === Math.sign(vl)) { lo = m; vl = vm; } else hi = m; } const p = fplotAt(fg, (lo + hi) / 2); if (p) out.push({ p, ok: true }); }
        px = x; pv = v;
      }
      return out;
    }
  }
  // 꺾은선 × 직선/원 또는 꺾은선 × 꺾은선
  const A = curvePolyline(oa, ga), B = curvePolyline(ob, gb); if (!A || !B) return [];
  const sfB = signedFn(ob, gb), sfA = signedFn(oa, ga);
  const poly = sfB ? A : sfA ? B : A, other = sfB || sfA;
  if (other) {
    for (let i = 1; i < poly.pts.length; i++) {
      const a = poly.pts[i - 1], b = poly.pts[i]; if (!a || !b) continue; const va = other.s(a), vb = other.s(b);
      if (Math.sign(va) === Math.sign(vb) || vdist(a, b) > 6) continue;
      if (other === signedFn(ob, gb) || other) {
        // 직선/원은 선분과 정확한 교점, 원은 보간
        const u = va / (va - vb); const p = lerp(a, b, u); out.push({ p, ok: other.ok(p) });
      }
    }
    return out;
  }
  for (let i = 1; i < A.pts.length; i++) {
    const a = A.pts[i - 1], b = A.pts[i]; if (!a || !b) continue; const d = vsub(b, a);
    for (let j = 1; j < B.pts.length; j++) {
      const c = B.pts[j - 1], e = B.pts[j]; if (!c || !e) continue; const f = vsub(e, c), den = vcross(d, f); if (Math.abs(den) < 1e-14) continue;
      const w = vsub(c, a), t = vcross(w, f) / den, u = vcross(w, d) / den;
      if (t >= 0 && t < 1 && u >= 0 && u < 1) out.push({ p: vadd(a, vmul(d, t)), ok: true });
    }
  }
  return out;
}

/* ================= 좌표계 격자 그리기 (극·직사각) ================= */
function drawCoord(co, o) {
  const b = viewBoundsFn(), O = toS(co.o), ux = co.ux * view.s, uy = co.uy * view.s;
  const trig = !!o.d.trig; let sx = niceStep(ux); if (trig) { const half = Math.PI / 2; sx = half * Math.max(1, Math.round(niceStep(ux * half) )); } const sy = co.form === 'rect' ? niceStep(uy) : (trig ? niceStep(uy) : sx);
  ctx.save(); ctx.lineWidth = 1; ctx.setLineDash([]);
  const gx0 = Math.ceil((b.x0 - co.o.x) / co.ux / sx) * sx, gx1 = (b.x1 - co.o.x) / co.ux;
  const gy0 = Math.ceil((b.y0 - co.o.y) / co.uy / sy) * sy, gy1 = (b.y1 - co.o.y) / co.uy;
  if (o.d.grid !== false) {
    ctx.strokeStyle = THEME.grid; ctx.fillStyle = THEME.axis;
    if (co.form === 'polar') {
      const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - O.x, y - O.y))) / ux;
      ctx.beginPath(); for (let r = sx; r <= far; r += sx) { ctx.moveTo(O.x + r * ux, O.y); ctx.arc(O.x, O.y, r * ux, 0, TAU); }
      for (let k = 0; k < 24; k++) { const a = k * TAU / 24; ctx.moveTo(O.x, O.y); ctx.lineTo(O.x + Math.cos(a) * far * ux, O.y - Math.sin(a) * far * ux); }
      ctx.stroke();
    } else if (o.d.dots) { for (let x = gx0; x <= gx1; x += sx) for (let y = gy0; y <= gy1; y += sy) ctx.fillRect(O.x + x * ux - 1, O.y - y * uy - 1, 2, 2); }
    else { ctx.beginPath(); for (let x = gx0; x <= gx1; x += sx) { const p = Math.round(O.x + x * ux) + 0.5; ctx.moveTo(p, 0); ctx.lineTo(p, H); } for (let y = gy0; y <= gy1; y += sy) { const p = Math.round(O.y - y * uy) + 0.5; ctx.moveTo(0, p); ctx.lineTo(W, p); } ctx.stroke(); }
  }
  if (o.d.axes === false) { ctx.restore(); return; }
  const marked = o.id === doc.coordId;
  ctx.strokeStyle = THEME.axis; ctx.lineWidth = marked ? 1.3 : 1; ctx.beginPath(); ctx.moveTo(0, O.y); ctx.lineTo(W, O.y); ctx.moveTo(O.x, 0); ctx.lineTo(O.x, H); ctx.stroke();
  ctx.fillStyle = THEME.axis; ctx.beginPath(); ctx.moveTo(W - 2, O.y); ctx.lineTo(W - 11, O.y - 4); ctx.lineTo(W - 11, O.y + 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(O.x, 2); ctx.lineTo(O.x - 4, 11); ctx.lineTo(O.x + 4, 11); ctx.fill();
  if (sel.includes(o.id) || hoverId === o.id) { ctx.strokeStyle = sel.includes(o.id) ? THEME.sel : THEME.hover; ctx.globalAlpha = 0.5; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, O.y); ctx.lineTo(W, O.y); ctx.moveTo(O.x, 0); ctx.lineTo(O.x, H); ctx.stroke(); ctx.globalAlpha = 1; }
  if (o.d.ticks !== false) {
    ctx.font = '11px "IBM Plex Sans KR", system-ui, sans-serif'; ctx.fillStyle = THEME.muted; ctx.strokeStyle = THEME.axis; ctx.lineWidth = 1;
    const lab = v => String(+v.toFixed(6)).replace('-', '−'); const labX = v => trig ? piLabel(Math.round(v / (Math.PI / 2))) : lab(v);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let x = gx0; x <= gx1; x += sx) { if (Math.abs(x) < sx / 2) continue; const p = O.x + x * ux; ctx.beginPath(); ctx.moveTo(p, O.y - 3); ctx.lineTo(p, O.y + 3); ctx.stroke(); ctx.fillText(labX(x), p, clamp(O.y + 5, 2, H - 14)); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let y = gy0; y <= gy1; y += sy) { if (Math.abs(y) < sy / 2) continue; const p = O.y - y * uy; ctx.beginPath(); ctx.moveTo(O.x - 3, p); ctx.lineTo(O.x + 3, p); ctx.stroke(); ctx.fillText(lab(y), clamp(O.x - 6, 22, W - 2), p); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('0', O.x - 5, O.y + 4);
  }
  ctx.restore();
}
function pathFplotGeneral(g, o) {
  if (o && o.d && o.d.disc) { for (const s of fplotSamples(g, Math.min(g.n || 120, 400))) if (s.p) { const q = toS(s.p); ctx.moveTo(q.x + 1.6, q.y); ctx.arc(q.x, q.y, 1.6, 0, TAU); } return; }
  if ((g.form || 'yx') === 'yx') return pathFplot(g);
  const S = fplotSamples(g); let pen = false, prev = null;
  for (const s of S) { if (!s.p) { pen = false; continue; } const q = toS(s.p); if (pen && prev && vdist(prev, q) > Math.max(W, H)) pen = false; pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); pen = true; prev = q; }
}
function hitFplot(g, P) {
  if ((g.form || 'yx') === 'yx') return null;
  let best = Infinity, prev = null;
  for (const s of fplotSamples(g, 300)) { if (!s.p) { prev = null; continue; } const q = toS(s.p); if (prev) best = Math.min(best, distSeg(P, prev, q)); prev = q; }
  return best;
}
