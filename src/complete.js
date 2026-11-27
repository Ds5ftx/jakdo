'use strict';
/* ================= 글꼴 도우미 (레이블·값·표·눈금) ================= */
const FAM = { sans: '"IBM Plex Sans KR", system-ui, sans-serif', serif: '"STIX Two Text", "Noto Serif KR", "Batang", serif', mono: '"IBM Plex Mono", ui-monospace, monospace' };
function objLabelFont(o) {
  const P = doc.prefs, lf = o.lf || {};
  const size = lf.size || P.labelSize || 16, fam = FAM[lf.font || P.labelFont || 'serif'];
  const it = lf.italic ?? (P.labelItalic ?? true), bd = lf.bold ?? true;
  return `${it ? 'italic ' : ''}${bd ? 600 : 400} ${size}px ${fam}`;
}
function valueFont(o) { const P = doc.prefs; const size = o.d.size || P.valSize || 14; return `${o.d.italic ? 'italic ' : ''}${o.d.bold ? 600 : 400} ${size}px ${FAM[o.d.font || P.valFont || 'sans']}`; }
function tableFont(o) { const P = doc.prefs; return `${(o && o.d.size) || P.tableSize || 14}px ${FAM[(o && o.d.font) || P.tableFont || 'sans']}`; }
function tickFont() { return `${doc.prefs.tickSize || 11}px ${FAM.sans}`; }

/* ================= 글상자 너비에 맞춘 줄바꿈 ================= */
function wrapText(text, width, size, font) {
  if (!width) return text.split('\n');
  const out = [];
  for (const para of text.split('\n')) {
    const words = para.split(/(\s+)/); let line = '';
    for (const w of words) {
      const cand = line + w; if (!line || layoutRich(parseRich(cand.trimEnd()), size, font).w <= width) { line = cand; continue; }
      out.push(line.trimEnd()); line = w.trimStart();
      // 한 단어가 너무 길면 글자 단위로 자름
      while (line && layoutRich(parseRich(line), size, font).w > width && line.length > 1) { let k = line.length - 1; while (k > 1 && layoutRich(parseRich(line.slice(0, k)), size, font).w > width) k--; out.push(line.slice(0, k)); line = line.slice(k); }
    }
    out.push(line.trimEnd());
  }
  return out;
}

/* ================= 데이터 함수: 부드럽게 (Catmull-Rom) ================= */
function dataFn(xs, ys, smooth) {
  const n = xs.length;
  return x => {
    if (!(x >= xs[0] && x <= xs[n - 1])) return NaN;
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    const h = xs[hi] - xs[lo], u = h === 0 ? 0 : (x - xs[lo]) / h;
    if (!smooth || n < 3) return ys[lo] + (ys[hi] - ys[lo]) * u;
    const slope = i => { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); return (ys[b] - ys[a]) / ((xs[b] - xs[a]) || 1); };
    const m0 = slope(lo) * h, m1 = slope(hi) * h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[lo] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * ys[hi] + (u3 - u2) * m1;
  };
}

/* ================= 사진(그림)에서 함수 정의 ================= */
// GSP 「그림으로 함수 정의」: f(x) = x 위에서 그림의 가장 높은 점의 y. 그림·좌표계를 부모로 두어 그림을 옮기거나 늘이면 함수도 바뀐다.
// 투명한 바탕의 그림은 불투명한 픽셀, 바탕이 모두 불투명한 그림(사진 등)은 어두운 픽셀을 그림으로 본다.
const picMaskCache = new Map();
function picMask(src) {
  const c0 = picMaskCache.get(src); if (c0) return c0;
  const im = imgOf(src);
  if (!im.complete || !im.naturalWidth) { if (!im._pfWait) { im._pfWait = true; im.addEventListener('load', () => { recompute(); requestDraw(); }); } return null; }
  const w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 1200 / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x2 = c.getContext('2d'); x2.drawImage(im, 0, 0, cw, ch);
  let data = null; try { data = x2.getImageData(0, 0, cw, ch).data; } catch (e) { }
  const m = { cw, ch, op: null, top: null, bot: null };
  if (data) {
    let clear = false; for (let q = 3; q < data.length; q += 4) if (data[q] < 128) { clear = true; break; }
    const op = new Uint8Array(cw * ch), top = new Int32Array(cw).fill(-1), bot = new Int32Array(cw).fill(-1);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const q = (j * cw + i) * 4; const on = clear ? data[q + 3] >= 128 : data[q + 3] >= 128 && 0.299 * data[q] + 0.587 * data[q + 1] + 0.114 * data[q + 2] < 140; if (on) { op[j * cw + i] = 1; if (top[i] < 0) top[i] = j; bot[i] = j; } }
    Object.assign(m, { op, top, bot });
  }
  picMaskCache.set(src, m); return m;
}
function picTopFn(pg, co) {
  const e1 = vsub(pg.TR, pg.TL), e2 = vsub(pg.BL, pg.TL), det = e1.x * e2.y - e1.y * e2.x;
  return x => {
    const m = picMask(pg.src); if (!m || !m.op || Math.abs(det) < 1e-12) return NaN;
    const X = co.o.x + x * co.ux;
    if (Math.abs(e1.y) < 1e-9 && Math.abs(e2.x) < 1e-9) { // 기울지 않은 그림: 열마다 미리 구한 맨 위·맨 아래
      const u = (X - pg.TL.x) / e1.x; if (!(u >= 0 && u < 1)) return NaN;
      const topIsHigh = (e2.y < 0) === (co.uy > 0), row = c => { const r = topIsHigh ? m.top[c] : m.bot[c]; return r < 0 ? NaN : (topIsHigh ? r : r + 1); };
      const q = u * m.cw - 0.5, c0 = Math.max(0, Math.floor(q)), c1 = Math.min(m.cw - 1, c0 + 1), f = Math.max(0, Math.min(1, q - c0)); // 이웃한 두 열의 가운데 사이는 직선으로 (GSP 와 같게)
      const r0 = row(c0), r1 = row(c1), r = isFinite(r0) && isFinite(r1) ? r0 + (r1 - r0) * f : isFinite(r0) ? r0 : r1; if (!isFinite(r)) return NaN;
      const Y = pg.TL.y + r / m.ch * e2.y; return (Y - co.o.y) / co.uy;
    }
    const ys = [pg.TL.y, pg.TR.y, pg.BL.y, pg.TR.y + e2.y]; let y0 = Math.max(...ys), y1 = Math.min(...ys); if (co.uy < 0) [y0, y1] = [y1, y0];
    const N = 2 * Math.max(m.cw, m.ch);
    for (let i = 0; i <= N; i++) { // 돌린 그림: 높은 쪽부터 내려가며 처음 만나는 픽셀
      const Y = y0 + (y1 - y0) * i / N, dx = X - pg.TL.x, dy = Y - pg.TL.y, u = (dx * e2.y - dy * e2.x) / det, v = (e1.x * dy - e1.y * dx) / det;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) continue; if (m.op[Math.floor(v * m.ch) * m.cw + Math.floor(u * m.cw)]) return (Y - co.o.y) / co.uy;
    }
    return NaN;
  };
}
function functionFromPictureLive() {
  const pic = S().os.find(o => o.t === 'picture'); if (!pic || !G[pic.id]) return;
  snap(); const cid = ensureCoord(); const id = mkValue('picfn', [pic.id, cid], { form: 'yx', notation: 'f' }); recompute(); setSel([id]);
  toast(picMask(G[pic.id].src) ? '그림의 가장 높은 점으로 함수를 정의했습니다 (그림을 옮기면 함수도 바뀝니다)' : '그림을 불러오면 함수가 정해집니다');
}
function functionFromPicture() {
  const pic = S().os.find(o => o.t === 'picture'), g = G[pic.id]; const im = imgOf(g.src);
  if (!im.complete || !im.naturalWidth) return toast('그림을 불러오는 중입니다. 잠시 뒤 다시 해 보세요');
  const w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 600 / w); const cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x2 = c.getContext('2d'); x2.drawImage(im, 0, 0, cw, ch);
  let data; try { data = x2.getImageData(0, 0, cw, ch).data; } catch (e) { return toast('이 그림의 픽셀을 읽을 수 없습니다'); }
  snap(); const cid = ensureCoord(); recompute(); const co = G[cid];
  const pts = [];
  for (let i = 0; i < cw; i++) for (let j = 0; j < ch; j++) {
    const q = (j * cw + i) * 4, a = data[q + 3], lum = 0.299 * data[q] + 0.587 * data[q + 1] + 0.114 * data[q + 2];
    if (a > 128 && lum < 140) { const u = (i + 0.5) / cw, v = (j + 0.5) / ch; const P0 = vadd(g.TL, vadd(vmul(vsub(g.TR, g.TL), u), vmul(vsub(g.BL, g.TL), v))); pts.push(wToC(co, P0)); break; }
  }
  if (pts.length < 2) { undoStack.pop(); return toast('그림에서 어두운 선을 찾지 못했습니다'); }
  pts.sort((a, b) => a.x - b.x); const xs = [], ys = [];
  for (const p of pts) { if (xs.length && Math.abs(p.x - xs[xs.length - 1]) < 1e-9) { ys[ys.length - 1] = Math.max(ys[ys.length - 1], p.y); continue; } xs.push(+p.x.toFixed(5)); ys.push(+p.y.toFixed(5)); }
  const id = mkValue('data', [], { xs, ys, form: 'yx', smooth: true }); setSel([id]); toast('그림의 어두운 윗선으로 함수를 만들었습니다');
}

/* ================= 표본 변환 그림 (그림의 사용자 변환) ================= */
function computeCxfPicture(o, Gx) {
  const g = Gx[o.p[0]]; if (!g || !g.TL) return null; const f = cxfMapper(o.p[1], o.p[2], Gx); const n = o.d.n || 12; const mesh = [];
  for (let j = 0; j <= n; j++) { const row = []; for (let i = 0; i <= n; i++) { const u = i / n, v = j / n; const P0 = vadd(g.TL, vadd(vmul(vsub(g.TR, g.TL), u), vmul(vsub(g.BL, g.TL), v))); const q = f(P0); row.push(okp(q) ? { x: q.x, y: q.y } : null); } mesh.push(row); }
  return { mesh, n, src: g.src, TL: mesh[0][0], TR: mesh[0][n], BL: mesh[n][0] };
}
function drawMeshPicture(o, g, selected, hover) {
  const im = imgOf(g.src); if (!im.complete || !im.naturalWidth) return; const W0 = im.naturalWidth, H0 = im.naturalHeight, n = g.n;
  const tri = (s0, s1, s2, d0, d1, d2) => {
    ctx.save(); ctx.beginPath(); ctx.moveTo(d0.x, d0.y); ctx.lineTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y); ctx.closePath(); ctx.clip();
    const den = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y); if (Math.abs(den) < 1e-9) { ctx.restore(); return; }
    const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / den, b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / den;
    const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / den, d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / den;
    const e = d0.x - a * s0.x - c * s0.y, f = d0.y - b * s0.x - d * s0.y;
    ctx.transform(a, b, c, d, e, f); ctx.drawImage(im, 0, 0); ctx.restore();
  };
  ctx.save(); if (o.hidden) ctx.globalAlpha = 0.3; else if (o.alpha != null) ctx.globalAlpha = o.alpha;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const p00 = g.mesh[j][i], p10 = g.mesh[j][i + 1], p01 = g.mesh[j + 1][i], p11 = g.mesh[j + 1][i + 1]; if (!p00 || !p10 || !p01 || !p11) continue;
    const S0 = { x: i / n * W0, y: j / n * H0 }, S1 = { x: (i + 1) / n * W0, y: j / n * H0 }, S2 = { x: i / n * W0, y: (j + 1) / n * H0 }, S3 = { x: (i + 1) / n * W0, y: (j + 1) / n * H0 };
    const D0 = toS(p00), D1 = toS(p10), D2 = toS(p01), D3 = toS(p11);
    const grow = (P, c) => { const v = vsub(P, c), L = vlen(v) || 1; return vadd(P, vmul(v, 0.6 / L)); }; // 이음새 감추기
    const c1 = { x: (D0.x + D1.x + D2.x) / 3, y: (D0.y + D1.y + D2.y) / 3 }, c2 = { x: (D1.x + D3.x + D2.x) / 3, y: (D1.y + D3.y + D2.y) / 3 };
    tri(S0, S1, S2, grow(D0, c1), grow(D1, c1), grow(D2, c1)); tri(S1, S3, S2, grow(D1, c2), grow(D3, c2), grow(D2, c2));
  }
  ctx.restore();
  if (selected || hover) { ctx.save(); ctx.strokeStyle = selected ? THEME.sel : THEME.hover; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); const edge = []; for (let i = 0; i <= n; i++) edge.push(g.mesh[0][i]); for (let j = 1; j <= n; j++) edge.push(g.mesh[j][n]); for (let i = n - 1; i >= 0; i--) edge.push(g.mesh[n][i]); for (let j = n - 1; j > 0; j--) edge.push(g.mesh[j][0]); edge.filter(Boolean).forEach((p, k) => { const q = toS(p); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.closePath(); ctx.stroke(); ctx.restore(); }
}

/* ================= 그림 크기 조절 손잡이 ================= */
function pictureHandleAt(sx, sy) {
  if (sel.length !== 1) return null; const o = obj(sel[0]); if (!o || o.t !== 'picture' || !(o.k === 'free' || (o.k === 'pts' && o.p.length === 1))) return null;
  const g = G[o.id]; if (!g) return null; const BR = toS(vadd(g.TR, vsub(g.BL, g.TL)));
  return vdist(BR, { x: sx, y: sy }) < (touchMode ? 16 : 9) ? o : null;
}
function drawPictureHandle() {
  if (sel.length !== 1) return; const o = obj(sel[0]); if (!o || o.t !== 'picture' || !(o.k === 'free' || (o.k === 'pts' && o.p.length === 1))) return; const g = G[o.id]; if (!g) return;
  const BR = toS(vadd(g.TR, vsub(g.BL, g.TL))); ctx.save(); ctx.fillStyle = THEME.paper; ctx.strokeStyle = THEME.sel; ctx.lineWidth = 2; ctx.fillRect(BR.x - 5, BR.y - 5, 10, 10); ctx.strokeRect(BR.x - 5, BR.y - 5, 10, 10); ctx.restore();
}

/* ================= 글상자 너비 손잡이 ================= */
function captionHandleAt(sx, sy) {
  if (sel.length !== 1) return null; const o = obj(sel[0]); if (!o || o.t !== 'text' || !o._bb) return null; const b = o._bb;
  return Math.abs(sx - (b.x + b.w + 2)) < 7 && sy > b.y - 2 && sy < b.y + b.h + 2 ? o : null;
}
function drawCaptionHandle() {
  if (sel.length !== 1) return; const o = obj(sel[0]); if (!o || o.t !== 'text' || !o._bb) return; const b = o._bb;
  ctx.save(); ctx.fillStyle = THEME.sel; ctx.fillRect(b.x + b.w + 1, b.y + b.h / 2 - 8, 3, 16); ctx.restore();
}

/* ================= 계산의 단위 ================= */
const UNIT_TOK = ['cm', 'in', 'px', 'rad', '°'];
function unitConst(name) {
  const P = doc.prefs, perCm = P.unit === 'in' ? 1 / 2.54 : P.unit === 'px' ? PXCM : 1;
  if (name === 'cm') return perCm; if (name === 'in') return 2.54 * perCm; if (name === 'px') return perCm / PXCM;
  if (name === 'rad') return P.deg ? 180 / Math.PI : 1; if (name === '°') return P.deg ? 1 : Math.PI / 180;
  return NaN;
}
function unitOfAst(a) {
  // 반환 {L: 길이 차수, A: 각 여부} 또는 null(단위 없음 섞임)
  const Z = { L: 0, A: 0 };
  switch (a[0]) {
    case 'n': case 'x': return Z;
    case 'u': return a[1] === 'rad' || a[1] === '°' ? { L: 0, A: 1 } : { L: 1, A: 0 };
    case 'r': { const g = G[a[1]]; if (!g) return Z; return g.u === 'dist' ? { L: 1, A: 0 } : g.u === 'area' ? { L: 2, A: 0 } : g.u === 'angle' ? { L: 0, A: 1 } : Z; }
    case '+': case '-': { const x = unitOfAst(a[1]), y = unitOfAst(a[2]); if (!x || !y) return null; if (x.L === y.L && x.A === y.A) return x; if (!x.L && !x.A) return y; if (!y.L && !y.A) return x; return null; }
    case '*': { const x = unitOfAst(a[1]), y = unitOfAst(a[2]); if (!x || !y) return null; return { L: x.L + y.L, A: Math.min(1, x.A + y.A) }; }
    case '/': { const x = unitOfAst(a[1]), y = unitOfAst(a[2]); if (!x || !y) return null; return { L: x.L - y.L, A: x.A && !y.A ? 1 : 0 }; }
    case '^': { const x = unitOfAst(a[1]); if (!x) return null; if (a[2][0] === 'n') return { L: x.L * a[2][1], A: x.A }; return Z; }
    case 'neg': return unitOfAst(a[1]);
    case 'f': { if (a[1] === 'abs') return unitOfAst(a[2]); if (a[1] === 'sqrt') { const x = unitOfAst(a[2]); return x && x.L % 2 === 0 ? { L: x.L / 2, A: 0 } : Z; } if (['asin', 'acos', 'atan'].includes(a[1])) return { L: 0, A: 1 }; return Z; }
  }
  return Z;
}
function calcUnit(ast) { const u = unitOfAst(ast); if (!u) return 'none'; if (u.L === 1 && !u.A) return 'dist'; if (u.L === 2 && !u.A) return 'area'; if (!u.L && u.A) return 'angle'; return 'none'; }
function fromDisplay(v, u) { const P = doc.prefs; if (u === 'dist') return P.unit === 'in' ? v * 2.54 : P.unit === 'px' ? v / PXCM : v; if (u === 'area') return P.unit === 'in' ? v * 6.4516 : P.unit === 'px' ? v / (PXCM * PXCM) : v; if (u === 'angle') return P.deg ? v * D2R : v; return v; }

/* ================= 색 메뉴 편집 ================= */
function paletteEditDlg() {
  const P = doc.prefs; P.palette = P.palette || {};
  const rows = Object.keys(PALETTE).filter(k => k !== 'ink').map(k => el('div', { class: 'fx' }, el('input', { type: 'color', id: 'pe-' + k, value: col(k), style: 'width:44px;height:30px;border:0;background:none;padding:0' }), el('span', {}, PAL_KO[k])));
  openDlg('색 메뉴 편집', el('div', { class: 'stack' }, el('p', { class: 'note' }, '색 메뉴의 열 가지 색을 바꿉니다. 이 페이지의 객체 가운데 그 색을 쓰는 것도 함께 바뀝니다.'), el('div', { class: 'row2' }, rows)),
    [{ label: '기본 색으로', run: () => { snap(); delete P.palette; applyPalette(); refresh(); } }, { label: '취소' }, { label: '확인', primary: true, run: () => { snap(); for (const k of Object.keys(PALETTE)) { if (k === 'ink') continue; P.palette[k] = $('#pe-' + k).value; } applyPalette(); refresh(); } }]);
}
const PALETTE_BASE = { ...PALETTE };
function applyPalette() { const o = (doc && doc.prefs && doc.prefs.palette) || {}; for (const k of Object.keys(PALETTE_BASE)) PALETTE[k] = o[k] || PALETTE_BASE[k]; }

/* ================= 내보내기: 배율·투명 배경·SVG ================= */
function withExportState(fn) {
  const s0 = sel, h0 = hoverId, ov = overlay; sel = []; hoverId = null; overlay = null;
  try { return fn(); } finally { sel = s0; hoverId = h0; overlay = ov; requestDraw(); }
}
let exportNoBg = false;
function exportPNGScaled() {
  const P = doc.prefs, k = P.exportScale || 2;
  withExportState(() => {
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const oldCtx = ctx, oldDPR = DPR; ctx = c.getContext('2d'); DPR = k; exportNoBg = !!P.exportTransparent;
    try { draw(); } finally { ctx = oldCtx; DPR = oldDPR; exportNoBg = false; }
    c.toBlob(b => saveFile((curPage() ? curPage().name : '작도') + '.png', b, 'image/png'), 'image/png');
  });
}
function svgCtx(w, h) {
  // 캔버스 2D 호출을 SVG 요소로 기록하는 간단한 대역
  const out = []; let st = { m: [1, 0, 0, 1, 0, 0], fill: '#000', stroke: '#000', lw: 1, dash: [], alpha: 1, font: '14px sans-serif', align: 'left', base: 'alphabetic', cap: 'butt', join: 'miter', clip: null };
  const stack = []; let path = []; let clipN = 0; const defs = [];
  const T = (x, y) => { const m = st.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; };
  const scl = () => Math.sqrt(Math.abs(st.m[0] * st.m[3] - st.m[1] * st.m[2])) || 1;
  const f = n => +n.toFixed(2);
  const measure = document.createElement('canvas').getContext('2d');
  let cur = null, start = null;
  const color = c => typeof c === 'string' ? c : '#000';
  const attrs = (kind) => {
    const a = [];
    if (kind === 'fill') a.push(`fill="${color(st.fill)}"`, 'stroke="none"'); else { a.push('fill="none"', `stroke="${color(st.stroke)}"`, `stroke-width="${f(st.lw * scl())}"`, `stroke-linecap="${st.cap}"`, `stroke-linejoin="${st.join}"`); if (st.dash.length) a.push(`stroke-dasharray="${st.dash.map(d => f(d * scl())).join(' ')}"`); }
    if (st.alpha < 1) a.push(`opacity="${f(st.alpha)}"`); if (st.clip) a.push(`clip-path="url(#${st.clip})"`);
    return a.join(' ');
  };
  const C = {
    canvas: { width: w, height: h },
    get fillStyle() { return st.fill; }, set fillStyle(v) { st.fill = v; },
    get strokeStyle() { return st.stroke; }, set strokeStyle(v) { st.stroke = v; },
    get lineWidth() { return st.lw; }, set lineWidth(v) { st.lw = v; },
    get globalAlpha() { return st.alpha; }, set globalAlpha(v) { st.alpha = v; },
    get font() { return st.font; }, set font(v) { st.font = v; measure.font = v; },
    get textAlign() { return st.align; }, set textAlign(v) { st.align = v; },
    get textBaseline() { return st.base; }, set textBaseline(v) { st.base = v; },
    get lineCap() { return st.cap; }, set lineCap(v) { st.cap = v; },
    get lineJoin() { return st.join; }, set lineJoin(v) { st.join = v; },
    setLineDash(d) { st.dash = d || []; }, getLineDash() { return st.dash; },
    save() { stack.push({ ...st, m: st.m.slice(), dash: st.dash.slice() }); }, restore() { if (stack.length) st = stack.pop(); },
    setTransform(a, b, c, d, e, g) { st.m = [a, b, c, d, e, g]; },
    transform(a, b, c, d, e, g) { const m = st.m; st.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * g + m[4], m[1] * e + m[3] * g + m[5]]; },
    translate(x, y) { C.transform(1, 0, 0, 1, x, y); }, scale(x, y) { C.transform(x, 0, 0, y, 0, 0); },
    beginPath() { path = []; cur = null; start = null; },
    moveTo(x, y) { const p = T(x, y); path.push(`M${f(p[0])} ${f(p[1])}`); cur = p; start = p; },
    lineTo(x, y) { const p = T(x, y); path.push((cur ? 'L' : 'M') + `${f(p[0])} ${f(p[1])}`); cur = p; if (!start) start = p; },
    closePath() { path.push('Z'); cur = start; },
    rect(x, y, w2, h2) { C.moveTo(x, y); C.lineTo(x + w2, y); C.lineTo(x + w2, y + h2); C.lineTo(x, y + h2); C.closePath(); },
    arc(cx, cy, r, a0, a1, ccw) {
      let sw = a1 - a0; if (!ccw && sw < 0) sw = sw % TAU + TAU; if (ccw && sw > 0) sw = sw % TAU - TAU; if (!ccw && sw > TAU) sw = TAU; if (ccw && sw < -TAU) sw = -TAU;
      const N = Math.max(2, Math.ceil(Math.abs(sw) / (Math.PI / 2)));
      for (let i = 0; i <= N; i++) { const a = a0 + sw * i / N; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (i === 0) { cur ? C.lineTo(x, y) : C.moveTo(x, y); continue; }
        const p = T(x, y), R = r * scl(); path.push(`A${f(R)} ${f(R)} 0 0 ${sw > 0 === (st.m[0] * st.m[3] - st.m[1] * st.m[2] > 0) ? 1 : 0} ${f(p[0])} ${f(p[1])}`); cur = p; }
    },
    ellipse(cx, cy, rx, ry, rot, a0, a1) { const N = 24; for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N; const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a); i === 0 && !cur ? C.moveTo(x, y) : C.lineTo(x, y); } },
    arcTo(x1, y1, x2, y2) { C.lineTo(x1, y1); C.lineTo(x2, y2); },
    fill(rule) { if (path.length) out.push(`<path d="${path.join('')}" ${attrs('fill')}${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`); },
    stroke() { if (path.length) out.push(`<path d="${path.join('')}" ${attrs('stroke')}/>`); },
    clip() { const id = 'c' + (++clipN); defs.push(`<clipPath id="${id}"><path d="${path.join('')}"/></clipPath>`); st.clip = id; },
    fillRect(x, y, w2, h2) { const sp = path; C.beginPath(); C.rect(x, y, w2, h2); C.fill(); path = sp; },
    strokeRect(x, y, w2, h2) { const sp = path; C.beginPath(); C.rect(x, y, w2, h2); C.stroke(); path = sp; },
    clearRect() { },
    measureText(t) { measure.font = st.font; return measure.measureText(t); },
    fillText(t, x, y) {
      const m = st.m, anchor = st.align === 'center' ? 'middle' : st.align === 'right' || st.align === 'end' ? 'end' : 'start';
      const base = st.base === 'top' ? 'text-before-edge' : st.base === 'middle' ? 'central' : st.base === 'bottom' ? 'text-after-edge' : 'alphabetic';
      const esc = String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
      out.push(`<text transform="matrix(${m.map(f).join(' ')})" x="${f(x)}" y="${f(y)}" style="font:${st.font.replace(/"/g, "'")}" fill="${color(st.fill)}" text-anchor="${anchor}" dominant-baseline="${base}"${st.alpha < 1 ? ` opacity="${f(st.alpha)}"` : ''}${st.clip ? ` clip-path="url(#${st.clip})"` : ''}>${esc}</text>`);
    },
    drawImage(im, x = 0, y = 0) { const src = im.src || ''; if (!src) return; const m = st.m; out.push(`<image transform="matrix(${m.map(f).join(' ')})" x="${f(x)}" y="${f(y)}" width="${im.naturalWidth}" height="${im.naturalHeight}" href="${src}"${st.alpha < 1 ? ` opacity="${f(st.alpha)}"` : ''}${st.clip ? ` clip-path="url(#${st.clip})"` : ''}/>`); },
    createLinearGradient() { return { addColorStop() { } }; },
    toSVG() { return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs>${out.join('\n')}</svg>`; },
  };
  return C;
}
function exportSVG() {
  withExportState(() => {
    const oldCtx = ctx, oldDPR = DPR; const s = svgCtx(Math.round(W), Math.round(H)); ctx = s; DPR = 1; exportNoBg = !!doc.prefs.exportTransparent;
    try { draw(); } finally { ctx = oldCtx; DPR = oldDPR; exportNoBg = false; }
    saveFile((curPage() ? curPage().name : '작도') + '.svg', s.toSVG(), 'image/svg+xml');
  });
}
function advPrefsDlg() {
  const P = doc.prefs;
  const body = el('div', { class: 'stack' },
    el('div', { class: 'sub' }, '내보내기'),
    el('div', { class: 'row2' }, field('그림 배율', el('select', { id: 'ap-sc' }, [1, 2, 3, 4].map(n => el('option', { value: n, selected: (P.exportScale || 2) === n }, n + '배 (' + Math.round(W * n) + '×' + Math.round(H * n) + ')')))), field('기본 형식', el('select', { id: 'ap-fm' }, el('option', { value: 'png', selected: (P.exportFormat || 'png') === 'png' }, 'PNG (그림)'), el('option', { value: 'svg', selected: P.exportFormat === 'svg' }, 'SVG (벡터)')))),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'ap-tr', checked: !!P.exportTransparent }), '배경을 투명하게'),
    el('div', { class: 'sub' }, '표본'),
    el('div', { class: 'row3' }, field('자취 기본 표본 수', num('ap-ln', P.locusN || 300, 10)), field('함수 그래프 기본 표본 수', num('ap-fn', P.plotN || 400, 10)), field('반복 최대 상 개수', num('ap-ic', P.iterCap || 30000, 1000))),
    el('div', { class: 'sub' }, '시스템'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'ap-hd', checked: P.hiDPI !== false }), '고해상도 화면에서 선명하게 그리기 (끄면 느린 기기에서 빨라짐)'));
  openDlg('고급 환경설정', body, [{ label: '취소' }, { label: '확인', primary: true, run: () => {
    snap(); P.exportScale = +$('#ap-sc').value; P.exportFormat = $('#ap-fm').value; P.exportTransparent = $('#ap-tr').checked;
    P.locusN = clamp(Math.round(getNum('ap-ln') || 300), 20, 5000); P.plotN = clamp(Math.round(getNum('ap-fn') || 400), 20, 5000); P.iterCap = clamp(Math.round(getNum('ap-ic') || 30000), 1000, 200000); P.hiDPI = $('#ap-hd').checked; resize(); refresh();
  } }]);
}

/* ================= 글자 스타일·도구 환경설정 ================= */
function textStylePrefsDlg() {
  const P = doc.prefs; const famSel = (id, v) => el('select', { id }, [['sans', '고딕'], ['serif', '명조·수식'], ['mono', '고정폭']].map(([k, l]) => el('option', { value: k, selected: v === k }, l)));
  const body = el('div', { class: 'stack' },
    el('div', { class: 'row3' }, field('레이블 크기', num('ts-ls', P.labelSize || 16, 1)), field('레이블 글꼴', famSel('ts-lf', P.labelFont || 'serif')), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'ts-li', checked: P.labelItalic ?? true }), '기울임')),
    el('div', { class: 'row2' }, field('측정값·계산 크기', num('ts-vs', P.valSize || 14, 1)), field('측정값 글꼴', famSel('ts-vf', P.valFont || 'sans'))),
    el('div', { class: 'row2' }, field('새 글상자 크기', num('ts-cs', P.capSize || 15, 1)), field('새 글상자 글꼴', famSel('ts-cf', P.capFont || 'sans'))),
    el('div', { class: 'row3' }, field('표 글자 크기', num('ts-ts', P.tableSize || 14, 1)), field('표 글꼴', famSel('ts-tf', P.tableFont || 'sans')), field('축 눈금 숫자 크기', num('ts-ks', P.tickSize || 11, 1))));
  openDlg('글자 스타일 환경설정', body, [{ label: '취소' }, { label: '확인', primary: true, run: () => {
    snap(); const n = (id, d) => clamp(getNum(id) || d, 7, 72);
    P.labelSize = n('ts-ls', 16); P.labelFont = $('#ts-lf').value; P.labelItalic = $('#ts-li').checked; P.valSize = n('ts-vs', 14); P.valFont = $('#ts-vf').value;
    P.capSize = n('ts-cs', 15); P.capFont = $('#ts-cf').value; P.tableSize = n('ts-ts', 14); P.tableFont = $('#ts-tf').value; P.tickSize = n('ts-ks', 11); refresh();
  } }]);
}
function toolPrefsDlg() {
  const P = doc.prefs; const t = P.tool || {};
  const body = el('div', { class: 'stack' },
    el('div', { class: 'row3' }, field('새 점 크기', el('select', { id: 'tp-ps' }, [[1, '작게'], [2, '보통'], [3, '크게']].map(([v, l]) => el('option', { value: v, selected: (t.ps || 2) === v }, l)))),
      field('새 선 굵기', el('select', { id: 'tp-w' }, [[1, '가늘게'], [2, '보통'], [3, '굵게']].map(([v, l]) => el('option', { value: v, selected: (t.w || 2) === v }, l)))),
      field('새 선 모양', el('select', { id: 'tp-d' }, [[0, '실선'], [1, '파선'], [2, '점선']].map(([v, l]) => el('option', { value: v, selected: (t.dash || 0) === v }, l))))),
    el('div', { class: 'row2' }, field('새 각 표시 크기 (px)', num('tp-ar', t.ar || 20, 1)), field('다각형 도구 기본', el('select', { id: 'tp-pg' }, [['fill', '다각형 내부'], ['both', '내부와 변'], ['edges', '변만']].map(([v, l]) => el('option', { value: v, selected: toolState.v.polygon === v }, l))))),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tp-bl', checked: P.balloons !== false }), '정보 풍선 보이기'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tp-hint', checked: P.hints !== false }), '상태줄에 도구 설명 보이기'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tp-mk', checked: !!t.markDir }), '새 각 표시에 방향 화살표'));
  openDlg('도구 환경설정', body, [{ label: '취소' }, { label: '확인', primary: true, run: () => {
    snap(); P.tool = { ps: +$('#tp-ps').value, w: +$('#tp-w').value, dash: +$('#tp-d').value, ar: clamp(getNum('tp-ar') || 20, 8, 80), markDir: $('#tp-mk').checked };
    P.balloons = $('#tp-bl').checked; P.hints = $('#tp-hint').checked; toolState.v.polygon = $('#tp-pg').value; setTool(toolState.id); refresh();
  } }]);
}
function applyToolDefaults(o) {
  const t = doc.prefs && doc.prefs.tool; if (!t) return o;
  if (o.t === 'point' && t.ps) o.ps = t.ps;
  if ((isStraight(o) || o.t === 'circle' || o.t === 'arc') && t.w) { o.w = t.w; o.dash = t.dash || 0; }
  if (o.t === 'amark') { if (t.ar && !o.d.r) o.d.r = t.ar; if (t.markDir) o.d.dir = true; }
  return o;
}

/* ================= 사용자 도구 결과 레이블 규칙 ================= */
function toolResultLabel(tool, o, shownOriginal) {
  if (!shownOriginal || !o.label) return null;
  const mode = tool.labelMode || (tool.keepLabels ? 'keep' : 'auto');
  if (mode === 'prefix' && tool.labelPrefix) { tool.genN = (tool.genN || 0) + 1; let lab = tool.labelPrefix + tool.genN; while (doc.objs.some(x => x !== o && x.label === lab)) { tool.genN++; lab = tool.labelPrefix + tool.genN; } return lab; }
  return null;
}
