'use strict';
/* ================= 여러 페이지(시트) ================= */
let book = { pages: [], cur: 0, nextPid: 1 };
const curPage = () => book.pages[book.cur];
function defaultView() { return { ox: W / 2, oy: H / 2, s: PXCM }; }
function normDoc(d) { const x = Object.assign(newDoc(), d || {}); x.prefs = Object.assign(newDoc().prefs, (d && d.prefs) || {}); if (!Array.isArray(x.objs)) x.objs = []; delete x.view; return x; }
function stashPage() { const pg = curPage(); if (!pg) return; pg.doc = doc; pg.view = { ...view }; pg._sel = sel.slice(); pg._undo = undoStack; pg._redo = redoStack; }
function pageName(base) { const names = new Set(book.pages.map(p => p.name)); if (!names.has(base)) return base; let i = 2; while (names.has(base + ' ' + i)) i++; return base + ' ' + i; }
function nextPageName() { let i = book.pages.length + 1; while (book.pages.some(p => p.name === '페이지 ' + i)) i++; return '페이지 ' + i; }

function showPage(i, opts = {}) {
  if (i < 0 || i >= book.pages.length) return;
  if (!opts.noStash) stashPage();
  stopAnim(); traces.clear(); cancelPending(); closeContext(); $('#infopop').hidden = true;
  if (calcInsertHook) dlgStack.slice().forEach(c => c(false));
  book.cur = i; const pg = curPage();
  doc = pg.doc; reindex(); Object.assign(view, pg.view && pg.view.s ? pg.view : defaultView());
  sel = (pg._sel || []).filter(id => byId.has(id));
  undoStack = pg._undo || (pg._undo = []); redoStack = pg._redo || (pg._redo = []);
  dirty = true; draw(); renderTabs(); refresh(); scheduleSave();
}
function addPage(name, d, v, at) {
  stashPage();
  const pg = { id: book.nextPid++, name: pageName(name || nextPageName()), doc: normDoc(d), view: v ? { ...v } : defaultView() };
  const idx = at == null ? book.pages.length : at;
  book.pages.splice(idx, 0, pg); if (idx <= book.cur && book.pages.length > 1 && at != null) book.cur++;
  showPage(idx, { noStash: true }); return pg;
}
function duplicatePage(i) {
  stashPage(); const src = book.pages[i];
  const d = JSON.parse(JSON.stringify(src.doc, (k, v) => k[0] === '_' ? undefined : v));
  addPage(pageName(src.name + ' 사본'), d, src.view, i + 1); toast('페이지를 복제했습니다');
}
function deletePage(i) {
  if (book.pages.length <= 1) return toast('페이지가 하나뿐이라 삭제할 수 없습니다');
  const pg = book.pages[i];
  openDlg('페이지 삭제', el('p', { class: 'note', style: 'font-size:14px' }, `‘${pg.name}’ 페이지와 그 안의 작도를 모두 지웁니다. 이 작업은 되돌릴 수 없습니다.`),
    [{ label: '취소' }, { label: '삭제', primary: true, run: () => {
      stashPage(); book.pages.splice(i, 1);
      const next = i < book.cur ? book.cur - 1 : i === book.cur ? Math.min(i, book.pages.length - 1) : book.cur;
      book.cur = -1; showPage(next, { noStash: true }); toast('‘' + pg.name + '’ 페이지를 삭제했습니다');
    } }]);
}
function movePage(i, j) {
  if (j < 0 || j >= book.pages.length || i === j) return;
  stashPage(); const cur = curPage(); const [pg] = book.pages.splice(i, 1); book.pages.splice(j, 0, pg);
  book.cur = book.pages.indexOf(cur); renderTabs(); scheduleSave();
}
function renamePage(i, tabEl) {
  const pg = book.pages[i]; const span = tabEl.querySelector('span');
  const inp = el('input', { class: 'ptab-edit', value: pg.name, 'aria-label': '페이지 이름' });
  span.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  const fin = ok => { if (done) return; done = true; const v = inp.value.trim(); if (ok && v && v !== pg.name) { pg.name = book.pages.some(p => p !== pg && p.name === v) ? pageName(v) : v; scheduleSave(); } renderTabs(); };
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') fin(true); if (e.key === 'Escape') fin(false); });
  inp.addEventListener('blur', () => fin(true));
  inp.addEventListener('pointerdown', e => e.stopPropagation());
}
function renamePageDlg(i) { const t = document.querySelectorAll('.ptab')[i]; if (t) renamePage(i, t); }
function popupMenu(items, x, y) {
  closeContext(); closeMenus(); const m = el('div', { class: 'menu top', id: 'ctx', role: 'menu' }); menuItems(items, m, 0); $('#app').append(m);
  m.style.left = clamp(x, 4, innerWidth - m.offsetWidth - 6) + 'px'; m.style.top = clamp(y - m.offsetHeight, 4, innerHeight - m.offsetHeight - 6) + 'px';
}
function pageMenu(i, e) {
  const t = e.currentTarget;
  popupMenu([
    { label: '이 페이지로 가기', run: () => showPage(i), en: () => i !== book.cur },
    { label: '이름 바꾸기', run: () => renamePageDlg(i) },
    { label: '복제', run: () => duplicatePage(i) },
    sep,
    { label: '왼쪽으로 옮기기', run: () => movePage(i, i - 1), en: () => i > 0 },
    { label: '오른쪽으로 옮기기', run: () => movePage(i, i + 1), en: () => i < book.pages.length - 1 },
    sep,
    { label: '삭제…', run: () => deletePage(i), en: () => book.pages.length > 1 },
  ], e.clientX, e.clientY);
}
let tabDrag = null;
function renderTabs() {
  const bar = $('#pages'); bar.innerHTML = '';
  book.pages.forEach((pg, i) => {
    const on = i === book.cur;
    const t = el('button', { class: 'ptab' + (on ? ' on' : ''), role: 'tab', 'aria-selected': on ? 'true' : 'false', draggable: 'true', title: pg.name + ' — 더블클릭: 이름 바꾸기, 오른쪽 클릭: 메뉴' }, el('span', {}, pg.name));
    t.addEventListener('click', () => { if (i !== book.cur) showPage(i); });
    t.addEventListener('dblclick', () => renamePage(i, t));
    t.addEventListener('contextmenu', e => { e.preventDefault(); pageMenu(i, e); });
    t.addEventListener('dragstart', e => { tabDrag = i; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (_) { } });
    t.addEventListener('dragover', e => { if (tabDrag == null) return; e.preventDefault(); const r = t.getBoundingClientRect(); t.classList.toggle('drop-l', e.clientX < r.left + r.width / 2); t.classList.toggle('drop-r', e.clientX >= r.left + r.width / 2); });
    t.addEventListener('dragleave', () => t.classList.remove('drop-l', 'drop-r'));
    t.addEventListener('drop', e => { e.preventDefault(); if (tabDrag == null) return; const r = t.getBoundingClientRect(); let j = e.clientX < r.left + r.width / 2 ? i : i + 1; if (tabDrag < j) j--; movePage(tabDrag, j); tabDrag = null; });
    t.addEventListener('dragend', () => { tabDrag = null; document.querySelectorAll('.ptab').forEach(x => x.classList.remove('drop-l', 'drop-r')); });
    bar.append(t);
  });
  const add = el('button', { class: 'padd', title: '새 페이지', 'aria-label': '새 페이지', onclick: () => addPage() });
  add.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  bar.append(add);
  const on = bar.querySelector('.ptab.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('#page-count').textContent = (book.cur + 1) + ' / ' + book.pages.length;
}

/* ---- 문서 저장 형식 ---- */
function serializeBook() {
  stashPage();
  return JSON.stringify({ app: 'jakdo', book: 1, cur: book.cur, pages: book.pages.map(p => ({ id: p.id, name: p.name, view: p.view, doc: p.doc })) }, (k, v) => k[0] === '_' ? undefined : v);
}
function parseBook(data) {
  const d = typeof data === 'string' ? JSON.parse(data) : data;
  if (d && Array.isArray(d.pages)) return { cur: d.cur || 0, pages: d.pages.map((p, i) => ({ name: p.name || '페이지 ' + (i + 1), doc: normDoc(p.doc), view: p.view })) };
  if (d && Array.isArray(d.objs)) return { cur: 0, pages: [{ name: d.title || '페이지 1', doc: normDoc(d), view: d.view }] };
  throw new Error('작도 파일 형식이 아닙니다');
}
function replaceBook(b) {
  book = { pages: [], cur: 0, nextPid: 1 };
  for (const p of b.pages) book.pages.push({ id: book.nextPid++, name: p.name, doc: p.doc, view: p.view && p.view.s ? p.view : defaultView() });
  if (!book.pages.length) book.pages.push({ id: book.nextPid++, name: '페이지 1', doc: newDoc(), view: defaultView() });
  showPage(clamp(b.cur || 0, 0, book.pages.length - 1), { noStash: true });
}
function appendBook(b) {
  stashPage(); const first = book.pages.length;
  for (const p of b.pages) book.pages.push({ id: book.nextPid++, name: pageName(p.name), doc: p.doc, view: p.view && p.view.s ? p.view : defaultView() });
  showPage(first, { noStash: true });
  return b.pages.length;
}
function newDocument() {
  openDlg('새 문서', el('p', { class: 'note', style: 'font-size:14px' }, `열려 있는 페이지 ${book.pages.length}개를 모두 닫고 빈 문서로 시작합니다. 필요하면 먼저 파일로 저장하거나 보관함에 보관하세요.`),
    [{ label: '취소' }, { label: '새 문서', primary: true, run: () => { replaceBook({ cur: 0, pages: [{ name: '페이지 1', doc: newDoc() }] }); toast('새 문서를 시작했습니다'); } }]);
}
function linkTargets() { return book.pages.filter((p, i) => i !== book.cur); }
function makeLinkButton(pid) {
  const pg = book.pages.find(p => p.id === pid); if (!pg) return; snap(); const pos = nextScreenPos();
  const b = add({ t: 'button', k: 'b', p: [], d: { act: 'link', pid, sx: pos.sx, sy: pos.sy, text: pg.name + '(으)로 이동' } }); setSel([b.id]);
}
function followLink(o) {
  const i = book.pages.findIndex(p => p.id === o.d.pid);
  if (i < 0) return toast('연결된 페이지가 없습니다 (삭제되었을 수 있습니다)');
  showPage(i);
}
