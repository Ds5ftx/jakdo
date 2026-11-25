'use strict';
/* ================= GSP 4/5 문서(.gsp)와 JavaSketchpad(HTML) 불러오기 =================
   .gsp: "GSP4" 뒤에 [u32 길이][u32 태그][내용] 레코드가 이어지는 이진 형식.
   902 = 구역 시작(1 페이지 · 2 도구), 1100 = 이름, 2000 = 객체 머리, 2002 = 부모, 2007 = 객체 끝 */
const GSPI = { opt: { cc: false, perp: true } }; // GSP 수선의 방향은 이 앱과 반대(17각형 작도로 확인)
GSPI.dec = (u8) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) { try { return new TextDecoder('euc-kr').decode(u8); } catch (e2) { return String.fromCharCode(...u8); } } };
GSPI.sub = s => String(s || '').replace(/\[(\d+)\]/g, (_, d) => subDigits(d)).replace(/\[([^\]]+)\]/g, '$1');
GSPI.color = (r, g, b) => { if (r === 0 && g === 0 && b === 0) return 'ink'; const h = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); return { '#ff0000': 'red', '#0000ff': 'blue' }[h] || h; };
/* GSP 텍스트 표기 <VL<H<T4x...>>> 에서 글자만 뽑기 (T 뒤 길이는 16진수, 바이트 단위) */
GSPI.markup = (u8, start, end) => {
  // <VL …> 문단, <H …> 줄(줄바꿈은 자동 줄바꿈이므로 공백으로), <0> 빈 줄(문단 나눔), <T{16진 길이}x바이트> 글자
  let out = '', i = start, buf = [], stack = [], gap = false;
  const flush = () => { if (buf.length) { let t = GSPI.dec(new Uint8Array(buf)); if (gap && out && !/\s$/.test(out) && !/^\s/.test(t)) out += ' '; out += t; buf = []; gap = false; } };
  while (i < end) {
    const c = u8[i];
    if (c === 0) break;
    if (c === 60) { // '<'
      const t = u8[i + 1];
      if (t === 84) { // T
        let j = i + 2, h = ''; while (j < end && u8[j] !== 120) h += String.fromCharCode(u8[j++]);
        const n = parseInt(h, 16) || 0; for (let k = 0; k < n && j + 1 + k < end; k++) buf.push(u8[j + 1 + k]);
        i = j + 1 + n; if (u8[i] === 62) i++; flush(); if (stack[stack.length - 1] === 'V') gap = true; continue;
      }
      let j = i + 1, tag = ''; while (j < end && u8[j] !== 60 && u8[j] !== 62) tag += String.fromCharCode(u8[j++]);
      if (tag === '0' && u8[j] === 62) { flush(); out = out.replace(/ +$/, '') + '\n'; i = j + 1; continue; }
      if (tag[0] === '!' && u8[j] === 62) { const ch = GSPI.SYM[parseInt(tag.slice(1), 16)]; if (ch) { buf.push(...new TextEncoder().encode(ch)); } i = j + 1; continue; } // <!D7> 같은 Symbol 글꼴 문자
      stack.push(tag[0]); i = j; continue;
    }
    if (c === 62) { const tg = stack.pop(); if (tg === 'H') gap = true; i++; continue; }
    i++;
  }
  flush(); return out.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
};
GSPI.fam = (n) => /courier|mono|consol|fixed/i.test(n) ? 'mono' : /times|serif|바탕|명조|batang|myungjo|궁서|georgia|garamond|book|symbol|cambria|palatino/i.test(n) ? 'serif' : n ? 'sans' : 'serif';
// Symbol 글꼴 문자 (<!XX>): 그리스 문자·수학 기호
GSPI.SYM = (() => { const m = {}; const g = 'ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ'; for (let i = 0; i < 26; i++) { m[0x41 + i] = g[i]; m[0x61 + i] = 'αβχδεφγηιϕκλμνοπθρστυϖωξψζ'[i]; }
  Object.assign(m, { 0xA2: '′', 0xA3: '≤', 0xA5: '∞', 0xB0: '°', 0xB1: '±', 0xB2: '″', 0xB3: '≥', 0xB4: '×', 0xB5: '∝', 0xB6: '∂', 0xB7: '•', 0xB8: '÷', 0xB9: '≠', 0xBA: '≡', 0xBB: '≈', 0xBC: '…', 0xAC: '←', 0xAD: '↑', 0xAE: '→', 0xAF: '↓', 0xAB: '↔', 0xC5: '⊕', 0xC6: '∅', 0xC7: '∩', 0xC8: '∪', 0xC9: '⊃', 0xCA: '⊇', 0xCC: '⊂', 0xCD: '⊆', 0xCE: '∈', 0xCF: '∉', 0xD0: '∠', 0xD1: '∇', 0xD5: '∏', 0xD6: '√', 0xD7: '⋅', 0xD8: '¬', 0xD9: '∧', 0xDA: '∨', 0xDB: '⇔', 0xDE: '⇒', 0xE5: '∑', 0xF2: '∫', 0x5E: '⊥', 0x5C: '∴', 0x22: '∀', 0x24: '∃', 0x27: '∋', 0x40: '≅', 0x7E: '∼' }); return m; })();
/* 계산식 토큰(u16) → 저장 식 문자열 */
GSPI.FNS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'abs', 'sqrt', 'ln', 'log', 'sgn', 'round', 'trunc'];
GSPI.expr = (toks, ref) => {
  let s = '';
  for (const t of toks) {
    const hi = t >> 12, lo = t & 0xfff;
    if (hi === 0) { s += lo <= 9 ? String(lo) : lo === 10 ? '.' : lo === 11 ? '(' : lo === 12 ? ')' : lo === 13 ? ' pi ' : lo === 14 ? ' e ' : lo === 15 ? ' x ' : (GSPI.UNIT[lo] || ''); } // 0x100~: 앞 수의 단위 (라디안·도·픽셀·cm·인치)
    else if (hi === 1) s += lo === 5 ? ' -' : ' ' + ('+-*/^'[lo] || '+') + ' '; // 5: 부호 바꾸기(단항 −)
    else if (hi === 2) s += ' ' + (GSPI.FNS[lo] || 'abs') + '(';
    else if (hi === 6) { const r = ref(lo); if (r == null) throw new Error('ref'); s += ' #' + r + ' '; }
    else if (hi === 7) { const r = ref(lo); if (r == null) throw new Error('ref'); s += ' #' + r + ' ('; }
  }
  return s.replace(/\s+/g, ' ').trim();
};

/* 그림 자료(레코드 1300): [u32 폭][u32 높이] 뒤에 PNG·JPEG·BMP 등 그림 파일 바이트 */
GSPI.picture = (u8, p, len) => {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const w = dv.getUint32(p, true), h = dv.getUint32(p + 4, true); let b = u8.slice(p + 8, p + len);
  let mime = b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b[0] === 0x42 && b[1] === 0x4d ? 'image/bmp' : b[0] === 0x47 && b[1] === 0x49 ? 'image/gif' : null;
  if (!mime && b.length >= 40 && new DataView(b.buffer, b.byteOffset).getUint32(0, true) === 40) { // 머리 없는 DIB → BMP 머리를 붙임
    const hdr = new Uint8Array(14), hv = new DataView(hdr.buffer); hdr[0] = 0x42; hdr[1] = 0x4d; hv.setUint32(2, 14 + b.length, true);
    const bpp = new DataView(b.buffer, b.byteOffset).getUint16(14, true), clr = new DataView(b.buffer, b.byteOffset).getUint32(32, true);
    hv.setUint32(10, 14 + 40 + 4 * (clr || (bpp <= 8 ? 1 << bpp : 0)), true); const nb = new Uint8Array(14 + b.length); nb.set(hdr); nb.set(b, 14); b = nb; mime = 'image/bmp';
  }
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return { w, h, src: mime ? 'data:' + mime + ';base64,' + btoa(s) : null };
};
GSPI.parse = (ab) => {
  const u8 = new Uint8Array(ab), dv = new DataView(ab);
  if (String.fromCharCode(...u8.slice(0, 4)) !== 'GSP4') throw new Error('GSP 4/5 문서가 아닙니다 (GSP 3 이하 형식은 지원하지 않습니다)');
  const secs = [], pics = []; let sec = null, o = null, off = 4;
  while (off + 8 <= u8.length) {
    const len = dv.getUint32(off, true), tag = dv.getUint32(off + 4, true), p = off + 8;
    if (p + len > u8.length) break;
    if (tag === 902) { sec = { type: dv.getUint16(p, true), name: '', objs: [] }; secs.push(sec); }
    else if (tag === 1300 && len > 8) pics.push(GSPI.picture(u8, p, len));
    else if (tag === 1204 && sec && len >= 4) { const n = dv.getUint32(p, true); sec.givens = []; for (let i = 0; i < n && 8 + 4 * i <= len; i++) sec.givens.push(dv.getUint32(p + 4 + 4 * i, true) - 1); }
    else if (tag === 1201 && sec && len >= 3) { let e = p + 2; while (e < p + len && u8[e]) e++; (sec.fonts = sec.fonts || []).push(GSPI.dec(u8.slice(p + 2, e))); } // 글꼴 표
    else if (tag === 1203 && sec && len >= 20) (sec.styles = sec.styles || []).push({ f: dv.getUint16(p, true), pt: dv.getUint16(p + 2, true), it: u8[p + 15] === 1, raw: Array.from(u8.slice(p + 4, p + 20)) }); // 글자 모양 표: 글꼴 번호, 크기(pt), 꼴
    else if (tag === 1100 && sec) { let e = p; while (e < p + len && u8[e]) e++; sec.name = GSPI.dec(u8.slice(p, e)); }
    else if (tag === 1000 && sec && len >= 8) { sec.scroll = { x: dv.getInt16(p + 4, true), y: dv.getInt16(p + 6, true) }; if (len >= 18) sec.angle = dv.getUint16(p + 16, true); }
    else if (tag === 2000 && sec) {
      const a = dv.getUint32(p, true);
      o = { code: a & 0xffff, fl: a >>> 16, k: dv.getUint16(p + 8, true), e: dv.getUint16(p + 10, true), rgb: [u8[p + 12], u8[p + 13], u8[p + 14]], par: [], rec: {} };
      sec.objs.push(o);
    }
    else if (tag === 2007) o = null;
    else if (o) {
      if (tag === 2002) { const n = dv.getUint32(p, true); for (let i = 0; i < n; i++) o.par.push(dv.getUint32(p + 4 + 4 * i, true) - 1); }
      else o.rec[tag] = { p, len };
    }
    off = p + len + (len & 1); // 길이가 홀수인 레코드(그림 등) 뒤에는 채움 바이트 1개
  }
  return { u8, dv, secs, pics };
};

/* 구역 하나를 현재 doc 에 객체로 만든다. 반환: 건너뛴 객체 수 */
GSPI.build = (F, sec, links) => {
  const { u8, dv } = F; const map = []; sec.map = map; let skipped = 0;
  const D = (r, at) => r && r.len >= at + 8 ? dv.getFloat64(r.p + at, true) : NaN;
  const W = (px, py) => ({ x: px / PXCM, y: -py / PXCM });
  const pend = {}; // 좌표계 조각
  const label = (src, o) => {
    const r = src.rec[2005]; if (!r || r.len < 24) return;
    const n = dv.getUint16(r.p + 22, true); if (!n) return;
    const s = GSPI.sub(GSPI.dec(u8.slice(r.p + 24, r.p + 24 + n)).replace(/\0.*$/, ''));
    if (s) { o.label = s; o.showLabel = dv.getUint16(r.p + 2, true) === 1; }
  };
  const style = (src, o) => {
    o.hidden = !!(src.fl & 1);
    o.color = GSPI.color(...src.rgb);
    const e = src.e; let w = 1, dash = 0;
    if (e < 256) { w = e === 0 ? 1 : e; dash = e === 0 ? 1 : 0; } else { w = (e & 0xf) || 1; const st = (e >> 4) & 0xf; dash = st === 1 ? 1 : st === 0 ? 2 : 0; } // 0x1SW: S 2=실선 1=파선 0=점선, W 굵기
    if (o.t !== 'point') { o.w = Math.min(3, w); o.dash = dash; }
    if (isInterior(o)) o.alpha = 0.45;
  };
  const pos = (src, tag) => { const r = src.rec[tag]; return r && r.len >= 16 ? { sx: dv.getInt16(r.p + 12, true), sy: dv.getInt16(r.p + 14, true) } : null; };
  const toks = (src) => { const r = src.rec[2311]; if (!r || r.len < 46) return null; const n = dv.getUint16(r.p + 44, true); const t = []; for (let i = 0; i < n; i++) t.push(dv.getUint16(r.p + r.len - 2 * n + 2 * i, true)); return { t, r, n, form: r.len > 48 && dv.getUint16(r.p + 46, true) === 1 ? 'xy' : 'yx' }; }; // 46: 1 이면 x = f(y)
  const gsty = (src) => { // 2008: 이 페이지 글자 모양 표의 번호
    const r = src.rec[2008]; if (!r || r.len < 2 || !sec.styles) return null; const st = sec.styles[dv.getUint16(r.p, true)]; if (!st) return null;
    const name = (sec.fonts || [])[st.f] || ''; return { name, fam: GSPI.fam(name), px: st.pt, it: st.it, g: { f: name, pt: st.pt, raw: st.raw } };
  };
  const applySty = (src, o) => {
    const st = gsty(src); if (!st || !o) return;
    if (o.t === 'text') { o.d.size = st.px; o.d.font = st.fam; if (st.it) o.d.italic = true; o.d.gsty = st.g; }
    else if (o.t === 'value') { o.d.size = st.px; o.d.font = st.fam; o.d.gsty = st.g; }
    else if (o.t === 'button') o.d.gsty = st.g;
    else if (o.t !== 'coord' && src.rec[2005]) { o.lf = { size: st.px, font: st.fam, italic: st.it, bold: false }; o.gsty = st.g; }
  };
  const fin = (src, id, opts = {}) => { const o = obj(id); if (!o) return null; if (!opts.noStyle) style(src, o); label(src, o); return id; };
  const text = (src, s, sx, sy, extra = {}) => add({ t: 'text', k: 'cap', d: { text: s, sx, sy, size: 14, ...extra }, color: GSPI.color(...src.rgb) }).id;
  const valAt = (src, k, p, extra = {}) => { const id = mkValue(k, p, extra); const q = pos(src, 2307) || pos(src, 2311); if (q) Object.assign(obj(id).d, q);
    const r = src.rec[2307] || src.rec[2311]; // 표시 이름: 표시 문자열이 '<0>'(자동)이 아니면 그 글자가 측정값 이름
    if (r && r.len >= 20 && k !== 'func' && k !== 'param') { const n = dv.getUint16(r.p + 16, true); if (n > 3 && 18 + n <= r.len) { try { const nm = GSPI.markup(u8, r.p + 18, r.p + 18 + n).trim(); if (nm) obj(id).d.name = nm; } catch (e) { } }
      else if (n === 3 && r.len >= 28 && dv.getUint16(r.p + 26, true) === 3) { const l = src.rec[2005]; if (l && l.len >= 24) { const m = dv.getUint16(l.p + 22, true); const nm = GSPI.dec(u8.slice(l.p + 24, l.p + 24 + Math.min(m, l.len - 24))).replace(/\0.*$/, '').trim(); if (nm) obj(id).d.name = nm.replace(/\[(\d+)\]/g, (q, d) => [...d].map(c => String.fromCharCode(0x2080 + +c)).join('')); } } } // 방식 3: 이름표(2005)를 측정값 이름으로
    return id; };
  sec.objs.forEach((s, i) => {
    let P = s.par.map(j => map[j]); let id = null;
    if (s.k === 23 || s.k === 59 || s.k === 19) P = P.filter(v => v != null && v !== -1);
    if (s.code === 77) { map[i] = null; return; } // 반복된 상: 반복 객체가 그린다
    if (s.code !== 76 && s.code !== 89 && P.some(v => v == null)) { map[i] = null; skipped++; (GSPI.miss = GSPI.miss || []).push('dep:' + s.code + '/' + s.k + '@' + sec.type); return; }
    const po = j => obj(P[j]);
    try {
      switch (s.k === 23 ? 62 : (s.rec[2216] && s.rec[8004]) ? 0 : s.code) {
        case 0: {
          if (s.rec[2216] && s.rec[8004]) { // 그림
            const pic = F.pics[dv.getUint16(s.rec[8004].p, true)]; if (!pic || !pic.src) break;
            const m = s.rec[2216], a = D(m, 0), b = D(m, 8), tx = D(m, 16), c = D(m, 24), d = D(m, 32), ty = D(m, 40);
            const TL = W(tx, ty), TR = W(tx + a * pic.w, ty + c * pic.w), BL = W(tx + b * pic.h, ty + d * pic.h);
            if (Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9 && Math.abs(a - d) < 1e-9 && a > 0) id = add({ t: 'picture', k: 'free', p: [], d: { src: pic.src, w: pic.w, h: pic.h, ww: TR.x - TL.x, x: TL.x, y: TL.y }, color: 'ink' }).id;
            else { const q = [TL, TR, BL].map(w => { const pid = P0(w); const po = obj(pid); po.hidden = true; po.showLabel = false; return pid; }); id = add({ t: 'picture', k: 'pts', p: q, d: { src: pic.src, w: pic.w, h: pic.h }, color: 'ink' }).id; }
            obj(id).hidden = !!(s.fl & 1); map[i] = id; return;
          }
          if (s.k === 4 || s.k === 41) { const r = s.rec[2201]; if (!r) break; const w = W(D(r, 0), D(r, 8)); id = P0(w); if (s.k === 41) { obj(id).isOrigin = true; pend.O = id; } break; }
          if (s.k === 39) { id = ensureCoord(); const c = obj(id); if (c) c.given = true; map[i] = id; return; } // 도구의 '좌표계' 주어진 것
          if (s.k === 19 || s.k === 59) { const r = s.rec[2300]; if (!r) break; const q = s.rec[2200]; const sx = q ? dv.getInt16(q.p, true) : dv.getInt16(r.p + 12, true), sy = q ? dv.getInt16(q.p + 2, true) : dv.getInt16(r.p + 14, true); id = text(s, GSPI.markup(u8, r.p + 18, r.p + r.len), sx, sy); obj(id).hidden = !!(s.fl & 1); if (q) { const w = dv.getInt16(q.p + 4, true) - sx; if (w > 60 && obj(id).d.text.length > 30) obj(id).d.wrap = w + 24; } break; }
          const T = toks(s); if (!T) break;
          if (s.k === 57) { id = valAt(s, 'func', [], { expr: GSPI.expr(T.t, () => null), form: T.form, notation: 'f' }); break; }
          if (s.k !== 79) { id = valAt(s, 'calc', [], { expr: GSPI.expr(T.t, () => null) }); break; } // 부모 없는 계산값(상수 식): k 는 단위 종류(48 거리·49 각·50 넓이·51 없음)
          let v = D(T.r, T.r.len - 2 * T.n - 8); try { const e = GSPI.expr(T.t, () => null); if (/^[\d.\s+\-*/^()pie]+$/.test(e) && /\d|pi/.test(e)) { const x = Function('return (' + e.replace(/\^/g, '**').replace(/\bpi\b/g, 'Math.PI').replace(/\be\b/g, 'Math.E') + ')')(); if (isFinite(x)) v = x; } } catch (er) { } // 값은 식(토큰)이 기준
          id = valAt(s, 'param', [], { v: isFinite(v) ? v : 1, min: -10, max: 10, step: 0.1, unit: 'none' }); break;
        }
        case 76: case 89: { // 반복: [깊이 값], 원상들, 사상별 상들, 그 뒤 연쇄 객체
          const r = s.rec[2314]; const npre = r ? dv.getUint16(r.p + 6, true) || 1 : 1, nm = r ? dv.getUint32(r.p + 8, true) || 1 : 1, depth = r ? dv.getUint32(r.p + 16, true) : 3;
          const Q = P.slice(); const depthV = s.code === 89 ? Q.shift() : null; if (s.code === 89 && depthV == null) break;
          const pre = Q.slice(0, npre), maps = []; for (let m = 0; m < nm; m++) maps.push(Q.slice(npre * (m + 1), npre * (m + 2)));
          if (pre.length !== npre || pre.some(v => v == null) || maps.some(m => m.length !== npre || m.some(v => v == null))) break;
          id = add({ t: 'iter', k: 'geo', p: [...pre, ...maps.flat(), ...(depthV != null ? [depthV] : [])], d: { pre, maps, depth: Math.min(400, depth || 3), depthV, final: false } }).id; break;
        }
        case 92: { if (P[0] == null || obj(P[0]).t !== 'iter') break; const r = s.rec[2317]; const sx = r ? dv.getInt16(r.p + 12, true) : 10, sy = r ? dv.getInt16(r.p + 14, true) : 10; id = add({ t: 'table', k: 'iter', p: P.filter(v => v != null), d: { sx, sy } }).id; map[i] = id; return; }
        case 1: id = mkMid(P[0]); break;
        case 2: id = mkStraight('segment', P[0], P[1]); break;
        case 63: id = mkStraight('line', P[0], P[1]); break;
        case 64: id = mkStraight('ray', P[0], P[1]); break;
        case 3: id = mkCircle(P[0], P[1]); break;
        case 4: id = mkCircleR(P[0], P[1]); break;
        case 5: id = mkPerp(P[0], P[1]); break;
        case 6: id = mkPar(P[0], P[1]); break;
        case 7: id = mkBis(P[0], P[1], P[2]); break;
        case 8: id = mkPoly(P); break;
        case 10: id = mkCInt(P[0]); break;
        case 9: id = mkInt(P[0], P[1], 0); break;
        case 11: case 12: case 13: case 14: {
          let k = (s.code === 12 || s.code === 14) ? 1 : 0; const A = po(0), B = po(1);
          if (s.code >= 13) { if (GSPI.opt.cc) k = 1 - k; }
          else { const L = isStraight(A) ? A : B; if (L.k === 'perp' && GSPI.opt.perp) k = 1 - k; }
          id = mkInt(P[0], P[1], k); break;
        }
        case 15: {
          const r = s.rec[2003], path = po(0); let t = D(r, 4);
          if (path.t === 'circle' || path.t === 'cinterior') { const c = D(r, 4), sn = D(r, 12); t = mod(Math.atan2(sn, c) / TAU, 1); }
          else if (path.isAxis) { const q = obj(path.p[1]); const u = (q && q.d.u) || (q && obj(q.p[0]) && obj(q.p[0]).d.u) || 1; t = (t - 0.5) * GSPI.AXIS_PX / (u * PXCM) * (path.isAxis === 'y' ? -1 : 1); } // y축은 화면 아래쪽이 + 방향 // 축 위의 점: 원점에서 화면 200px 범위를 0~1로 잰 값
          else if (path.t === 'fplot') { const lo = path.d.xmin ?? -10, hi = path.d.xmax ?? 10; t = lo + t * (hi - lo); }
          id = mkOn(P[0], isFinite(t) ? t : 0.5); if (path.t === 'polygon' && isFinite(t)) obj(id).d.pe = t; else if ((path.k === 'perp' || path.k === 'par') && !path.isAxis && isFinite(t)) obj(id).d.pl = t; break; // 다각형: GSP 는 「변 번호 + 변 위의 비율」로 저장 → 불러온 뒤 둘레 비율로 바꿈
        }
        case 80: id = mkArcCPP(P[0], P[1], P[2]); break; // 첫 점에서 둘째 점까지 반시계 방향 (GSP 와 같음) // 중심과 두 점으로 정한 호
        case 81: id = mkArc3(P[0], P[1], P[2]); break; // 세 점을 지나는 호
        case 35: id = mkLocus(P[2], P[0]); break;
        case 97: { // 매개변수로 움직이는 자취: [자취를 그릴 객체, 매개변수, 연쇄…]
          const prm = po(1); if (!prm || prm.t !== 'value') break; const r = s.rec[2306]; id = mkLocus(P[1], P[0]);
          if (r && r.len >= 20) { let a = D(r, 0), b = D(r, 8); if (isFinite(a) && isFinite(b) && b > a) { if (prm.k === 'param' && (a < (prm.d.min ?? 0) || b > (prm.d.max ?? 10))) { prm.d.min = Math.min(prm.d.min ?? 0, a); prm.d.max = Math.max(prm.d.max ?? 10, b); } const lo = prm.d.min ?? 0, sp = (prm.d.max ?? 10) - lo; if (sp > 0) obj(id).d.dom = [(a - lo) / sp, (b - lo) / sp]; } obj(id).d.n = dv.getUint32(r.p + 16, true) || undefined; }
          break;
        }
        case 93: id = mkInt(P[0], P[1], 0); break; // 직선류와 다각형 둘레의 교점 (반직선이면 첫 교점)
        case 95: id = add({ t: 'point', k: 'onv', p: [P[1], P[0]], d: {} }).id; break; // 값으로 정한 경로 위의 점: [값, 경로]
        case 101: case 102: case 96: { // 사용자 변환의 상: [상, 원상 객체, 변환의 원상 점, 연쇄…, 상]
          const src = P[2], dst = P[0], pre = P[1]; const r = s.rec[2306]; const ns = r && r.len >= 20 ? dv.getUint32(r.p + 16, true) : 0;
          doc.cxf = doc.cxf || []; if (!doc.cxf.some(t => t.pre === src && t.img === dst)) doc.cxf.push({ id: Date.now() + doc.cxf.length, name: '사용자 변환 ' + (doc.cxf.length + 1), pre: src, img: dst });
          if (s.code === 101) id = add({ t: 'point', k: 'cxf', p: [pre, src, dst] }).id;
          else if (s.code === 102) id = add({ t: 'locus', k: 'cxf', p: [pre, src, dst], d: ns ? { n: Math.min(ns, 2000) } : {} }).id;
          else id = add({ t: 'picture', k: 'cxf', p: [pre, src, dst], d: { n: ns ? Math.max(12, Math.min(64, Math.round(Math.sqrt(ns) / 4))) : 24 } }).id;
          break;
        }
        case 91: { // 표: 칸 글자를 읽어 고정 행으로 (마지막 행은 실시간 값)
          const r = s.rec[2317]; const p = P.filter(v => v != null); if (!r || !p.length) break;
          const sx = dv.getInt16(r.p + 12, true), sy = dv.getInt16(r.p + 14, true); const nc = p.length;
          const txt = GSPI.dec(u8.slice(r.p + 30, r.p + r.len)).replace(/\0[\s\S]*$/, '');
          const groups = []; let dep = 0, cur = null, row = null; const rowsTxt = [];
          for (let k = 0; k < txt.length; k++) { const ch = txt[k];
            if (dep === 0 && ch === '0') { row = []; rowsTxt.push(row); continue; }
            if (ch === '<') { if (dep === 0) cur = ''; dep++; if (txt[k + 1] === 'T') { const m = /^<T([0-9A-F]+)x/.exec(txt.slice(k)); if (m) { const n = parseInt(m[1], 16); const start = k + m[0].length; const bytes = GSPX.utf8(txt.slice(start)); const t = new TextDecoder().decode(bytes.slice(0, n)); cur += t; k = start + t.length - 1; continue; } } continue; }
            if (ch === '>') { dep--; if (dep === 0 && row) row.push(cur); continue; }
          }
          const data = rowsTxt.filter(rw => rw.length === nc); const body = data.slice(1, -1); // 첫 행은 머리글, 마지막 행은 실시간
          const rows = body.map(rw => rw.map(c => { const v = parseFloat(String(c).replace(/[−–]/g, '-')); return isFinite(v) ? v : c; }));
          id = add({ t: 'table', k: 'tab', p, d: { sx, sy, rows, live: true } }).id; map[i] = id; return;
        }
        // 변환 (원본 종류를 그대로 따름)
        case 16: id = mkXf(P[0], { type: 'tr', vec: [P[1], P[2]] }); break;
        case 21: { const r = s.rec[2003]; id = mkXf(P[0], { type: 'tr', dist: D(r, 32) / PXCM, ang: D(r, 20) }); break; }
        case 27: { const r = s.rec[2003]; id = mkXf(P[0], { type: 'rot', c: P[1], ang: D(r, 20) }); break; }
        case 30: { const r = s.rec[2003]; id = mkXf(P[0], { type: 'dil', c: P[1], r: D(r, 4) }); break; }
        case 33: id = mkXf(P[0], { type: 'dil', c: P[1], rV: P[2] }); break;
        case 34: id = mkXf(P[0], { type: 'ref', m: P[1] }); break;
        case 17: { const r = s.rec[2003]; id = mkXf(P[0], { type: 'tr', mode: 'rect', dx: D(r, 4) / PXCM, dy: D(r, 24) / PXCM }); break; } // 가로·세로 고정 평행이동
        case 28: id = mkXf(P[0], { type: 'rot', c: P[1], angP: [P[2], P[3], P[4]] }); break; // 세 점으로 표시한 각만큼 회전
        case 32: id = mkXf(P[0], { type: 'dil', c: P[1], rP: [P[2], P[3], P[4]] }); break; // 세 점으로 표시한 비율로 확대
        // 좌표계
        case 52: { const r = s.rec[2003]; if (P[0] != null) { pend.O = P[0]; pend.V = null; obj(P[0]).isOrigin = true; } const o = add({ t: 'point', k: 'unit', p: [P[0]], d: { u: D(r, 4) / PXCM } }); giveLabel(o, false); o.ps = 1; id = o.id; pend.U = id; break; }
        case 54: id = P[0]; break;
        case 55: { const r = s.rec[2003]; const O = obj(P[0]).p[0]; const o = add({ t: 'point', k: 'unit', p: [O], d: { u: D(r, 4) / PXCM, axis: 'y' } }); giveLabel(o, false); o.ps = 1; id = o.id; pend.V = id; break; }
        case 121: map[i] = null; return; // 슬라이더 눈금(장식)
        case 58: { // 축: 그 위의 점(축 위의 점)을 위해 숨은 직선으로 둔다
          const O = pend.O, U = pend.U, pc = sec.objs[s.par[1]] && sec.objs[s.par[1]].code;
          if (O == null || U == null) { map[i] = -1; return; }
          let Q = pc === 52 ? U : pc === 55 && pend.V != null ? pend.V : null;
          if (Q == null) { Q = mkXf(U, { type: 'rot', c: O, ang: 90 }); const q = obj(Q); q.hidden = true; q.showLabel = false; q.label = ''; }
          const L = mkStraight('line', O, Q); const l = obj(L); if (!l) { map[i] = -1; return; } l.hidden = true; l.isAxis = pc === 52 ? 'x' : 'y'; map[i] = L; return;
        }
        case 61: {
          const O = pend.O, U = pend.U; if (O == null || U == null) break;
          const co = add({ t: 'coord', k: 'c', p: pend.V ? [O, U, pend.V] : [O, U], d: { grid: !(s.fl & 1), form: pend.V ? 'rect' : 'square' } });
          const axes = s.par.map(j => sec.objs[j]).filter(x => x && x.code === 58); if (axes.length && axes.every(x => x.fl & 1)) co.hidden = true;
          if (!doc.coordId) doc.coordId = co.id; id = co.id;
          sec.objs.forEach((x, j) => { if (map[j] === -1) map[j] = co.id; });
          map[i] = id; return;
        }
        // 측정값
        case 36: id = valAt(s, 'len', [P[0]]); break;
        case 37: id = valAt(s, 'dist', [P[0], P[1]]); break;
        case 41: id = valAt(s, 'angle', [P[0], P[1], P[2]]); break;
        case 42: id = valAt(s, 'area', [P[0]]); break;
        case 44: id = valAt(s, 'arclen', [P[0]]); break;
        case 46: id = valAt(s, 'radius', [P[0]]); break;
        case 49: { id = valAt(s, 'coords', [P[0], P[1]]); const q = pos(s, 2300); if (q) Object.assign(obj(id).d, q); break; }
        case 65: id = valAt(s, 'x', [P[0], P[1]]); break;
        case 66: id = valAt(s, 'y', [P[0], P[1]]); break;
        case 87: id = valAt(s, 'slope', [P[0], P[1]]); break;
        case 94: id = valAt(s, 'ptval', [P[0]]); break;
        case 47: id = valAt(s, 'ratio3', [P[0], P[1], P[2]]); break;
        case 50: case 51: { id = valAt(s, 'eq', [P[0], P[1]]); const r = s.rec[2300]; if (r) Object.assign(obj(id).d, { sx: dv.getInt16(r.p + 12, true), sy: dv.getInt16(r.p + 14, true) }); break; }
        case 67: { const r = s.rec[2003]; const o = add({ t: 'point', k: 'plot', p: [P[0]], d: { x: D(r, 4), y: D(r, 12), polar: false } }); giveLabel(o, false); id = o.id; break; }
        case 48: case 71: case 78: {
          const T = toks(s); if (!T) break; const expr = GSPI.expr(T.t, n => P[n]);
          const isF = s.code !== 48; id = valAt(s, isF ? 'func' : 'calc', [...new Set(P)], isF ? { expr, form: T.form, notation: 'f' } : { expr });
          break;
        }
        case 72: { const r = s.rec[2306]; const f = add({ t: 'fplot', k: 'fn', p: [P[1], P[0]], d: { fn: P[0], xmin: D(r, 0), xmax: D(r, 8) } }); f.label = obj(P[0]).label; id = f.id; break; }
        case 69: { const o = add({ t: 'point', k: 'plot', p: [P[2], P[0], P[1]], d: { xV: P[0], yV: P[1], polar: false } }); giveLabel(o, false); id = o.id; break; }
        case 90: case 73: { const r = s.rec[2300]; if (!r) break; id = text(s, GSPI.markup(u8, r.p + 18, r.p + r.len), dv.getInt16(r.p + 12, true), dv.getInt16(r.p + 14, true)); obj(id).hidden = !!(s.fl & 1); if (obj(id).d.text.length > 90) obj(id).d.wrap = 620; map[i] = id; return; }
        case 62: {
          const r = s.rec[2310]; if (!r || r.len < 24) break;
          const ty = dv.getUint16(r.p + 12, true), sub = dv.getUint16(r.p + 14, true);
          const sx = dv.getInt16(r.p + 20, true), sy = dv.getInt16(r.p + 22, true);
          const tmp = {}; label(s, tmp); const txt = tmp.label || '버튼';
          if (ty === 5) { id = add({ t: 'button', k: 'b', p: [], d: { act: 'link', sx, sy, text: txt } }).id; links.push({ id, page: sub }); }
          else if ((ty === 0 || ty === 1) && sub !== 3) id = add({ t: 'button', k: 'b', p: P.filter(v => v != null), d: { act: 'hide', sx, sy, text: txt } }).id; // 숨기기/보이기: ty 0 = 지금 보임(누르면 숨김), 1 = 지금 숨김
          else if (ty === 2) id = add({ t: 'button', k: 'b', p: P.filter(v => v != null), d: { act: 'anim', sx, sy, text: txt } }).id;
          else if (ty === 3 && P.length === 2 && P.every(v => v != null)) id = add({ t: 'button', k: 'b', p: P.slice(), d: { act: 'move', sx, sy, text: txt, speed: [2, 6, 15, 0][sub] ?? 6 } }).id;
          else if (ty === 4 && P[0] != null) id = add({ t: 'button', k: 'b', p: [P[0]], d: { act: 'scroll', sx, sy, text: txt, mode: sub === 1 ? 'center' : 'tl' } }).id;
          else if (ty === 6 && r.len >= 26) { const n = dv.getUint16(r.p + 24, true); const url = GSPI.dec(u8.slice(r.p + 26, r.p + 26 + Math.min(n, r.len - 26))).replace(/\0.*$/, ''); id = add({ t: 'button', k: 'b', p: [], d: { act: 'url', sx, sy, text: txt, url } }).id; }
          else if (ty === 7) { const p = P.filter(v => v != null && obj(v) && obj(v).t === 'button'); if (p.length) id = add({ t: 'button', k: 'b', p, d: { act: 'present', sx, sy, text: txt, seq: sub === 1 ? 'seq' : 'sim', pause: sub === 1 ? dv.getUint16(r.p + 16, true) : 1 } }).id; }
          if (id != null) { obj(id).hidden = !!(s.fl & 1); applySty(s, obj(id)); obj(id).color = GSPI.color(...s.rgb); }
          map[i] = id; if (id == null) skipped++; return;
        }
      }
    } catch (e) { id = null; }
    if (id == null) { map[i] = null; skipped++; (GSPI.miss = GSPI.miss || []).push(s.code + '/' + s.k); return; }
    map[i] = id;
    const o = obj(id); if (o.k === 'xf') o.showLabel = false;
    if (!['value', 'text', 'button', 'coord'].includes(o.t) && s.code !== 54) fin(s, id);
    else if (o.t === 'value') { label(s, o); o.hidden = !!(s.fl & 3); if (s.rgb.some(v => v)) o.color = GSPI.color(...s.rgb); } // 2: GSP 가 화면에 보이지 않게 둔 값
    applySty(s, o);
  });
  return skipped;
};
/* 교점 번호 보정: GSP에서 보이던 교점이 여기서 정의되지 않으면(호·선분 밖을 고른 경우) 다른 교점으로 바꿔 본다 */
GSPI.AXIS_PX = 200;
GSPI.UNIT = { 0x100: 'rad', 0x101: '°', 0x200: 'px', 0x201: 'cm', 0x202: 'in' }; // GSP 계산기 단위 토큰
// GSP 의 수선·평행선 위 점: 통과점 + (t − 0.5)·V. V 는 기준 직선의 벡터(평행선) 또는 그것을 화면에서 시계 방향으로 90° 돌린 벡터(수선)
GSPI.lineVec = (o, depth = 0) => {
  const g = G[o.id]; if (!g || depth > 20) return null;
  if (o.t === 'line' && (o.k === 'perp' || o.k === 'par')) { const r = obj(o.p[1]); const v = r && GSPI.lineVec(r, depth + 1); if (!v) return null; return o.k === 'par' ? v : { x: v.y, y: -v.x }; }
  return g.a && g.b ? { x: g.b.x - g.a.x, y: g.b.y - g.a.y } : null;
};
GSPI.fixInts = () => {
  recompute();
  for (const o of doc.objs) { // 수선·평행선 위의 점: GSP 매개변수 → 앱 매개변수
    if (o.t !== 'point' || o.k !== 'on' || o.d.pl == null) continue; const L = obj(o.p[0]), g = G[L.id], T = G[L.p[0]], V = GSPI.lineVec(L); const tg = o.d.pl; delete o.d.pl; if (!g || !T || !V) continue;
    const pos = { x: T.x + (tg - 0.5) * V.x, y: T.y + (tg - 0.5) * V.y }, d = { x: g.b.x - g.a.x, y: g.b.y - g.a.y }, dd = d.x * d.x + d.y * d.y; if (dd > 1e-18) { o.d.t = ((pos.x - g.a.x) * d.x + (pos.y - g.a.y) * d.y) / dd; recompute(); }
  }
  for (const o of doc.objs) { // 다각형 위의 점: 변 매개변수 → 둘레 비율
    if (o.t !== 'point' || o.k !== 'on' || o.d.pe == null) continue; const g = G[o.p[0]]; const pe = o.d.pe; delete o.d.pe; if (!g || !g.pts) continue;
    const n = g.pts.length, e = Math.floor(mod(pe, n)), f = mod(pe, n) - e, L = polyLens(g.pts, true), tot = L[L.length - 1]; if (tot > 1e-12) { o.d.t = (L[e] + f * (L[e + 1] - L[e])) / tot; recompute(); }
  }
  recompute();
  for (const o of doc.objs) {
    if (o.t !== 'point' || o.k !== 'int' || G[o.id] || o.p.some(id => !G[id])) continue;
    o.d.i = 1 - (o.d.i || 0); recompute(); if (!G[o.id]) { o.d.i = 1 - o.d.i; recompute(); }
  }
};
function P0(w) { return P(w.x, w.y); }

async function importGSPFile(file) {
  let F;
  try { F = GSPI.parse(await file.arrayBuffer()); } catch (e) { return toast('GSP 파일을 열 수 없습니다: ' + e.message); }
  const pages = [], tools = []; let skipped = 0;
  stashPage(); const keep = { doc, sel }; const links = [];
  try {
    for (const sec of F.secs) {
      if (sec.type !== 1 && sec.type !== 2) continue;
      doc = newDoc(); doc.prefs.autoLabel = false; reindex(); sel = []; if (sec.angle === 0) doc.prefs.deg = false; else if (sec.angle >= 1) { doc.prefs.deg = true; doc.prefs.directed = sec.angle === 2; } // 2: 방향 있는 도
      const L = []; skipped += GSPI.build(F, sec, L); GSPI.fixInts(); if (sec.scroll) doc.objs.forEach(o => { if (o.d && o.d.sx != null) { o.d.sx -= sec.scroll.x; o.d.sy -= sec.scroll.y; } }); // 글·값·버튼 위치는 화면 기준
      doc.prefs.autoLabel = true;
      if (sec.type === 1) { pages.push({ name: sec.name || '페이지 ' + (pages.length + 1), doc, view: { ox: -(sec.scroll ? sec.scroll.x : 0), oy: -(sec.scroll ? sec.scroll.y : 0), s: PXCM } }); links.push(L); }
      else if (doc.objs.length) {
        recompute(); const csPart = o => (o.t === 'coord' && o.given) || ((o.isOrigin || o.k === 'unit') && doc.objs.some(c => c.t === 'coord' && c.given && c.p.includes(o.id))); sel = doc.objs.filter(o => !['text', 'button'].includes(o.t) && !csPart(o)).map(o => o.id); // 주어진 좌표계의 부분만 뺀다 (도구가 직접 만드는 좌표계는 도구 객체)
        const t = buildTool(sec.name || '도구 ' + (tools.length + 1));
        if (!t.err && sec.givens && sec.map) { const ord = sec.givens.map(i => sec.map[i]); const at = g => { const k = ord.indexOf(g.id); return k < 0 ? 999 : k; }; t.givens.sort((a, b) => at(a) - at(b)); } // GSP 의 주어진 것 순서(1204)
        if (!t.err) { const vis = new Set(doc.objs.filter(o => !o.hidden).map(o => o.id)); t.shown = t.shown.filter(id => vis.has(id)); t.steps = t.objs.map(o => (vis.has(o.id) ? '' : '(숨김) ') + describe(obj(o.id))); tools.push(t); }
      }
    }
  } finally { doc = keep.doc; sel = keep.sel; reindex(); }
  if (!pages.length) pages.push({ name: file.name.replace(/\.gsp$/i, ''), doc: newDoc(), view: { ox: 0, oy: 0, s: PXCM } });
  if (tools.length) pages[0].doc.tools = (pages[0].doc.tools || []).concat(tools);
  const first = book.pages.length;
  appendBook({ pages });
  links.forEach((L, pi) => { const pdoc = book.pages[first + pi].doc; L.forEach(({ id, page }) => { const b = pdoc.objs.find(o => o.id === id); const tgt = book.pages[first + page]; if (b && tgt) b.d.pid = tgt.id; }); });
  recompute(); refresh(); scheduleSave();
  toast(`‘${file.name}’에서 페이지 ${pages.length}개` + (tools.length ? `, 사용자 도구 ${tools.length}개(첫 페이지)` : '') + '를 열었습니다' + (skipped ? ` · 지원하지 않는 객체 ${skipped}개는 건너뛰었습니다` : ''));
}

/* ================= JavaSketchpad(HTML) ================= */
function importJSP(txt, name) {
  const m = txt.match(/PARAM\s+NAME\s*=\s*"?Construction"?\s+VALUE\s*=\s*"([\s\S]*?)"\s*>/i); if (!m) return toast('JavaSketchpad 작도를 찾지 못했습니다');
  // GSP는 한글을 CP949 바이트 그대로 내보낸다 → 다시 해석
  const fix = s => { if (!/[\u0080-ÿ]/.test(s) || /[Ā-￿]/.test(s)) return s; try { return new TextDecoder('euc-kr').decode(Uint8Array.from([...s].map(c => c.charCodeAt(0) & 255))); } catch (e) { return s; } };
  const src = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const re = /\{(\d+)\}\s*([A-Za-z][A-Za-z0-9 ]*?)\s*\(((?:[^;()']|'[^']*')*)\)((?:\([^)]*\))*)\s*(\[(?:[^\]']|'[^']*')*\])?\s*;/g;
  const args = s => { const out = []; let cur = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === "'") { q = !q; cur += c; continue; } if (c === ',' && !q) { out.push(cur.trim()); cur = ''; continue; } cur += c; } if (cur.trim() !== '') out.push(cur.trim()); return out.map(a => /^'.*'$/s.test(a) ? fix(a.slice(1, -1)) : +a); };
  stashPage(); const keep = { doc, sel }; let skipped = 0; doc = newDoc(); doc.prefs.autoLabel = false; reindex(); sel = [];
  const map = {}; const pend = {}; let k;
  const W = (px, py) => ({ x: px / PXCM, y: -py / PXCM });
  const COLORS = { red: 'red', blue: 'blue', green: 'green', black: 'ink', magenta: 'magenta', yellow: 'gold', cyan: 'teal', gray: 'gray', white: '#ffffff' };
  const rpn = (s, refs) => {
    const st = []; for (const t of s.trim().split(/\s+/)) {
      if (/^[A-Z]$/.test(t)) st.push('#' + refs[t.charCodeAt(0) - 65] + ' ');
      else if (t === 'x') st.push('x');
      else if (/^-?[\d.]+$/.test(t)) st.push(t);
      else if (t === '!') st.push('(-' + st.pop() + ')');
      else if ('+-*/^'.includes(t) && t.length === 1) { const b = st.pop(), a = st.pop(); st.push('(' + a + t + b + ')'); }
      else if (/^@f[A-Z]$/.test(t)) st.push('#' + refs[t.charCodeAt(2) - 65] + ' (' + st.pop() + ')');
      else if (/^@/.test(t)) { const f = t.slice(1).replace(/_$/, ''); const nm = { arcsin: 'asin', arccos: 'acos', arctan: 'atan' }[f] || f; st.push(nm + '(' + st.pop() + ')'); }
    } return (st.pop() || '0').replace(/^\((.*)\)$/s, '$1');
  };
  try {
    while ((k = re.exec(src))) {
      const n = +k[1], cmd = k[2].trim(), a = args(k[3]), ex = [...k[4].matchAll(/\(([^)]*)\)/g)].map(x => args(x[1])), opt = k[5] || ''; let id = null;
      const R = i => map[a[i]];
      try {
        switch (cmd) {
          case 'Point': { const w = W(a[0], a[1]); id = P(w.x, w.y); if (pend.wantO) { obj(id).isOrigin = true; } break; }
          case 'FixedPoint': { const w = W(a[0], a[1]); id = P(w.x, w.y); break; }
          case 'Midpoint': id = mkMid(R(0)); break;
          case 'Segment': id = mkStraight('segment', R(1), R(0)); break;
          case 'Line': id = mkStraight('line', R(1), R(0)); break;
          case 'Ray': id = mkStraight('ray', R(1), R(0)); break;
          case 'Circle': id = mkCircle(R(0), R(1)); break;
          case 'Circle by radius': id = mkCircleR(R(0), R(1)); break;
          case 'Perpendicular': id = mkPerp(R(1), R(0)); break;
          case 'Parallel': id = mkPar(R(1), R(0)); break;
          case 'Bisector': id = mkBis(R(0), R(1), R(2)); break;
          case 'Intersect': case 'Intersect1': id = mkInt(R(0), R(1), 0); break;
          case 'Intersect2': id = mkInt(R(0), R(1), 1); break;
          case 'Point on object': { const pth = obj(R(0)); let t = a[1]; if (pth.t === 'circle') t = mod(t / TAU, 1); else if (pth.t === 'fplot') { const lo = pth.d.xmin ?? -10, hi = pth.d.xmax ?? 10; t = lo + t * (hi - lo); } id = mkOn(R(0), t); break; }
          case 'Polygon': id = mkPoly(a.map(i => map[i])); break;
          case 'Circle interior': id = mkCInt(R(0)); break;
          case 'Locus': id = mkLocus(R(1), R(0)); break;
          case 'Reflection': id = mkXf(R(0), { type: 'ref', m: R(1) }); break;
          case 'Rotation': id = mkXf(R(0), { type: 'rot', c: R(1), ang: a[2] / D2R }); break;
          case 'Dilation': id = mkXf(R(0), { type: 'dil', c: R(1), r: a[2] }); break;
          case 'Translation': id = mkXf(R(0), { type: 'tr', mode: 'rect', dx: a[1] / PXCM, dy: a[2] / PXCM }); break;
          case 'VectorTranslation': id = mkXf(R(0), { type: 'tr', vec: [R(1), R(2)] }); break;
          case 'FixedText': id = add({ t: 'text', k: 'cap', d: { text: GSPI.sub(a[2]), sx: a[0], sy: a[1] - 12, size: 14 } }).id; break;
          case 'Length': id = mkValue('len', [R(0)], { sx: a[1], sy: a[2] - 12 }); break;
          case 'Distance': id = mkValue('dist', [R(0), R(1)], { sx: a[2], sy: a[3] - 12 }); break;
          case 'Radius': id = mkValue('radius', [R(0)], { sx: a[1], sy: a[2] - 12 }); break;
          case 'Area': id = mkValue('area', [R(0)], { sx: a[1], sy: a[2] - 12 }); break;
          case 'Perimeter': id = mkValue('perim', [R(0)], { sx: a[1], sy: a[2] - 12 }); break;
          case 'Circumference': id = mkValue('circum', [R(0)], { sx: a[1], sy: a[2] - 12 }); break;
          case 'Angle': id = mkValue('angle', [R(0), R(1), R(2)], { sx: a[3], sy: a[4] - 12 }); break;
          case 'Slope': id = mkValue('slope', [R(0)], { sx: a[1], sy: a[2] - 12 }); break;
          case 'Coordinates': id = mkValue('coords', [R(0), R(1)], { sx: a[2], sy: a[3] - 12 }); break;
          case 'Abscissa': id = mkValue('x', [R(0), R(1)], { sx: a[2], sy: a[3] - 12 }); break;
          case 'Ordinate': id = mkValue('y', [R(0), R(1)], { sx: a[2], sy: a[3] - 12 }); break;
          case 'Parameter': id = mkValue('param', [], { v: a[0], min: -10, max: 10, step: 0.1, unit: 'none', sx: a[1], sy: a[2] - 12 }); break;
          case 'Calculate': { const refs = (ex[0] || []).map(i => map[i]); id = mkValue('calc', [...new Set(refs)], { expr: rpn(a[3], refs), sx: a[0], sy: a[1] - 12 }); break; }
          case 'Function': { const refs = (ex[0] || []).map(i => map[i]); id = mkValue('func', [...new Set(refs)], { expr: rpn(a[3], refs), form: 'yx', notation: 'f', sx: a[0], sy: a[1] - 12 }); break; }
          case 'FunctionPlot': { const f = add({ t: 'fplot', k: 'fn', p: [R(1), R(0)], d: { fn: R(0), xmin: a[3], xmax: a[4] } }); f.label = obj(R(0)).label; id = f.id; break; }
          case 'PlotXY': { const o = add({ t: 'point', k: 'plot', p: [R(1), R(2), R(0)], d: { xV: R(2), yV: R(0), polar: false } }); giveLabel(o, false); id = o.id; break; }
          case 'UnitPoint': { pend.O = R(0); obj(R(0)).isOrigin = true; const o = add({ t: 'point', k: 'unit', p: [R(0)], d: { u: a[1] / PXCM } }); giveLabel(o, false); id = pend.U = o.id; break; }
          case 'SquareUnitPoint': id = R(0); break;
          case 'RectangularUnitPoint': { const o = add({ t: 'point', k: 'unit', p: [pend.O], d: { u: a[1] / PXCM, axis: 'y' } }); giveLabel(o, false); id = pend.V = o.id; break; }
          case 'HorizontalAxis': case 'VerticalAxis': map[n] = -1; continue;
          case 'CoordSysByAxes': { const co = add({ t: 'coord', k: 'c', p: pend.V ? [pend.O, pend.U, pend.V] : [pend.O, pend.U], d: { grid: !/hidden/.test(opt), form: pend.V ? 'rect' : 'square' } }); if (!doc.coordId) doc.coordId = co.id; for (const key in map) if (map[key] === -1) map[key] = co.id; map[n] = co.id; continue; }
          case 'ShowButton': case 'HideButton': case 'ToggleVisibilityButton': { const refs = (ex[0] || []).map(i => map[i]).filter(v => v != null); id = add({ t: 'button', k: 'b', p: refs, d: { act: 'hide', sx: a[0], sy: a[1] - 12, text: String(a[2]).split('|').pop() } }).id; break; }
          case 'AnimateButton': { const refs = (ex[0] || []).map(i => map[i]).filter(v => v != null); id = add({ t: 'button', k: 'b', p: refs.slice(0, 1), d: { act: 'anim', sx: a[0], sy: a[1] - 12, text: a[2] || '움직이기' } }).id; break; }
        }
      } catch (e) { id = null; }
      if (id == null) { map[n] = null; skipped++; continue; }
      map[n] = id; const o = obj(id);
      const lab = opt.match(/label\('([^']*)'\)/); if (lab) { o.label = GSPI.sub(fix(lab[1])); o.showLabel = true; }
      if (/\bhidden\b/.test(opt)) o.hidden = true;
      const c = opt.match(/color\((\d+),(\d+),(\d+)\)/); if (c) o.color = GSPI.color(+c[1], +c[2], +c[3]); else { const nm = Object.keys(COLORS).find(x => new RegExp('\\b' + x + '\\b').test(opt)); if (nm) o.color = COLORS[nm]; }
      if (o.t !== 'point' && o.t !== 'value' && o.t !== 'text') { o.w = /thickLine/.test(opt) ? 3 : /mediumLine/.test(opt) ? 2 : 1; if (/dashed/.test(opt)) o.dash = 1; }
      if (isInterior(o)) o.alpha = 0.45;
    }
  } finally { doc.prefs.autoLabel = true; var nd = doc; doc = keep.doc; sel = keep.sel; reindex(); }
  appendBook({ pages: [{ name: String(name || 'JavaSketchpad').replace(/\.html?$/i, ''), doc: nd, view: { ox: 0, oy: 0, s: PXCM } }] });
  recompute(); refresh(); scheduleSave();
  toast(`JavaSketchpad 작도를 새 페이지로 열었습니다` + (skipped ? ` · 지원하지 않는 명령 ${skipped}개는 건너뛰었습니다` : ''));
}
