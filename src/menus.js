'use strict';
/* ================= 대화상자 ================= */
const dlgStack = [];
function openDlg(title, body, buttons = [], opts = {}) {
  const box = el('div', { class: 'dlg' + (opts.modeless ? ' modeless' : ''), role: 'dialog', 'aria-label': title });
  const head = el('div', { class: 'dlg-head' }, el('span', {}, title), el('button', { class: 'dlg-x', 'aria-label': '닫기', onclick: () => close(false) }, '×'));
  const foot = el('div', { class: 'dlg-foot' });
  const close = (ok) => { if (opts.onClose) opts.onClose(ok); box.remove(); const i = dlgStack.indexOf(close); if (i >= 0) dlgStack.splice(i, 1); if (!opts.modeless) $('#scrim').hidden = !document.querySelector('.dlg:not(.modeless)'); };
  for (const b of buttons) foot.append(el('button', { class: 'btn' + (b.primary ? ' primary' : ''), onclick: () => { if (b.run && b.run() === false) return; close(!!b.primary); } }, b.label));
  box.append(head, el('div', { class: 'dlg-body' }, body), foot);
  $('#app').append(box); if (!opts.modeless) $('#scrim').hidden = false;
  // 끌어 옮기기
  head.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = box.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; head.setPointerCapture(e.pointerId); const mv = ev => { box.style.left = clamp(ev.clientX - ox, 0, innerWidth - 80) + 'px'; box.style.top = clamp(ev.clientY - oy, 0, innerHeight - 40) + 'px'; box.style.transform = 'none'; }; head.addEventListener('pointermove', mv); head.addEventListener('pointerup', () => head.removeEventListener('pointermove', mv), { once: true }); });
  box.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(false); } if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const p = buttons.find(b => b.primary); if (p) { e.preventDefault(); if (p.run && p.run() === false) return; close(true); } } });
  dlgStack.push(close);
  setTimeout(() => { const f = box.querySelector('input,select,textarea'); if (f) { f.focus(); if (f.select) f.select(); } }, 30);
  return close;
}
const field = (label, input, hint) => el('label', { class: 'fld' }, el('span', {}, label), input, hint ? el('small', {}, hint) : null);
const num = (id, v, step = 'any') => el('input', { id, type: 'number', value: v, step, inputmode: 'decimal' });
const getNum = id => { const v = parseFloat($('#' + id).value); return isFinite(v) ? v : NaN; };
function radio(name, opts, val) { return el('div', { class: 'seg', role: 'radiogroup' }, opts.map(([v, l, dis]) => el('label', { class: dis ? 'dis' : '' }, el('input', { type: 'radio', name, value: v, checked: v === val, disabled: !!dis }), el('span', {}, l)))); }
const radioVal = name => { const r = document.querySelector(`input[name="${name}"]:checked`); return r && r.value; };

function translateDlg() {
  if (!S().os.some(XF_OK)) return toast('평행이동할 객체를 선택하세요');
  const hasV = !!doc.marks.vector, hasD = !!doc.marks.dist, hasA = !!doc.marks.angle;
  const body = el('div', { class: 'stack' },
    radio('trm', [['polar', '극좌표'], ['rect', '직교좌표'], ['vec', '표시된 벡터' + (hasV ? ' (' + markDesc('vector') + ')' : ''), !hasV]], hasV ? 'vec' : 'polar'),
    el('div', { class: 'row2' }, field('거리 (cm)', num('tr-d', 1)), field('각도 (°)', num('tr-a', 0))),
    el('div', { class: 'row2' }, hasD ? el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tr-md' }), '표시된 거리: ' + markDesc('dist')) : null, hasA ? el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'tr-ma' }), '표시된 각: ' + markDesc('angle')) : null),
    el('div', { class: 'row2' }, field('수평 이동 (cm)', num('tr-x', 1)), field('수직 이동 (cm)', num('tr-y', 0))));
  openDlg('평행이동', body, [{ label: '취소' }, { label: '평행이동', primary: true, run: () => {
    const m = radioVal('trm'); let xf;
    if (m === 'vec') xf = { type: 'tr', vec: doc.marks.vector.slice() };
    else if (m === 'rect') xf = { type: 'tr', mode: 'rect', dx: getNum('tr-x') || 0, dy: getNum('tr-y') || 0 };
    else { xf = { type: 'tr', mode: 'polar', dist: getNum('tr-d') || 0, ang: getNum('tr-a') || 0 }; if ($('#tr-md') && $('#tr-md').checked) xf.distV = doc.marks.dist.val; if ($('#tr-ma') && $('#tr-ma').checked) { const a = doc.marks.angle; if (a.pts) xf.angP = a.pts.slice(); else xf.angV = a.val; } }
    applyXf(xf);
  } }]);
}
function rotateDlg() {
  if (!S().os.some(XF_OK)) return toast('회전할 객체를 선택하세요');
  if (doc.marks.center == null) return toast('먼저 중심점을 표시하세요 (점을 선택하고 변환 ▸ 중심점 표시)');
  const hasA = !!doc.marks.angle;
  const body = el('div', { class: 'stack' }, el('p', { class: 'note' }, '중심점: ' + markDesc('center')),
    radio('rtm', [['fixed', '고정된 각'], ['mark', '표시된 각' + (hasA ? ' (' + markDesc('angle') + ')' : ''), !hasA]], hasA ? 'mark' : 'fixed'),
    field('각도 (°, 시계 반대 방향이 +)', num('rt-a', 90)));
  openDlg('회전', body, [{ label: '취소' }, { label: '회전', primary: true, run: () => {
    const xf = { type: 'rot', c: doc.marks.center };
    if (radioVal('rtm') === 'mark') { const a = doc.marks.angle; if (a.pts) xf.angP = a.pts.slice(); else xf.angV = a.val; } else xf.ang = getNum('rt-a') || 0;
    applyXf(xf);
  } }]);
}
function dilateDlg() {
  if (!S().os.some(XF_OK)) return toast('확대·축소할 객체를 선택하세요');
  if (doc.marks.center == null) return toast('먼저 중심점을 표시하세요 (점을 선택하고 변환 ▸ 중심점 표시)');
  const hasR = !!doc.marks.ratio;
  const body = el('div', { class: 'stack' }, el('p', { class: 'note' }, '중심점: ' + markDesc('center')),
    radio('dlm', [['fixed', '고정된 비율'], ['mark', '표시된 비율' + (hasR ? ' (' + markDesc('ratio') + ')' : ''), !hasR]], hasR ? 'mark' : 'fixed'),
    el('div', { class: 'row2' }, field('새 길이', num('dl-a', 1)), field('원래 길이', num('dl-b', 2))));
  openDlg('확대·축소', body, [{ label: '취소' }, { label: '확대·축소', primary: true, run: () => {
    const xf = { type: 'dil', c: doc.marks.center };
    if (radioVal('dlm') === 'mark') { const r = doc.marks.ratio; if (r.pts) xf.rP = r.pts.slice(); else if (r.segs) xf.rS = r.segs.slice(); else xf.rV = r.val; } else { const a = getNum('dl-a'), b = getNum('dl-b'); if (!b) { toast('원래 길이는 0이 될 수 없습니다'); return false; } xf.r = a / b; }
    applyXf(xf);
  } }]);
}
function reflectCmd() { if (doc.marks.mirror == null) return toast('먼저 거울을 표시하세요 (직선을 선택하고 변환 ▸ 거울 표시)'); applyXf({ type: 'ref', m: doc.marks.mirror }); }

function paramDialog(o) {
  const d = o ? o.d : { v: 1, min: 0, max: 10, step: 0.1, unit: 'none' };
  const body = el('div', { class: 'stack' },
    el('div', { class: 'row2' }, field('이름', el('input', { id: 'pm-n', value: o ? o.label : 't' + ((doc.cnt.t || 0) + 1) })), field('값 (수식을 넣으면 계산으로 바뀜)', el('input', { id: 'pm-v', value: d.v, inputmode: 'decimal' }))),
    field('단위', el('select', { id: 'pm-u' }, [['none', '없음'], ['dist', '거리 (cm)'], ['angle', '각 (' + (doc.prefs.deg ? '°' : 'rad') + ')']].map(([v, l]) => el('option', { value: v, selected: v === d.unit }, l)))),
    el('div', { class: 'row3' }, field('최솟값', num('pm-min', d.min)), field('최댓값', num('pm-max', d.max)), field('키보드 증감', num('pm-st', d.step))),
    el('p', { class: 'note' }, '선택한 뒤 + / − 키로 값을 바꾸고, 표시 ▸ 애니메이션으로 최솟값과 최댓값 사이를 오갑니다.'));
  openDlg(o ? '매개변수 편집' : '새 매개변수', body, [{ label: '취소' }, { label: o ? '확인' : '만들기', primary: true, run: () => {
    const raw = $('#pm-v').value.trim(); const v = getNum('pm-v');
    if (!isFinite(v) || !/^[-+0-9.eE]+$/.test(raw)) { if (!o) { toast('값에 숫자를 입력하세요'); return false; } let r2; try { r2 = userExprToStored(raw, false); } catch (e) { toast('숫자나 수식을 입력하세요: ' + e.message); return false; } if (r2.refs.includes(o.id)) { toast('자기 자신을 참조할 수 없습니다'); return false; } snap(); o.k = 'calc'; o.p = r2.refs; o.d = { expr: r2.stored, sx: o.d.sx, sy: o.d.sy }; moveToEnd(o.id); refresh(); toast('매개변수를 계산으로 바꿨습니다'); return; }
    const name = $('#pm-n').value.trim().replace(/\s+/g, '');
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) { toast('이름은 영문자로 시작하는 영문·숫자 조합이어야 합니다 (예: t1, a)'); return false; }
    if (doc.objs.some(x => x !== o && (x.t === 'value' || x.t === 'fplot') && x.label === name)) { toast('같은 이름이 이미 있습니다'); return false; }
    snap(); let mn = getNum('pm-min'), mx = getNum('pm-max'); if (!(mx > mn)) { mn = Math.min(v, 0); mx = Math.max(v, 10); }
    const nd = { v, min: mn, max: mx, step: getNum('pm-st') || 0.1, unit: $('#pm-u').value };
    if (o) Object.assign(o.d, nd), o.label = name; else { const id = mkParam(v, nd); obj(id).label = name; setSel([id]); }
    refresh();
  } }]);
}
function valueChips(onPick, exclude) {
  const vals = doc.objs.filter(o => o.id !== exclude && ((o.t === 'value' && o.k !== 'fdef' && o.k !== 'eq' && o.k !== 'coords') || (o.t === 'fplot' && o.d.expr && !o.d.fn)));
  if (!vals.length) return el('p', { class: 'note' }, '아직 측정값이나 매개변수가 없습니다. 측정 메뉴에서 값을 만들면 여기에서 고를 수 있습니다.');
  return el('div', { class: 'chips' }, vals.map(v => el('button', { class: 'chip', type: 'button', onclick: () => onPick(v) }, el('b', {}, disp(v.label) + (isFnObj(v) ? '( )' : '')), ' ', v.t === 'fplot' ? '' : valueText(v))));
}
function insertAt(inp, text) { const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s; inp.value = inp.value.slice(0, s) + text + inp.value.slice(e); inp.focus(); const p = s + text.length; inp.setSelectionRange(p, p); inp.dispatchEvent(new Event('input')); }
function calcDialog(o) {
  const inp = el('input', { id: 'calc-e', class: 'mono', value: o ? storedToUser(o.d.expr) : '', autocomplete: 'off', spellcheck: 'false', 'aria-label': '수식' });
  const out = el('div', { class: 'calc-out' }, ' ');
  const preview = () => {
    try { const r = userExprToStored(inp.value, false); const tmp = { t: 'value', k: 'calc', p: r.refs, d: { expr: r.stored }, id: -1 }; const g = computeValue(tmp, G); out.textContent = g && g.err ? g.err : '= ' + fmt(g ? g.v : NaN); out.classList.remove('err'); }
    catch (e) { out.textContent = inp.value.trim() ? e.message : ' '; out.classList.toggle('err', !!inp.value.trim()); }
  };
  inp.addEventListener('input', preview);
  const keys = ['7', '8', '9', '/', 'sin(', 'cos(', '4', '5', '6', '*', 'tan(', 'sqrt(', '1', '2', '3', '-', 'abs(', 'ln(', '0', '.', '^', '+', '(', ')', 'π', 'asin(', 'acos(', 'atan(', 'log(', 'exp(', 'cm', 'in', '°', 'rad', 'sgn(', 'round('];
  const pad = el('div', { class: 'keypad' }, keys.map(k => el('button', { type: 'button', onclick: () => insertAt(inp, k) }, k.replace('*', '×').replace('/', '÷').replace('sqrt(', '√('))));
  const body = el('div', { class: 'stack' }, inp, out, pad, el('div', { class: 'sub' }, '값 넣기 — 스케치의 값을 클릭해도 들어갑니다'), valueChips(v => insertAt(inp, v.label + (v.t === 'fplot' ? '(' : '')), o && o.id),
    el('p', { class: 'note' }, '삼각함수는 환경설정의 각 단위(' + (doc.prefs.deg ? '도' : '라디안') + ')를 따릅니다. cm·in·°·rad를 붙이면 단위가 있는 값이 되고, 결과에도 단위가 붙습니다 (예: 2cm + m1, 30°).'));
  calcInsertHook = v => insertAt(inp, v.label + (v.t === 'fplot' ? '(' : ''));
  openDlg(o ? '계산 편집' : '계산', body, [{ label: '취소' }, { label: o ? '확인' : '만들기', primary: true, run: () => {
    let r; try { r = userExprToStored(inp.value, false); } catch (e) { toast(e.message); return false; }
    if (o && r.refs.includes(o.id)) { toast('자기 자신을 참조할 수 없습니다'); return false; }
    if (o && r.refs.some(id => descendants([o.id]).has(id))) { toast('이 계산에 의존하는 값은 넣을 수 없습니다'); return false; }
    snap(); if (o) { o.d.expr = r.stored; o.p = r.refs; moveToEnd(o.id); reindex(); refresh(); } else setSel([mkCalc(inp.value)]);
  } }], { modeless: true, onClose: () => { calcInsertHook = null; } });
  setTimeout(preview, 0);
}
function functionDialog(f, opts = {}) {
  // f: 함수 값 객체(func/deriv) 또는 옛 형식 fplot
  const legacy = f && f.t === 'fplot';
  const inp = el('input', { id: 'fn-e', class: 'mono', value: f && f.d.expr ? storedToUser(f.d.expr) : '', placeholder: '예: a*sin(x) + 1', autocomplete: 'off', spellcheck: 'false', 'aria-label': '함수식' });
  const form = f && f.d.form || 'yx';
  const plotted = f && doc.objs.find(o => o.t === 'fplot' && o.d.fn === f.id);
  const body = el('div', { class: 'stack' },
    el('div', { class: 'row2' }, field('형태', el('select', { id: 'fn-form', disabled: legacy }, [['yx', 'y = f(x)'], ['xy', 'x = f(y)'], ['rt', 'r = f(θ) (극좌표)']].map(([v, l]) => el('option', { value: v, selected: v === form }, l)))),
      field('표기', el('select', { id: 'fn-not' }, [['f', 'f(x) = …'], ['y', 'y = …']].map(([v, l]) => el('option', { value: v, selected: v === ((f && f.d.notation) || 'f') }, l))))),
    el('div', { class: 'fx' }, el('span', { class: 'mono' }, (f ? disp(f.label) : '새 함수') + '(x) ='), inp),
    opts.plot === false ? null : el('div', { class: 'row2' }, field('정의역 최솟값 (비우면 전체)', el('input', { id: 'fn-a', type: 'number', value: plotted && plotted.d.xmin != null ? plotted.d.xmin : legacy && f.d.xmin != null ? f.d.xmin : '' })), field('정의역 최댓값', el('input', { id: 'fn-b', type: 'number', value: plotted && plotted.d.xmax != null ? plotted.d.xmax : legacy && f.d.xmax != null ? f.d.xmax : '' }))),
    el('div', { class: 'sub' }, '매개변수·측정값·함수 넣기'), valueChips(v => insertAt(inp, v.label + (isFnObj(v) ? '(' : '')), f && f.id),
    el('p', { class: 'note' }, '독립변수는 언제나 x로 씁니다 (x = f(y)이면 y, 극좌표이면 θ로 표시됩니다). 함수의 삼각함수는 라디안을 씁니다. x² 은 x^2, 곱셈은 2x 또는 2*x, 조각 함수는 sgn( )을 이용합니다.'));
  const plot = opts.plot !== false;
  openDlg(f ? '함수 편집' : plot ? '새 함수 그래프' : '새 함수', body, [{ label: '취소' }, { label: f ? '확인' : plot ? '그리기' : '만들기', primary: true, run: () => {
    let r; try { r = userExprToStored(inp.value, true); } catch (e) { toast(e.message); return false; }
    if (f && (r.refs.includes(f.id) || r.refs.some(id => descendants([f.id]).has(id)))) { toast('자기 자신이나 이 함수에 의존하는 값은 넣을 수 없습니다'); return false; }
    const a = $('#fn-a') && $('#fn-a').value !== '' ? +$('#fn-a').value : null, b = $('#fn-b') && $('#fn-b').value !== '' ? +$('#fn-b').value : null;
    snap();
    if (legacy) { f.d.expr = r.stored; f.p = [f.p[0], ...r.refs]; f.d.xmin = a; f.d.xmax = b; moveToEnd(f.id); refresh(); return; }
    if (f) { f.d.expr = r.stored; f.p = r.refs; f.d.form = $('#fn-form').value; f.d.notation = $('#fn-not').value; if (f.k === 'deriv') { f.k = 'func'; delete f.d.numeric; } if (plotted) { plotted.d.xmin = a; plotted.d.xmax = b; } moveToEnd(f.id); refresh(); return; }
    const fn = mkFunc(inp.value, { form: $('#fn-form').value, notation: $('#fn-not').value });
    if (plot) setSel([mkFplotOf(fn, { xmin: a, xmax: b })]); else setSel([fn]);
  } }]);
}
function plotDlg() {
  const body = el('div', { class: 'stack' }, radio('plm', [['rect', '직교좌표 (x, y)'], ['polar', '극좌표 (r, θ)']], 'rect'), el('div', { class: 'row2' }, field('x 또는 r', num('pl-x', 1)), field('y 또는 θ', num('pl-y', 1))));
  openDlg('점 그리기', body, [{ label: '닫기' }, { label: '그리기', primary: true, run: () => { const x = getNum('pl-x'), y = getNum('pl-y'); if (!isFinite(x) || !isFinite(y)) { toast('숫자를 입력하세요'); return false; } snap(); const id = mkPlot(x, y, { polar: radioVal('plm') === 'polar' }); setSel([id]); return false; } }]);
}
function prefsDlg() {
  const P = doc.prefs; const opt = (id, v) => el('option', { value: id, selected: String(v) === String(id) }, id === '' ? '기본' : id + '자리');
  const precSel = (id, v) => el('select', { id }, ['', 0, 1, 2, 3, 4, 5].map(n => opt(n, v ?? '')));
  const body = el('div', { class: 'stack' },
    el('div', { class: 'sub' }, '단위'),
    el('div', { class: 'row2' }, field('거리 단위', el('select', { id: 'pf-u' }, [['cm', '센티미터 (cm)'], ['in', '인치 (in)'], ['px', '픽셀 (px)']].map(([v, l]) => el('option', { value: v, selected: v === P.unit }, l)))),
      field('각 단위', el('select', { id: 'pf-a' }, el('option', { value: 'deg', selected: P.deg && !P.directed }, '도 (°)'), el('option', { value: 'ddeg', selected: P.deg && P.directed }, '방향 있는 도 (−180°~180°)'), el('option', { value: 'rad', selected: !P.deg }, '라디안')))),
    el('div', { class: 'row3' }, field('기본 소수점', el('select', { id: 'pf-p' }, [0, 1, 2, 3, 4, 5].map(n => el('option', { value: n, selected: n === P.prec }, n + '자리')))), field('각 측정', precSel('pf-pa', P.precA)), field('거리·넓이', precSel('pf-pd', P.precD))),
    field('기타 값(비·계산 등)', precSel('pf-po', P.precO)),
    el('div', { class: 'sub' }, '레이블'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'pf-l', checked: P.autoLabel }), '새 점에 레이블 자동 표시'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'pf-la', checked: !!P.labelAll }), '새 직선·원 등에도 레이블 자동 표시'),
    el('div', { class: 'sub' }, '그래프와 표본'),
    el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'pf-s', checked: P.snap }), '좌표계가 있을 때 점을 격자에 맞추기'),
    el('div', { class: 'row2' }, field('자취 기본 표본 수', num('pf-ln', P.locusN || 300, 10)), field('반복 최대 상 개수', num('pf-ic', P.iterCap || 30000, 1000))));
  openDlg('환경설정', body, [{ label: '취소' }, { label: '확인', primary: true, run: () => {
    snap(); P.unit = $('#pf-u').value; P.deg = $('#pf-a').value !== 'rad'; P.directed = $('#pf-a').value === 'ddeg'; P.prec = +$('#pf-p').value;
    const pv = id => $('#' + id).value === '' ? undefined : +$('#' + id).value; P.precA = pv('pf-pa'); P.precD = pv('pf-pd'); P.precO = pv('pf-po');
    P.autoLabel = $('#pf-l').checked; P.labelAll = $('#pf-la').checked; P.snap = $('#pf-s').checked;
    P.locusN = clamp(Math.round(getNum('pf-ln') || 300), 20, 5000); P.iterCap = clamp(Math.round(getNum('pf-ic') || 30000), 1000, 200000); refresh();
  } }]);
}
function propsDialog(list) {
  list = list || S().os; if (!list.length) return toast('속성을 볼 객체를 선택하세요');
  const one = list.length === 1 ? list[0] : null; const body = el('div', { class: 'stack' });
  if (one) body.append(el('p', { class: 'note' }, describe(one)));
  if (one && one.t !== 'text' && one.t !== 'button' && !(one.t === 'value' && one.k !== 'param')) body.append(el('div', { class: 'row2' }, field('레이블', el('input', { id: 'pr-l', value: one.label || '' })), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'pr-sl', checked: !!one.showLabel }), '레이블 보이기')));
  if (one && one.t === 'text') body.append(field('내용', el('textarea', { id: 'pr-tx', rows: 3 }, one.d.text)), el('div', { class: 'row2' }, field('글자 크기', num('pr-fs', one.d.size || 15, 1)), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'pr-b', checked: !!one.d.bold }), '굵게')));
  if (one && one.t === 'button') body.append(field('버튼 이름', el('input', { id: 'pr-bt', value: one.d.text })));
  let color = one ? one.color : null;
  const sw = el('div', { class: 'swatches' }, Object.keys(PALETTE).map(k => el('button', { type: 'button', class: 'sw' + (color === k ? ' on' : ''), title: PAL_KO[k], 'aria-label': PAL_KO[k], style: `--c:${col(k)}`, onclick: e => { color = k; sw.querySelectorAll('.sw').forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); } })));
  body.append(field('색', sw));
  if (list.some(o => isPath(o) && !isInterior(o))) body.append(el('div', { class: 'row2' }, field('선 굵기', el('select', { id: 'pr-w' }, [[1, '가늘게'], [2, '보통'], [3, '굵게']].map(([v, l]) => el('option', { value: v, selected: one && one.w === v }, l)))), field('선 모양', el('select', { id: 'pr-d' }, [[0, '실선'], [1, '파선'], [2, '점선']].map(([v, l]) => el('option', { value: v, selected: one && one.dash === v }, l))))));
  if (list.some(isPoint)) body.append(field('점 크기', el('select', { id: 'pr-ps' }, [[1, '작게'], [2, '보통'], [3, '크게']].map(([v, l]) => el('option', { value: v, selected: one && one.ps === v }, l)))));
  if (list.some(isInterior)) body.append(field('채우기 불투명도', el('input', { id: 'pr-al', type: 'range', min: 0.05, max: 0.9, step: 0.05, value: one && one.alpha != null ? one.alpha : 0.26 })));
  body.append(el('div', { class: 'row2' }, el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'pr-h', checked: one ? !!one.hidden : false }), '숨기기'), list.some(o => o.t === 'point' || isPath(o)) ? el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'pr-tr', checked: one ? !!one.trace : false }), '자취 남기기') : null));
  const extraApply = propsExtra(list, one, body);
  openDlg(one ? selName(one) + ' 속성' : list.length + '개 객체 속성', body, [{ label: '취소' }, { label: '확인', primary: true, run: () => {
    snap();
    for (const o of list) {
      if (color) o.color = color;
      if ($('#pr-w') && (isPath(o) && !isInterior(o))) { o.w = +$('#pr-w').value; o.dash = +$('#pr-d').value; }
      if ($('#pr-ps') && isPoint(o)) o.ps = +$('#pr-ps').value;
      if ($('#pr-al') && isInterior(o)) o.alpha = +$('#pr-al').value;
      o.hidden = $('#pr-h').checked; if ($('#pr-tr')) { o.trace = $('#pr-tr').checked; if (!o.trace) traces.delete(o.id); }
    }
    if (one) {
      if ($('#pr-l')) { const v = $('#pr-l').value.trim(); if (v) one.label = v; one.showLabel = $('#pr-sl').checked; }
      if (one.t === 'text') { one.d.text = $('#pr-tx').value; one.d.size = +$('#pr-fs').value || 15; one.d.bold = $('#pr-b').checked; }
      if (one.t === 'button') one.d.text = $('#pr-bt').value || one.d.text;
    }
    extraApply();
    if (list.some(o => o.hidden)) sel = sel.filter(id => !obj(id).hidden);
    refresh();
  } }]);
}
function archiveDlg() {
  const listBox = el('div', { class: 'arch' });
  const render = () => {
    const a = archiveList(); listBox.innerHTML = '';
    if (!a.length) listBox.append(el('p', { class: 'note' }, '보관한 문서가 없습니다. 문서의 모든 페이지가 함께 보관됩니다. 이 브라우저에만 저장되며 다른 기기와는 공유되지 않습니다.'));
    a.forEach((it, i) => listBox.append(el('div', { class: 'arch-row' }, el('div', {}, el('b', {}, it.name), el('small', {}, new Date(it.t).toLocaleString('ko-KR') + (it.pages ? ' · 페이지 ' + it.pages + '개' : ''))),
      el('button', { class: 'btn', onclick: () => { try { const n = appendBook(parseBook(it.data)); toast('‘' + it.name + '’에서 페이지 ' + n + '개를 열었습니다'); } catch (e) { toast('불러올 수 없습니다'); } } }, '열기'),
      el('button', { class: 'btn ghost', 'aria-label': it.name + ' 삭제', onclick: () => { const b = archiveList(); b.splice(i, 1); archiveSet(b); render(); } }, '삭제'))));
  };
  render();
  const nameIn = el('input', { id: 'ar-n', value: '작도 문서 ' + new Date().toLocaleDateString('ko-KR') });
  const body = el('div', { class: 'stack' }, el('div', { class: 'fx' }, nameIn, el('button', { class: 'btn primary', onclick: () => { const n = nameIn.value.trim() || '이름 없음'; const a = archiveList().filter(x => x.name !== n); a.unshift({ name: n, t: Date.now(), data: serializeBook(), pages: book.pages.length }); if (archiveSet(a.slice(0, 40))) { toast('보관했습니다: ' + n); render(); } } }, '현재 문서 보관')), listBox);
  openDlg('문서 보관함', body, [{ label: '닫기' }]);
}
function helpDlg() {
  const rows = [['Ctrl+Z / Ctrl+Y', '실행 취소 / 다시 실행'], ['Ctrl+L', '선분 (점 2개 이상 선택)'], ['Ctrl+M', '중점'], ['Ctrl+I', '교점'], ['Ctrl+P', '다각형 내부'], ['Ctrl+K', '레이블 보이기/숨기기'], ['Ctrl+H', '객체 숨기기'], ['Ctrl+T', '자취 켜기/끄기'], ['Ctrl+B', '자취 지우기'], ['Ctrl+=', '계산기'], ['Ctrl+C / Ctrl+V', '복사 / 붙여넣기'], ['Delete', '선택 객체와 그에 의존하는 객체 삭제'], ['Esc', '작도 취소 → 화살표 도구 → 선택 해제'], ['Shift+↑/↓', '도구 바꾸기'], ['Shift+←/→', '도구 변형 바꾸기 (선분·반직선·직선 등)'], ['+ / −', '선택한 매개변수 값 바꾸기'], ['방향키', '선택 객체를 1픽셀씩 이동'], ['Space·Alt+끌기, 휠', '화면 이동, 확대·축소']];
  const body = el('div', { class: 'stack help' },
    el('p', {}, '작도 원리는 스케치패드와 같습니다. 도구나 메뉴로 만든 객체는 부모 객체에 의존하므로, 자유점을 끌어도 모든 관계(평행, 수직, 교점, 측정값)가 유지됩니다. 메뉴 명령은 필요한 객체를 먼저 선택해야 켜집니다.'),
    el('table', {}, el('tbody', {}, rows.map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v))))),
    el('p', { class: 'note' }, '점을 더블클릭하면 중심점, 직선을 더블클릭하면 거울로 표시됩니다. 계산기가 열려 있을 때 스케치의 값을 클릭하면 수식에 들어갑니다. 아래 페이지 탭으로 한 문서에 작도를 여러 장 둘 수 있습니다. 탭을 더블클릭하면 이름 바꾸기, 끌면 순서 바꾸기, 오른쪽 클릭하면 복제·삭제입니다. 편집 ▸ 동작 버튼 ▸ 페이지 이동으로 다른 페이지로 넘어가는 버튼을 만들 수 있습니다. 작업은 이 브라우저에 자동 저장됩니다.'));
  openDlg('사용법과 단축키', body, [{ label: '닫기', primary: true }]);
}

/* ================= 메뉴 ================= */
const sep = '-';
const MENUS = [
  { name: '파일', items: [
    { label: '새 문서…', run: newDocument },
    { label: '열기… (.json · .gsp · .htm)', key: 'Ctrl+O', run: fileOpen },
    { label: '저장', key: 'Ctrl+S', run: () => fileSave() },
    { label: '다른 이름으로 저장… (.json · .gsp)', key: 'Ctrl+Shift+S', run: () => fileSaveAs() },
    { label: 'GSP 5 문서로 저장 (.gsp)…', run: () => fileSaveAs('gsp') },
    { label: '그림으로 내보내기 (.png)', key: 'Ctrl+E', run: exportPNGScaled },
    { label: '벡터 그림으로 내보내기 (.svg)', run: exportSVG },
    { label: '그림 가져오기…', run: importPictureDlg },
    { label: '웹 페이지로 내보내기 (.html)', run: exportWebPage },
    ...(isStandalone() ? [{ label: '인쇄…', run: printSketch }] : []),
    sep,
    { label: '새 페이지', run: () => addPage() },
    { label: '페이지 복제', run: () => duplicatePage(book.cur) },
    { label: '페이지 이름 바꾸기', run: () => renamePageDlg(book.cur) },
    { label: '페이지 삭제…', run: () => deletePage(book.cur), en: () => book.pages.length > 1 },
    { label: '페이지로 가기', sub: () => book.pages.map((p, i) => ({ label: p.name, check: () => i === book.cur, run: () => showPage(i) })) },
    sep,
    { label: '문서 보관함…', run: archiveDlg },
    { label: '예제 (새 페이지로 열기)', sub: () => EXAMPLES.map(x => ({ label: x.name, run: () => loadExample(x) })) },
  ] },
  { name: '편집', items: [
    { label: '실행 취소', key: 'Ctrl+Z', run: undo, en: () => undoStack.length > 0 },
    { label: '다시 실행', key: 'Ctrl+Y', run: redo, en: () => redoStack.length > 0 },
    { label: '모두 실행 취소', run: undoAll, en: () => undoStack.length > 0 },
    { label: '모두 다시 실행', run: redoAll, en: () => redoStack.length > 0 },
    sep,
    { label: '복사', key: 'Ctrl+C', run: copySel, en: () => sel.length > 0 },
    { label: '그림으로 복사', run: copyAsPicture },
    { label: '붙여넣기', key: 'Ctrl+V', run: paste, en: () => !!clip },
    { label: '삭제', key: 'Del', run: deleteSel, en: () => sel.length > 0 },
    sep,
    { label: '모두 선택', key: 'Ctrl+A', run: selectAll },
    { label: '부모 선택', run: selectParents, en: () => sel.some(id => obj(id).p.length) },
    { label: '자식 선택', run: selectChildren, en: () => sel.some(id => children(id).length) },
    sep,
    { label: '동작 버튼', sub: () => [
      { label: '숨기기/보이기', run: () => makeButton('hide'), en: () => sel.length > 0 },
      { label: '애니메이션', run: () => makeButton('anim'), en: () => S().os.some(animatable) },
      { label: '페이지 이동', sub: () => { const t = linkTargets(); return t.length ? t.map(p => ({ label: p.name, run: () => makeLinkButton(p.id) })) : [{ label: '다른 페이지가 없습니다', en: () => false, run: () => { } }]; } },
      { label: '발표 (버튼 묶기)', run: () => makeButton2('present'), en: () => S().os.some(o => o.t === 'button') },
      { label: '소리', run: () => makeButton2('sound'), en: () => S().n === 1 && S().vals.length === 1 },
      { label: '화면 이동 (점 하나, 또는 방향을 나타내는 두 점)', run: () => makeButton2('scroll'), en: () => (S().n === 2 && S().pts.length === 2) || (S().n === 1 && S().pts.length === 1) },
      { label: '웹 주소 열기', run: () => makeButton2('url') },
      { label: '이동 (자유점 → 도착점)', run: () => makeButton('move'), en: () => { const s = S(); return s.n === 2 && s.pts.length === 2 && s.pts[0].k === 'free'; } },
    ] },
    { label: '정의 편집…', run: editDefinition, en: () => canEditDef() },
    { label: '분리/병합', sub: () => { const i = splitMergeInfo(); return [i ? { label: i.label, run: i.run } : { label: '점 하나(분리), 자유점과 점(병합), 자유점과 경로(병합) 중 하나를 선택하세요', en: () => false, run: () => { } }]; } },
    { label: '그림을 다각형으로 자르기', run: cropPictureCmd, en: () => { const s = S(); return s.n === 2 && s.os.some(o => o.t === 'picture') && s.os.some(o => o.t === 'polygon'); } },
    sep,
    { label: '맨 앞으로', run: () => layer(true), en: () => sel.length > 0 },
    { label: '맨 뒤로', run: () => layer(false), en: () => sel.length > 0 },
    { label: '속성…', run: () => propsDialog(), en: () => sel.length > 0 },
    { label: '환경설정…', run: prefsDlg },
    { label: '색·글자 환경설정…', run: colorPrefsDlg },
    { label: '글자 스타일 환경설정…', run: textStylePrefsDlg },
    { label: '도구 환경설정…', run: toolPrefsDlg },
    { label: '고급 환경설정…', run: advPrefsDlg },
  ] },
  { name: '표시', items: [
    { label: '선 굵기', sub: () => [[1, '가늘게'], [2, '보통'], [3, '굵게']].map(([v, l]) => ({ label: l, run: () => setProp(o => o.w = v), en: () => sel.length > 0 })) },
    { label: '선 모양', sub: () => [[0, '실선'], [1, '파선'], [2, '점선']].map(([v, l]) => ({ label: l, run: () => setProp(o => o.dash = v), en: () => sel.length > 0 })) },
    { label: '점 크기', sub: () => [[1, '작게'], [2, '보통'], [3, '크게']].map(([v, l]) => ({ label: l, run: () => setProp(o => o.ps = v), en: () => S().pts.length > 0 })) },
    { label: '색', sub: () => [...Object.keys(PALETTE).map(k => ({ label: PAL_KO[k], swatch: col(k), run: () => setProp(o => { o.color = k; delete o.pc; }), en: () => sel.length > 0 })), sep, { label: '다른 색…', run: () => otherColorDlg(), en: () => sel.length > 0 }, { label: '색 메뉴 편집…', run: paletteEditDlg }, { label: '매개변수 색…', run: paramColorDlg, en: () => { const s = S(); const v = s.vals.filter(x => !isFnObj(x)).length; return (v === 1 || v === 3) && s.n > v; } }] },
    { label: '텍스트 팔레트 보이기/숨기기', run: () => toggleTextPalette(), check: () => paletteOn },
    { label: '큰 버튼 모드 (태블릿·전자칠판)', run: () => { setBigUI(!bigUI); toast(bigUI ? '큰 버튼 모드를 켰습니다 · 두 손가락으로 확대·이동' : '큰 버튼 모드를 껐습니다'); }, check: () => bigUI },
    sep,
    { label: '레이블 보이기/숨기기', key: 'Ctrl+K', run: toggleLabels, en: () => sel.length > 0 },
    { label: '레이블 붙이기…', run: labelManyDlg, en: () => sel.length > 0 },
    { label: '다음 레이블 다시 설정', run: resetLabels },
    { label: '객체 숨기기', key: 'Ctrl+H', run: hideSel, en: () => sel.length > 0 },
    { label: '숨긴 객체 모두 보이기', run: showAllHidden },
    sep,
    { label: '자취 켜기/끄기', key: 'Ctrl+T', run: toggleTrace, en: () => sel.length > 0, check: () => S().n > 0 && S().os.every(o => o.trace) },
    { label: '자취 지우기', key: 'Ctrl+B', run: eraseTraces },
    sep,
    { label: '애니메이션 시작', run: () => startAnim(sel), en: () => S().os.some(animatable) },
    { label: '애니메이션 멈춤', run: () => stopAnim(), en: () => anims.size > 0 || moves.size > 0 },
    { label: '더 빠르게', run: () => { speedK = Math.min(8, speedK * 1.5); updateMotion(); } },
    { label: '더 느리게', run: () => { speedK = Math.max(0.1, speedK / 1.5); updateMotion(); } },
    { label: '운동 조절기 보이기/숨기기', run: () => { motionPinned = !motionPinned; updateMotion(); }, check: () => motionPinned },
    { label: '도구상자 보이기/숨기기', run: () => { const t = $('#toolbox'); t.hidden = !t.hidden; resize(); }, check: () => !$('#toolbox').hidden },
  ] },
  { name: '작도', items: [
    { label: '대상 위의 점', run: C.pointOn, en: can.pointOn },
    { label: '중점', key: 'Ctrl+M', run: C.midpoint, en: can.midpoint },
    { label: '교점', key: 'Ctrl+I', run: C.intersect, en: can.intersect },
    sep,
    { label: '선분', key: 'Ctrl+L', run: () => C.straight('segment'), en: can.straight },
    { label: '반직선', run: () => C.straight('ray'), en: can.straight },
    { label: '직선', run: () => C.straight('line'), en: can.straight },
    sep,
    { label: '평행선', run: () => C.parperp('par'), en: can.parperp },
    { label: '수선', run: () => C.parperp('perp'), en: can.parperp },
    { label: '각의 이등분선', run: C.bisector, en: can.bisector },
    sep,
    { label: '중심과 점으로 원', run: C.circleCP, en: can.twoPts },
    { label: '중심과 반지름으로 원', run: C.circleCR, en: can.circleCR },
    { label: '원 위의 호', run: C.arcOn, en: can.arcOn },
    { label: '세 점을 지나는 호', run: C.arc3, en: can.bisector },
    sep,
    { label: '다각형 내부', key: 'Ctrl+P', run: C.polyInt, en: can.polyInt },
    { label: '원 내부', run: C.circInt, en: can.circInt },
    { label: '부채꼴 내부', run: C.sector, en: can.arcs },
    { label: '활꼴 내부', run: C.arcseg, en: can.arcs },
    sep,
    { label: '자취', run: C.locus, en: can.locus },
  ] },
  { name: '변환', items: [
    { label: '중심점 표시', run: markCmd.center, en: () => S().n === 1 && S().pts.length === 1, hint: () => markDesc('center') },
    { label: '거울 표시', run: markCmd.mirror, en: () => S().n === 1 && S().str.length === 1, hint: () => markDesc('mirror') },
    { label: '각 표시', run: markCmd.angle, en: () => { const s = S(); return (s.n === 3 && s.pts.length === 3) || (s.n === 1 && (s.vals.length === 1 || s.os[0].t === 'amark')); }, hint: () => markDesc('angle') },
    { label: '비율·배율 표시', run: markCmd.ratio, en: () => { const s = S(); return (s.n === 3 && s.pts.length === 3) || (s.n === 2 && s.segs.length === 2) || (s.n === 1 && s.vals.length === 1); }, hint: () => markDesc('ratio') },
    { label: '벡터 표시', run: markCmd.vector, en: () => { const s = S(); return s.n === 2 && s.pts.length === 2; }, hint: () => markDesc('vector') },
    { label: '거리 표시', run: markCmd.dist, en: () => { const s = S(); return s.n === 1 && s.vals.length === 1; }, hint: () => markDesc('dist') },
    sep,
    { label: '평행이동…', run: translateDlg, en: () => S().os.some(XF_OK) },
    { label: '회전…', run: rotateDlg, en: () => S().os.some(XF_OK) },
    { label: '확대·축소…', run: dilateDlg, en: () => S().os.some(XF_OK) },
    { label: '대칭이동', run: reflectCmd, en: () => S().os.some(XF_OK) && doc.marks.mirror != null },
    sep,
    { label: '반복…', run: iterateDlg, en: () => { const s = S(); return s.pts.length >= 1 && s.pts.length + (s.vals.length === 1 ? 1 : 0) === s.n; } },
    { label: '종점', run: terminalPointCmd, en: () => S().n === 1 && S().os[0].t === 'iter' },
    sep,
    { label: '사용자 변환 정의…', run: defineCxfDlg, en: () => { const s = S(); return s.n === 2 && s.pts.length === 2 && (descendants([s.pts[0].id]).has(s.pts[1].id) || descendants([s.pts[1].id]).has(s.pts[0].id)); } },
    { label: '사용자 변환 편집…', run: editCxfDlg, en: () => !!(doc.cxf && doc.cxf.length) },
    { label: '사용자 변환 적용', sub: () => (doc.cxf || []).length ? doc.cxf.map(t => ({ label: t.name, run: () => applyCxf(t), en: () => sel.length > 0 })) : [{ label: '정의된 변환이 없습니다', en: () => false, run: () => { } }] },
  ] },
  { name: '측정', items: [
    { label: '길이', run: measure.len, en: canM.len },
    { label: '거리', run: measure.dist, en: canM.dist },
    { label: '둘레', run: measure.perim, en: canM.perim },
    { label: '원주', run: measure.circum, en: canM.circum },
    { label: '각', run: measure.angle, en: canM.angle },
    { label: '넓이', run: measure.area, en: canM.area },
    { label: '호의 중심각', run: measure.arcang, en: canM.arc },
    { label: '호의 길이', run: measure.arclen, en: canM.arc },
    { label: '반지름', run: measure.radius, en: canM.radius },
    { label: '비', run: measure.ratio, en: canM.ratio },
    { label: '경로 위 점의 값', run: measure.ptval, en: canM.ptval },
    sep,
    { label: '좌표', run: measure.coords, en: canM.pts },
    { label: '좌표 거리', run: measure.coorddist, en: () => { const s = S(); return s.n === 2 && s.pts.length === 2; } },
    { label: 'x좌표 (극: r)', run: measure.x, en: canM.pts },
    { label: 'y좌표 (극: θ)', run: measure.y, en: canM.pts },
    { label: '기울기', run: measure.slope, en: canM.slope },
    { label: '방정식', run: measure.eq, en: canM.eq },
  ] },
  { name: '수', items: [
    { label: '새 매개변수…', run: () => paramDialog() },
    { label: '계산…', key: 'Ctrl+=', run: () => calcDialog() },
    { label: '매개변수 편집…', run: () => paramDialog(S().vals[0]), en: () => S().n === 1 && S().vals[0] && S().vals[0].k === 'param' },
    sep,
    { label: '표 만들기', run: tabulateCmd, en: () => { const s = S(); return s.n >= 1 && s.os.every(o => o.t === 'value' && !isFnObj(o) && o.k !== 'fdef'); } },
    { label: '표에 데이터 추가…', run: () => addTableDataDlg(), en: () => { const s = S(); return s.n === 1 && s.os[0].t === 'table' && s.os[0].k !== 'iter'; } },
    { label: '표 데이터 지우기', sub: () => [{ label: '마지막 행', run: () => removeTableData(S().os[0], false) }, { label: '모든 행', run: () => removeTableData(S().os[0], true) }].map(x => ({ ...x, en: () => S().n === 1 && S().os[0].t === 'table' && S().os[0].k !== 'iter' })) },
    sep,
    { label: '새 함수…', run: () => functionDialog(null, { plot: false }) },
    { label: '그림에서 함수 정의', run: () => S().os[0].t === 'picture' ? functionFromPictureLive() : functionFromDrawing(), en: () => S().n === 1 && (S().os[0].t === 'drawing' || S().os[0].t === 'picture') },
    { label: '도함수 정의', run: () => { snap(); setSel(S().os.filter(o => o.t === 'value' && isFnObj(o)).map(mkDerivative)); }, en: () => { const s = S(); return s.n >= 1 && s.os.every(o => o.t === 'value' && isFnObj(o)); } },
  ] },
  { name: '그래프', items: [
    { label: '좌표계 정의', run: defineCoordCmd },
    { label: '좌표계 표시', run: () => { const c = S().os.find(o => o.t === 'coord'); doc.coordId = c.id; toast('표시된 좌표계를 바꿨습니다'); refresh(); }, en: () => S().n === 1 && S().os[0].t === 'coord' && S().os[0].id !== doc.coordId },
    { label: '격자 모양', sub: () => [
      ...[['square', '정사각 격자'], ['rect', '직사각 격자'], ['polar', '극 격자']].map(([v, l]) => ({ label: l, en: () => !!doc.coordId, check: () => { const c = obj(doc.coordId); return c && (c.d.form || 'square') === v; }, run: () => setGridForm(v) })),
      sep,
      ...[['line', '선 격자'], ['dots', '점 격자'], ['none', '격자 숨기기']].map(([v, l]) => ({ label: l, en: () => !!doc.coordId, check: () => { const c = obj(doc.coordId); return c && (v === 'none' ? c.d.grid === false : c.d.grid !== false && (!!c.d.dots === (v === 'dots'))); }, run: () => { snap(); const c = obj(doc.coordId); c.d.grid = v !== 'none'; c.d.dots = v === 'dots'; refresh(); } })),
      sep,
      { label: '삼각 축 (x축을 π 단위로)', en: () => !!doc.coordId, check: () => { const c = obj(doc.coordId); return c && !!c.d.trig; }, run: () => { snap(); const c = obj(doc.coordId); c.d.trig = !c.d.trig; refresh(); } },
      { label: '축 보이기/숨기기', en: () => !!doc.coordId, check: () => { const c = obj(doc.coordId); return c && c.d.axes !== false; }, run: () => { snap(); const c = obj(doc.coordId); c.d.axes = c.d.axes === false; refresh(); } },
    ] },
    { label: '좌표계 보이기/숨기기', run: () => { if (!doc.coordId) return; snap(); const c = obj(doc.coordId); c.hidden = !c.hidden; refresh(); }, en: () => !!doc.coordId },
    { label: '격자에 맞추기', run: () => { doc.prefs.snap = !doc.prefs.snap; toast(doc.prefs.snap ? '격자에 맞추기 켬' : '격자에 맞추기 끔'); }, check: () => doc.prefs.snap },
    sep,
    { label: '축 위에 값 그리기', run: plotValueOnAxis, en: () => { const s = S(); return s.n >= 1 && s.vals.length === s.n && s.vals.every(v => isFinite((G[v.id] || {}).v)); } },
    { label: '(x, y)로 그리기', run: () => { const v = S().vals; snap(); const pol = G[ensureCoord()].form === 'polar'; setSel([mkPlot({ v: v[0].id }, { v: v[1].id }, { polar: pol })]); }, en: () => { const s = S(); return s.n === 2 && s.vals.length === 2; } },
    { label: '경로 위에 값 그리기', run: plotOnPathCmd, en: () => { const s = S(); return s.n === 2 && s.vals.length === 1 && s.os.some(isPath); } },
    { label: '점 그리기…', run: plotDlg },
    { label: '표 데이터 그리기', run: () => plotTableCmd && plotTableCmd(), en: () => typeof plotTableCmd === 'function' && S().n === 1 && S().os[0].t === 'table' },
    sep,
    { label: '함수 그래프 그리기', run: () => { snap(); setSel(S().vals.filter(isFnObj).map(f => mkFplotOf(f.id))); }, en: () => { const s = S(); return s.n >= 1 && s.os.every(isFnObj) && s.os.every(o => o.t === 'value'); } },
    { label: '새 함수 그래프…', run: () => functionDialog() },
    { label: '매개곡선 그리기…', run: paramPlotDlg, en: () => { const s = S(); return s.n === 2 && s.os.every(o => o.t === 'value' && isFnObj(o)); } },
    { label: '함수 편집…', run: () => { const o = S().os[0]; functionDialog(o.t === 'fplot' && o.d.fn != null ? obj(o.d.fn) : o.k === 'fdef' ? obj(o.p[0]) : o); }, en: () => { const s = S(); if (s.n !== 1) return false; const o = s.os[0]; return (o.t === 'fplot' && o.k !== 'param') || (o.t === 'value' && (o.k === 'fdef' || o.k === 'func' || (o.k === 'deriv' && !o.d.numeric))); } },
  ] },
  { name: '도움말', items: [
    { label: '사용법과 단축키', run: helpDlg },
    { label: '매뉴얼 기능 대응표', run: manualMapDlg },
  ] },
];
let openMenu = null;
function buildMenubar() {
  const bar = $('#menubar'); bar.innerHTML = '';
  MENUS.forEach((m, i) => {
    const b = el('button', { class: 'mb', 'aria-haspopup': 'true', 'aria-expanded': 'false', onclick: e => { e.stopPropagation(); openMenu === i ? closeMenus() : showMenu(i, b); }, onpointerenter: () => { if (openMenu != null && openMenu !== i) showMenu(i, b); } }, m.name);
    bar.append(b);
  });
}
function menuItems(items, host, depth) {
  for (const it of items) {
    if (it === sep) { host.append(el('div', { class: 'msep', role: 'separator' })); continue; }
    const enabled = it.en ? !!it.en() : true;
    const hint = it.hint && it.hint();
    const row = el('button', { class: 'mi', role: 'menuitem', disabled: !enabled },
      el('span', { class: 'mi-chk' }, it.check && it.check() ? '✓' : it.swatch ? el('i', { class: 'mi-sw', style: `background:${it.swatch}` }) : ''),
      el('span', { class: 'mi-l' }, it.label, hint ? el('small', {}, ' · ' + hint) : null), el('span', { class: 'mi-k' }, it.sub ? '▸' : it.key || ''));
    if (it.sub) {
      const subHost = el('div', { class: 'menu sub', role: 'menu' });
      const show = () => { host.querySelectorAll(':scope > .menu.sub').forEach(s => s !== subHost && s.remove()); if (!subHost.isConnected) { subHost.innerHTML = ''; menuItems(it.sub(), subHost, depth + 1); host.append(subHost); } const r = row.getBoundingClientRect(), hr = host.getBoundingClientRect(); subHost.style.top = (r.top - hr.top - 4) + 'px'; const left = hr.width - 4; subHost.style.left = left + 'px'; requestAnimationFrame(() => { const sr = subHost.getBoundingClientRect(); if (sr.right > innerWidth - 4) subHost.style.left = (-sr.width + 4) + 'px'; if (sr.bottom > innerHeight - 4) subHost.style.top = (r.top - hr.top - (sr.bottom - innerHeight) - 8) + 'px'; }); };
      row.addEventListener('pointerenter', show); row.addEventListener('click', e => { e.stopPropagation(); show(); });
    } else {
      row.addEventListener('pointerenter', () => host.querySelectorAll(':scope > .menu.sub').forEach(s => s.remove()));
      row.addEventListener('click', e => { e.stopPropagation(); closeMenus(); it.run(); });
    }
    host.append(row);
  }
}
function showMenu(i, btn) {
  closeMenus(); openMenu = i; btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open');
  const m = el('div', { class: 'menu top', role: 'menu', id: 'menu-pop' }); menuItems(MENUS[i].items, m, 0);
  $('#app').append(m); const r = btn.getBoundingClientRect(); m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 6) + 'px'; m.style.top = r.bottom + 'px';
}
function closeMenus() { openMenu = null; const m = $('#menu-pop'); if (m) m.remove(); document.querySelectorAll('.mb').forEach(b => { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }); }
document.addEventListener('pointerdown', e => { if (!e.target.closest('.menu, .mb')) closeMenus(); if (!e.target.closest('#ctx')) closeContext(); if (!e.target.closest('.flyout, .tool')) closeFlyout(); if (!e.target.closest('#infopop, #cv')) $('#infopop').hidden = true; });

/* ---- 오른쪽 클릭 메뉴 ---- */
function openContext(e) {
  const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; const h = hitTest(sx, sy);
  let items;
  if (h) {
    const o = obj(h.id); if (!sel.includes(o.id)) setSel([o.id]);
    items = [
      { label: '속성…', run: () => propsDialog() },
      o.t !== 'value' && o.t !== 'text' && o.t !== 'button' ? { label: o.showLabel ? '레이블 숨기기' : '레이블 보이기', run: toggleLabels } : null,
      { label: '숨기기', run: hideSel },
      (o.t === 'point' || isPath(o)) && o.t !== 'locus' && o.t !== 'fplot' ? { label: o.trace ? '자취 끄기' : '자취 켜기', run: toggleTrace } : null,
      animatable(o) ? { label: anims.has(o.id) ? '애니메이션 멈춤' : '애니메이션', run: () => anims.has(o.id) ? stopAnim([o.id]) : startAnim([o.id]) } : null,
      o.t === 'point' ? { label: '중심점으로 표시', run: () => { doc.marks.center = o.id; toast('중심점 표시: ' + nm(o.id)); requestDraw(); } } : null,
      isStraight(o) ? { label: '거울로 표시', run: () => { doc.marks.mirror = o.id; toast('거울 표시: ' + nm(o.id)); } } : null,
      o.t === 'value' && o.k === 'param' ? { label: '매개변수 편집…', run: () => paramDialog(o) } : null,
      o.t === 'value' && o.k === 'calc' ? { label: '계산 편집…', run: () => calcDialog(o) } : null,
      o.t === 'table' && o.k !== 'iter' ? { label: '행 추가', run: () => { snap(); addTableRow(o); refresh(); } } : null,
      o.t === 'table' && o.k !== 'iter' ? { label: '마지막 행 지우기', run: () => removeTableData(o, false) } : null,
      o.t === 'table' ? { label: 'CSV로 저장', run: () => saveFile('표.csv', tableCSV(o), 'text/csv') } : null,
      o.t === 'iter' ? { label: '반복 속성…', run: () => iterProps(o) } : null,
      sep, { label: '색', sub: () => Object.keys(PALETTE).map(k => ({ label: PAL_KO[k], swatch: col(k), run: () => setProp(x => x.color = k) })) },
      { label: '맨 앞으로', run: () => layer(true) }, { label: '맨 뒤로', run: () => layer(false) },
      sep, { label: '삭제', run: deleteSel },
    ].filter(Boolean);
  } else items = [{ label: '붙여넣기', run: paste, en: () => !!clip }, { label: '모두 선택', run: selectAll }, { label: '숨긴 객체 모두 보이기', run: showAllHidden }, sep, { label: '좌표계 정의', run: defineCoordCmd }, sep, { label: '새 페이지', run: () => addPage() }, { label: '새 매개변수…', run: () => paramDialog() }, { label: '계산…', run: () => calcDialog() }];
  closeContext(); const m = el('div', { class: 'menu top', id: 'ctx', role: 'menu' }); menuItems(items, m, 0); $('#app').append(m);
  m.style.left = Math.min(e.clientX, innerWidth - m.offsetWidth - 6) + 'px'; m.style.top = Math.min(e.clientY, innerHeight - m.offsetHeight - 6) + 'px';
}
function closeContext() { const m = $('#ctx'); if (m) m.remove(); }

/* ================= 도구상자 ================= */
const ICON = {
  'arrow:move': '<path d="M6 3l12 9-5.2 1.1L16 20l-2.6 1.2-3.2-6.9L6 18z" fill="currentColor"/>',
  'arrow:rotate': '<path d="M5 3l9 7-4 .9L12.4 16l-2 1-2.4-5.2L5 14z" fill="currentColor"/><path d="M14 20.5a6.5 6.5 0 006.2-8.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M21.6 14.6l-1.3-3.2-2.7 2.2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  'arrow:dilate': '<path d="M5 3l9 7-4 .9L12.4 16l-2 1-2.4-5.2L5 14z" fill="currentColor"/><path d="M15 15l6 6M21 16.5V21h-4.5" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  point: '<circle cx="12" cy="12" r="4.2" fill="currentColor"/>',
  compass: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="17.7" cy="6.3" r="2" fill="currentColor"/>',
  'straight:segment': '<path d="M5 19L19 5" stroke="currentColor" stroke-width="1.8"/><circle cx="5" cy="19" r="2.3" fill="currentColor"/><circle cx="19" cy="5" r="2.3" fill="currentColor"/>',
  'straight:ray': '<path d="M5 19L20 4" stroke="currentColor" stroke-width="1.8"/><circle cx="5" cy="19" r="2.3" fill="currentColor"/><path d="M20 4l-6 1.5M20 4l-1.5 6" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  'straight:line': '<path d="M4 20L20 4" stroke="currentColor" stroke-width="1.8"/><path d="M20 4l-5.5 1.3M20 4l-1.3 5.5M4 20l5.5-1.3M4 20l1.3-5.5" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  'polygon:fill': '<path d="M12 4l8 15H4z" fill="currentColor" opacity=".55"/>',
  'polygon:both': '<path d="M12 4l8 15H4z" fill="currentColor" fill-opacity=".35" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  'polygon:edges': '<path d="M12 4l8 15H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  text: '<path d="M6 20L11.2 5h1.6L18 20M8.2 14.5h7.6" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  marker: '<path d="M4 19h16M4 19L15 6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M11 19a7 7 0 00-2.3-5.2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  info: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 10.5V17M12 7v.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  custom: '<rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 13.5v6M13.5 16.5h6" stroke="currentColor" stroke-width="1.9"/>',
  hand: '<path d="M8 12V6.5a1.5 1.5 0 013 0V11m0-5.5V5a1.5 1.5 0 013 0v6m0-4.5a1.5 1.5 0 013 0V14c0 4-2.5 6.5-6 6.5-2.6 0-4-1.2-5.6-3.4L4.3 13.3a1.5 1.5 0 012.4-1.8L8 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
};
function svg(inner) { return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${inner}</svg>`; }
function buildToolbox() {
  const tb = $('#toolbox'); tb.innerHTML = '';
  for (const t of TOOLS) {
    const iconKey = t.vars ? t.id + ':' + toolState.v[t.id] : t.id;
    const b = el('button', { class: 'tool', 'data-tool': t.id, title: t.name, 'aria-label': t.name, 'aria-pressed': 'false' }); b.innerHTML = `<span class="tico">${svg(ICON[iconKey])}</span>` + (t.vars ? '<span class="tvar" aria-hidden="true"></span>' : '');
    let lp = null;
    b.addEventListener('pointerdown', () => { if (t.vars) lp = setTimeout(() => { lp = 'done'; showFlyout(t, b); }, 380); });
    b.addEventListener('pointerup', () => { if (t.id === 'custom') { if (ctool && toolState.id !== 'custom') setTool('custom'); customToolMenu(b); return; } if (lp === 'done') { lp = null; return; } clearTimeout(lp); lp = null; if (t.vars && toolState.id === t.id) showFlyout(t, b); else setTool(t.id); });
    b.addEventListener('contextmenu', e => { e.preventDefault(); if (t.vars) showFlyout(t, b); });
    tb.append(b);
    if (t.id === 'arrow' || t.id === 'polygon' || t.id === 'custom') tb.append(el('div', { class: 'tsep' }));
  }
}
function showFlyout(t, b) {
  closeFlyout(); const r = b.getBoundingClientRect();
  const f = el('div', { class: 'flyout', role: 'menu' }, t.vars.map(([v, l]) => { const x = el('button', { class: 'fo' + (toolState.v[t.id] === v && toolState.id === t.id ? ' on' : ''), role: 'menuitem', onclick: () => { setTool(t.id, v); closeFlyout(); } }); x.innerHTML = svg(ICON[t.id + ':' + v]) + `<span>${l}</span>`; return x; }));
  $('#app').append(f); f.style.left = (r.right + 6) + 'px'; f.style.top = Math.min(r.top, innerHeight - f.offsetHeight - 8) + 'px';
}
function closeFlyout() { document.querySelectorAll('.flyout').forEach(f => f.remove()); }

/* ---- 그래프 명령 ---- */
function defineCoordCmd() {
  const s = S(); snap();
  if (!s.n) { const had = !!doc.coordId; ensureCoord(); obj(doc.coordId).hidden = false; refresh(); if (had) toast('좌표계가 이미 있습니다. 점을 선택하고 실행하면 그 점을 원점으로 하는 새 좌표계를 만듭니다.'); return; }
  let O, U;
  if (s.n === 1 && s.pts.length === 1) O = s.pts[0].id;
  else if (s.n === 2 && s.pts.length === 1 && (s.segs.length === 1 || s.vals.length === 1)) { O = s.pts[0].id; const src = (s.segs[0] || s.vals[0]).id; U = add({ t: 'point', k: 'unitlen', p: [O, src], color: 'ink', ps: 1 }).id; giveLabel(obj(U), false); }
  else if (s.n === 1 && s.circ.length === 1 && obj(s.circ[0].p[0]).t === 'point') { O = s.circ[0].p[0]; U = add({ t: 'point', k: 'unitlen', p: [O, s.circ[0].id], color: 'ink', ps: 1 }).id; giveLabel(obj(U), false); }
  else { undoStack.pop(); return toast('점 하나, 점과 선분(또는 거리값), 원 하나 중 하나를 선택하세요'); }
  if (!U) { U = add({ t: 'point', k: 'unit', p: [O], d: { u: 1 }, color: 'ink', ps: 1 }).id; giveLabel(obj(U), false); }
  const co = add({ t: 'coord', k: 'c', p: [O, U], d: { grid: true, form: 'square' } }); doc.coordId = co.id; setSel([co.id]); toast('새 좌표계를 만들고 표시했습니다');
}
function setGridForm(v) {
  snap(); const c = obj(doc.coordId); c.d.form = v;
  if (v === 'rect' && c.p[2] == null) { const Y = add({ t: 'point', k: 'unit', p: [c.p[0]], d: { u: G[c.id] ? G[c.id].ux : 1, axis: 'y' }, color: 'ink', ps: 1 }); giveLabel(Y, false); c.p.push(Y.id); moveToEnd(c.id); }
  if (v !== 'rect' && c.p[2] != null) { const y = c.p[2]; c.p = c.p.slice(0, 2); if (!doc.objs.some(o => o !== c && o.p.includes(y))) deleteObjs([y]); }
  refresh();
}
function plotValueOnAxis() {
  const vals = S().vals;
  openDlg('축 위에 값 그리기', el('div', { class: 'stack' }, radio('pva', [['x', '가로축 (x축)'], ['y', '세로축 (y축)']], 'x')), [{ label: '취소' }, { label: '그리기', primary: true, run: () => { const ax = radioVal('pva'); snap(); setSel(vals.map(v => ax === 'x' ? mkPlot({ v: v.id }, 0) : mkPlot(0, { v: v.id }))); } }]);
}
function paramPlotDlg() {
  const [fx, fy] = S().vals;
  const body = el('div', { class: 'stack' }, el('p', { class: 'note' }, '(x, y) = (' + disp(fx.label) + '(t), ' + disp(fy.label) + '(t))'), el('div', { class: 'row2' }, field('t 최솟값', num('pp-a', 0)), field('t 최댓값', num('pp-b', 6.283185))));
  openDlg('매개곡선 그리기', body, [{ label: '취소' }, { label: '그리기', primary: true, run: () => { const a = getNum('pp-a'), b = getNum('pp-b'); if (!(b > a)) { toast('최댓값이 최솟값보다 커야 합니다'); return false; } snap(); setSel([mkParamPlot(fx.id, fy.id, { tmin: a, tmax: b })]); } }]);
}
