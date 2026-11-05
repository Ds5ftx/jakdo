'use strict';
/* ================= 예제 ================= */
function L(id, name, show = true) { const o = obj(id); o.label = name; o.showLabel = show; return id; }
function hide(...ids) { ids.forEach(id => obj(id).hidden = true); }
function sty(id, s) { Object.assign(obj(id), s); return id; }
function text(t, sx, sy, extra = {}) { return add({ t: 'text', k: 'cap', d: { text: t, sx, sy, size: 14, ...extra }, color: 'gray' }).id; }
function placeVals(ids, x, y) { ids.forEach((id, i) => { const o = obj(id); o.d.sx = x; o.d.sy = y + i * 26; }); }

const EXAMPLES = [
  { name: '삼각형의 외심과 외접원', build() {
    const A = L(P(-4, -2.2), 'A'), B = L(P(4.2, -2.6), 'B'), C = L(P(0.8, 3.6), 'C');
    const sAB = mkStraight('segment', A, B), sBC = mkStraight('segment', B, C); mkStraight('segment', C, A);
    const M1 = L(mkMid(sAB), 'M', false), M2 = L(mkMid(sBC), 'N', false);
    sty(M1, { ps: 1, color: 'gray' }); sty(M2, { ps: 1, color: 'gray' });
    const p1 = sty(mkPerp(M1, sAB), { dash: 1, color: 'gray', w: 1 }), p2 = sty(mkPerp(M2, sBC), { dash: 1, color: 'gray', w: 1 });
    const O = L(mkInt(p1, p2, 0), 'O'); sty(O, { color: 'blue' });
    sty(mkCircle(O, A), { color: 'blue' });
    const d = [mkValue('dist', [O, A]), mkValue('dist', [O, B]), mkValue('dist', [O, C])];
    placeVals(d, 14, 14);
    text('두 변의 수직이등분선의 교점 O에서\n세 꼭짓점까지의 거리는 항상 같습니다.\n꼭짓점을 끌어 보세요.', 14, 100);
  } },
  { name: '오일러 직선', build() {
    const A = L(P(-4.8, -2.4), 'A'), B = L(P(5, -2.6), 'B'), C = L(P(-2.6, 3.9), 'C');
    const ab = mkStraight('segment', A, B), bc = mkStraight('segment', B, C), ca = mkStraight('segment', C, A);
    const Ma = sty(mkMid(bc), { ps: 1, color: 'gray', showLabel: false }), Mb = sty(mkMid(ca), { ps: 1, color: 'gray', showLabel: false }), Mc = sty(mkMid(ab), { ps: 1, color: 'gray', showLabel: false });
    const m1 = sty(mkStraight('segment', A, Ma), { w: 1, dash: 2, color: 'green' }), m2 = sty(mkStraight('segment', B, Mb), { w: 1, dash: 2, color: 'green' });
    const Gc = L(mkInt(m1, m2, 0), 'G'); sty(Gc, { color: 'green' });
    const h1 = sty(mkPerp(A, bc), { w: 1, dash: 1, color: 'orange' }), h2 = sty(mkPerp(B, ca), { w: 1, dash: 1, color: 'orange' });
    const Hh = L(mkInt(h1, h2, 0), 'H'); sty(Hh, { color: 'orange' });
    const q1 = sty(mkPerp(Mc, ab), { w: 1, dash: 1, color: 'blue' }), q2 = sty(mkPerp(Ma, bc), { w: 1, dash: 1, color: 'blue' });
    const O = L(mkInt(q1, q2, 0), 'O'); sty(O, { color: 'blue' });
    const e = sty(mkStraight('line', O, Hh), { w: 3, color: 'magenta' }); obj(e).label = 'e';
    const hg = mkValue('dist', [Hh, Gc]), go = mkValue('dist', [Gc, O]);
    placeVals([hg, go], 14, 14);
    const r = mkCalc(obj(hg).label + '/' + obj(go).label); placeVals([r], 14, 66);
    const b = add({ t: 'button', k: 'b', p: [m1, m2, h1, h2, q1, q2, Ma, Mb, Mc], d: { act: 'hide', sx: 14, sy: 102, text: '보조선 숨기기' } }).id;
    text('무게중심 G, 수심 H, 외심 O는 한 직선 위에 있고\nHG : GO = 2 : 1 입니다. 꼭짓점을 끌어 보세요.', 14, 142);
  } },
  { name: '타원 — 자취와 포락선', build() {
    const F1 = L(P(-2, 0), 'F₁'), R = L(P(4, 0), 'R', false); sty(R, { ps: 1 });
    const c = sty(mkCircle(F1, R), { color: 'gray', w: 1 });
    const Pp = L(mkOn(c, 0.2), 'P'); const F2 = L(P(2, 0.4), 'F₂');
    const s1 = sty(mkStraight('segment', F1, Pp), { w: 1, color: 'gray' }), s2 = sty(mkStraight('segment', F2, Pp), { w: 1, color: 'gray', dash: 1 });
    const M = sty(mkMid(s2), { ps: 1, showLabel: false, color: 'gray' });
    const pb = sty(mkPerp(M, s2), { color: 'teal', w: 1 });
    const X = L(mkInt(pb, s1, 0), 'X'); sty(X, { color: 'purple', ps: 3 });
    const loc = mkLocus(Pp, X); sty(loc, { color: 'purple', w: 3 });
    const env = mkLocus(Pp, pb); sty(env, { color: 'teal', w: 1 }); obj(env).hidden = true;
    const a = mkValue('dist', [F1, X]), b = mkValue('dist', [F2, X]); placeVals([a, b], 14, 14);
    const sum = mkCalc(obj(a).label + '+' + obj(b).label); placeVals([sum], 14, 66);
    add({ t: 'button', k: 'b', p: [Pp], d: { act: 'anim', sx: 14, sy: 100, text: 'P 움직이기' } });
    add({ t: 'button', k: 'b', p: [env], d: { act: 'hide', sx: 140, sy: 100, text: '포락선 보이기' } });
    text('F₂P의 수직이등분선과 F₁P의 교점 X의 자취는\nF₁, F₂를 초점으로 하는 타원입니다. (F₁X + F₂X = 반지름)', 14, 140);
  } },
  { name: '이차함수와 매개변수', build() {
    ensureCoord();
    const a = mkParam(1, { min: -3, max: 3, step: 0.1, label: 'a' }), p = mkParam(1, { min: -4, max: 4, step: 0.5, label: 'p' }), q = mkParam(-2, { min: -4, max: 4, step: 0.5, label: 'q' });
    placeVals([a, p, q], 14, 14);
    const f = mkFplot('a*(x-p)^2+q'); placeVals([obj(f).d.fn], 14, 98);
    const V = L(mkPlot({ v: p }, { v: q }), 'V'); sty(V, { color: 'orange' });
    const T = L(mkOn(f, 2.2), 'T'); const ct = mkValue('coords', [T]); placeVals([ct], 14, 124);
    add({ t: 'button', k: 'b', p: [a], d: { act: 'anim', sx: 14, sy: 158, text: 'a 바꾸기' } });
    text('매개변수를 선택하고 + / − 키를 누르거나\n더블클릭해서 값을 바꿔 보세요. 꼭짓점 V = (p, q)', 14, 198);
  } },
  { name: '사이클로이드', build() {
    const co = ensureCoord(); const O = obj(co).p[0]; obj(O).d.x = -6; obj(O).d.y = -2; obj(obj(co).p[1]).d.u = 1;
    const th = mkParam(60, { min: 0, max: 720, step: 15, label: 'th', unit: 'none' }); placeVals([th], 14, 14);
    const xc = mkCalc('th*pi/180'), xp = mkCalc('th*pi/180 - sin(th)'), yp = mkCalc('1 - cos(th)');
    placeVals([xc, xp, yp], 14, 46);
    const Cc = L(mkPlot({ v: xc }, 1), 'C'); sty(Cc, { color: 'gray', ps: 1 });
    const Pp = L(mkPlot({ v: xp }, { v: yp }), 'P'); sty(Pp, { color: 'red', ps: 3 });
    sty(mkCircle(Cc, Pp), { color: 'blue' });
    sty(mkStraight('segment', Cc, Pp), { color: 'blue', w: 1 });
    const loc = mkLocus(th, Pp); sty(loc, { color: 'purple', w: 3 });
    add({ t: 'button', k: 'b', p: [th], d: { act: 'anim', sx: 14, sy: 128, text: '원 굴리기' } });
    text('반지름 1인 원이 x축 위를 굴러갈 때\n원 위의 한 점 P가 그리는 곡선입니다.', 14, 168);
  } },
  { name: '시에르핀스키 삼각형 (반복)', build() {
    const A = L(P(-5, -3.6), 'A'), B = L(P(5, -3.6), 'B'), C = L(P(0, 5), 'C');
    const ab = mkStraight('segment', A, B), bc = mkStraight('segment', B, C), ca = mkStraight('segment', C, A);
    [ab, bc, ca].forEach(s => sty(s, { w: 1 }));
    const D = sty(L(mkMid(ab), 'D'), { ps: 1 }), E = sty(L(mkMid(bc), 'E'), { ps: 1 }), F = sty(L(mkMid(ca), 'F'), { ps: 1 });
    const pg = mkPoly([A, B, C], 'blue'); obj(pg).alpha = 0.35;
    const n = mkParam(4, { min: 0, max: 6, step: 1, label: 'n' }); placeVals([n], 14, 14);
    add({ t: 'iter', k: 'geo', p: [A, B, C, A, D, F, D, B, E, F, E, C, n], d: { pre: [A, B, C], maps: [[A, D, F], [D, B, E], [F, E, C]], depth: 4, depthV: n, final: true, ptsToo: false, drawHidden: true } }); obj(n).prec = 0;
    obj(pg).hidden = true; [ab, bc, ca].forEach(s => obj(s).hidden = true);
    add({ t: 'button', k: 'b', p: [pg, ab, bc, ca], d: { act: 'hide', sx: 14, sy: 50, text: '원래 삼각형 보이기' } });
    text('변환 ▸ 반복으로 A→A, B→D, C→F 등 세 사상을 지정해 만든 프랙털입니다.\n매개변수 n을 선택하고 + / − 키로 단계를 바꿔 보세요. 꼭짓점도 끌 수 있습니다.', 14, 90);
  } },
  { name: '회전 대칭 무늬', build() {
    const O = L(P(0, 0), 'O'); sty(O, { color: 'ink' });
    const A = L(P(1, 0.5), 'A'), B = L(P(3.6, 0.4), 'B'), Cc = L(P(2.4, 2.2), 'C');
    const cols = ['red', 'orange', 'gold', 'green', 'blue', 'purple'];
    let src = mkPoly([A, B, Cc], cols[0]); obj(src).alpha = 0.45;
    doc.marks.center = O;
    for (let i = 1; i < 6; i++) { const im = mkXf(src, { type: 'rot', c: O, ang: 60 }); obj(im).color = cols[i]; obj(im).alpha = 0.45; src = im; }
    text('삼각형을 점 O를 중심으로 60°씩 회전했습니다.\nA, B, C를 끌면 무늬 전체가 함께 바뀝니다.', 14, 14);
  } },
];
function loadExample(x, quiet) {
  addPage(x.name);
  view.s = clamp(Math.min(W, H) / 12.5, 22, 46); view.ox = W / 2 + (W > 700 ? 90 : 0); view.oy = H / 2 + 10;
  x.build(); dirty = true; recompute(); draw(); refresh();
  undoStack.length = 0; redoStack.length = 0;
  if (!quiet) toast('예제를 새 페이지로 열었습니다: ' + x.name);
}

/* ================= 시작 ================= */
function init() {
  readTheme(); buildMenubar(); buildToolbox();
  new ResizeObserver(resize).observe($('#stage')); resize();
  doc = newDoc(); reindex();
  let loaded = false;
  const emb = document.getElementById('jakdo-embed');
  if (emb) { let h = 0; for (const ch of emb.textContent) h = (h * 31 + ch.charCodeAt(0)) | 0; STORE_KEY = 'jakdo-book:emb:' + (h >>> 0).toString(36); }
  try {
    const s = localStorage.getItem(STORE_KEY) || (emb ? emb.textContent : null) || localStorage.getItem('jakdo-autosave');
    if (s) { const b = parseBook(s); if (!localStorage.getItem(STORE_KEY) && !emb) { const v = JSON.parse(localStorage.getItem('jakdo-view') || 'null'); if (v && v.s) b.pages[0].view = v; } if (b.pages.some(p => p.doc.objs.length)) { replaceBook(b); loaded = true; } }
  } catch (e) { loaded = false; }
  if (!loaded) { book = { pages: [], cur: 0, nextPid: 1 }; for (const x of EXAMPLES) loadExample(x, true); showPage(1); }
  setTool('arrow'); updateStatus(); refresh();
  const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener && mq.addEventListener('change', () => { readTheme(); requestDraw(); });
  new MutationObserver(() => { readTheme(); requestDraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.fonts) document.fonts.ready.then(() => requestDraw());
  $('#b-undo').onclick = undo; $('#b-redo').onclick = redo; $('#b-help').onclick = helpDlg;
  $('#z-in').onclick = () => zoomAt(W / 2, H / 2, 1.25); $('#z-out').onclick = () => zoomAt(W / 2, H / 2, 0.8);
  $('#z-fit').onclick = fitView;
  $('#m-stop').onclick = () => stopAnim(); $('#m-slow').onclick = () => { speedK = Math.max(0.1, speedK / 1.5); updateMotion(); }; $('#m-fast').onclick = () => { speedK = Math.min(8, speedK * 1.5); updateMotion(); };
}
function fitView() {
  const pts = []; for (const o of doc.objs) { if (o.hidden) continue; const g = G[o.id]; if (!g) continue; if (o.t === 'point') pts.push(g); else if (o.t === 'circle') pts.push(vsub(g.c, { x: g.r, y: g.r }), vadd(g.c, { x: g.r, y: g.r })); }
  if (!pts.length) { view.s = PXCM; view.ox = W / 2; view.oy = H / 2; refresh(); return; }
  const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
  const s = clamp(Math.min((W - 120) / Math.max(1, x1 - x0), (H - 120) / Math.max(1, y1 - y0)), 5, 400);
  view.s = s; view.ox = W / 2 - (x0 + x1) / 2 * s; view.oy = H / 2 + (y0 + y1) / 2 * s; refresh(); scheduleSave();
}
init();
