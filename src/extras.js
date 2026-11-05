'use strict';
/* ================= 모두 실행 취소 / 다시 실행 ================= */
function undoAll() { if (!undoStack.length) return toast('되돌릴 작업이 없습니다'); while (undoStack.length) { redoStack.push(serialize()); const s = undoStack.pop(); if (!undoStack.length) restore(s); } toast('처음 상태로 되돌렸습니다'); scheduleSave(); }
function redoAll() { if (!redoStack.length) return toast('다시 실행할 작업이 없습니다'); let last = null; while (redoStack.length) { undoStack.push(serialize()); last = redoStack.pop(); } restore(last); toast('모두 다시 실행했습니다'); scheduleSave(); }

/* ================= Shift: 15° 단위로 고정 ================= */
let shiftDown = false;
document.addEventListener('keydown', e => { if (e.key === 'Shift') shiftDown = true; });
document.addEventListener('keyup', e => { if (e.key === 'Shift') shiftDown = false; });
function constrainCand(c, fromId) {
  if (!shiftDown || !c || c.kind !== 'free' || fromId == null || !G[fromId]) return c;
  const A = G[fromId], d = vsub(c.w, A), L = vlen(d); if (L < 1e-9) return c;
  const step = Math.PI / 12, th = Math.round(vang(d) / step) * step; const w = vadd(A, vpol(L, th));
  return { kind: 'free', w, s: toS(w) };
}

/* ================= 독립점(자유점) 애니메이션 ================= */
function stepFreePoint(o, a, dt) {
  if (a.vx == null) { const th = Math.random() * TAU; a.vx = Math.cos(th); a.vy = Math.sin(th); }
  const turn = (Math.random() - 0.5) * 2.2 * dt; const c = Math.cos(turn), s = Math.sin(turn); const vx = a.vx * c - a.vy * s, vy = a.vx * s + a.vy * c; a.vx = vx; a.vy = vy;
  const sp = 3 * speedK * (a.speed || 1) * dt; o.d.x += a.vx * sp; o.d.y += a.vy * sp;
  const b = viewBoundsFn(), m = 0.6;
  if (o.d.x < b.x0 + m || o.d.x > b.x1 - m) { a.vx *= -1; o.d.x = clamp(o.d.x, b.x0 + m, b.x1 - m); }
  if (o.d.y < b.y0 + m || o.d.y > b.y1 - m) { a.vy *= -1; o.d.y = clamp(o.d.y, b.y0 + m, b.y1 - m); }
}

/* ================= 레이블 여러 개 붙이기 / 다음 레이블 다시 설정 ================= */
function labelManyDlg() {
  const os = S().os.filter(o => o.t !== 'text' && o.t !== 'button' && o.t !== 'table'); if (!os.length) return toast('레이블을 붙일 객체를 선택하세요');
  const one = os.length === 1;
  const body = el('div', { class: 'stack' }, el('div', { class: 'row2' }, field(one ? '레이블' : '레이블 앞부분', el('input', { id: 'lm-b', value: one ? (os[0].label || '') : 'P' })), one ? null : field('시작 번호', num('lm-s', 1, 1))),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'lm-v', checked: true }), '레이블 보이기'),
    one ? null : el('p', { class: 'note' }, '선택한 순서대로 P₁, P₂, P₃ … 처럼 붙습니다.'));
  openDlg(one ? '레이블 붙이기' : '여러 객체에 레이블 붙이기', body, [{ label: '취소' }, { label: '적용', primary: true, run: () => {
    const base = $('#lm-b').value.trim(); if (!base) { toast('레이블을 입력하세요'); return false; }
    snap(); const st = one ? 0 : Math.max(0, Math.floor(getNum('lm-s') || 1)); os.forEach((o, i) => { o.label = one ? base : base + (st + i); if (o.t !== 'value') o.showLabel = $('#lm-v').checked; }); refresh();
  } }]);
}
function resetLabels() { snap(); doc.cnt = {}; toast('다음 레이블을 A, j, c₁ … 부터 다시 붙입니다'); }

/* ================= 텍스트·그림을 점에 병합 ================= */
function pegText(t, p) { snap(); const P0 = toS(G[p.id]); t.d.peg = p.id; t.d.pox = t.d.sx - P0.x; t.d.poy = t.d.sy - P0.y; refresh(); toast('글상자를 점 ' + nm(p.id) + '에 붙였습니다. 점을 끌면 함께 움직입니다'); }
function unpegText(t) { snap(); delete t.d.peg; refresh(); toast('글상자를 점에서 분리했습니다'); }
function pegPicture(pic, p) { snap(); pic.k = 'pts'; pic.p = [p.id]; moveToEnd(pic.id); refresh(); toast('그림을 점 ' + nm(p.id) + '에 붙였습니다'); }
function textPos(o) { if (o.d.peg != null && G[o.d.peg]) { const P0 = toS(G[o.d.peg]); o.d.sx = P0.x + (o.d.pox ?? 8); o.d.sy = P0.y + (o.d.poy ?? -30); } }

/* ================= 경로 위에 값 그리기 ================= */
function plotOnPathCmd() { const s = S(); const v = s.vals[0], path = s.os.find(isPath); snap(); const o = add({ t: 'point', k: 'onv', p: [path.id, v.id] }); giveLabel(o, doc.prefs.autoLabel); setSel([o.id]); }

/* ================= 인쇄 (독립 실행 페이지에서만) ================= */
function isStandalone() { try { return window.top === window.self; } catch (e) { return false; } }
function printSketch() {
  const s0 = sel; sel = []; const h0 = hoverId; hoverId = null; draw();
  let area = $('#print-area'); if (!area) { area = el('div', { id: 'print-area' }); document.body.append(area); }
  area.innerHTML = ''; area.append(el('h1', {}, curPage() ? curPage().name : '작도'), el('img', { src: cv.toDataURL('image/png'), alt: '작도 그림' }));
  sel = s0; hoverId = h0; requestDraw(); setTimeout(() => window.print(), 50);
}

/* ================= 그림으로 복사 / 파일 끌어다 놓기 ================= */
function copyAsPicture() {
  const s0 = sel; sel = []; draw();
  cv.toBlob(async b => { sel = s0; requestDraw(); try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast('그림을 클립보드에 복사했습니다'); } catch (e) { toast('이 화면에서는 그림 복사가 막혀 있습니다. 그림으로 내보내기를 쓰세요'); } }, 'image/png');
}
function readDropped(file) {
  if (/^image\//.test(file.type)) return importPicture(file);
  const r = new FileReader();
  r.onload = () => {
    const txt = r.result;
    try {
      if (/\.json$/i.test(file.name)) { const n = appendBook(parseBook(txt)); return toast('‘' + file.name + '’에서 페이지 ' + n + '개를 열었습니다'); }
      if (/\.html?$/i.test(file.name)) {
        const m = txt.match(/<script type="application\/json" id="jakdo-embed">([\s\S]*?)<\/script>/); if (m) { const n = appendBook(parseBook(m[1])); return toast('웹 페이지에서 페이지 ' + n + '개를 열었습니다'); }
        if (typeof importJSP === 'function' && /PARAM\s+NAME\s*=\s*"?Construction/i.test(txt)) return importJSP(txt, file.name);
      }
      if (/\.gsp$/i.test(file.name) && typeof importGSPFile === 'function') return importGSPFile(file);
      toast('이 파일 형식은 열 수 없습니다');
    } catch (e) { toast('파일을 열 수 없습니다: ' + e.message); }
  };
  if (/\.gsp$/i.test(file.name) && typeof importGSPFile === 'function') return importGSPFile(file);
  r.readAsText(file);
}
const stageEl = document.getElementById('stage');
stageEl.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); stageEl.classList.add('dropping'); } });
stageEl.addEventListener('dragleave', () => stageEl.classList.remove('dropping'));
stageEl.addEventListener('drop', e => { stageEl.classList.remove('dropping'); const fs = [...(e.dataTransfer.files || [])]; if (!fs.length) return; e.preventDefault(); fs.forEach(readDropped); });

/* ================= 겹친 객체 선택 (같은 자리 다시 클릭) ================= */
function hitAll(sx, sy) {
  const out = []; const seen = new Set();
  for (let k = 0; k < 8; k++) { const h = hitTest(sx, sy, o => !seen.has(o.id)); if (!h) break; seen.add(h.id); out.push(h.id); }
  return out;
}

/* ================= 정보 풍선 ================= */
let balloonTimer = null;
function balloonAt(sx, sy, id) {
  clearTimeout(balloonTimer); const b = $('#balloon'); if (b) b.hidden = true;
  if (id == null || doc.prefs.balloons === false) return;
  balloonTimer = setTimeout(() => { const o = obj(id); if (!o) return; let bb = $('#balloon'); if (!bb) { bb = el('div', { id: 'balloon', role: 'tooltip' }); $('#stage').append(bb); } bb.textContent = describe(o); bb.hidden = false; bb.style.left = clamp(sx + 14, 4, W - 260) + 'px'; bb.style.top = clamp(sy + 18, 4, H - 40) + 'px'; }, 900);
}

/* ================= 삼각 축 눈금 ================= */
function piLabel(k) { // k: π/2 단위 개수
  if (k === 0) return '0'; const sgn = k < 0 ? '−' : ''; k = Math.abs(k);
  if (k % 2 === 0) { const n = k / 2; return sgn + (n === 1 ? '' : n) + 'π'; } return sgn + (k === 1 ? '' : k) + 'π/2';
}

/* ================= 환경설정: 색·글자 ================= */
const TYPE_DEFAULT_COLOR = { point: 'red', straight: 'ink', circle: 'ink', interior: null, locus: 'purple', plot: 'blue', text: 'ink' };
function prefColor(kind) { const c = doc.prefs.colors && doc.prefs.colors[kind]; return c || TYPE_DEFAULT_COLOR[kind]; }
function labelFont() { const s = doc.prefs.labelSize || 16; return `italic 600 ${s}px "STIX Two Text", "Times New Roman", serif`; }
function colorPrefsDlg() {
  const P = doc.prefs; P.colors = P.colors || {};
  const kinds = [['point', '점'], ['straight', '직선류'], ['circle', '원·호'], ['interior', '내부 (비우면 번갈아)'], ['locus', '자취'], ['plot', '함수 그래프'], ['text', '글상자']];
  const sel2 = (k) => el('select', { id: 'cp-' + k }, el('option', { value: '' }, k === 'interior' ? '번갈아 칠하기' : '기본'), Object.keys(PALETTE).map(c => el('option', { value: c, selected: P.colors[k] === c }, PAL_KO[c])));
  const bg = el('input', { type: 'color', id: 'cp-bg', value: P.bg || '#ffffff', style: 'width:100%;height:34px;border:0;background:none' });
  const body = el('div', { class: 'stack' }, el('div', { class: 'sub' }, '새 객체의 기본 색'), el('div', { class: 'row2' }, kinds.map(([k, l]) => field(l, sel2(k)))),
    el('div', { class: 'sub' }, '스케치 배경'), el('div', { class: 'row2' }, field('배경색', bg), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'cp-bgd', checked: !P.bg }), '테마 배경 쓰기')),
    el('div', { class: 'sub' }, '글자'), el('div', { class: 'row3' }, field('레이블 크기', num('cp-ls', P.labelSize || 16, 1)), field('새 글상자 크기', num('cp-cs', P.capSize || 15, 1)), field('새 글상자 글꼴', el('select', { id: 'cp-cf' }, [['sans', '고딕'], ['serif', '명조·수식'], ['mono', '고정폭']].map(([v, l]) => el('option', { value: v, selected: (P.capFont || 'sans') === v }, l))))),
    el('div', { class: 'sub' }, '그 밖에'), el('div', { class: 'row2' }, field('자취 흐려짐 (초, 0=계속 남김)', num('cp-fd', P.fade || 0, 1)), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'cp-bl', checked: P.balloons !== false }), '정보 풍선 보이기')));
  openDlg('색·글자 환경설정', body, [{ label: '기본값으로', run: () => { snap(); delete P.colors; delete P.bg; delete P.labelSize; delete P.capSize; delete P.capFont; delete P.fade; delete P.balloons; refresh(); } }, { label: '취소' }, { label: '확인', primary: true, run: () => {
    snap(); for (const [k] of kinds) { const v = $('#cp-' + k).value; if (v) P.colors[k] = v; else delete P.colors[k]; }
    if ($('#cp-bgd').checked) delete P.bg; else P.bg = bg.value;
    P.labelSize = clamp(getNum('cp-ls') || 16, 8, 48); P.capSize = clamp(getNum('cp-cs') || 15, 8, 72); P.capFont = $('#cp-cf').value; P.fade = Math.max(0, getNum('cp-fd') || 0); P.balloons = $('#cp-bl').checked; refresh();
  } }]);
}

/* ================= 사용자 도구 추가 기능 ================= */
function toolMatchesSelection(t) {
  const manual = t.givens.filter(g => !g.auto); const os = S().os; if (os.length !== manual.length) return null;
  const out = []; let j = 0;
  for (const g of t.givens) { if (g.auto) { out.push(ensureCoord()); continue; } const o = os[j++]; if (givenKind(o) !== g.kind) return null; out.push(o.id); }
  return out;
}
function autoMatchNext() {
  if (!ctool || !ctool.automatch) return;
  for (;;) { const g = ctool.givens[ctoolMatched.length]; if (!g || g.auto || g.kind === 'coord') return; const o = doc.objs.find(x => x.label === g.label && givenKind(x) === g.kind && !ctoolMatched.includes(x.id)); if (!o) return; ctoolMatched.push(o.id); }
}

/* ================= 수식 표기: 윗줄·호 ================= */
// layoutRich에서 \overline{…}, \arc{…} 처리 (display.js parseRich 확장)
