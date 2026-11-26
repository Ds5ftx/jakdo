'use strict';
/* ================= 표 ================= */
function cellVal(id, Gx = G) {
  const o = obj(id), g = Gx[id]; if (!o || !g) return null;
  if (o.t === 'iter') return null;
  if (o.k === 'coords') return [g.vx, g.vy];
  if (o.k === 'eq') return valueText(o).replace(/^[^:]*:\s*/, '');
  return isFinite(g.v) ? g.v : null;
}
const cellStr = v => v == null ? '—' : Array.isArray(v) ? '(' + fmt(v[0]) + ', ' + fmt(v[1]) + ')' : typeof v === 'number' ? fmt(v) : String(v);
function tableRows(o) {
  if (o.k === 'iter') { const g = G[o.p[0]]; if (!g || !g.levels) return { rows: [], live: null }; return { rows: g.levels.map((L, n) => [String(n), ...o.p.slice(1).map(id => L[id] ?? null)]), live: null }; }
  return { rows: o.d.rows || [], live: o.d.live !== false ? o.p.map(id => cellVal(id)) : null };
}
function tableHeads(o) { return o.k === 'iter' ? ['n', ...o.p.slice(1).map(id => obj(id) ? valueName(obj(id)) : '?')] : o.p.map(id => obj(id) ? valueName(obj(id)) : '?'); }
function drawTable(o, selected, hover) {
  const heads = tableHeads(o), { rows, live } = tableRows(o); const all = live ? rows.concat([live]) : rows;
  ctx.save(); const tf = tableFont(o), tsz = (o.d.size || doc.prefs.tableSize || 14); ctx.font = tf; const pad = 7, lh = Math.round(tsz * 1.6);
  const shown = all.slice(-200);
  const widths = heads.map((h, j) => Math.max(ctx.measureText(h).width, ...shown.map(r => ctx.measureText(cellStr(r[j])).width)) + pad * 2);
  const w = widths.reduce((a, b) => a + b, 0), h = lh * (shown.length + 1) + 2; const x = o.d.sx, y = o.d.sy; o._bb = { x, y, w, h };
  ctx.fillStyle = THEME.paper; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = THEME.chip; ctx.fillRect(x, y, w, lh);
  ctx.strokeStyle = selected ? THEME.sel : hover ? THEME.hover : THEME.chipLine; ctx.lineWidth = selected ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.lineWidth = 1; ctx.strokeStyle = THEME.chipLine; ctx.beginPath();
  let cx = x; for (let j = 0; j < widths.length - 1; j++) { cx += widths[j]; ctx.moveTo(Math.round(cx) + 0.5, y); ctx.lineTo(Math.round(cx) + 0.5, y + h); }
  for (let i = 1; i <= shown.length; i++) { ctx.moveTo(x, y + i * lh + 0.5); ctx.lineTo(x + w, y + i * lh + 0.5); } ctx.stroke();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  cx = x; heads.forEach((hd, j) => { ctx.fillStyle = THEME.ink; ctx.font = '600 ' + tf; ctx.textAlign = 'center'; ctx.fillText(hd, cx + widths[j] / 2, y + lh / 2 + 1); cx += widths[j]; });
  ctx.font = tf; ctx.textAlign = 'right';
  shown.forEach((r, i) => { let c2 = x; const isLive = live && i === shown.length - 1; ctx.fillStyle = isLive ? THEME.muted : THEME.ink; r.forEach((v, j) => { ctx.fillText(cellStr(v), c2 + widths[j] - pad, y + (i + 1.5) * lh + 1); c2 += widths[j]; }); });
  ctx.restore();
}
function mkTable(ids) { const pos = nextScreenPos(); return add({ t: 'table', k: 'tab', p: ids.slice(), d: { sx: pos.sx + 260, sy: pos.sy, rows: [], live: true } }).id; }
function addTableRow(o) { if (o.k === 'iter') return toast('반복 표는 깊이에 따라 정해집니다'); o.d.rows = o.d.rows || []; o.d.rows.push(o.p.map(id => cellVal(id))); }
function collectTables() {
  const now = performance.now();
  for (const o of doc.objs) {
    if (o.t !== 'table' || !o.d.auto || o.d.auto.left <= 0) continue; const a = o.d.auto;
    if (now - (a.last || 0) < a.every * 1000) continue;
    const row = o.p.map(id => cellVal(id)); const prev = o.d.rows[o.d.rows.length - 1];
    if (prev && JSON.stringify(prev) === JSON.stringify(row)) continue;
    o.d.rows.push(row); a.last = now; a.left--; if (a.left <= 0) { delete o.d.auto; toast('표 자동 수집을 마쳤습니다'); }
  }
}
function tabulateCmd() { const vals = S().os.filter(o => o.t === 'value' && !isFnObj(o) && o.k !== 'fdef'); if (!vals.length) return; snap(); setSel([mkTable(vals.map(v => v.id))]); }
function addTableDataDlg(o) {
  o = o || S().os.find(x => x.t === 'table');
  const body = el('div', { class: 'stack' }, radio('atd', [['one', '지금 한 행 추가'], ['auto', '값이 바뀔 때 자동으로 추가']], 'one'),
    el('div', { class: 'row2' }, field('최대 행 수', num('atd-n', 10, 1)), field('최소 간격 (초)', num('atd-s', 1, 0.1))),
    el('p', { class: 'note' }, '자동 추가는 점을 끌거나 애니메이션할 때 값이 달라질 때마다 행을 더합니다.'));
  openDlg('표에 데이터 추가', body, [{ label: '취소' }, { label: '추가', primary: true, run: () => { snap(); if (radioVal('atd') === 'one') addTableRow(o); else { o.d.auto = { left: Math.max(1, getNum('atd-n') || 10), every: Math.max(0, getNum('atd-s') || 0), last: 0 }; toast('이제 점을 끌거나 애니메이션하면 행이 쌓입니다'); } refresh(); } }]);
}
function removeTableData(o, all) { snap(); if (all) o.d.rows = []; else (o.d.rows || []).pop(); refresh(); }
function tableCSV(o) { const heads = tableHeads(o), { rows, live } = tableRows(o); const all = live ? rows.concat([live]) : rows; const q = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; return '﻿' + [heads, ...all.map(r => r.map(cellStr))].map(r => r.map(x => q(String(x))).join(',')).join('\n'); }
function plotTableCmd() { const t = S().os[0]; snap(); const c = ensureCoord(); const o = add({ t: 'tplot', k: 'tp', p: [c, t.id], d: { cx: t.k === 'iter' ? 0 : 0, cy: 1 }, color: 'red' }); setSel([o.id]); }
function tplotPoints(o) {
  const co = G[o.p[0]], t = obj(o.p[1]); if (!co || !t) return [];
  const { rows, live } = tableRows(t); const all = live ? rows.concat([live]) : rows; const out = [];
  for (const r of all) { const a = r[o.d.cx], b = r[o.d.cy]; let x, y; if (Array.isArray(a)) { x = a[0]; y = a[1]; } else { x = a; y = b; } if (isFinite(x) && isFinite(y)) out.push(cToW(co, x, y)); }
  return out;
}

/* ================= 반복 ================= */
function iterChain(o) {
  const idx = doc.objs.indexOf(o); const down = descendants(o.d.pre);
  return doc.objs.slice(0, idx).filter(x => down.has(x.id) && !o.d.pre.includes(x.id) && !['iter', 'table', 'button', 'text', 'tplot'].includes(x.t) && !(x.t === 'value' && x.k === 'fdef'));
}
function copyGeom(g) { return g == null ? g : JSON.parse(JSON.stringify(g, (k, v) => typeof v === 'function' || k === 'src' || k === 'mesh' ? undefined : v)); }
function computeIter(o, Gx) {
  const pre = o.d.pre, maps = o.d.maps; if (!pre.every(id => Gx[id])) return null;
  let depth = o.d.depthV != null ? Math.floor(valNum(o.d.depthV, Gx)) : o.d.depth; if (!isFinite(depth)) return null; depth = clamp(depth, 0, 400);
  const chain = iterChain(o); const Gt = Object.assign({}, Gx);
  const valueIds = chain.filter(x => x.t === 'value' && !isFnObj(x)).map(x => x.id).concat(pre.filter(id => obj(id).t === 'value'));
  const items = [], levels = [Object.fromEntries(valueIds.map(id => [id, Gx[id] ? Gx[id].v : null]))];
  const show = o.d.show; // GSP 에서 불러온 반복: 그려지는 객체가 정해져 있음
  const drawIds = show ? chain.filter(x => show[x.id] && !show[x.id].hidden && x.t !== 'value').map(x => x.id) : chain.filter(x => (!x.hidden || o.d.drawHidden) && x.t !== 'value' && (o.d.ptsToo !== false || x.t !== 'point')).map(x => x.id);
  const pcIds = new Set(drawIds.filter(id => obj(id).pc)); // 매개변수 색은 단계마다 그 단계의 값으로
  let frontier = [pre.map(id => Gx[id])]; let term = null, termG = null; const CAP = o.d.cap || doc.prefs.iterCap || 30000;
  for (let L = 1; L <= depth; L++) {
    const next = [];
    for (const vals of frontier) {
      // vals: 이 단계 직전의 원상 값 → 사상별 상
      const base = vals;
      for (let m = 0; m < maps.length; m++) {
        pre.forEach((id, i) => Gt[id] = base[i]);
        for (const c of chain) Gt[c.id] = compute(c, Gt);
        const img = maps[m].map(id => Gt[id]); if (img.some(v => v == null)) continue;
        pre.forEach((id, i) => Gt[id] = img[i]);
        for (const c of chain) Gt[c.id] = compute(c, Gt);
        if (!o.d.final || L === depth) for (const id of drawIds) if (Gt[id]) { const it = { id, L, g: copyGeom(Gt[id]) }; if (pcIds.has(id)) it.col = paramColor(obj(id), Gt); items.push(it); }
        if (m === 0 && next.length === 0) { levels[L] = Object.fromEntries(valueIds.map(id => [id, Gt[id] ? Gt[id].v : null])); term = img; termG = Object.fromEntries(chain.filter(c => c.t === 'point' && Gt[c.id]).map(c => [c.id, { ...Gt[c.id] }])); }
        next.push(img);
        if (items.length > CAP) { return { items, levels, term, termG, truncated: true, depth: L }; }
      }
    }
    frontier = next; if (!frontier.length) break;
  }
  return { items, levels, term, termG, depth };
}
function drawIter(o, g, selected) {
  ctx.save();
  for (const it of g.items) { const s = obj(it.id); if (s && s.t === 'picture' && G[s.id]) drawPicture(s, { ...it.g, src: G[s.id].src }, false, false); }
  const passes = [it => isInterior(obj(it.id)), it => !isInterior(obj(it.id)) && obj(it.id).t !== 'point', it => obj(it.id).t === 'point'];
  for (const pass of passes) for (const it of g.items) {
    const s = obj(it.id); if (!s || !pass(it) || s.t === 'picture') continue; const gg = it.g; const sc = o.d.show && o.d.show[it.id]; const cc = it.col || (sc && !s.pc ? col(sc.color) : colOf(s));
    if (s.t === 'point') { const p = toS(gg); if (p.x < -10 || p.y < -10 || p.x > W + 10 || p.y > H + 10) continue; ctx.beginPath(); ctx.arc(p.x, p.y, [0, 2, 2.8, 4][s.ps || 2], 0, TAU); ctx.fillStyle = cc; ctx.fill(); continue; }
    ctx.beginPath(); if (s.t === 'locus') continue; pathGeom(s.t, gg);
    if (isInterior(s)) { ctx.fillStyle = rgba(cc, s.alpha ?? 0.26); ctx.fill('evenodd'); }
    else { setStroke(s, 0, cc); ctx.stroke(); }
  }
  if (selected) { ctx.globalAlpha = 0.5; ctx.strokeStyle = THEME.sel; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); let n = 0; for (const it of g.items) { if (n++ > 400) break; const s = obj(it.id); if (!s || s.t === 'point') continue; ctx.beginPath(); pathGeom(s.t, it.g); ctx.stroke(); } }
  ctx.restore();
}
function hitIter(o, g, P) {
  let best = Infinity, n = 0;
  for (const it of g.items) { if (n++ > 3000) break; const s = obj(it.id); if (!s) continue; if (isInterior(s)) { if (insideInterior(s, it.g, P)) best = Math.min(best, 3); continue; } best = Math.min(best, hitDist(s, it.g, P)); }
  return best;
}

let iterPick = null;
function iterateDlg() {
  const s = S(); const pre = s.pts.map(o => o.id); const dv = s.vals.length === 1 ? s.vals[0].id : null;
  if (!pre.length) return toast('반복할 원상 점을 선택하세요 (깊이를 매개변수로 정하려면 값도 하나 함께 선택)');
  const st = { pre, maps: [pre.map(() => null)], cur: 0, slot: 0 };
  const tbl = el('div', { class: 'iter-map' }); const mapsel = el('div', { class: 'seg' });
  const render = () => {
    mapsel.innerHTML = ''; st.maps.forEach((_, m) => { const b = el('label', {}, el('input', { type: 'radio', name: 'itm', checked: m === st.cur, onchange: () => { st.cur = m; st.slot = st.maps[m].findIndex(x => x == null); if (st.slot < 0) st.slot = 0; render(); } }), el('span', {}, '사상 ' + (m + 1))); mapsel.append(b); });
    tbl.innerHTML = ''; tbl.append(el('div', { class: 'im-h' }, '원상'), el('div', { class: 'im-h' }, '→ 상 (스케치에서 클릭)'));
    pre.forEach((id, i) => { const img = st.maps[st.cur][i]; tbl.append(el('div', { class: 'im-c' }, nm(id)), el('button', { class: 'im-t' + (i === st.slot ? ' on' : ''), type: 'button', onclick: () => { st.slot = i; render(); } }, img != null ? nm(img) : i === st.slot ? '클릭하세요…' : '—')); });
    iterHighlight = pre[st.slot]; requestDraw();
  };
  iterPick = o => {
    if (o.t !== 'point') return toast('점을 클릭하세요');
    if (pre.includes(o.id) && st.maps[st.cur].length === 1) return toast('원상과 다른 점을 고르세요');
    st.maps[st.cur][st.slot] = o.id; const nx = st.maps[st.cur].findIndex(x => x == null); st.slot = nx < 0 ? st.slot : nx; render();
  };
  const body = el('div', { class: 'stack' }, mapsel, tbl,
    el('div', { class: 'row2' }, dv ? el('p', { class: 'note' }, '반복 깊이: ' + valueName(obj(dv)) + ' (값에 따라 바뀜)') : field('반복 횟수', num('it-d', 3, 1)), field('표시', el('select', { id: 'it-f' }, el('option', { value: 'all' }, '전체 궤도'), el('option', { value: 'final' }, '마지막 단계만')))),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'it-p', checked: true }), '점의 상도 그리기'),
    el('div', { class: 'fx' }, el('button', { class: 'btn', type: 'button', onclick: () => { st.maps.push(pre.map(() => null)); st.cur = st.maps.length - 1; st.slot = 0; $('#it-p').checked = false; render(); } }, '사상 추가'), el('button', { class: 'btn ghost', type: 'button', onclick: () => { if (st.maps.length > 1) { st.maps.splice(st.cur, 1); st.cur = 0; st.slot = 0; render(); } } }, '현재 사상 삭제')),
    el('p', { class: 'note' }, '원상 점마다, 한 단계 뒤에 그 점이 옮겨 갈 점을 스케치에서 클릭합니다. 여러 사상을 쓰면 시에르핀스키 삼각형 같은 프랙털을 만들 수 있습니다.'));
  render();
  openDlg('반복', body, [{ label: '취소' }, { label: '반복', primary: true, run: () => {
    if (st.maps.some(m => m.some(x => x == null))) { toast('모든 원상에 상을 지정하세요'); return false; }
    const down = descendants(pre); if (st.maps.some(m => m.some(id => !down.has(id) && !pre.includes(id)))) { toast('상은 원상 점에 의존하는 점이어야 합니다'); return false; }
    snap();
    const o = add({ t: 'iter', k: 'geo', p: [...pre, ...st.maps.flat(), ...(dv ? [dv] : [])], d: { pre, maps: st.maps, depth: dv ? 3 : Math.max(1, Math.floor(getNum('it-d') || 3)), depthV: dv, final: $('#it-f').value === 'final', ptsToo: $('#it-p').checked } });
    recompute(); const g = G[o.id];
    const vids = g && g.levels && g.levels[0] ? Object.keys(g.levels[0]).map(Number) : [];
    const created = [o.id];
    if (vids.length) { const t = add({ t: 'table', k: 'iter', p: [o.id, ...vids], d: { sx: nextScreenPos().sx + 260, sy: 14 } }); created.push(t.id); }
    setSel(created.slice(0, 1)); toast('반복을 만들었습니다. 선택한 채 + / − 키로 횟수를 바꿉니다');
  } }], { modeless: true, onClose: () => { iterPick = null; iterHighlight = null; requestDraw(); } });
}
let iterHighlight = null;
function iterProps(o) {
  const body = el('div', { class: 'stack' },
    o.d.depthV != null ? el('p', { class: 'note' }, '반복 횟수는 ' + valueName(obj(o.d.depthV)) + '에 따라 정해집니다.') : field('반복 횟수', num('ip-d', o.d.depth, 1)),
    field('표시', el('select', { id: 'ip-f' }, el('option', { value: 'all', selected: !o.d.final }, '전체 궤도'), el('option', { value: 'final', selected: !!o.d.final }, '마지막 단계만'))),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'ip-p', checked: o.d.ptsToo !== false }), '점의 상도 그리기'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'ip-h', checked: !!o.d.drawHidden }), '숨긴 원상 객체의 상도 그리기'));
  openDlg('반복 속성', body, [{ label: '취소' }, { label: '확인', primary: true, run: () => { snap(); if ($('#ip-d')) o.d.depth = Math.max(0, Math.floor(getNum('ip-d') || 0)); o.d.final = $('#ip-f').value === 'final'; o.d.ptsToo = $('#ip-p').checked; o.d.drawHidden = $('#ip-h').checked; refresh(); } }]);
}
function terminalPointCmd() {
  const it = S().os.find(o => o.t === 'iter'); snap();
  const out = it.d.pre.map((pid, i) => { const p = add({ t: 'point', k: 'term', p: [it.id], d: { i } }); giveLabel(p, doc.prefs.autoLabel); return p.id; });
  setSel(out); toast('반복의 마지막 단계(첫 번째 사상)의 점을 만들었습니다');
}

/* ================= 사용자 정의 변환 ================= */
function cxfChain(pre, img) { const down = descendants([pre]), up = ancestors([img]); up.add(img); return doc.objs.filter(x => x.id !== pre && down.has(x.id) && up.has(x.id)); }
function cxfMapper(pre, img, Gx) {
  const chain = cxfChain(pre, img); const Gt = Object.assign({}, Gx);
  return p => { Gt[pre] = p; for (const c of chain) Gt[c.id] = compute(c, Gt); return Gt[img]; };
}
function computeCxfLocus(o, Gx) {
  const src = obj(o.p[0]), g = Gx[src.id]; if (!g) return null;
  const f = cxfMapper(o.p[1], o.p[2], Gx); const n = o.d.n || 240; const polys = []; let cur = [];
  let range = [0, 1];
  if (isStraight(src)) { const r = lineRange(g, src.t); range = r; }
  if (src.t === 'fplot') range = fplotRange(g);
  for (let i = 0; i <= n; i++) {
    const t = range[0] + (range[1] - range[0]) * i / n;
    const p0 = src.t === 'polygon' ? polyAt(g.pts, true, t) : isStraight(src) ? lerp(g.a, g.b, t) : pathAt(src, g, t);
    const q = p0 ? f(p0) : null;
    if (okp(q)) cur.push({ x: q.x, y: q.y }); else { if (cur.length > 1) polys.push(cur); cur = []; }
  }
  if (cur.length > 1) polys.push(cur);
  return { polys };
}
function defineCxfDlg() {
  const [a, b] = S().pts; const pre = descendants([b.id]).has(a.id) ? b : a, img = pre === a ? b : a;
  const body = el('div', { class: 'stack' }, el('p', { class: 'note' }, '원상 ' + nm(pre.id) + ' → 상 ' + nm(img.id)), field('변환 이름', el('input', { id: 'cx-n', value: '사용자 변환 ' + ((doc.cxf || []).length + 1) })));
  openDlg('사용자 변환 정의', body, [{ label: '취소' }, { label: '정의', primary: true, run: () => { snap(); doc.cxf = doc.cxf || []; doc.cxf.push({ id: Date.now(), name: $('#cx-n').value.trim() || '사용자 변환', pre: pre.id, img: img.id }); toast('변환 메뉴 아래에 추가했습니다'); } }]);
}
function applyCxf(t) {
  const os = S().os.filter(o => o.id !== t.pre && o.id !== t.img && (o.t === 'point' || isPath(o) || o.t === 'picture')); if (!os.length) return toast('변환할 점·경로·그림을 선택하세요');
  snap(); const out = os.map(o => {
    if (o.t === 'point') { const p = add({ t: 'point', k: 'cxf', p: [o.id, t.pre, t.img], color: o.color, ps: o.ps }); p.label = (o.label || 'P') + '′'; p.showLabel = o.showLabel; return p.id; }
    if (o.t === 'picture') return add({ t: 'picture', k: 'cxf', p: [o.id, t.pre, t.img], d: { n: 12 }, color: o.color }).id;
    return add({ t: 'locus', k: 'cxf', p: [o.id, t.pre, t.img], d: {}, color: o.color, w: o.w, dash: o.dash }).id;
  });
  setSel(out);
}
function editCxfDlg() {
  const list = el('div', { class: 'arch' });
  const render = () => { list.innerHTML = ''; (doc.cxf || []).forEach((t, i) => { const inp = el('input', { value: t.name, 'aria-label': '변환 이름' }); inp.onchange = () => { t.name = inp.value; }; list.append(el('div', { class: 'arch-row' }, inp, el('span', { class: 'note' }, nm(t.pre) + '→' + nm(t.img)), el('button', { class: 'btn ghost', onclick: () => { doc.cxf.splice(i, 1); render(); } }, '삭제'))); }); if (!(doc.cxf || []).length) list.append(el('p', { class: 'note' }, '정의된 사용자 변환이 없습니다.')); };
  render(); openDlg('사용자 변환 편집', list, [{ label: '닫기', primary: true, run: () => { scheduleSave(); } }]);
}
