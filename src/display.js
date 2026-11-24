'use strict';
/* ================= 매개변수 색 ================= */
function hex2(n) { return Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0'); }
function hslHex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return '#' + hex2(f(0) * 255) + hex2(f(8) * 255) + hex2(f(4) * 255); }
function pcT(v, pc) { let t = (v - pc.min) / ((pc.max - pc.min) || 1); if (pc.mode === 'once') return clamp(t, 0, 1); if (pc.mode === 'bounce') { t = mod(t, 2); return t > 1 ? 2 - t : t; } return mod(t, 1); }
function paramColor(o) {
  const pc = o.pc; const vals = pc.v.map(id => { const g = G[id]; return g && isFinite(g.v) ? g.v : NaN; }); if (vals.some(v => !isFinite(v))) return null;
  if (vals.length === 3) return '#' + vals.map(v => hex2(pcT(v, pc) * 255)).join('');
  const t = pcT(vals[0], pc); return pc.gray ? hslHex(0, 0, 88 - t * 80) : hslHex(270 * (1 - t), 78, 50);
}
function paramColorDlg() {
  const s = S(); const vals = s.vals.filter(v => !isFnObj(v)); const targets = s.os.filter(o => !vals.includes(o));
  if (!(vals.length === 1 || vals.length === 3) || !targets.length) return toast('값 1개 또는 3개와 색을 바꿀 객체를 함께 선택하세요');
  const body = el('div', { class: 'stack' }, el('p', { class: 'note' }, vals.length === 1 ? valueName(vals[0]) + ' 값으로 색을 정합니다 (보라 → 빨강).' : '세 값을 빨강·초록·파랑 성분으로 씁니다.'),
    el('div', { class: 'row2' }, field('정의역 시작', num('pc-a', 0)), field('정의역 끝', num('pc-b', 1))),
    field('색 범위', el('select', { id: 'pc-m' }, el('option', { value: 'cycle' }, '반복 (한 방향)'), el('option', { value: 'bounce' }, '반복 (왕복)'), el('option', { value: 'once' }, '반복 없음'))),
    vals.length === 1 ? el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'pc-g' }), '회색조') : null);
  openDlg('매개변수 색', body, [{ label: '취소' }, { label: '적용', primary: true, run: () => { snap(); targets.forEach(o => { o.pc = { v: vals.map(v => v.id), min: getNum('pc-a') || 0, max: isFinite(getNum('pc-b')) ? getNum('pc-b') : 1, mode: $('#pc-m').value, gray: !!($('#pc-g') && $('#pc-g').checked) }; }); refresh(); } }]);
}
function otherColorDlg(list) {
  list = list || S().os; if (!list.length) return toast('색을 바꿀 객체를 선택하세요');
  const cur = col(list[0].color); const inp = el('input', { type: 'color', id: 'oc-c', value: /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#2f6ad9', style: 'width:100%;height:44px;border:0;background:none' });
  openDlg('다른 색', el('div', { class: 'stack' }, inp, el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'oc-pc', checked: false }), '매개변수 색 해제')), [{ label: '취소' }, { label: '적용', primary: true, run: () => { snap(); list.forEach(o => { o.color = inp.value; if ($('#oc-pc').checked || o.pc) delete o.pc; }); refresh(); } }]);
}

/* ================= 수식 표기 (캡션) ================= */
// 지원: x^2, x^{n+1}, a_1, a_{ij}, √{…}, \frac{a}{b}, {#id} 핫 텍스트
function parseRich(s) {
  let i = 0; const out = [];
  const group = () => { if (s[i] === '{') { let d = 0, j = i; for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) break; } const inner = s.slice(i + 1, j); i = j + 1; return parseRichStr(inner); } const c = s[i++]; return c == null ? [] : [{ k: 't', s: c }]; };
  while (i < s.length) {
    const c = s[i];
    if (c === '^' || c === '_') { i++; out.push({ k: c === '^' ? 'sup' : 'sub', c: group() }); continue; }
    if (s.startsWith('\\overline', i)) { i += 9; out.push({ k: 'over', c: group() }); continue; }
    if (s.startsWith('\\arc', i)) { i += 4; out.push({ k: 'arcm', c: group() }); continue; }
    if (s.startsWith('\\frac', i)) { i += 5; const a = group(), b = group(); out.push({ k: 'frac', a, b }); continue; }
    if (c === '√' && s[i + 1] === '{') { i++; out.push({ k: 'sqrt', c: group() }); continue; }
    if (s.startsWith('{#', i)) { const j = s.indexOf('}', i); const id = +s.slice(i + 2, j); i = j + 1; out.push({ k: 'hot', id }); continue; }
    let j = i; while (j < s.length && !'^_{\\√'.includes(s[j])) j++; if (j === i) j = i + 1; out.push({ k: 't', s: s.slice(i, j) }); i = j;
  }
  return out;
}
function parseRichStr(s) { return parseRich(s); }
function hotText(id) { const o = obj(id); if (!o) return '?'; if (o.t === 'value') return valueText(o); if (o.t === 'table') return '[표]'; return o.label ? disp(o.label) : selName(o); }
function layoutRich(nodes, size, font) {
  // 반환 {w, asc, desc, draw(x, y)}
  const items = []; let w = 0, asc = size * 0.8, desc = size * 0.25;
  const F = sz => font.replace('{S}', sz + 'px');
  for (const n of nodes) {
    let L;
    if (n.k === 't' || n.k === 'hot') { const str = n.k === 'hot' ? hotText(n.id) : n.s; ctx.font = F(size); const ww = ctx.measureText(str).width; L = { w: ww, asc: size * 0.8, desc: size * 0.25, draw: (x, y) => { ctx.font = F(size); ctx.fillText(str, x, y); } }; }
    else if (n.k === 'sup' || n.k === 'sub') { const c = layoutRich(n.c, size * 0.7, font); const dy = n.k === 'sup' ? -size * 0.4 : size * 0.25; L = { w: c.w + 1, asc: Math.max(size * 0.8, c.asc - dy), desc: Math.max(size * 0.25, c.desc + dy), draw: (x, y) => c.draw(x, y + dy) }; }
    else if (n.k === 'over' || n.k === 'arcm') { const c = layoutRich(n.c, size, font); const arc = n.k === 'arcm'; L = { w: c.w, asc: c.asc + 4, desc: c.desc, draw: (x, y) => { c.draw(x, y); const top = y - c.asc - 2; if (arc) { ctx.save(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(x + c.w / 2, top + 2, c.w / 2, 3.5, 0, Math.PI, TAU); ctx.stroke(); ctx.restore(); } else ctx.fillRect(x, top, c.w, 1.1); } }; }
    else if (n.k === 'frac') { const a = layoutRich(n.a, size * 0.85, font), b = layoutRich(n.b, size * 0.85, font); const fw = Math.max(a.w, b.w) + 4, mid = size * 0.3; L = { w: fw + 2, asc: mid + a.asc + a.desc + 2, desc: Math.max(0, b.asc + b.desc + 2 - mid), draw: (x, y) => { a.draw(x + 1 + (fw - a.w) / 2, y - mid - 2 - a.desc); b.draw(x + 1 + (fw - b.w) / 2, y - mid + 2 + b.asc); ctx.fillRect(x + 1, y - mid - 0.6, fw, 1.2); } }; }
    else if (n.k === 'sqrt') { const c = layoutRich(n.c, size, font); const rw = size * 0.55; L = { w: c.w + rw + 3, asc: c.asc + 3, desc: c.desc, draw: (x, y) => { const top = y - c.asc - 2; ctx.save(); ctx.lineWidth = Math.max(1, size / 14); ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(x, y - size * 0.3); ctx.lineTo(x + rw * 0.35, y - size * 0.4); ctx.lineTo(x + rw * 0.6, y + c.desc * 0.6); ctx.lineTo(x + rw, top); ctx.lineTo(x + rw + c.w + 2, top); ctx.stroke(); ctx.restore(); c.draw(x + rw + 1, y); } }; }
    if (!L) continue; const x0 = w; items.push([x0, L]); w += L.w; asc = Math.max(asc, L.asc); desc = Math.max(desc, L.desc);
  }
  return { w, asc, desc, draw: (x, y) => { for (const [dx, L] of items) L.draw(x + dx, y); } };
}
function textFont(o) {
  const fam = { sans: '"IBM Plex Sans KR", system-ui, sans-serif', serif: '"STIX Two Text", "Noto Serif KR", "Batang", serif', mono: '"IBM Plex Mono", ui-monospace, monospace' }[o.d.font || 'sans'];
  return `${o.d.italic ? 'italic ' : ''}${o.d.bold ? 600 : 400} {S} ${fam}`;
}
function drawRichText(o, selected, hover) {
  const size = o.d.size || 15, font = textFont(o), lines = o.d.wrap ? wrapText(o.d.text || '', o.d.wrap, size, font) : (o.d.text || '').split('\n'), pad = 4;
  ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const Ls = lines.map(l => layoutRich(parseRich(l), size, font));
  const w = Math.max(10, o.d.wrap || 0, ...Ls.map(L => L.w)) + pad * 2; let h = pad * 2; const ys = [];
  for (const L of Ls) { h += L.asc; ys.push(h); h += L.desc + size * 0.25; }
  textPos(o); const x = o.d.sx, y = o.d.sy; o._bb = { x, y, w, h };
  if (o.hidden) ctx.globalAlpha = 0.35;
  ctx.globalAlpha *= 0.82; ctx.fillStyle = THEME.paper; ctx.fillRect(x, y, w, h); ctx.globalAlpha = o.hidden ? 0.35 : 1;
  if (selected || hover) { ctx.strokeStyle = selected ? THEME.sel : THEME.hover; ctx.lineWidth = selected ? 2 : 1; ctx.setLineDash([3, 3]); ctx.strokeRect(x - 2, y - 2, w + 4, h + 4); ctx.setLineDash([]); }
  ctx.fillStyle = colOf(o);
  Ls.forEach((L, i) => { const ax = o.d.align === 'center' ? (w - pad * 2 - L.w) / 2 : o.d.align === 'right' ? (w - pad * 2 - L.w) : 0; L.draw(x + pad + ax, y + ys[i]); if (o.d.underline) ctx.fillRect(x + pad, y + ys[i] + 2, L.w, 1); });
  ctx.restore();
}
function textToEdit(s) { return (s || '').replace(/\{#(\d+)\}/g, (_, id) => { const o = obj(+id); return o ? '{' + (o.label || '?') + '}' : '{?}'; }); }
function textFromEdit(s) { return s.replace(/\{([^{}#]+)\}/g, (m, name) => { const o = doc.objs.find(x => x.label === name.trim() && (x.t === 'value' || x.t === 'point' || isPath(x))); return o ? '{#' + o.id + '}' : m; }); }

/* ================= 텍스트 팔레트 ================= */
let paletteOn = false;
function toggleTextPalette(force) {
  paletteOn = force ?? !paletteOn; let pal = $('#txtpal');
  if (!paletteOn) { if (pal) pal.remove(); return; }
  if (pal) return;
  const targets = () => S().os.filter(o => o.t === 'text' || o.t === 'value' || o.t === 'button');
  const apply = f => { const all = S().os; if (!all.length) return toast('글상자·값·레이블이 있는 객체를 선택하세요'); snap(); all.forEach(o => { if (o.t === 'text' || o.t === 'value' || o.t === 'button' || o.t === 'table') f(o); else { o.lf = o.lf || {}; const proxy = { d: o.lf, color: o.color }; f(proxy); o.lf = proxy.d; } }); refresh(); };
  const ins = s => { const a = document.activeElement; if (a && a.classList && a.classList.contains('inline-edit')) { insertAt(a, s); return; } toast('글상자를 편집하는 중에 누르면 커서 위치에 들어갑니다'); };
  const sym = ['\\overline{AB}', '\\arc{AB}', 'π', 'θ', '°', '±', '×', '÷', '≤', '≥', '≠', '≈', '∠', '△', '⊥', '∥', '≅', '∽', '∞', '√{ }', 'x^{2}', 'a_{n}', '\\frac{a}{b}'];
  pal = el('div', { id: 'txtpal', role: 'toolbar', 'aria-label': '텍스트 팔레트' },
    el('select', { 'aria-label': '글꼴', onchange: e => apply(o => o.d.font = e.target.value) }, el('option', { value: 'sans' }, '고딕'), el('option', { value: 'serif' }, '명조·수식'), el('option', { value: 'mono' }, '고정폭')),
    el('select', { 'aria-label': '크기', onchange: e => apply(o => o.d.size = +e.target.value) }, [11, 13, 15, 18, 22, 28, 36, 48].map(n => el('option', { value: n, selected: n === 15 }, n + 'px'))),
    el('button', { class: 'tp-b', title: '굵게', onclick: () => apply(o => o.d.bold = !o.d.bold) }, el('b', {}, 'B')),
    el('button', { class: 'tp-b', title: '기울임', onclick: () => apply(o => o.d.italic = !o.d.italic) }, el('i', {}, 'I')),
    el('button', { class: 'tp-b', title: '밑줄', onclick: () => apply(o => o.d.underline = !o.d.underline) }, el('u', {}, 'U')),
    el('span', { class: 'tp-sep' }),
    ...Object.keys(PALETTE).map(k => el('button', { class: 'sw sm', title: PAL_KO[k], 'aria-label': PAL_KO[k], style: `--c:${col(k)}`, onclick: () => apply(o => { o.color = k; delete o.pc; }) })),
    el('span', { class: 'tp-sep' }),
    el('button', { class: 'tp-b', title: '왼쪽 정렬', onclick: () => apply(o => o.d.align = 'left') }, '⫷'), el('button', { class: 'tp-b', title: '가운데 정렬', onclick: () => apply(o => o.d.align = 'center') }, '≡'), el('button', { class: 'tp-b', title: '오른쪽 정렬', onclick: () => apply(o => o.d.align = 'right') }, '⫸'),
    el('span', { class: 'tp-sep' }),
    ...sym.map(sy => el('button', { class: 'tp-s', title: '편집 중인 글상자에 넣기', onmousedown: e => e.preventDefault(), onclick: () => ins(sy.replace('{ }', '{}')) }, sy.replace('\\overline{AB}', 'AB̄').replace('\\arc{AB}', '⌒AB').replace('\\frac{a}{b}', 'a/b').replace('x^{2}', 'x²').replace('a_{n}', 'aₙ').replace('√{ }', '√'))),
    el('button', { class: 'tp-x', 'aria-label': '팔레트 닫기', onclick: () => toggleTextPalette(false) }, '×'));
  $('#stage').append(pal);
}

/* ================= 버튼 확장 ================= */
let audioCtx = null; const sounds = new Map();
function soundToggle(o) {
  if (sounds.has(o.id)) { const s = sounds.get(o.id); s.osc.stop(); sounds.delete(o.id); o._running = false; requestDraw(); return; }
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return toast('이 브라우저에서는 소리를 낼 수 없습니다'); }
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(); gain.gain.value = 0.12; osc.type = 'sine'; osc.connect(gain).connect(audioCtx.destination); osc.start();
  sounds.set(o.id, { osc, gain }); o._running = true;
  const tick = () => { const s = sounds.get(o.id); if (!s) return; const g = G[o.p[0]]; const v = g && isFinite(g.v) ? g.v : NaN; if (isFinite(v)) { s.gain.gain.value = 0.12; s.osc.frequency.value = clamp(440 * Math.pow(2, v / 12), 30, 4000); } else s.gain.gain.value = 0; requestAnimationFrame(tick); }; tick(); requestDraw();
}
function scrollBy(dx, dy) { const ox = view.ox, oy = view.oy, t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - k, 3); view.ox = ox + dx * e; view.oy = oy + dy * e; dirty = true; draw(); if (k < 1) requestAnimationFrame(f); else scheduleSave(); }; requestAnimationFrame(f); }
let presenting = null;
async function runPresentation(o) {
  if (presenting === o.id) { presenting = null; o._running = false; stopAnim(); requestDraw(); return; }
  const btns = o.p.map(obj).filter(b => b && b.t === 'button');
  presenting = o.id; o._running = true; requestDraw();
  if (o.d.seq !== 'seq') { btns.forEach(b => runButton(b)); presenting = null; o._running = false; requestDraw(); return; }
  for (const b of btns) {
    if (presenting !== o.id) break; runButton(b); const t0 = performance.now();
    await new Promise(res => { const chk = () => { if (presenting !== o.id) return res(); if (performance.now() - t0 >= (o.d.pause ?? 1) * 1000 && !moves.size) return res(); requestAnimationFrame(chk); }; chk(); });
  }
  presenting = null; o._running = false; requestDraw();
}
function makeButton2(act) {
  const s = S(); const pos = nextScreenPos();
  if (act === 'present') { const bs = s.os.filter(o => o.t === 'button'); if (!bs.length) return toast('묶을 동작 버튼들을 선택하세요'); snap(); setSel([add({ t: 'button', k: 'b', p: bs.map(b => b.id), d: { act, sx: pos.sx, sy: pos.sy, text: '발표', seq: 'seq', pause: 1 } }).id]); }
  else if (act === 'sound') { const v = s.vals[0]; if (!v) return toast('소리로 바꿀 값을 하나 선택하세요'); snap(); setSel([add({ t: 'button', k: 'b', p: [v.id], d: { act, sx: pos.sx, sy: pos.sy, text: '소리: ' + valueName(v) } }).id]); }
  else if (act === 'scroll') { if (s.pts.length !== 2) return toast('화면을 옮길 방향을 나타내는 두 점을 선택하세요'); snap(); setSel([add({ t: 'button', k: 'b', p: s.pts.map(o => o.id), d: { act, sx: pos.sx, sy: pos.sy, text: '화면 옮기기 ' + nm(s.pts[0].id) + '→' + nm(s.pts[1].id) } }).id]); }
  else if (act === 'url') { snap(); setSel([add({ t: 'button', k: 'b', p: [], d: { act, sx: pos.sx, sy: pos.sy, text: '웹 페이지 열기', url: 'https://' } }).id]); toast('속성에서 주소를 입력하세요'); }
}
function runButtonExt(o) {
  if (o.d.act === 'present') { runPresentation(o); return true; }
  if (o.d.act === 'sound') { soundToggle(o); return true; }
  if (o.d.act === 'scroll') { const a = G[o.p[0]], b = G[o.p[1]]; if (a && b) { const A = toS(a), B = toS(b); scrollBy(B.x - A.x, B.y - A.y); } return true; }
  if (o.d.act === 'url') { if (!/^https?:\/\//.test(o.d.url || '') || o.d.url === 'https://') { toast('버튼 속성에 웹 주소를 입력하세요'); return true; } const a = el('a', { href: o.d.url, target: '_blank', rel: 'noopener' }); document.body.append(a); a.click(); a.remove(); return true; }
  return false;
}

/* ================= 속성 대화상자 추가 항목 ================= */
function propsExtra(list, one, body) {
  const fns = [];
  if (one && one.t === 'value' && !['param', 'func', 'deriv', 'data', 'fdef'].includes(one.k)) {
    body.append(el('div', { class: 'row2' }, field('표시 이름 (비우면 자동)', el('input', { id: 'px-nm', value: one.d.name || '' })), field('소수점 자리', el('select', { id: 'px-pr' }, el('option', { value: '' }, '환경설정 따름'), [0, 1, 2, 3, 4, 5, 6].map(n => el('option', { value: n, selected: one.prec === n }, n + '자리'))))));
    fns.push(() => { const v = $('#px-nm').value.trim(); if (v) one.d.name = v; else delete one.d.name; const p = $('#px-pr').value; if (p === '') delete one.prec; else one.prec = +p; });
  }
  if (one && one.t === 'locus') {
    body.append(el('div', { class: 'row2' }, field('표본 수', num('px-n', one.d.n || (obj(one.p[one.p.length === 3 ? 2 : 1]) && obj(one.p[one.p.length === 3 ? 2 : 1]).t === 'point' ? 300 : 70), 1)), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'px-dc', checked: !!one.d.disc }), '점으로만 (불연속)')));
    const dm = one.d.dom || [0, 1]; body.append(el('div', { class: 'row2' }, field('구동 범위 시작 (0~1)', el('input', { id: 'px-d0', type: 'number', step: 0.05, min: 0, max: 1, value: dm[0] })), field('구동 범위 끝 (0~1)', el('input', { id: 'px-d1', type: 'number', step: 0.05, min: 0, max: 1, value: dm[1] }))), el('p', { class: 'note' }, '구동하는 점이 경로의 어느 부분을 지나는 동안만 자취를 그릴지 정합니다 (0 = 처음, 1 = 끝).'));
    fns.push(() => { one.d.n = clamp(Math.round(getNum('px-n') || 100), 3, 5000); one.d.disc = $('#px-dc').checked; const a = clamp(+$('#px-d0').value || 0, 0, 1), b = clamp($('#px-d1').value === '' ? 1 : +$('#px-d1').value, 0, 1); if (a === 0 && b === 1) delete one.d.dom; else one.d.dom = [Math.min(a, b), Math.max(a, b)]; });
  }
  if (one && one.t === 'amark') { body.append(el('div', { class: 'row2' }, field('각 표시 크기 (px)', num('px-ar', one.d.r || 20, 1)), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'px-dir', checked: !!one.d.dir }), '방향 화살표 (방향각 표시)'))); fns.push(() => { one.d.r = clamp(getNum('px-ar') || 20, 8, 80); one.d.dir = $('#px-dir').checked; }); }
  if (one && one.label && !isScreenObj(one) && one.t !== 'coord') {
    const lf = one.lf || {}; const cur = lf.italic == null ? '' : ((lf.italic ? 'i' : '') + (lf.bold ? 'b' : '') || 'n');
    body.append(el('div', { class: 'row3' }, field('레이블 크기', el('input', { id: 'px-lsz', type: 'number', value: lf.size || '', placeholder: String(doc.prefs.labelSize || 16) })), field('레이블 글꼴', el('select', { id: 'px-lfn' }, [['', '환경설정 따름'], ['serif', '명조·수식'], ['sans', '고딕'], ['mono', '고정폭']].map(([v, l]) => el('option', { value: v, selected: (lf.font || '') === v }, l)))), field('레이블 모양', el('select', { id: 'px-lst' }, [['', '환경설정 따름'], ['ib', '기울임 굵게'], ['i', '기울임'], ['b', '굵게'], ['n', '보통']].map(([v, l]) => el('option', { value: v, selected: v === cur }, l))))));
    fns.push(() => { const n = {}; const sz = +$('#px-lsz').value; if (sz) n.size = clamp(sz, 7, 72); if ($('#px-lfn').value) n.font = $('#px-lfn').value; const st = $('#px-lst').value; if (st) { n.italic = st.includes('i'); n.bold = st.includes('b'); } if (Object.keys(n).length) one.lf = n; else delete one.lf; });
  }
  if (one && one.t === 'coord') {
    body.append(el('div', { class: 'row2' }, field('x축 이름', el('input', { id: 'px-xl', value: one.d.xlabel || '', placeholder: '예: x' })), field('y축 이름', el('input', { id: 'px-yl', value: one.d.ylabel || '', placeholder: '예: y' }))),
      el('div', { class: 'row3' }, el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'px-ax', checked: one.d.axes !== false }), '축 보이기'), el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'px-tk', checked: one.d.ticks !== false }), '눈금 숫자'), el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'px-tg', checked: !!one.d.trig }), '삼각 축')));
    fns.push(() => { one.d.xlabel = $('#px-xl').value.trim(); one.d.ylabel = $('#px-yl').value.trim(); one.d.axes = $('#px-ax').checked; one.d.ticks = $('#px-tk').checked; one.d.trig = $('#px-tg').checked; });
  }
  if (one && one.t === 'value' && one.k === 'data') { body.append(el('p', { class: 'note' }, '데이터 점 ' + one.d.xs.length + '개, 정의역 [' + fmt(one.d.xs[0]) + ', ' + fmt(one.d.xs[one.d.xs.length - 1]) + ']'), el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'px-sm', checked: !!one.d.smooth }), '부드럽게 잇기 (끄면 꺾은선)')); fns.push(() => { one.d.smooth = $('#px-sm').checked; }); }
  if (one && one.t === 'picture') { body.append(field('불투명도', el('input', { id: 'px-pa', type: 'range', min: 0.05, max: 1, step: 0.05, value: one.alpha ?? 1 }))); fns.push(() => { one.alpha = +$('#px-pa').value; }); if (one.k === 'cxf') { body.append(field('표본 격자 (칸 수)', num('px-pn', one.d.n || 12, 1))); fns.push(() => { one.d.n = clamp(Math.round(getNum('px-pn') || 12), 2, 60); }); } }
  if (one && one.t === 'fplot') {
    body.append(el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'px-fd', checked: !!one.d.disc }), '점으로만 (불연속)')); fns.push(() => { one.d.disc = $('#px-fd').checked; });
    const isP = one.k === 'param';
    body.append(el('div', { class: 'row3' }, field(isP ? 't 최솟값' : '정의역 최솟값', el('input', { id: 'px-a', type: 'number', value: isP ? one.d.tmin : (one.d.xmin ?? '') })), field(isP ? 't 최댓값' : '정의역 최댓값', el('input', { id: 'px-b', type: 'number', value: isP ? one.d.tmax : (one.d.xmax ?? '') })), field('표본 수', num('px-n', one.d.n || 400, 1))));
    fns.push(() => { const a = $('#px-a').value, b = $('#px-b').value; if (isP) { one.d.tmin = +a || 0; one.d.tmax = b === '' ? 1 : +b; } else { one.d.xmin = a === '' ? null : +a; one.d.xmax = b === '' ? null : +b; } one.d.n = clamp(Math.round(getNum('px-n') || 400), 10, 5000); });
  }
  if (one && one.t === 'button') {
    const d = one.d;
    if (d.act === 'anim') { body.append(el('div', { class: 'row3' }, field('속도', el('select', { id: 'px-sp' }, [[0.25, '아주 느리게'], [0.5, '느리게'], [1, '보통'], [2, '빠르게'], [4, '아주 빠르게']].map(([v, l]) => el('option', { value: v, selected: (d.speed || 1) === v }, l)))), field('방향', el('select', { id: 'px-dir' }, el('option', { value: 1, selected: (d.dir || 1) === 1 }, '정방향'), el('option', { value: -1, selected: d.dir === -1 }, '역방향'))), el('label', { class: 'chk', style: 'align-self:end' }, el('input', { type: 'checkbox', id: 'px-once', checked: !!d.once }), '한 번만'))); fns.push(() => { d.speed = +$('#px-sp').value; d.dir = +$('#px-dir').value; d.once = $('#px-once').checked; }); }
    if (d.act === 'move') { body.append(field('이동 속도', el('select', { id: 'px-ms' }, [[0, '즉시'], [2, '느리게'], [6, '보통'], [15, '빠르게']].map(([v, l]) => el('option', { value: v, selected: (d.speed ?? 6) === v }, l))))); fns.push(() => { d.speed = +$('#px-ms').value; }); }
    if (d.act === 'present') { body.append(el('div', { class: 'row2' }, field('실행 방식', el('select', { id: 'px-sq' }, el('option', { value: 'seq', selected: d.seq === 'seq' }, '차례로'), el('option', { value: 'sim', selected: d.seq !== 'seq' }, '동시에'))), field('동작 사이 쉬는 시간 (초)', num('px-pa', d.pause ?? 1)))); fns.push(() => { d.seq = $('#px-sq').value; d.pause = Math.max(0, getNum('px-pa') || 0); }); }
    if (d.act === 'url') { body.append(field('웹 주소', el('input', { id: 'px-url', value: d.url || 'https://' }))); fns.push(() => { d.url = $('#px-url').value.trim(); }); }
  }
  if (one && one.t === 'text') {
    body.append(el('div', { class: 'sub' }, '값 넣기 (핫 텍스트) — {이름} 형태로 들어가 실시간으로 바뀝니다'), valueChips(v => insertAt($('#pr-tx'), '{' + v.label + '}'), null),
      el('p', { class: 'note' }, '수식 표기: x^{2}, a_{n}, √{x+1}, \\frac{a}{b}'));
    const ta = $('#pr-tx', body); if (ta) ta.value = textToEdit(one.d.text);
    fns.push(() => { if ($('#pr-tx')) one.d.text = textFromEdit($('#pr-tx').value); });
  }
  if (list.some(o => o.pc)) { body.append(el('label', { class: 'chk' }, el('input', { type: 'checkbox', id: 'px-nopc' }), '매개변수 색 해제')); fns.push(() => { if ($('#px-nopc').checked) list.forEach(o => delete o.pc); }); }
  return () => fns.forEach(f => f());
}

/* ================= 운동 조절기 ================= */
let animPaused = false;
function motionTargets() { const ids = [...anims.keys()]; const s = sel.filter(id => anims.has(id)); return s.length ? s : ids; }
function buildMotion() {
  const m = $('#motion'); m.innerHTML = '';
  const tsel = el('select', { id: 'motion-target', 'aria-label': '대상', onchange: e => { if (e.target.value !== 'all') setSel([+e.target.value]); else setSel([]); } }, el('option', { value: 'all' }, '모든 움직이는 객체'), ...[...anims.keys()].map(id => el('option', { value: id, selected: sel.length === 1 && sel[0] === id }, selName(obj(id)))));
  m.append(tsel,
    el('button', { title: animPaused ? '계속' : '일시 정지', onclick: () => { animPaused = !animPaused; if (!animPaused) kick(); buildMotion(); } }, animPaused ? '▶ 계속' : '❚❚ 일시 정지'),
    el('button', { title: '방향 바꾸기', onclick: () => { motionTargets().forEach(id => { const a = anims.get(id); if (a) a.dir *= -1; }); } }, '⇄ 반대로'),
    el('button', { onclick: () => stopAnim(sel.some(id => anims.has(id)) ? motionTargets() : undefined) }, '■ 멈춤'),
    el('button', { 'aria-label': '느리게', onclick: () => speedMotion(1 / 1.5) }, '−'), el('span', { id: 'motion-speed' }, '×' + (+speedK.toFixed(2))), el('button', { 'aria-label': '빠르게', onclick: () => speedMotion(1.5) }, '+'));
}
function speedMotion(k) { const t = sel.filter(id => anims.has(id)); if (t.length) t.forEach(id => { const a = anims.get(id); a.speed = clamp((a.speed || 1) * k, 0.05, 20); }); else speedK = clamp(speedK * k, 0.05, 20); buildMotion(); }

/* ================= 내보내기: 웹 페이지 ================= */
function exportWebPage() {
  const embed = serializeBook().replace(/</g, '\\u003c');
  const OPEN = '<script type="application/json" id="jakdo-' + 'embed">', CLOSE = '<' + '/script>', MAIN = '<script id="jakdo-' + 'main">';
  let html = BOOT_HTML; let i = html.indexOf(MAIN); if (i < 0) return toast('웹 페이지를 만들 수 없습니다');
  const j = html.indexOf(OPEN); if (j >= 0 && j < i) { const k = html.indexOf(CLOSE, j); html = html.slice(0, j) + html.slice(k + CLOSE.length); i = html.indexOf(MAIN); }
  html = html.slice(0, i) + OPEN + embed + CLOSE + html.slice(i);
  if (!/^<!doctype/i.test(html)) html = '<!doctype html>\n' + html;
  saveFile('작도-' + stamp() + '.html', html, 'text/html');
}

/* ================= 매뉴얼 대응표 ================= */
const MANUAL_MAP = [
  ['도구', '화살표(이동·회전·확대), 점, 컴퍼스, 직선자(선분·반직선·직선), 다각형(3종), 텍스트, 표시(각·눈금·손그림), 정보, 사용자 도구'],
  ['파일', '새 문서, 열기(.json · GSP 4/5 문서 .gsp · JavaSketchpad .htm), 저장(.json), 문서 옵션(페이지 추가·복제·이름·삭제·이동), 그림 가져오기, 그림·웹 페이지로 내보내기, 보관함, 예제'],
  ['편집', '실행 취소/다시 실행, 잘라내기/복사/붙여넣기, 삭제, 동작 버튼(숨기기/보이기·애니메이션·이동·발표·소리·링크·스크롤·웹 주소), 모두 선택, 부모·자식 선택, 그림 자르기, 분리/병합, 정의 편집, 속성, 환경설정'],
  ['표시', '점·선 스타일, 색(팔레트·다른 색·매개변수 색), 텍스트 팔레트, 객체·레이블 숨기기, 숨긴 객체 보이기, 자취·자취 지우기, 애니메이션·속도·멈춤, 운동 조절기, 도구상자 보이기/숨기기'],
  ['작도', '대상 위의 점, 중점, 교점(직선·원·호·그래프·자취·다각형-반직선), 선분·반직선·직선, 평행선, 수선, 각의 이등분선, 원 2종, 호 2종, 내부 4종, 자취(2·3객체)'],
  ['변환', '중심점·거울·각·비율·벡터·거리 표시, 평행이동(극·직교·벡터), 회전, 확대·축소, 대칭이동, 반복(여러 사상·깊이 매개변수·종점), 사용자 변환 정의·편집·적용'],
  ['측정', '길이, 거리, 둘레, 원주, 각, 넓이, 호의 중심각·길이, 반지름, 비(선분 2·세 점), 경로 위 점의 값, 좌표·x·y(극 r·θ), 좌표 거리, 기울기, 방정식'],
  ['사용자 도구', '도구 만들기·이름·설명, 스크립트 보기(단계별 적용·나머지 모두·적용 취소), 도구 폴더, .gsp 문서 안의 사용자 도구 가져오기'],
  ['수', '새 매개변수, 계산, 표 만들기·데이터 추가(자동)·지우기, 새 함수, 도함수, 그림에서 함수 정의'],
  ['그래프', '좌표계 정의(점·단위 선분·원), 좌표계 표시(여러 좌표계), 격자(정사각·직사각·극, 선·점), 격자에 맞추기, 축 위에 값·(x, y)로 그리기, 점 그리기, 표 데이터 그리기, 함수 그래프(y=, x=, r=), 매개곡선'],
  ['객체 속성', '레이블, 색·불투명도, 표시 이름·자릿수, 자취·그래프 표본 수와 정의역, 반복 횟수·표시, 버튼 속도·방향, 앞/뒤로'],
  ['환경설정', '단위·각(방향 포함)·자릿수, 색·글자(기본 색·배경·색 메뉴 편집), 글자 스타일(레이블·측정값·글상자·표·눈금), 도구(기본 점·선·각 표시, 정보 풍선), 고급(내보내기 배율·투명 배경·SVG, 표본 수, 고해상도)'],
  ['웹에서 다르게 처리한 것', '인쇄·인쇄 미리보기 → GitHub 등 독립 실행 페이지에서 브라우저 인쇄 / 도구 폴더 → 이 브라우저의 도구 폴더 / JavaSketchpad → 웹 페이지 내보내기(불러오기도 가능) / 창 메뉴·LessonLink·명령줄 옵션은 웹 앱에 해당 없음'],
];
function manualMapDlg() { openDlg('매뉴얼 기능 대응표', el('div', { class: 'stack help' }, el('table', {}, el('tbody', {}, MANUAL_MAP.map(([k, v]) => el('tr', {}, el('th', { style: 'font-family:var(--f-ui)' }, k), el('td', {}, v)))))), [{ label: '닫기', primary: true }]); }
