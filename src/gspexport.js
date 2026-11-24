const GSPX_T = { t902: "hAEAAIYDAAACAAQABAADAAMABAAAAAAAAAAAALsA7J20IOusuOyEnOydmCDsgqzsmqnsnpAg64+E6rWsIOykkSDsnbzrtoDqsIAgR1NQIOydmCDsg4jroZzsmrQg67KE7KCE7J2EIOyCrOyaqe2VtCDrp4zrk6TslrTsp4Qg6rKD7J207Ja07IScIOydveyWtOuTpOydvCDsiJgg7JeG7Iq164uI64ukLiAg7J20IOusuOyEnOulvCDsgqzrs7jsnLzroZzshJwg7Je06rKg7Iq164uI64ukLgCuAOydtCDrrLjshJzsnZgg7IKs7Jqp7J6QIOuPhOq1rCDspJEg7J2867aA6rCAIOyDiOuhnOyatCDrsoTsoITsnZggR1NQIOulvCDsgqzsmqntlbQg66eM65Ok7Ja07KGM7Iq164uI64ukLiAg7IKs7Jqp7J6QIOuPhOq1rOqwgCDsoJzrjIDroZwg7J6R64+Z7ZWY7KeAIOyViuydhCDsiJgg7J6I7Iq164uI64ukLgAA", head: "R1NQNBwAAACEAwAABQABAAAAAAAAAAAAAQAEAAAASgWSAgkAAgAAAPIBAACGAwAABQAFAAUAAwADAAQAAAAAAK4A7J20IOusuOyEnOyXkCDtj6ztlajrkJwg7KCV67O0IOykkSDsnbzrtoDqsIAgR1NQIOydmCDsg4jroZzsmrQg67KE7KCE7J2EIOyCrOyaqe2VtCDrp4zrk6TslrTsoLgg7J6I7Ja0IOyCrOyaqe2VoCDsiJgg7JeG7Iq164uI64ukLiAg66y47ISc66W8IOyCrOuzuOycvOuhnOyEnCDsl7TqsqDsirXri4jri6QuAACrAOydtCDrrLjshJzsl5Ag7Y+s7ZWo65CcIOygleuztCDspJEg7J2867aA6rCAIEdTUCDsnZgg7J207KCEIOuyhOyghOydhCDsgqzsmqntlbQg66eM65Ok7Ja07KC4IOyeiOyWtCDsgqzsmqntlaAg7IiYIOyXhuyKteuLiOuLpC4gIOusuOyEnOulvCDsgqzrs7jsnLzroZzshJwg7Je06rKg7Iq164uI64ukLgB/AOydtCDrrLjshJzsl5Ag7Y+s7ZWo65CcIOygleuztCDspJEg7J2867aA6rCAIEdTUCDsnZgg7J207KCEIOuyhOyghOydhCDsgqzsmqntlbQg66eM65Ok7Ja07KC4IOyeiOyWtCDsgqzsmqntlaAg7IiYIOyXhuyKteuLiOuLpC4AAAAAAO4DAAAAAAAA7wMAAAAAAACHAwAA", p902: "XgEAAIYDAAABAAQABAABAAEAAgAAAAAAAAAAAH0A7J20IOusuOyEnOuKlCBHU1Ag7J2YIOyDiOuhnOyatCDrsoTsoITsnYQg7IKs7Jqp7ZW07IScIOunjOuTpOyWtOynhCDqsoPsnoXri4jri6QuICDrrLjshJzrpbwg7J297Ja065Ok7J207KeAIOuqu+2WiOyKteuLiOuLpC4AxwDsnbQg66y47ISc64qUIEdTUCDsnZgg7IOI66Gc7Jq0IOuyhOyghOydhCDsgqzsmqntlbQg66eM65Ok7Ja07KeEIOqyg+yeheuLiOuLpC4gIOusuOyEnOydmCDsoJXrs7Qg7KSRIOydvOu2gOuKlCDsnb3slrTrk6TsnbTsp4Ag66q77ZWgIOyImCDsnojsirXri4jri6QuICDsnbQg66y47ISc66W8IOyCrOuzuOycvOuhnOyEnCDsl7TqsqDsirXri4jri6QuAA==", p1000: "JAAAAOgDAAAAAAAAAAAAADmcAAAAAAAAAQABAAAAAAAjAAAAAAAAAAAAAAA=", prest: "BgAAAGAJAAAAAAIAAAAGAAAAYQkAAAUAAAAAAAYAAABiCQAAAAAAAAAABgAAAGMJAAAAAAEAAAAGAAAAZAkAAAAAAQAAAAYAAABlCQAAAAABAAAABgAAAGYJAAAAAAEAAAAGAAAAZwkAAAAAAQAAAAYAAABoCQAAAAABAAAABgAAAGkJAAAAAAAAAAAGAAAAagkAAAAAAQAAAAYAAABrCQAAAQAAAAAABgAAAGwJAAAAAAEAAAAGAAAAbQkAAAAAAQAAAAYAAABuCQAAAAABAAAABgAAAG8JAAAAAAEAAAAGAAAAcAkAAAAAAQAAAAYAAABxCQAAAAABAAAABgAAAHIJAAAAAAEAAAAGAAAAcwkAAAAAAQAAAAYAAABfCQAAAAAAAAAAGgAAACwjAABHU1A1X3dfMTAxNEsvRGVjIDE3IDIwMTAAAAQAAAAwIwAAYAAAABQAAACxBAAAAQBUaW1lcyBOZXcgUm9tYW4AAAAMAAAAsQQAAAAA6rW066a8AGV3IBQAAACzBAAAAAAQAAEAAQABAAEAAQABAAEAAQAUAAAAswQAAAEAEAABAAEAAQABAAEAAQABAAEAAgAAABInAAABAAIAAAATJwAAAAACAAAAFCcAAAEAAgAAABUnAAABAAIAAAAWJwAAAAACAAAAFycAAAEABgAAACQnAAAAAP8AAAAGAAAAJCcAAAEAAACAAAYAAAAkJwAAAgAAgAAABgAAACQnAAADAAD/AAAGAAAAJCcAAAQAgACAAAYAAAAkJwAABQCAAAAABgAAACQnAAAGAP8A/wAGAAAAJCcAAAcA////AAYAAAAkJwAACADAwMAABgAAACQnAAAJAAAAAAAGAAAAJCcAAAoA/4AAAAYAAAAkJwAACwAAAAAABgAAACQnAAAMAGBgYAAGAAAAJCcAAA0AQEBAAAYAAAAkJwAADgD/AAAAAgAAACUnAAAAAAIAAAAmJwAAAQACAAAAJycAAAEAAgAAABgnAAABAAIAAAA4JwAAAgACAAAAOCcAAAIBAgAAADgnAAACAgIAAAA5JwAAAQACAAAAOicAAAEAMAAAADwnAAAAABoAEQEQAAEAAQABAAEAAQABAAEAAQABAFRpbWVzIE5ldyBSb21hbgBfAPD+EwMwAAAAPCcAAAEAGgARARAAAQABAAEAAQABAAEAAQABAAEAVGltZXMgTmV3IFJvbWFuAF8A8P4TAygAAAA8JwAAAgAaAAEAEAABAAEAAQABAAEAAQABAAEAAADqtbTrprwAZXcgUm9tYSgAAAA8JwAAAwAaAAEAEAABAAEAAQABAAEAAQABAAEAAADqtbTrprwAZXcgUm9tYSgAAAA8JwAABAAaAAEAEAABAAEAAQABAAEAAQABAAEAAADqtbTrprwAZXcgUm9tYSgAAAA8JwAABQAaAAEAEAABAAEAAQABAAEAAQABAAEAAADqtbTrprwAZXcgUm9tYQ==" };
/* ================= GSP 5 문서(.gsp)로 저장 =================
   GSP 5.03 이 저장한 파일을 본으로 삼아 문서·페이지 머리글을 그대로 쓰고, 객체 레코드만 새로 만든다. */
const GSPX = {};
GSPX.b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
GSPX.W = class {
  constructor() { this.parts = []; this.n = 0; }
  raw(u8) { this.parts.push(u8); this.n += u8.length; }
  rec(tag, body) { if (body.length % 2) { const b2 = new Uint8Array(body.length + 1); b2.set(body); body = b2; } const h = new DataView(new ArrayBuffer(8)); h.setUint32(0, body.length, true); h.setUint32(4, tag, true); this.raw(new Uint8Array(h.buffer)); this.raw(body); }
  out() { const u = new Uint8Array(this.n); let o = 0; for (const p of this.parts) { u.set(p, o); o += p.length; } return u; }
};
GSPX.B = class { // 작은 바이트 버퍼
  constructor() { this.a = []; }
  u8(v) { this.a.push(v & 255); return this; }
  u16(v) { v &= 0xffff; this.a.push(v & 255, v >> 8); return this; }
  i16(v) { return this.u16(v < 0 ? 0x10000 + Math.round(v) : Math.round(v)); }
  u32(v) { for (let i = 0; i < 4; i++) this.a.push((v >>> (8 * i)) & 255); return this; }
  f64(v) { const d = new DataView(new ArrayBuffer(8)); d.setFloat64(0, v, true); this.a.push(...new Uint8Array(d.buffer)); return this; }
  bytes(u) { this.a.push(...u); return this; }
  hex(h) { for (let i = 0; i < h.length; i += 2) this.a.push(parseInt(h.substr(i, 2), 16)); return this; }
  zeros(n) { for (let i = 0; i < n; i++) this.a.push(0); return this; }
  get() { return Uint8Array.from(this.a); }
};
GSPX.utf8 = s => new TextEncoder().encode(s);
GSPX.rgb = c => { const h = c === 'ink' || !c ? '#000000' : col(c); const m = /^#([0-9a-f]{6})/i.exec(h); const v = m ? m[1] : '000000'; return [0, 2, 4].map(i => parseInt(v.substr(i, 2), 16)); };
/* 객체 종류 → GSP 의 (분류 c, 종류 k) */
GSPX.CK = { point: [1, 4], segment: [2, 14], line: [2, 12], ray: [2, 13], circle: [3, 28], arc: [12, 67], cinterior: [5, 16] };
GSPX.polyK = n => n >= 3 && n <= 6 ? 49 + n : 15;
GSPX.FN = { sin: 0, cos: 1, tan: 2, asin: 3, acos: 4, atan: 5, abs: 6, sqrt: 7, ln: 8, log: 9, sgn: 10, round: 11, trunc: 12 };
/* 저장 식(#id 참조) → GSP 토큰. 부모 목록(refs)을 함께 돌려준다 */
GSPX.tokens = (expr) => {
  const refs = [], toks = []; const ri = id => { let i = refs.indexOf(id); if (i < 0) { refs.push(id); i = refs.length - 1; } return i; };
  const re = /\s*(#\d+\s*\(|#\d+|\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[A-Za-z_]+\s*\(?|[()+\-*/^])/gy; let m, s = String(expr).trim(), last = 0;
  re.lastIndex = 0;
  while (last < s.length && (m = re.exec(s))) {
    last = re.lastIndex; const t = m[1].replace(/\s+/g, '');
    if (/^#\d+\($/.test(t)) toks.push(0x7000 + ri(+t.slice(1, -1)));
    else if (/^#\d+$/.test(t)) toks.push(0x6000 + ri(+t.slice(1)));
    else if (/^[\d.]/.test(t)) { if (/e/i.test(t)) throw new Error('num'); for (const ch of t) toks.push(ch === '.' ? 10 : +ch); }
    else if (/^[A-Za-z_]+\($/.test(t)) { const f = t.slice(0, -1); if (!(f in GSPX.FN)) throw new Error('fn ' + f); toks.push(0x2000 + GSPX.FN[f]); }
    else if (t === 'pi' || t === 'π') toks.push(13);
    else if (t === 'e') toks.push(14);
    else if (t === 'x') toks.push(15);
    else if (t === '(') toks.push(11);
    else if (t === ')') toks.push(12);
    else if (t === '-' && (!toks.length || (toks[toks.length - 1] >> 12) === 1 || (toks[toks.length - 1] >> 12) >= 2 && (toks[toks.length - 1] >> 12) !== 6 || toks[toks.length - 1] === 11)) toks.push(0x1005); // 단항 −
    else if ('+-*/^'.includes(t) && t.length === 1) toks.push(0x1000 + '+-*/^'.indexOf(t));
    else throw new Error('tok ' + t);
  }
  if (last < s.length) throw new Error('parse');
  return { toks, refs };
};
/* 측정값·계산이 공통으로 쓰는 32바이트 표시 머리 */
GSPX.disp = (sx, sy, mode = 0) => new GSPX.B().hex('fc080000').u32(0x16).u32(4).i16(sx).i16(sy).hex('03003c303e0000000600').u16(mode).hex('0200').u16(0);
GSPX.valLabel = name => { const u = GSPX.utf8(GSPX.glabel(String(name).trim())); const b = new GSPX.B().u16(7).u16(0).u16(1).i16(8).i16(5).u16(0).u16(0).hex('986e12c1515c6141').u16(u.length).bytes(u).u8(0); if (b.a.length % 2) b.u8(0); return b.get(); };
GSPX.glabel = s => String(s).replace(/[₀-₉]+/g, m => '[' + [...m].map(c => c.charCodeAt(0) - 0x2080).join('') + ']').replace(/′/g, "'").replace(/″/g, "''");
GSPX.rect = o => { const x = o.d.sx || 10, y = o.d.sy || 10; return new GSPX.B().i16(x).i16(y).i16(x + 120).i16(y + 24).get(); };
GSPX.label = (o, type = 7) => {
  if (!o.label || !String(o.label).trim()) return null; const t = GSPX.utf8(GSPX.glabel(String(o.label).trim()));
  const b = new GSPX.B().u16(type).u16(o.showLabel ? 1 : 0).u16(0).i16(o.lx ?? 6).i16(o.ly ?? -14).zeros(4); if (type === 6) b.hex('986e12c1515c6141'); else b.zeros(8); b.u16(t.length).bytes(t);
  b.u8(0); if (b.a.length % 2) b.u8(0); return b.get();
};
GSPX.markup = (text, maxw = 640) => {
  // 문단은 <0>으로, 문단 안의 자동 줄바꿈은 <H…> 줄로 (GSP는 저장된 줄 그대로 그린다)
  const cw = ch => /[\u1100-\uffff]/.test(ch) ? 13 : /[A-Z0-9mw]/.test(ch) ? 8 : 6.5;
  const wrap = ln => { const out = []; let cur = '', w = 0; for (const word of ln.split(/(?<=\s)/)) { const ww = [...word].reduce((a, c) => a + cw(c), 0); if (cur && w + ww > maxw) { out.push(cur); cur = ''; w = 0; } cur += word; w += ww; } out.push(cur); return out; };
  const enc = s => { const u = GSPX.utf8(s); return [...GSPX.utf8('<T' + u.length.toString(16).toUpperCase() + 'x'), ...u, 62]; };
  const out = [...GSPX.utf8('<VL')];
  String(text || '').replace(/\r/g, '').split('\n').forEach((ln, i) => {
    if (i) out.push(...GSPX.utf8('<0>'));
    if (!ln) return; const parts = wrap(ln);
    if (parts.length === 1) out.push(...enc(ln)); else parts.forEach(p => out.push(...GSPX.utf8('<H'), ...enc(p), 62));
  });
  out.push(62); return out;
};
GSPX.capRec = (mk, sx, sy) => { const tail = mk.length % 2 ? 3 : 4; return new GSPX.B().hex('fc080000').u32(18 + mk.length + tail - 2).u32(4).i16(sx).i16(sy).u16(mk.length).bytes(mk).zeros(tail).get(); };
GSPX.MOVESP = { 2: 0, 6: 1, 15: 2, 0: 3 }; // 앱 이동 속도 → GSP 이동 버튼 속도 번호
/* 사용자 도구를 GSP 도구 구역으로 쓰기 위한 임시 문서: 주어진 것은 자유 객체로, 나머지는 도구의 객체 그대로 */
GSPX.toolDoc = (t, base) => {
  if (!t || !t.objs || !t.objs.length || !t.givens) return null;
  const td = newDoc(); td.prefs = { ...(base && base.prefs || {}) }; const ids = new Set(); let nid = 900000, k = 0;
  const put = o => { o.p = o.p || []; o.d = o.d || {}; if (o.w == null) o.w = 2; if (o.ps == null) o.ps = 2; if (o.dash == null) o.dash = 0; td.objs.push(o); ids.add(o.id); return o.id; };
  const bo = id => base && base.objs.find(o => o.id === id);
  const freeAt = (lab, i) => put({ id: nid++, t: 'point', k: 'free', p: [], d: { x: 2 + 2.5 * i, y: -2 - (i % 2) * 1.5 }, label: lab || '', showLabel: !!lab, color: 'red' });
  for (const g of t.givens) {
    const b = bo(g.id);
    if (g.kind === 'point') put({ id: g.id, t: 'point', k: 'free', p: [], d: { x: 2 + 2.5 * k, y: -2 - (k % 2) * 1.5 }, label: g.label || '', showLabel: true, color: 'red' });
    else if (g.kind === 'value' && ((b && isFnObj(b)) || t.objs.some(o => (o.d && o.d.fn === g.id) || (o.d && typeof o.d.expr === 'string' && new RegExp('#' + g.id + '\\s*\\(').test(o.d.expr))))) put({ id: g.id, t: 'value', k: 'func', p: [], d: { expr: b && b.d.expr && !/#/.test(b.d.expr) ? b.d.expr : 'x', form: 'yx', notation: 'f', sx: 10, sy: 10 + 24 * k }, label: g.label || 'f', color: 'ink' }); // 함수가 주어진 것
    else if (g.kind === 'value') put({ id: g.id, t: 'value', k: 'param', p: [], d: { v: b && b.k === 'param' ? +b.d.v || 1 : 1, sx: 10, sy: 10 + 24 * k, min: -10, max: 10, step: 0.1 }, label: g.label || 't', color: 'ink' });
    else if (g.kind === 'straight' || g.kind === 'circle') {
      const a = freeAt('', k), c = freeAt('', k + 1); const ty = g.kind === 'circle' ? 'circle' : (b && isStraight(b) ? b.t : 'segment');
      put({ id: g.id, t: ty, k: g.kind === 'circle' ? 'cp' : '2p', p: [a, c], d: {}, label: g.label || '', color: 'ink' });
    } else if (g.kind === 'coord') {
      put({ id: g.id, t: 'coord', k: 'given', p: [], d: {}, color: 'ink' }); td.coordId = g.id; // GSP 도구의 '좌표계' 주어진 것 (0/39)
    } else return null;
    k++;
  }
  const shown = new Set(t.shown || []);
  for (const c of t.objs) { const o = JSON.parse(JSON.stringify(c)); o.hidden = !shown.has(c.id) || !!c.hidden; put(o); }
  if (td.objs.some(o => o.p.some(id => !ids.has(id)))) return null;
  td.nid = nid + 1; return td;
};
GSPX.setPref = (u8, tag, val, at = 0) => { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let off = 0; while (off + 8 <= u8.length) { const len = dv.getUint32(off, true), t = dv.getUint32(off + 4, true); if (t === tag && len >= at + 2) { dv.setUint16(off + 8 + at, val, true); return; } off += 8 + len; } };

GSPX.picBytes = (src, w, h) => { // 그림을 PNG 바이트로 (PNG가 아니면 캔버스로 다시 그려 변환)
  try {
    let url = src;
    if (!/^data:image\/png;base64,/.test(src)) { const im = imgOf(src); if (!im.complete || !im.naturalWidth) return null; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); url = c.toDataURL('image/png'); w = c.width; h = c.height; }
    const bin = atob(url.split(',')[1]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (!w || !h) { const dv = new DataView(bytes.buffer); w = dv.getUint32(16); h = dv.getUint32(20); }
    return { bytes, w, h };
  } catch (e) { return null; }
};
GSPX.unit = d => GSPX.rad(d) ? 0 : d.prefs.directed ? 2 : 1; // GSP 각 단위: 0 라디안, 1 도, 2 방향 있는 도
GSPX.rad = d => !d.prefs.deg || d.objs.some(x => x.t === 'fplot' || (x.t === 'value' && x.k === 'func')); // 함수 그래프가 있으면 라디안
function buildGSP() {
  stashPage(); const keep = doc; const W = new GSPX.W(); let skipped = 0, fixed = 0; GSPX.skips = [];
  const head = GSPX.b64(GSPX_T.head); const hd = new DataView(head.buffer); new DataView(head.buffer).setUint16(14, book.pages.length, true); new DataView(head.buffer).setUint16(16, 0, true); new DataView(head.buffer).setUint16(12 + 24, 1 + book.pages.length, true); // 구역 수(부록 1 + 페이지)
  const pics = []; // 그림 자료: 문서 머리(부록 구역)의 1300 레코드로 저장
  try {
    const writeSec = (pg, pi, tool) => {
      doc = pg.doc; reindex(); recompute();
      const V = pg.view && pg.view.s ? pg.view : { ox: 0, oy: 0, s: PXCM };
      const x0 = -V.ox / V.s, y0 = V.oy / V.s; // 화면 왼쪽 위의 세계 좌표
      const PX = (x, y) => [(x - x0) * PXCM, (y0 - y) * PXCM];
      const recs = []; // [{hdr, recs:[[tag, u8]]}]
      const idx = new Map(); const coordIdx = new Map(); let csFirst = 0;
      const emit = (code, c, k, par, o, extra = [], opt = {}) => {
        if (par && par.some(v => !(v > 0))) throw 0; // 빠진 부모가 있으면 이 객체도 뺀다 (0 번 부모는 GSP 가 손상으로 봄)
        const [r, g, b] = GSPX.rgb(o ? o.color : 'ink');
        let e = opt.e ?? 0x121; if (o && opt.e == null && o.t !== 'point' && o.t !== 'value') { e = 0x120 + Math.max(1, Math.min(3, Math.round(o.w || 1))); if (o.dash) e = 0x220 + (e & 0xf); }
        const hid = (o && o.hidden) || opt.hidden ? 1 : 0;
        const h = new GSPX.B().u32(code | ((hid | (opt.fl || 0)) << 16)).u16(0).u16(c).u16(k).u16(e).u8(r).u8(g).u8(b).u8(0);
        if (opt.interior) h.hex('ff7f0000').zeros(8); else if (opt.pic) h.hex('ffff0000').zeros(8); else h.hex('ffff0000c1bdf0ff00000000');
        const rs = [];
        if (par && par.length) { const pb = new GSPX.B().u32(par.length); par.forEach(p => pb.u32(p)); rs.push([2002, pb.get()]); }
        rs.push(...extra);
        recs.push({ h: h.get(), rs }); return recs.length;
      };
      const P1 = id => idx.get(id);
      const lab = (o, rs) => { const l = o.k === 'xf' || (o.t !== 'point' && !o.showLabel) ? null : GSPX.label(o); if (l) { const at = rs.length && rs[0][0] === 2201 ? 0 : rs.length; rs.splice(at, 0, [2005, l], [2008, Uint8Array.of(0, 0)]); } return rs; }; // 순서: 2002, 종류별 자료, 2005·2008 (단, 자유점은 2005·2008 뒤에 2201)
      const freePt = (o, x, y, opt = {}) => { const [px, py] = PX(x, y); return emit(0, 1, opt.k || 4, [], o, lab(o, [[2201, new GSPX.B().f64(px).f64(py).get()]]), { e: 0x221 }); };
      const valRec = (o) => o.d.name ? [[2307, GSPX.disp(o.d.sx || 10, o.d.sy || 10, 3).get()], [2005, GSPX.valLabel(o.d.name)], [2008, Uint8Array.of(1, 0)]] : [[2307, GSPX.disp(o.d.sx || 10, o.d.sy || 10).get()], [2008, Uint8Array.of(1, 0)]]; // 이름 있는 측정값: 표시 방식 3 + 이름표(아래 첨자는 [n])
      const exprRec = (o, toks, kind) => { // kind: calc | func | param
        const b = new GSPX.B().bytes(GSPX.disp(o.d.sx || 10, o.d.sy || 10, kind === 'param' ? 3 : 0).get()).hex('07090000').u32(60 + 2 * toks.length).u32(0x30).u16(toks.length);
        if (kind === 'calc') b.u16(4).u16(0).u16(1).zeros(8).u32(4).zeros(28);
        else if (kind === 'func') b.u16(o.d.form === 'xy' ? 1 : 0).u16(8).u16(0).zeros(8).u32(4).zeros(28); // 1: x = f(y)
        else { const v = +o.d.v || 0; b.u16(4).u16(10).u16(3).f64(o.d.step || 0.01).f64(o.d.min ?? -100).f64(o.d.max ?? 100).f64(v).f64(v); }
        toks.forEach(t => b.u16(t)); return b.get();
      };
      const kOf = o => o.t === 'polygon' ? GSPX.polyK(o.p.length) : (GSPX.CK[o.t] || [0, 0])[1];
      const cOf = o => o.t === 'polygon' ? 4 : (GSPX.CK[o.t] || [0, 0])[0];
      // 가져온 좌표축(숨은 보조 직선)은 GSP 의 축 객체(58)로 되돌린다
      const axisAux = new Set(); doc.objs.forEach(l => { if (!l.isAxis) return; axisAux.add(l.id); const q = obj(l.p[1]); if (q && q.k === 'xf' && q.hidden && doc.objs.every(c => !c.p.includes(q.id) || c.isAxis)) axisAux.add(q.id); });
      for (const o of doc.objs) {
        let id = null; const g = G[o.id];
        if (axisAux.has(o.id)) continue;
        const par = o.p.map(P1);
        try {
          if (o.t === 'point' && o.k === 'free') {
            const isO = doc.objs.some(c => c.t === 'coord' && c.p[0] === o.id);
            id = freePt(o, o.d.x, o.d.y, { k: isO ? 41 : 4 });
          } else if (o.t === 'point' && o.k === 'unit') {
            const O = obj(o.p[0]); const og = G[O.id]; const u = (o.d.u || 1) * PXCM;
            if (o.d.axis === 'y') { idx.set(o.id, -1); continue; } // 직사각 좌표계의 y 단위점은 좌표계를 만들 때 씀
            id = emit(52, 1, 40, [P1(O.id)], o, [[2003, new GSPX.B().u32(52).f64(u).get()]], { e: 0x221 });
          } else if (o.t === 'coord' && o.k === 'given') {
            const cl = GSPX.label({ label: 'S[1]', showLabel: false }); cl[4] = 1; // 세 번째 값 1: 문서의 좌표계에 자동으로 대입
            id = emit(0, 1, 39, [], null, [[2005, cl], [2008, Uint8Array.of(0, 0)], [2201, new GSPX.B().zeros(16).get()]], { e: 0x121 });
          } else if (o.t === 'coord') {
            const [O, U, Vy] = o.p; const iO = P1(O), iU = P1(U); if (!iO || !iU) throw 0;
            const u = (obj(U).d.u || 1) * PXCM;
            const ax = emit(58, 9, 38, [iO, iU], o, [[2309, new GSPX.B().u32(1).get()], [2005, GSPX.label({ label: 'x' }, 7)], [2008, Uint8Array.of(1, 0)]], { e: 0x121 });
            let iY;
            if (Vy && obj(Vy)) { iY = emit(55, 1, 40, [iU], null, [[2003, new GSPX.B().u32(55).f64((obj(Vy).d.u || 1) * PXCM).get()]], { e: 0x221, hidden: obj(Vy).hidden ? 1 : 0 }); idx.set(Vy, iY); } // 세로 단위점도 다른 객체가 쓸 수 있게
            else iY = emit(54, 1, 40, [iU], null, [[2003, new GSPX.B().u32(54).f64(u).get()]], { e: 0x221, fl: 4 });
            const ay = emit(58, 9, 38, [iO, iY], o, [[2309, new GSPX.B().u32(0).get()], [2005, GSPX.label({ label: 'y' }, 7)], [2008, Uint8Array.of(1, 0)]], { e: 0x121 });
            id = emit(61, 8, 39, [ax, ay], { color: '#c0c0c0', hidden: o.hidden || o.d.grid === false }, [[2308, new GSPX.B().u32(1).u32(0).get()]], { e: 0x120 });
            if (!csFirst) csFirst = id;
            doc.objs.forEach(l => { if (l.isAxis && l.p[0] === O) idx.set(l.id, l.p[1] === U ? ax : ay); });
          } else if (o.t === 'point') {
            const pk = o.k, A = obj(o.p[0]), B = obj(o.p[1]);
            if (pk === 'mid' && o.p.length === 1 && A && A.t === 'segment') id = emit(1, 1, 11, par, o, lab(o, []), { e: 0x221 });
            else if (pk === 'int' && A && B) {
              const sA = isStraight(A), sB = isStraight(B), cA = A.t === 'circle' || A.t === 'arc', cB = B.t === 'circle' || B.t === 'arc'; // 호는 원처럼 (GSP 11~14)
              let code = null, i = o.d.i || 0;
              if (sA && sB) code = 9;
              else if ((sA && cB) || (cA && sB)) { const L = sA ? A : B; if (L.k === 'perp' && GSPI.opt.perp) i = 1 - i; code = i ? 12 : 11; }
              else if (cA && cB) { if (GSPI.opt.cc) i = 1 - i; code = i ? 14 : 13; }
              if (code == null) throw 0;
              id = emit(code, 1, 45, par, o, lab(o, []), { e: 0x221 });
            } else if (pk === 'on' && A) {
              const k = kOf(A) || (A.t === 'locus' ? 42 : A.t === 'fplot' ? 58 : 0); if (!k) throw 0;
              const b = new GSPX.B().u16(15).u16(k);
              if (A.t === 'circle') { const a = (o.d.t || 0) * TAU; b.f64(Math.cos(a)).f64(Math.sin(a)); }
              else if (A.t === 'fplot') { const lo = A.d.xmin ?? -10, hi = A.d.xmax ?? 10; b.f64(((o.d.t ?? 0) - lo) / ((hi - lo) || 1)); }
              else if (A.isAxis) { const ga = G[A.id]; const L = ga ? Math.hypot(ga.b.x - ga.a.x, ga.b.y - ga.a.y) : 1; b.f64(0.5 + (o.d.t ?? 0) * L * PXCM / GSPI.AXIS_PX * (A.isAxis === 'y' ? -1 : 1)); }
              else b.f64(o.d.t ?? 0.5);
              id = emit(15, 1, 10, par, o, lab(o, [[2003, b.get()]]), { e: 0x221 });
            } else if (pk === 'plot' && o.d.xV == null && o.d.yV == null && !o.d.polar) id = emit(67, 1, 56, [P1(o.p[0])], o, lab(o, [[2003, new GSPX.B().u32(67).f64(o.d.x || 0).f64(o.d.y || 0).get()]]), { e: 0x221 });
            else if (pk === 'plot' && !o.d.polar && (o.d.xV != null) !== (o.d.yV != null)) { // 한쪽만 값: 다른 쪽은 숨은 매개변수로
              const num = o.d.xV != null ? o.d.y : o.d.x; const T = GSPX.tokens(String(+(+num || 0).toFixed(6)));
              const pv = emit(0, 11, 79, [], { color: 'ink', hidden: true, d: { sx: 10, sy: 10, v: +num || 0 } }, [[2311, exprRec({ d: { sx: 10, sy: 10, v: +num || 0 } }, T.toks.length ? T.toks : [0], 'param')], [2008, Uint8Array.of(1, 0)], [2211, GSPX.rect({ d: { sx: 10, sy: 10 } })]], { hidden: 1 });
              const xv = o.d.xV != null ? P1(o.d.xV) : pv, yv = o.d.yV != null ? P1(o.d.yV) : pv;
              id = emit(69, 1, 56, [xv, yv, P1(o.p[0])], o, lab(o, []), { e: 0x221 });
            }
            else if (pk === 'plot' && o.d.xV && o.d.yV && !o.d.polar) id = emit(69, 1, 56, [P1(o.d.xV), P1(o.d.yV), P1(o.p[0])], o, lab(o, []), { e: 0x221 });
            else if (pk === 'xf') id = null;
            if (id == null && pk !== 'xf') throw 0;
          }
          if (id == null && o.k === 'xf' && o.t !== 'picture') {
            const src = obj(o.p[0]); const x = o.d.xf || o.d; const k = o.t === 'polygon' ? GSPX.polyK(src.p.length) : kOf(o); if (!k) throw 0;
            const c = cOf(o), e = o.t === 'point' ? { e: 0x221, interior: isInterior(o) } : { interior: isInterior(o) };
            const iS = P1(src.id); let rs = [];
            if (x.type === 'rot' && x.c && x.ang != null && !x.angV) { const a = x.ang * D2R; id = emit(27, c, k, [iS, P1(x.c)], o, lab(o, [[2003, new GSPX.B().u32(27).f64(-Math.sin(a)).f64(Math.cos(a)).f64(x.ang).u32(1).u32(0).get()]]), e); }
            else if (x.type === 'rot' && x.c && x.angP) id = emit(28, c, k, [iS, P1(x.c), ...x.angP.map(P1)], o, lab(o, []), e);
            else if (x.type === 'dil' && x.c && x.rP) id = emit(32, c, k, [iS, P1(x.c), ...x.rP.map(P1)], o, lab(o, []), e);
            else if (x.type === 'dil' && x.c && x.rV) id = emit(33, c, k, [iS, P1(x.c), P1(x.rV)], o, lab(o, []), e);
            else if (x.type === 'dil' && x.c && x.r != null) id = emit(30, c, k, [iS, P1(x.c)], o, lab(o, [[2003, new GSPX.B().u32(30).f64(x.r).get()]]), e);
            else if (x.type === 'ref' && x.m) id = emit(34, c, k, [iS, P1(x.m)], o, lab(o, []), e);
            else if (x.type === 'tr' && x.vec) id = emit(16, c, k, [iS, P1(x.vec[0]), P1(x.vec[1])], o, lab(o, []), e);
            else if (x.type === 'tr' && !x.vec && !x.distV && !x.angV) {
              let dist, ang; if (x.mode === 'rect') { dist = Math.hypot(x.dx || 0, x.dy || 0); ang = Math.atan2(x.dy || 0, x.dx || 0) / D2R; } else { dist = x.dist || 0; ang = x.ang || 0; }
              const a = ang * D2R; id = emit(21, c, k, [iS], o, lab(o, [[2003, new GSPX.B().u32(21).f64(-Math.sin(a)).f64(Math.cos(a)).f64(ang).u32(1).f64(dist * PXCM).f64(dist).u32(1).zeros(12).get()]]), e);
            }
            if (id == null) throw 0;
          }
          else if (id == null && (o.t === 'segment' || o.t === 'line' || o.t === 'ray')) {
            const code = o.k === '2p' ? { segment: 2, line: 63, ray: 64 }[o.t] : o.k === 'perp' ? 5 : o.k === 'par' ? 6 : o.k === 'bis' ? 7 : null;
            if (code == null) throw 0; id = emit(code, 2, kOf(o), par, o, lab(o, []));
          } else if (id == null && o.t === 'circle') {
            if (o.k === 'cp') id = emit(3, 3, 28, par, o, lab(o, []));
            else if (o.k === 'cr' && obj(o.p[1]) && obj(o.p[1]).t === 'segment') id = emit(4, 3, 28, par, o, lab(o, []));
            else throw 0;
          } else if (id == null && o.t === 'arc' && o.k === '3p') id = emit(81, 12, 67, par, o, lab(o, []));
          else if (id == null && o.t === 'arc' && o.k === 'cpp') id = emit(80, 12, 67, par, o, lab(o, []));
          else if (id == null && o.t === 'polygon' && o.k === 'pts') id = emit(8, 4, GSPX.polyK(o.p.length), par, o, lab(o, []), { interior: true });
          else if (id == null && o.t === 'cinterior') id = emit(10, 5, 16, par, o, lab(o, []), { interior: true });
          else if (id == null && o.t === 'locus') {
            const [drv, trc] = o.p; const D = obj(drv);
            if (D && D.t === 'value' && o.p.length === 2) { // 매개변수로 움직이는 자취 (GSP 97)
              const chain = [...descendants([drv])].filter(x => x !== drv && x !== trc && ancestors([trc]).has(x)); const ordered = doc.objs.filter(x => chain.includes(x.id)).map(x => P1(x.id));
              let t0 = D.d.min ?? 0, t1 = D.d.max ?? 10; if (o.d.dom) { const sp = t1 - t0; [t0, t1] = [t0 + sp * o.d.dom[0], t0 + sp * o.d.dom[1]]; }
              id = emit(97, 6, 42, [P1(trc), P1(drv), ...ordered, P1(trc)], o, [[2306, new GSPX.B().f64(t0).f64(t1).u32(o.d.n || 500).u16(4).u32(0).zeros(6).u16(1).zeros(6).get()]]);
            } else {
            if (!D || D.k !== 'on') throw 0;
            const path = obj(D.p[0]); const chain = [...descendants([drv])].filter(x => x !== drv && ancestors([trc]).has(x) || x === trc);
            const ordered = doc.objs.filter(x => chain.includes(x.id)).map(x => P1(x.id));
            const dom = path.t === 'circle' ? [0, TAU] : [0, 1];
            id = emit(35, 6, 42, [P1(trc), P1(path.id), P1(drv), ...ordered], o, [[2306, new GSPX.B().f64(dom[0]).f64(dom[1]).u32(o.d.n || 500).u16(4).u32(0).zeros(6).u16(1).zeros(6).get()]]);
            }
          } else if (id == null && o.t === 'fplot' && o.k === 'fn') {
            const fn = obj(o.d.fn || o.p[1]); if (!fn || (fn.d.form && fn.d.form !== 'yx' && fn.d.form !== 'xy')) throw 0;
            id = emit(72, 6, 58, [P1(fn.id), P1(o.p[0])], o, [[2306, new GSPX.B().f64(o.d.xmin ?? -10).f64(o.d.xmax ?? 10).u32(o.d.n || 750).u16(fn.d.form === 'xy' ? 1 : 0).u32(3).zeros(6).u16(1).zeros(6).get()]]);
          } else if (id == null && o.t === 'value') {
            const M = { ratio3: [47, 51], len: [36, 48], dist: [37, 48], angle: [41, 49], area: [42, 50], arclen: [44, 48], radius: [46, 48], x: [65, 51], y: [66, 51], slope: [87, 51], ptval: [94, 51] }[o.k];
            if (M) { let p = par; if (o.k === 'ptval') { const pt = obj(o.p[0]); if (!pt || pt.k !== 'on') throw 0; p = [P1(pt.id), P1(pt.p[0])]; } if ((o.k === 'x' || o.k === 'y' || o.k === 'slope') && p.length === 1) { const cs = doc.coordId && P1(doc.coordId); if (!cs) throw 0; p = [p[0], cs]; } id = emit(M[0], 7, M[1], p, o, valRec(o)); }
            else if (o.k === 'coords') { let p = par.slice(0, 2); if (p.length === 1) { const cs = doc.coordId && P1(doc.coordId); if (!cs) throw 0; p = [p[0], cs]; } let txt = ''; try { txt = valueText(o); } catch (e) { } id = emit(49, 0, 34, p, o, [[2300, GSPX.capRec(GSPX.markup(txt || '( , )'), o.d.sx || 10, o.d.sy || 10)], [2008, Uint8Array.of(0, 0)]]); }
            else if (o.k === 'eq') { const L = obj(o.p[0]); const code = L && isStraight(L) ? 50 : L && L.t === 'circle' ? 51 : 0; if (!code) throw 0; let p = par.slice(0, 2); if (p.length === 1) { const cs = doc.coordId && P1(doc.coordId); if (!cs) throw 0; p = [p[0], cs]; } let txt = ''; try { txt = valueText(o); } catch (e) { } id = emit(code, 0, code === 50 ? 36 : 37, p, o, [[2300, GSPX.capRec(GSPX.markup(txt || 'y = '), o.d.sx || 10, o.d.sy || 10)], [2008, Uint8Array.of(0, 0)]]); }
            else if (o.k === 'calc') { const T = GSPX.tokens(o.d.expr); id = emit(48, 11, 51, T.refs.map(P1), o, [[2311, exprRec(o, T.toks, 'calc')], [2008, Uint8Array.of(1, 0)]]); }
            else if (o.k === 'func' && (!o.d.form || o.d.form === 'yx' || o.d.form === 'xy')) { const T = GSPX.tokens(o.d.expr); const l = GSPX.label({ label: o.label || 'f', showLabel: false }, 6); id = T.refs.length ? emit(71, 11, 57, T.refs.map(P1), o, [[2311, exprRec(o, T.toks, 'func')], [2005, l], [2008, Uint8Array.of(0, 0)]]) : emit(0, 11, 57, [], o, [[2311, exprRec(o, T.toks, 'func')], [2005, l], [2008, Uint8Array.of(1, 0)], [2211, GSPX.rect(o)]]); }
            else if (o.k === 'param') { const T = GSPX.tokens(String(+(+o.d.v).toFixed(6))); const l = GSPX.label({ label: o.label || 't', showLabel: false }, 6); id = emit(0, 11, 79, [], o, [[2311, exprRec(o, T.toks.length ? T.toks : [0], 'param')], [2005, l], [2008, Uint8Array.of(1, 0)], [2211, GSPX.rect(o)]]); }
            else throw 0;
          } else if (id == null && o.t === 'picture') {
            if (!g || !g.TL || !g.src) throw 0; const pb = GSPX.picBytes(g.src, o.d.w, o.d.h); if (!pb) throw 0;
            const [x0, y0] = PX(g.TL.x, g.TL.y), [x1, y1] = PX(g.TR.x, g.TR.y), [x2, y2] = PX(g.BL.x, g.BL.y);
            const k = pics.length; pics.push(new GSPX.B().u32(pb.w).u32(pb.h).bytes(pb.bytes).get());
            const hdr = { color: '#ff0000', hidden: o.hidden };
            id = emit(0, 16, 78, [], hdr, [[2316, new GSPX.B().u32(pb.w).u32(pb.h).u32(pb.w).u32(pb.h).get()], [2216, new GSPX.B().f64((x1 - x0) / pb.w).f64((x2 - x0) / pb.h).f64(x0).f64((y1 - y0) / pb.w).f64((y2 - y0) / pb.h).f64(y0).get()], [8004, new GSPX.B().u16(k).get()]], { e: 0x121, pic: true });
          } else if (id == null && o.t === 'text') {
            const txt = String(o.d.text || '').replace(/\{#\d+\}/g, '').replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');
            const mk = GSPX.markup(txt, o.d.wrap || 640); const sx = o.d.sx || 10, sy = o.d.sy || 10;
            const tail = mk.length % 2 ? 3 : 4; const b = new GSPX.B().hex('fc080000').u32(18 + mk.length + tail - 2).u32(4).i16(sx).i16(sy).u16(mk.length).bytes(mk).zeros(tail);
            const lines = txt.split('\n'); const ww = o.d.wrap || 640; const w = Math.min(ww, Math.max(40, ...lines.map(l => l.length * 9))); const nl = lines.reduce((a, l) => a + Math.max(1, Math.ceil(l.length * 8 / ww)), 0); const hgt = nl * 18 + 6;
            id = emit(0, 0, 19, [], o, [[2300, b.get()], [2008, Uint8Array.of(0, 0)], [2200, new GSPX.B().i16(sx).i16(sy).i16(sx + w).i16(sy + hgt).get()]]);
          } else if (id == null && o.t === 'button' && (o.d.act === 'anim' || o.d.act === 'move')) {
            const sx = o.d.sx || 10, sy = o.d.sy || 10, l = GSPX.label({ label: o.d.text || '버튼', showLabel: true }, o.d.act === 'move' ? 4 : 7);
            if (o.d.act === 'anim') {
              const p = [...new Set(par.filter(v => v > 0))]; if (!p.length) throw 0;
              const b3 = new GSPX.B().u32(62); p.forEach(() => b3.hex('000000000000c0410000000000000000' + '0000c846').zeros(12)); // 대상마다 32바이트 (방향·속도)
              id = emit(62, 10, 23, p, o, [[2003, b3.get()], [2310, new GSPX.B().hex('06090000').u32(0x18).u32(0x0c).u16(2).u16(0).zeros(4).i16(sx).i16(sy).get()], [2005, l], [2008, Uint8Array.of(1, 0)]]);
            } else {
              if (par.length !== 2) throw 0; const sp = GSPX.MOVESP[o.d.speed ?? 6] ?? 1;
              id = emit(62, 10, 23, par, o, [[2310, new GSPX.B().hex('06090000').u32(0x18).u32(0x0c).u16(3).u16(sp).zeros(4).i16(sx).i16(sy).get()], [2005, l], [2008, Uint8Array.of(1, 0)]]);
            }
          } else if (id == null && o.t === 'button' && (o.d.act === 'scroll' || o.d.act === 'present' || o.d.act === 'url')) {
            const sx = o.d.sx || 10, sy = o.d.sy || 10, l = GSPX.label({ label: o.d.text || '버튼', showLabel: true }, 6);
            const r2310 = (ty, sub, extra = 0) => new GSPX.B().hex('06090000').u32(0x18).u32(0x0c).u16(ty).u16(sub).u16(extra).u16(0).i16(sx).i16(sy).get();
            if (o.d.act === 'scroll') { if (!(par[0] > 0)) throw 0; id = emit(62, 10, 23, [par[0]], o, [[2310, r2310(4, o.d.mode === 'center' ? 1 : 0)], [2005, l], [2008, Uint8Array.of(1, 0)]]); }
            else if (o.d.act === 'present') { const p = par.filter(v => v > 0); if (!p.length) throw 0; const seq = o.d.seq === 'seq'; id = emit(62, 10, 23, p, o, [[2310, r2310(7, seq ? 1 : 0, seq ? Math.round(o.d.pause ?? 1) : 600)], [2005, l], [2008, Uint8Array.of(1, 0)]]); }
            else { // 웹 주소 바로 가기 (종류 6)
              const u = GSPX.utf8(o.d.url || ''); const b = new GSPX.B().hex('06090000').u32(0).u32(0x0c).u16(6).u16(0).zeros(4).i16(sx).i16(sy).u16(u.length).bytes(u).u8(0); while (b.a.length % 4) b.u8(0);
              const r = b.get(); new DataView(r.buffer).setUint32(4, r.length, true); const w = 16 + 8 * String(o.d.text || '').length;
              id = emit(0, 10, 23, [], o, [[2310, r], [2005, l], [2008, Uint8Array.of(1, 0)], [2210, new GSPX.B().i16(sx).i16(sy).i16(sx + w).i16(sy + 19).get()]]);
            }
          } else if (id == null && o.t === 'table' && o.k === 'tab') { // 표 (GSP 91): 칸 내용은 글자로
            const p = o.p.map(P1); if (!p.length || p.some(v => !(v > 0))) throw 0;
            const T = s => { const u = GSPX.utf8(String(s)); return '<T' + u.length.toString(16).toUpperCase() + 'x' + String(s) + '>'; };
            const cell = v => '<H' + T(cellStr(v)) + '>';
            const heads = tableHeads(o); const rows = (o.d.rows || []).concat([o.p.map(id => cellVal(id))]);
            const mk = '0'.repeat(heads.length + 2) + heads.map(h => '<SS2' + T(h) + '>').join('') + rows.map(r => '0' + r.map(cell).join('')).join('');
            const mb = GSPX.utf8(mk); const b = new GSPX.B().hex('0d090000').u32(0).u32(0x10).i16(o.d.sx || 10).i16(o.d.sy || 10).u16(heads.length + 3).u16(rows.length).u16(1).zeros(6).bytes(mb).u8(0); if (b.a.length % 2) b.u8(0);
            const r = b.get(); new DataView(r.buffer).setUint32(4, r.length, true);
            id = emit(91, 17, 83, p, o, [[2317, r], [2008, Uint8Array.of(1, 0)]]);
          } else if (id == null && o.t === 'iter' && o.k === 'geo') {
            const pre = o.d.pre || [], maps = o.d.maps || []; const chain = iterChain(o).filter(c => P1(c.id) > 0);
            const dv = o.d.depthV != null ? P1(o.d.depthV) : null; if (o.d.depthV != null && !(dv > 0)) throw 0;
            const p = [...(dv ? [dv] : []), ...pre.map(P1), ...maps.flat().map(P1), ...chain.map(c => P1(c.id))];
            const r = new GSPX.B().u32(0).u16(0).u16(pre.length).u32(maps.length).u32((Math.random() * 0x7fffffff) >>> 0).u32(Math.max(0, o.d.depth ?? 3)).u32(0).get();
            id = emit(dv ? 89 : 76, 14, 64, p, o, [[2314, r]]);
            idx.set(o.id, id);
            for (const c of chain) { // 반복된 상 (그려지는 객체마다 하나)
              if (c.t === 'value' || isScreenObj(c) || c.t === 'locus' || (c.hidden && !o.d.drawHidden) || (c.t === 'point' && o.d.ptsToo === false)) continue;
              emit(77, 15, 65, [P1(c.id), id], c, [], c.t === 'point' ? { e: 0x221 } : {});
            }
          } else if (id == null && o.t === 'table' && o.k === 'iter') {
            const p = [P1(o.p[0]), ...o.p.slice(1).map(P1).filter(v => v > 0)];
            id = emit(92, 17, 84, p, o, [[2317, new GSPX.B().hex('0d090000').u32(0x1c).u32(0x10).i16(o.d.sx || 10).i16(o.d.sy || 10).zeros(12).get()], [2008, Uint8Array.of(1, 0)]]);
          } else if (id == null && o.t === 'button' && (o.d.act === 'hide' || o.d.act === 'link')) {
            const sx = o.d.sx || 10, sy = o.d.sy || 10, link = o.d.act === 'link';
            const ty = link ? [5, Math.max(0, book.pages.findIndex(p => p.id === o.d.pid))] : [1, 6];
            const l = GSPX.label({ label: o.d.text || '버튼', showLabel: true }, 7);
            const r2310 = new GSPX.B().hex('06090000').u32(0x18).u32(0x0c).u16(ty[0]).u16(ty[1]).zeros(4).i16(sx).i16(sy).get();
            const w = 16 + 8 * String(o.d.text || '').length;
            if (link) id = emit(0, 10, 23, [], o, [[2310, r2310], [2005, l], [2008, Uint8Array.of(0, 0)], [2210, new GSPX.B().i16(sx).i16(sy).i16(sx + w).i16(sy + 23).get()]]);
            else { const p = [...new Set(par.filter(v => v > 0))]; if (!p.length) throw 0; id = emit(62, 10, 23, p, o, [[2310, r2310], [2005, l], [2008, Uint8Array.of(0, 0)]]); }
          }
          if (id == null) throw 0;
        } catch (err) {
          // 대신 고정된 점으로 (점이라면) — 아니면 건너뜀
          if (o.t === "point" && g && isFinite(g.x)) { id = freePt(o, g.x, g.y); fixed++; (GSPX.skips = GSPX.skips || []).push("fixed:" + o.k + "<" + o.p.map(id => obj(id) ? obj(id).t + "/" + obj(id).k : "?").join(",") + ">"); } else { id = null; skipped++; (GSPX.skips = GSPX.skips || []).push(o.t + "/" + o.k + (o.k === "xf" ? "." + (o.d.xf || {}).type : "") + "<" + o.p.map(id => obj(id) ? obj(id).t + "/" + obj(id).k + (G[id] ? "" : "!") : "?").join(",") + ">" + (G[o.id] ? "" : "(undef)")); }
        }
        if (id != null) idx.set(o.id, id);
      }
      if (tool) { // 사용자 도구 구역: 902(종류 2), 이름, 객체, 903
        const gi = (pg.givens || []).map(id => idx.get(id)); if (!gi.length || gi.some(v => !(v > 0))) throw new Error('givens');
        W.raw(GSPX.b64(GSPX_T.t902));
        W.rec(1002, new GSPX.B().zeros(16).u16(GSPX.unit(doc)).u16(1).zeros(4).u32(recs.length).zeros(8).get()); // 도구 머리 (페이지의 1000 과 같은 꼴)
        W.rec(1100, new GSPX.B().bytes(GSPX.utf8(pg.name || '도구')).u8(0).get());
        W.rec(1201, new GSPX.B().hex('010054696d6573204e657720526f6d616e000000').get()); W.rec(1203, new GSPX.B().hex('0000100001000100010001000100010001000100').get());
        for (const r of recs) { W.rec(2000, r.h); for (const [t, u] of r.rs) W.rec(t, u); W.rec(2007, new Uint8Array(0)); }
        const gb = new GSPX.B().u32(gi.length); gi.forEach(v => gb.u32(v)); W.rec(1204, gb.get()); // 주어진 것(맞춤 순서)
        W.rec(1003, new Uint8Array(0)); W.rec(903, new Uint8Array(0)); return;
      }
      // 페이지 머리글
      const p902 = GSPX.b64(GSPX_T.p902), p1000 = GSPX.b64(GSPX_T.p1000); new DataView(p1000.buffer).setUint32(8 + 24, recs.length, true); new DataView(p1000.buffer).setUint16(8 + 16, GSPX.unit(doc), true); new DataView(p1000.buffer).setUint16(8 + 8, 0x4000 + pi * 0x0731 + 17, true); // @16 각 단위(0 라디안, 1 도), @8 페이지마다 다른 값
      W.raw(p902); W.raw(p1000);
      const nm = GSPX.utf8(pg.name || ('페이지 ' + (pi + 1))); W.rec(1100, new GSPX.B().bytes(nm).u8(0).get());
      const prest = GSPX.b64(GSPX_T.prest); GSPX.setPref(prest, 10042, GSPX.unit(doc)); W.raw(prest);
      for (const r of recs) { W.rec(2000, r.h); for (const [t, u] of r.rs) W.rec(t, u); W.rec(2007, new Uint8Array(0)); }
      if (csFirst) W.rec(9005, new GSPX.B().u32(csFirst).get());
      W.rec(1001, new Uint8Array(0)); W.rec(903, new Uint8Array(0));
    };
    book.pages.forEach((pg, pi) => writeSec(pg, pi));
    // 사용자 도구: 주어진 것과 도구 객체로 임시 문서를 만들어 도구 구역으로 저장
    const tools = []; const seenT = new Set(); book.pages.forEach(pg => (pg.doc.tools || []).forEach(t => { if (!seenT.has(t)) { seenT.add(t); tools.push(t); } }));
    let nTools = 0;
    for (const t of tools) {
      const td = GSPX.toolDoc(t, book.pages[0].doc); if (!td) { skipped++; GSPX.skips.push('tool:' + t.name + ':' + (t.givens || []).map(g => g.kind).join(',')); continue; }
      const before = W.n; try { writeSec({ doc: td, name: t.name, givens: t.givens.map(g => g.id), view: { ox: 0, oy: 0, s: PXCM } }, -1, true); nTools++; } catch (e) { skipped++; GSPX.skips.push('tool:' + t.name + ':' + e.message); }
    }
    hd.setUint16(16, nTools, true); hd.setUint16(12 + 24, 1 + book.pages.length + nTools, true);
    W.rec(901, new Uint8Array(0));
  } finally { doc = keep; reindex(); recompute(); }
  const F = new GSPX.W(); let at = 4; const hv = new DataView(head.buffer); // 머리에서 1006 레코드 뒤에 그림 레코드를 끼움
  while (at + 8 <= head.length) { const len = hv.getUint32(at, true), t = hv.getUint32(at + 4, true); at += 8 + len; if (t === 1006) break; }
  F.raw(head.slice(0, at)); for (const p of pics) F.rec(1300, p); F.raw(head.slice(at)); F.raw(W.out());
  return { bytes: F.out(), skipped, fixed };
}
function fileSaveGSP() {
  let r; try { r = buildGSP(); } catch (e) { return toast('GSP 문서로 저장하지 못했습니다: ' + e.message); }
  const name = (book.pages[0] && book.pages[0].name || '작도').replace(/[\\/:*?"<>|]/g, '') + '.gsp';
  saveFile(name, new Blob([r.bytes], { type: 'application/octet-stream' }), 'application/octet-stream');
  toast('GSP 5 문서로 저장했습니다' + (r.fixed ? ` · 점 ${r.fixed}개는 고정된 점으로` : '') + (r.skipped ? ` · GSP에 없는 객체 ${r.skipped}개는 뺐습니다` : ''));
}
