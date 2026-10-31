// E-ticket page (ticket.html?t=<token>): anyone with the link sees the ticket; staff who are signed in can check it in at the door.
import { sb, configured, $, h, fmtDate, fmtDateTime, money, esc } from './common.js';
import { applyTheme, logoNode, UNITS, THEMES } from './themes.js';
import { setTerms } from './i18n.js';
import { qrSVG, ticketCode } from './qr.js';

const token = new URLSearchParams(location.search).get('t');
const root = $('#ticket');

function fail(msg) { root.replaceChildren(h('div', { class: 'tk-card tk-err' }, h('div', { class: 'tk-big' }, '🎫'), h('h2', {}, msg))); }

async function staffRole() {
  try {
    const { data } = await sb.auth.getSession(); if (!data.session) return null;
    const { data: p } = await sb.from('profiles').select('role').eq('user_id', data.session.user.id).single();
    return p?.role || null;
  } catch { return null; }
}

export function zoneOf(zones, name) { return (zones || []).find(z => z.name === name) || null; }

async function load() {
  if (!configured) return fail('الصفحة غير مفعّلة');
  if (!/^[0-9a-f-]{36}$/i.test(token || '')) return fail('رابط التذكرة غير صحيح');
  const { data: t, error } = await sb.rpc('get_ticket', { p_token: token });
  if (error) return fail('تعذر تحميل التذكرة. تحقق من الاتصال بالإنترنت.');
  if (!t) return fail('التذكرة غير موجودة');
  const E = t.edition, T = applyTheme(E.event_type || 'christmas'), U = UNITS[E.unit_kind] || UNITS.kiosk;
  setTerms({ unit: E.unit_kind || 'kiosk', noun: T.noun });
  document.title = `تذكرة — ${E.name}`;
  const role = await staffRole();
  const one = t.start_date === t.end_date;
  const zones = [...new Set(t.units.map(u => u.zone).filter(Boolean))];
  const minSpend = t.units.reduce((a, u) => a + (u.min_spend || zoneOf(E.zones, u.zone)?.min_spend || 0), 0);
  const cap = t.units.reduce((a, u) => a + (u.capacity || 0), 0);
  const state = t.status === 'cancelled' ? ['bad', '✕ ملغاة'] : t.checked_in_at ? ['used', '✓ تم الدخول ' + fmtDateTime(t.checked_in_at)] : t.status === 'held' ? ['held', 'حجز مؤقت'] : ['ok', '✓ تذكرة صالحة'];
  const qr = h('div', { class: 'tk-qr', html: await qrSVG(location.href, { size: 220, dark: T.c.dark, eye: T.c.primary }) });
  const row = (k, v) => v ? h('div', { class: 'tk-row' }, h('span', {}, k), h('b', {}, v)) : null;
  const card = h('div', { class: 'tk-card', style: { '--a': T.c.dark, '--b': T.c.primary, '--g': T.c.gold } },
    h('div', { class: 'tk-head' }, logoNode(E, 'pub'), h('div', {}, h('h1', {}, E.name), h('p', {}, [E.venue && '📍 ' + E.venue, E.event_time && '🕘 ' + E.event_time].filter(Boolean).join(' · ')))),
    h('div', { class: 'tk-state ' + state[0] }, state[1]),
    h('div', { class: 'tk-body' },
      h('div', { class: 'tk-units' }, h('span', {}, U.many), h('strong', { dir: 'ltr' }, t.units.map(u => u.code).join(' · ') || '—')),
      row('الاسم', t.customer),
      row('التاريخ', one ? fmtDate(t.start_date) : `${fmtDate(t.start_date)} – ${fmtDate(t.end_date)}`),
      row('عدد الأشخاص', t.guests ? `👥 ${t.guests}` : cap ? `حتى ${cap}` : null),
      row('المنطقة', zones.join('، ')),
      row('الحد الأدنى للطلب', minSpend ? money(minSpend) : null)),
    h('div', { class: 'tk-tear' }),
    h('div', { class: 'tk-foot' }, qr, h('div', { class: 'tk-code' }, h('span', {}, 'رمز التذكرة'), h('b', { dir: 'ltr' }, t.code)),
      h('p', { class: 'tk-hint' }, 'أظهر هذا الرمز عند الدخول. ' + (T.greeting ? T.greeting + ' ✦' : ''))));
  const tools = h('div', { class: 'tk-tools' });
  if (role && role !== 'readonly' && t.status !== 'cancelled') {
    const btn = h('button', { class: 'btn ' + (t.checked_in_at ? '' : 'primary') + ' tk-checkin' }, t.checked_in_at ? '↺ إلغاء تسجيل الدخول' : '✓ تسجيل الدخول الآن');
    btn.onclick = async () => {
      btn.disabled = true;
      const { data, error: e2 } = await sb.rpc('check_in', { p_token: token, p_undo: !!t.checked_in_at });
      btn.disabled = false;
      if (e2) return alertBox(e2.message);
      if (!data.ok && data.reason === 'already') alertBox('هذه التذكرة استُخدمت للدخول ' + fmtDateTime(data.at));
      load();
    };
    tools.append(h('span', { class: 'tk-staff' }, '👮 أنت مسجّل كموظف'), btn, h('a', { class: 'btn', href: 'index.html#/checkin' }, '▦ ماسح التذاكر'));
  }
  tools.append(h('button', { class: 'btn', onclick: () => print() }, '🖨 طباعة / حفظ PDF'));
  root.replaceChildren(card, tools);
}
function alertBox(msg) { const d = h('div', { class: 'tk-alert' }, msg); document.body.append(d); setTimeout(() => d.remove(), 4000); }

if (root) load();
