'use strict';
/* ================= 참조 바꾸기 공통 ================= */
function remapRefs(o, f) {
  o.p = o.p.map(f);
  const d = o.d || {};
  if (d.xf) { const x = d.xf; for (const k of ['c', 'm', 'dxV', 'dyV', 'distV', 'angV', 'rV']) if (x[k] != null) x[k] = f(x[k]); for (const k of ['vec', 'angP', 'rS']) if (x[k]) x[k] = x[k].map(f); }
  if (typeof d.expr === 'string') d.expr = d.expr.replace(/#(\d+)/g, (_, id) => '#' + f(+id));
  for (const k of ['xV', 'yV', 'fn', 'base', 'depthV', 'crop']) if (d[k] != null) d[k] = f(d[k]);
  if (d.pre) d.pre = d.pre.map(f); if (d.maps) d.maps = d.maps.map(m => m.map(f));
  if (o.pc && o.pc.v) o.pc.v = o.pc.v.map(f);
  if (typeof d.text === 'string') d.text = d.text.replace(/\{#(\d+)\}/g, (_, id) => '{#' + f(+id) + '}');
  return o;
}
const cloneObj = o => JSON.parse(JSON.stringify(o, (k, v) => k[0] === '_' ? undefined : v));

/* ================= 사용자 도구 ================= */
function givenKind(o) { if (o.t === 'point') return 'point'; if (isStraight(o)) return 'straight'; if (o.t === 'value') return 'value'; if (o.t === 'coord') return 'coord'; return o.t; }
const KIND_KO = { point: '점', straight: '직선류', circle: '원', arc: '호', value: '값', polygon: '다각형', coord: '좌표계', fplot: '함수 그래프', locus: '자취', cinterior: '원 내부' };
function buildTool(name) {
  const S0 = sel.filter(id => obj(id) && !['button', 'table'].includes(obj(id).t)); const set = new Set(S0);
  let givens = S0.filter(id => ![...ancestors([id])].some(a => set.has(a)));
  const results = S0.filter(id => !givens.includes(id));
  if (!results.length) return { err: '결과가 될 객체(주어진 것에 의존하는 객체)도 함께 선택하세요' };
  // 결과에서 위로 올라가며 필요한 객체 모으기 (주어진 것에서 멈춤)
  const need = new Set(); const st = [...results]; const auto = [];
  while (st.length) {
    const id = st.pop(); if (need.has(id) || givens.includes(id)) continue; const o = obj(id); if (!o) continue;
    if (o.t === 'coord' || (o.t === 'point' && (o.isOrigin || o.k === 'unit') && doc.objs.some(c => c.t === 'coord' && c.p.includes(id)))) { const cid = o.t === 'coord' ? id : doc.objs.find(c => c.t === 'coord' && c.p.includes(id)).id; if (!givens.includes(cid)) { givens.push(cid); auto.push(cid); } continue; }
    if (!o.p.length && !isScreenObj(o) && o.t !== 'value' && o.t !== 'drawing' && o.t !== 'picture') { givens.push(id); auto.push(id); continue; }
    need.add(id); for (const p of o.p) st.push(p);
    if (o.d && o.d.fn != null) st.push(o.d.fn);
  }
  const objs = doc.objs.filter(o => need.has(o.id)).map(cloneObj);
  const shown = new Set(S0);
  return {
    name, id: 't' + Date.now().toString(36),
    givens: givens.map(id => { const o = obj(id); return { id, kind: givenKind(o), label: o.t === 'coord' ? '좌표계' : nm(id), auto: auto.includes(id) && o.t === 'coord' }; }),
    objs, results, shown: [...shown],
    steps: objs.map(o => (shown.has(o.id) ? '' : '(숨김) ') + describe(obj(o.id))),
  };
}
function instantiateTool(tool, matched) {
  const map = new Map(); tool.givens.forEach((g, i) => map.set(g.id, matched[i]));
  const out = [];
  for (const c of tool.objs) {
    const o = cloneObj(c); const old = o.id; delete o.id; remapRefs(o, id => map.get(id) ?? id);
    if (o.t === 'coord') continue;
    if (isScreenObj(o)) { const pos = nextScreenPos(); o.d.sx = pos.sx; o.d.sy = pos.sy; }
    const shown = tool.shown.includes(old); o.hidden = !shown || !!c.hidden;
    const keep = tool.keepLabels && o.label && !doc.objs.some(x => x.label === o.label); const lab0 = o.label;
    add(o); if (o.label || o.t === 'point') giveLabel(o, shown && (o.t === 'point' ? (doc.prefs.autoLabel || keep) && c.showLabel !== false : !!c.showLabel)); if (keep) o.label = lab0;
    map.set(old, o.id); if (shown) out.push(o.id);
  }
  return out;
}
function toolsAll() { return { doc: doc.tools || [], lib: toolLib() }; }
function toolLib() { try { return JSON.parse(localStorage.getItem('jakdo-toolfolder') || '[]'); } catch (e) { return []; } }
function saveToolLib(a) { try { localStorage.setItem('jakdo-toolfolder', JSON.stringify(a)); return true; } catch (e) { toast('브라우저 저장소를 쓸 수 없습니다'); return false; } }
function createToolDlg() {
  const body = el('div', { class: 'stack' }, field('도구 이름', el('input', { id: 'tl-n', value: '새 도구 ' + ((doc.tools || []).length + 1) })),
    field('도구 설명 (스크립트 보기에 표시)', el('textarea', { id: 'tl-c', rows: 2 })),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tl-lib' }), '도구 폴더(이 브라우저)에도 저장해 다른 페이지·문서에서 쓰기'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tl-am' }), '같은 레이블의 객체가 있으면 주어진 것에 자동 연결'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tl-kl' }), '결과에 원래 레이블 쓰기 (겹치지 않을 때)'),
    el('p', { class: 'note' }, '선택한 객체 가운데 다른 선택 객체에 의존하지 않는 것이 주어진 것(입력), 나머지가 결과가 됩니다. 선택하지 않은 중간 객체는 도구를 쓸 때 숨겨진 채로 만들어집니다. 주어진 것을 고른 순서대로 클릭하게 됩니다.'));
  openDlg('사용자 도구 만들기', body, [{ label: '취소' }, { label: '만들기', primary: true, run: () => {
    const t = buildTool($('#tl-n').value.trim() || '새 도구'); if (t.err) { toast(t.err); return false; } t.comment = $('#tl-c').value.trim(); t.automatch = $('#tl-am').checked; t.keepLabels = $('#tl-kl').checked;
    snap(); doc.tools = doc.tools || []; doc.tools.push(t);
    if ($('#tl-lib').checked) { const a = toolLib().filter(x => x.name !== t.name); a.push(t); saveToolLib(a); }
    activateTool(t); toast('도구 “' + t.name + '”을(를) 만들었습니다. 주어진 것 ' + t.givens.filter(g => !g.auto).length + '개를 차례로 클릭하세요');
  } }]);
}
let ctool = null, ctoolMatched = [];
function activateTool(t) { const m = toolMatchesSelection(t); setTool('custom'); ctool = t; ctoolMatched = []; if (m) { snap(); const out = instantiateTool(t, m); setSel(out); toast('선택한 객체에 “' + t.name + '”을(를) 명령처럼 적용했습니다'); } ctoolHint(); }
function nextGiven() { autoMatchNext(); while (ctool && ctoolMatched.length < ctool.givens.length && ctool.givens[ctoolMatched.length].auto) ctoolMatched.push(ensureCoord()); return ctool && ctool.givens[ctoolMatched.length]; }
function ctoolHint() {
  if (!ctool) { $('#status-hint').textContent = '도구상자의 사용자 도구 단추에서 도구를 고르세요.'; return; }
  const g = nextGiven(); const manual = ctool.givens.filter(x => !x.auto);
  $('#status-hint').textContent = '“' + ctool.name + '”: ' + (g ? KIND_KO[g.kind] + ' ' + g.label + '에 해당하는 것을 클릭하세요 (' + (ctoolMatched.filter((_, i) => !ctool.givens[i].auto).length + 1) + '/' + manual.length + ')' : '완료');
}
function customToolDown(sx, sy) {
  if (!ctool) return toast('사용자 도구 단추에서 도구를 먼저 고르세요');
  const g = nextGiven(); if (!g) return;
  if (!ctoolMatched.length) snap();
  if (g.kind === 'point') { const c = candidateAt(sx, sy, ctoolMatched); ctoolMatched.push(realize(c)); }
  else {
    const h = hitTest(sx, sy, o => givenKind(o) === g.kind || (g.kind === 'polygon' && o.t === 'polygon'));
    if (!h) { toast(KIND_KO[g.kind] + '을(를) 클릭하세요'); if (!ctoolMatched.length) undoStack.pop(); return; }
    ctoolMatched.push(h.id);
  }
  if (!nextGiven()) { const out = instantiateTool(ctool, ctoolMatched); ctoolMatched = []; setSel(out); }
  ctoolHint(); refresh();
}
function scriptView(t) {
  t = t || ctool; if (!t) return toast('도구를 먼저 고르세요');
  const body = el('div', { class: 'stack script' }, t.comment ? el('p', { class: 'note' }, t.comment) : null,
    el('div', { class: 'sub' }, '주어진 것'), el('ol', {}, t.givens.map(g => el('li', {}, KIND_KO[g.kind] + ' ' + g.label + (g.auto ? ' (자동 연결)' : '')))),
    el('div', { class: 'sub' }, '단계'), el('ol', {}, t.steps.map(s => el('li', {}, s))));
  openDlg('스크립트 보기 — ' + t.name, body, [{ label: '닫기', primary: true }]);
}
function manageToolsDlg() {
  const box = el('div', { class: 'stack' });
  const render = () => {
    box.innerHTML = '';
    const sec = (title, list, del, extra) => { box.append(el('div', { class: 'sub' }, title)); if (!list.length) box.append(el('p', { class: 'note' }, '없음')); list.forEach((t, i) => box.append(el('div', { class: 'arch-row' }, el('div', {}, el('input', { value: t.name, 'aria-label': '도구 이름', onchange: e => { t.name = e.target.value.trim() || t.name; if (list !== doc.tools) saveToolLib(list); scheduleSave(); } }), el('small', {}, '주어진 것 ' + t.givens.filter(g => !g.auto).length + '개 · 단계 ' + t.steps.length + '개')), el('button', { class: 'btn', onclick: () => { activateTool(t); } }, '쓰기'), extra(t, i), el('button', { class: 'btn ghost', onclick: () => { del(i); render(); } }, '삭제')))); };
    sec('이 페이지의 도구', doc.tools || [], i => { snap(); doc.tools.splice(i, 1); }, t => el('button', { class: 'btn ghost', onclick: () => { const a = toolLib().filter(x => x.name !== t.name); a.push(t); saveToolLib(a); toast('도구 폴더에 저장했습니다'); } }, '폴더에 저장'));
    sec('도구 폴더 (이 브라우저)', toolLib(), i => { const a = toolLib(); a.splice(i, 1); saveToolLib(a); }, t => el('button', { class: 'btn ghost', onclick: () => scriptView(t) }, '스크립트'));
  };
  render(); openDlg('사용자 도구 관리', box, [{ label: '닫기', primary: true }]);
}
function customToolMenu(btn) {
  const r = btn.getBoundingClientRect(); const { doc: dt, lib } = toolsAll();
  const items = [
    ...dt.map(t => ({ label: t.name, check: () => ctool === t, run: () => activateTool(t) })),
    ...(lib.length ? [sep, ...lib.map(t => ({ label: t.name + ' (폴더)', check: () => ctool && ctool.id === t.id, run: () => activateTool(t) }))] : []),
    ...(dt.length || lib.length ? [sep] : []),
    { label: '새 도구 만들기…', run: createToolDlg, en: () => sel.length >= 2 },
    { label: '스크립트 보기…', run: () => scriptView(), en: () => !!ctool },
    { label: '도구 관리…', run: manageToolsDlg },
  ];
  popupMenu(items, r.right + 6, r.top + 10 + 999);
  const m = $('#ctx'); m.style.top = Math.min(r.top, innerHeight - m.offsetHeight - 8) + 'px';
}

/* ================= 분리 / 병합 ================= */
function splitMergeInfo() {
  const s = S();
  const tx = s.os.find(o => o.t === 'text'), pic = s.os.find(o => o.t === 'picture');
  if (s.n === 1 && tx && tx.d.peg != null) return { label: '글상자를 점에서 분리', run: () => unpegText(tx) };
  if (s.n === 2 && tx && s.pts.length === 1) return { label: '글상자를 점 ' + nm(s.pts[0].id) + '에 병합', run: () => pegText(tx, s.pts[0]) };
  if (s.n === 2 && pic && pic.k === 'free' && s.pts.length === 1) return { label: '그림을 점 ' + nm(s.pts[0].id) + '에 병합', run: () => pegPicture(pic, s.pts[0]) };
  if (s.n === 1 && pic && pic.k === 'pts' && pic.p.length === 1) return { label: '그림을 점에서 분리', run: () => { snap(); const g = G[pic.id]; pic.k = 'free'; pic.p = []; pic.d.x = g.TL.x; pic.d.y = g.TL.y; refresh(); } };
  if (s.n === 1 && s.pts.length === 1 && ['on', 'int', 'mid', 'plot', 'term', 'cxf', 'xf', 'unitlen'].includes(s.pts[0].k)) return { label: s.pts[0].k === 'xf' ? '점을 정의에서 분리' : '점을 부모에서 분리', run: () => splitPoint(s.pts[0]) };
  if (s.n === 2 && s.pts.length === 2 && s.pts[0].k === 'free' && !descendants([s.pts[0].id]).has(s.pts[1].id)) return { label: '점 ' + nm(s.pts[0].id) + '을(를) ' + nm(s.pts[1].id) + '에 병합', run: () => mergePoints(s.pts[0], s.pts[1]) };
  if (s.n === 2 && s.pts.length === 1 && s.pts[0].k === 'free' && s.os.some(isPath) && !descendants([s.pts[0].id]).has(s.os.find(isPath).id)) return { label: '점을 경로에 병합', run: () => mergeOnPath(s.pts[0], s.os.find(isPath)) };
  return null;
}
function splitPoint(o) { snap(); const g = G[o.id] || { x: 0, y: 0 }; o.k = 'free'; o.p = []; o.d = { x: g.x, y: g.y }; dirty = true; refresh(); toast('점을 분리했습니다. 이제 자유롭게 끌 수 있습니다'); }
function mergePoints(a, b) {
  snap(); for (const o of doc.objs) if (o !== a) remapRefs(o, id => id === a.id ? b.id : id);
  for (const k of Object.keys(doc.marks)) if (doc.marks[k] === a.id) doc.marks[k] = b.id;
  doc.objs = doc.objs.filter(o => o !== a); // b가 a 뒤에 있으면 순서 보정
  const order = []; const seen = new Set(); const visit = o => { if (seen.has(o.id)) return; seen.add(o.id); for (const p of o.p) { const po = obj(p); if (po && po !== a) visit(po); } order.push(o); };
  reindex(); doc.objs.forEach(visit); doc.objs = order; reindex(); setSel([b.id]); toast('병합했습니다');
}
function mergeOnPath(pt, path) { snap(); const g = G[path.id]; pt.k = 'on'; pt.p = [path.id]; pt.d = { t: pathProj(path, g, G[pt.id]) }; moveToEnd(pt.id); refresh(); toast('점을 ' + nm(path.id) + ' 위의 점으로 병합했습니다'); }

/* ================= 정의 편집 / 앞뒤 ================= */
function editDefinition() {
  const o = S().os[0]; if (!o) return;
  if (o.t === 'value') { if (o.k === 'calc') return calcDialog(o); if (o.k === 'param') return paramDialog(o); if (isFnObj(o) && !o.d.numeric && o.k !== 'data') return functionDialog(o); if (o.k === 'fdef') return functionDialog(obj(o.p[0])); }
  if (o.t === 'fplot') return o.d.fn != null ? functionDialog(obj(o.d.fn)) : functionDialog(o);
  if (o.t === 'iter') return iterProps(o);
  toast('이 객체는 정의를 편집할 수 없습니다');
}
const canEditDef = () => { const s = S(); if (s.n !== 1) return false; const o = s.os[0]; return (o.t === 'value' && ['calc', 'param', 'func', 'deriv', 'fdef'].includes(o.k) && !o.d.numeric) || o.t === 'fplot' || o.t === 'iter'; };
function layer(front) { const s = S().os; if (!s.length) return; snap(); const zs = doc.objs.map(o => o.z || 0); const z = front ? Math.max(...zs) + 1 : Math.min(...zs) - 1; s.forEach(o => o.z = z); refresh(); }

/* ================= 손그림 ================= */
function drawingPathDraw(o, g, hi) {
  const pts = o.d.pts; if (pts.length < 2) return; ctx.save();
  if (hi) { ctx.strokeStyle = hi; ctx.globalAlpha = 0.5; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => { const q = toS(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); ctx.globalAlpha = 1; }
  setStroke(o, 0, colOf(o)); ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => { const q = toS(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); ctx.restore();
}
function hitDrawing(o, P) { let b = Infinity; const pts = o.d.pts; for (let i = 1; i < pts.length; i++) b = Math.min(b, distSeg(P, toS(pts[i - 1]), toS(pts[i]))); return b; }
function functionFromDrawing() {
  const dr = S().os.find(o => o.t === 'drawing'); snap(); const c = ensureCoord(); const co = G[c] || (recompute(), G[c]);
  const pts = dr.d.pts.map(p => wToC(co, p)); const bins = new Map();
  for (const p of pts) { const k = Math.round(p.x * 50) / 50; if (!bins.has(k) || bins.get(k) < p.y) bins.set(k, p.y); }
  const xs = [...bins.keys()].sort((a, b) => a - b); if (xs.length < 2) { undoStack.pop(); return toast('가로 폭이 있는 그림이어야 합니다'); }
  const id = mkValue('data', [], { xs, ys: xs.map(x => bins.get(x)), form: 'yx' }); setSel([id]); toast('그림의 윗선으로 함수를 만들었습니다. 그래프 ▸ 함수 그래프 그리기로 그릴 수 있습니다');
}

/* ================= 그림 ================= */
const imgCache = new Map();
function imgOf(src) { let im = imgCache.get(src); if (!im) { im = new Image(); im.onload = () => requestDraw(); im.src = src; imgCache.set(src, im); } return im; }
function pictureFrame(o, Gx) {
  const d = o.d;
  if (o.k === 'xf') { const g = Gx[o.p[0]], M = buildMap(d.xf, Gx); if (!g || !M) return null; return { TL: M.f(g.TL), TR: M.f(g.TR), BL: M.f(g.BL), src: g.src }; }
  const aspect = d.h / d.w; let TL, TR, BL;
  if (o.p.length === 0 || o.k === 'free') { TL = { x: d.x, y: d.y }; TR = { x: d.x + d.ww, y: d.y }; BL = { x: d.x, y: d.y - d.ww * aspect }; }
  else if (o.p.length === 1) { const P0 = Gx[o.p[0]]; if (!P0) return null; TL = P0; TR = { x: P0.x + d.ww, y: P0.y }; BL = { x: P0.x, y: P0.y - d.ww * aspect }; }
  else if (o.p.length === 2) { const P0 = Gx[o.p[0]], Q = Gx[o.p[1]]; if (!P0 || !Q) return null; TL = P0; TR = { x: Q.x, y: P0.y }; BL = { x: P0.x, y: Q.y }; }
  else { const P0 = Gx[o.p[0]], Q = Gx[o.p[1]], R = Gx[o.p[2]]; if (!P0 || !Q || !R) return null; TL = P0; TR = Q; BL = R; }
  return { TL, TR, BL, src: d.src };
}
function drawPicture(o, g, selected, hover) {
  const im = imgOf(g.src); if (!im.complete || !im.naturalWidth) return;
  const A = toS(g.TL), B = toS(g.TR), Cc = toS(g.BL); const w = im.naturalWidth, h = im.naturalHeight;
  ctx.save();
  const cg = o.d.crop != null ? G[o.d.crop] : null; if (cg && cg.pts) { ctx.beginPath(); pathPoly(cg.pts, true); ctx.clip(); }
  if (o.hidden) ctx.globalAlpha = 0.3; else if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.transform((B.x - A.x) / w, (B.y - A.y) / w, (Cc.x - A.x) / h, (Cc.y - A.y) / h, A.x, A.y);
  ctx.drawImage(im, 0, 0); ctx.restore();
  if (selected || hover) { ctx.save(); ctx.strokeStyle = selected ? THEME.sel : THEME.hover; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); const D = { x: B.x + Cc.x - A.x, y: B.y + Cc.y - A.y }; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(D.x, D.y); ctx.lineTo(Cc.x, Cc.y); ctx.closePath(); ctx.stroke(); ctx.restore(); }
}
function insidePicture(g, P) { const w = toW(P.x, P.y), u = vsub(g.TR, g.TL), v = vsub(g.BL, g.TL), q = vsub(w, g.TL), det = vcross(u, v); if (Math.abs(det) < 1e-12) return false; const a = vcross(q, v) / det, b = vcross(u, q) / det; return a >= 0 && a <= 1 && b >= 0 && b <= 1; }
function importPicture(file) {
  if (!file || !/^image\//.test(file.type)) return toast('그림 파일을 고르세요');
  const r = new FileReader(); r.onload = () => {
    const im = new Image(); im.onload = () => {
      const MAX = 1600; let w = im.naturalWidth, h = im.naturalHeight; const k = Math.min(1, MAX / Math.max(w, h)); let src = r.result;
      if (k < 1 || file.size > 600000) { const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); src = c.toDataURL(/png|gif|svg/.test(file.type) ? 'image/png' : 'image/jpeg', 0.86); w = c.width; h = c.height; }
      snap(); const pts = S().pts.slice(0, 3).map(o => o.id); const ww = Math.min(8, (W * 0.4) / view.s), ctr = toW(W / 2, H / 2);
      const o = add({ t: 'picture', k: pts.length ? 'pts' : 'free', p: pts, d: { src, w, h, ww, x: ctr.x - ww / 2, y: ctr.y + ww * h / w / 2 }, color: 'ink' });
      setSel([o.id]); toast(pts.length ? '그림을 선택한 점 ' + pts.length + '개에 붙였습니다' : '그림을 넣었습니다. 점을 선택하고 가져오면 점에 붙습니다');
    }; im.src = r.result;
  }; r.readAsDataURL(file);
}
function importPictureDlg() { const inp = el('input', { type: 'file', accept: 'image/*' }); inp.onchange = () => importPicture(inp.files[0]); inp.click(); }
document.addEventListener('paste', e => { if (e.target.closest('input,textarea')) return; const it = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/')); if (!it) return; e.preventDefault(); const pic = S().n === 1 && S().os[0].t === 'picture' ? S().os[0] : null; if (pic) { const r = new FileReader(); r.onload = () => { snap(); pic.d.src = r.result; refresh(); toast('그림을 바꿔 넣었습니다'); }; r.readAsDataURL(it.getAsFile()); } else importPicture(it.getAsFile()); });
function cropPictureCmd() { const s = S(); const pic = s.os.find(o => o.t === 'picture'), pg = s.os.find(o => o.t === 'polygon'); snap(); pic.d.crop = pg.id; refresh(); toast('그림을 다각형 모양으로 잘랐습니다'); }
