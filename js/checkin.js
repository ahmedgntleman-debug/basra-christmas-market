// Tickets inside the staff app: send a ticket on WhatsApp, and the door scanner page (#/checkin).
import { sb, h, toast, errText, modal, fmtDate, fmtDateTime, waLink, $ } from './common.js';
import { S, can, refresh, unitOf, themeOf } from './state.js';
import { qrSVG, ticketCode, ticketLink, startScanner, parseTicket } from './qr.js';
import { sfx } from './festive.js';

export async function openTicket(r) {
  if (!r.ticket_token) return toast('حدّث الصفحة لعرض التذكرة', { error: true });
  const E = S.edition, T = themeOf(), U = unitOf(), url = ticketLink(r.ticket_token), code = ticketCode(r.ticket_token);
  const when = r.start_date === r.end_date ? fmtDate(r.start_date) : `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`;
  const text = `${T.icon} ${E.name}\nتذكرتك الإلكترونية — ${U.one} ${r.kiosk_codes.join('، ')}\n📅 ${when}${E.event_time ? ' · ' + E.event_time : ''}${E.venue ? '\n📍 ' + E.venue : ''}${r.guests ? '\n👥 ' + r.guests + ' أشخاص' : ''}\n🎫 رمز التذكرة: ${code}\n${url}\nأظهر رمز QR عند الدخول. ${T.greeting}`;
  const svg = await qrSVG(url, { size: 220, dark: T.c.dark, eye: T.c.primary });
  const md = modal({ title: '🎫 تذكرة ' + (r.customer_name || ''), body: [
    h('div', { class: 'qr-poster', style: { '--a': T.c.dark, '--b': T.c.primary, '--g': T.c.gold } },
      h('h3', {}, r.kiosk_codes.join(' · ')), h('p', {}, [r.customer_name, when, r.guests && '👥 ' + r.guests].filter(Boolean).join(' · ')),
      h('div', { class: 'qp-code', html: svg }), h('strong', { class: 'qp-cta', dir: 'ltr', style: { letterSpacing: '4px', fontSize: '22px' } }, code),
      r.checked_in_at ? h('span', { class: 'pub-badge on' }, '✓ دخل ' + fmtDateTime(r.checked_in_at)) : null),
    !r.customer_phone ? h('p', { class: 'hint', style: { margin: 0 } }, 'لا يوجد رقم هاتف للعميل؛ سيفتح واتساب لتختار جهة الاتصال.') : null],
    footer: [
      h('a', { class: 'btn wa', target: '_blank', rel: 'noopener', href: r.customer_phone ? waLink(r.customer_phone, text) : 'https://wa.me/?text=' + encodeURIComponent(text) }, 'إرسال على واتساب'),
      h('a', { class: 'btn', target: '_blank', rel: 'noopener', href: url }, 'فتح التذكرة'),
      h('button', { class: 'btn', onclick: () => navigator.clipboard.writeText(url).then(() => toast('تم نسخ رابط التذكرة')) }, 'نسخ الرابط'),
      h('button', { class: 'btn', onclick: () => md.close() }, 'إغلاق')] });
}

// ---------------- door scanner ----------------
export function pageCheckin(root) {
  const E = S.edition, U = unitOf();
  const video = h('video', { class: 'ck-video', playsinline: true, muted: true });
  const result = h('div', { class: 'ck-result' }, h('span', { class: 'hint' }, 'وجّه الكاميرا نحو رمز QR في تذكرة الزبون، أو اكتب رمز التذكرة.'));
  const codeIn = h('input', { class: 'in', dir: 'ltr', placeholder: 'رمز التذكرة (8 أحرف) أو رابطها', style: { textTransform: 'uppercase', letterSpacing: '2px' } });
  const camBtn = h('button', { class: 'btn primary' }, '📷 تشغيل الكاميرا');
  let stop = null, busy = false;
  const list = h('div', { class: 'ck-list' });

  const byToken = t => S.reservations.find(r => r.ticket_token === t);
  const byCode = c => S.reservations.filter(r => r.ticket_token && ticketCode(r.ticket_token).startsWith(c));
  async function handle(text) {
    if (busy) return; busy = true;
    try {
      const p = parseTicket(text);
      if (!p) return show('bad', 'رمز غير معروف', 'هذا ليس رمز تذكرة صالحاً.');
      let r = p.token ? byToken(p.token) : null;
      if (!r && p.code) { const m = byCode(p.code); if (m.length === 1) r = m[0]; else if (m.length > 1) return show('bad', 'الرمز غير كافٍ', 'اكتب الرمز كاملاً (8 أحرف).'); }
      const token = r?.ticket_token || p.token;
      if (!token) return show('bad', 'التذكرة غير موجودة', 'لا توجد تذكرة بهذا الرمز في «' + E.name + '».');
      if (!r) { // a ticket from another project
        const { data: t } = await sb.rpc('get_ticket', { p_token: token });
        return show('bad', t ? 'تذكرة مشروع آخر' : 'التذكرة غير موجودة', t ? `هذه التذكرة لـ «${t.edition.name}». افتح ذلك المشروع لتسجيل دخولها.` : '');
      }
      const { data, error } = await sb.rpc('check_in', { p_token: token, p_undo: false });
      if (error) return show('bad', 'تعذر التسجيل', errText(error));
      const who = `${r.customer_name || 'بدون اسم'} — ${U.one} ${r.kiosk_codes.join('، ')}${r.guests ? ' · 👥 ' + r.guests : ''}`;
      if (data.ok) { show('ok', '✓ أهلاً وسهلاً — دخول مسموح', who, r); await refresh(); }
      else if (data.reason === 'already') show('warn', '⚠ استُخدمت هذه التذكرة من قبل', `${who}\nدخل ${fmtDateTime(data.at)}`, r);
      else if (data.reason === 'cancelled') show('bad', '✕ حجز ملغى', who);
      else show('bad', 'التذكرة غير موجودة', '');
    } finally { setTimeout(() => { busy = false; }, 1200); }
  }
  function show(kind, title, detail, r) {
    sfx(kind === 'ok' ? 'success' : 'error');
    try { navigator.vibrate?.(kind === 'ok' ? 80 : [60, 60, 60]); } catch {}
    result.className = 'ck-result ' + kind;
    result.replaceChildren(...[h('strong', {}, title), detail ? h('span', { style: { whiteSpace: 'pre-line' } }, detail) : null,
      kind === 'warn' && r ? h('button', { class: 'btn small', onclick: async () => { await sb.rpc('check_in', { p_token: r.ticket_token, p_undo: true }); await refresh(); toast('أُلغي تسجيل الدخول'); } }, '↺ إلغاء تسجيل دخوله') : null].filter(Boolean));
  }
  camBtn.onclick = async () => {
    if (stop) { stop(); stop = null; camBtn.textContent = '📷 تشغيل الكاميرا'; video.hidden = true; return; }
    try { video.hidden = false; stop = await startScanner(video, handle); camBtn.textContent = '■ إيقاف الكاميرا'; }
    catch (e) { video.hidden = true; toast('تعذر تشغيل الكاميرا: اسمح للموقع باستخدام الكاميرا، أو اكتب رمز التذكرة.', { error: true }); }
  };
  video.hidden = true;
  codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') { handle(codeIn.value); codeIn.select(); } });
  const drawList = () => {
    const live = S.reservations.filter(r => r.status !== 'cancelled');
    const inn = live.filter(r => r.checked_in_at).sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at));
    const guests = inn.reduce((a, r) => a + (r.guests || 0), 0);
    list.replaceChildren(
      h('div', { class: 'ck-stats' }, h('div', {}, h('b', { class: 'num' }, inn.length), ' / ', h('span', { class: 'num' }, live.length), h('small', {}, 'حجز دخل')),
        guests ? h('div', {}, h('b', { class: 'num' }, guests), h('small', {}, 'شخص دخلوا')) : ''),
      inn.length ? h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['الوقت', 'العميل', U.many, 'الأشخاص'].map(t => h('th', {}, t)))),
        h('tbody', {}, inn.slice(0, 100).map(r => h('tr', {}, h('td', {}, fmtDateTime(r.checked_in_at)), h('td', {}, r.customer_name || '—'), h('td', {}, r.kiosk_codes.join('، ')), h('td', {}, r.guests ?? '')))))) : h('p', { class: 'hint' }, 'لم يدخل أحد بعد.'));
  };
  drawList();
  root.replaceChildren(h('div', { class: 'checkin' },
    h('section', { class: 'panel' }, h('div', { class: 'panel-h' }, h('h2', {}, '▦ تسجيل الدخول عند الباب — ' + E.name)),
      h('div', { class: 'ck-row' }, camBtn, codeIn, h('button', { class: 'btn', onclick: () => { handle(codeIn.value); codeIn.select(); } }, 'تحقق')),
      video, result),
    h('section', { class: 'panel' }, h('div', { class: 'panel-h' }, h('h2', {}, 'من دخل')), list)));
  root._refresh = drawList;
  return () => { stop?.(); };
}
