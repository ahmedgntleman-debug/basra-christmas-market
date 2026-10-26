// Public availability page. Talks to ONE database function (get_public_map) that
// returns only kiosk codes, shapes and availability — never names, phones or money.
import { sb, configured, $, h, fmtDate, waLink, normDigits, DEFAULT_COLORS } from './common.js';
import { MapView } from './map.js';
import { startI18n, isEn } from './i18n.js';

const slug = new URLSearchParams(location.search).get('e') || (window.BCM_CONFIG?.DEFAULT_EDITION || 'bcm-2026');
const fromI = $('#from'), toI = $('#to'), q = $('#q');
let data = null, mv = null, selected = null, edition = null;

const TEXT = {
  available: c => `الكشك رقم ${c} متوفر للحجز.`,
  partial: c => `الكشك رقم ${c} متوفر لجزء من الفترة المحددة.`,
  reserved: c => `الكشك رقم ${c} محجوز خلال الفترة المحددة.`,
  disabled: c => `الكشك رقم ${c} غير متاح للإيجار.`,
};
const LEG = { available: 'متوفر', partial: 'متوفر جزئياً', reserved: 'محجوز', disabled: 'غير متاح' };

async function load(first) {
  if (!configured) return closed('الصفحة غير مفعّلة بعد.');
  const { data: d, error } = await sb.rpc('get_public_map', { p_slug: slug, p_from: fromI.value || null, p_to: toI.value || null });
  if (error) { if (first) closed('تعذر تحميل الخريطة. تحقق من الاتصال بالإنترنت ثم أعد تحميل الصفحة.'); return; }
  if (!d) return closed('خريطة الحجز غير متاحة حالياً.');
  data = d; edition = d.edition;
  if (first) {
    document.title = `خريطة الأكشاك المتوفرة للحجز — ${edition.name}`;
    $('#t-name').textContent = edition.name;
    fromI.value = d.from; toI.value = d.to;
    fromI.min = toI.min = addDaysISO(edition.start_date, -30);
    fromI.max = toI.max = addDaysISO(edition.end_date, 30);
    mv = new MapView($('#map'), { onSelect: k => { selected = k.code; sheet(); }, onBackground: () => { selected = null; sheet(); } });
    mv.setMap(edition.map_url, edition.map_w, edition.map_h);
  }
  const kiosks = d.kiosks.map(k => ({ ...k, id: k.code, needs_verify: false }));
  mv.setColors({ ...DEFAULT_COLORS, ...(edition.colors || {}) });
  mv.setKiosks(kiosks);
  mv.setStatuses(new Map(kiosks.map(k => [k.id, k.status])));
  if (selected) mv.setSelected([selected]);
  if (first) requestAnimationFrame(() => mv.fit());
  legend();
  filter();
  sheet();
  $('#updated').textContent = 'آخر تحديث ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', timeStyle: 'short' }).format(new Date());
}

function legend() {
  const c = { ...DEFAULT_COLORS, ...(edition.colors || {}) };
  const n = s => data.kiosks.filter(k => k.status === s).length;
  $('#legend').replaceChildren(
    ...['available', 'partial', 'reserved'].map(s => h('span', {}, h('i', { style: { background: c[s] } }), LEG[s], ' ', h('b', { class: 'num' }, n(s)))),
    h('span', {}, `${fmtDate(data.from)} – ${fmtDate(data.to)}`));
}

function filter() {
  const s = normDigits(q.value).trim().toUpperCase().replace(/\s+/g, '');
  if (!s) { mv.setHighlight(null); return; }
  const ids = data.kiosks.filter(k => k.code.toUpperCase().includes(s)).map(k => k.code);
  mv.setHighlight(ids);
  if (ids.length && ids.length <= 4) mv.fit(ids);
}

function sheet() {
  const host = $('#sheet-host');
  const k = selected && data?.kiosks.find(x => x.code === selected);
  if (!k) { host.replaceChildren(); return; }
  const c = { ...DEFAULT_COLORS, ...(edition.colors || {}) };
  const open = k.status === 'available' || k.status === 'partial';
  const msg = isEn() ? `Hello, I would like to ask about booking kiosk ${k.code} at ${edition.name} from ${fmtDate(data.from)} to ${fmtDate(data.to)}.`
    : `مرحباً، أود الاستفسار عن حجز الكشك رقم ${k.code} في ${edition.name} للفترة من ${fmtDate(data.from)} إلى ${fmtDate(data.to)}.`;
  host.replaceChildren(h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'الكشك ' + k.code },
    h('div', { class: 'row' },
      h('span', { class: 'code' }, k.code),
      h('span', { class: 'status-pill', style: { background: c[k.status] || '#888', color: '#fff', padding: '4px 12px', borderRadius: '999px', fontWeight: 600, fontSize: '13px' } }, LEG[k.status]),
      h('button', { class: 'x', 'aria-label': 'إغلاق', onclick: () => { selected = null; mv.setSelected([]); sheet(); } }, '×')),
    h('p', { class: 'msg' }, TEXT[k.status](k.code)),
    open ? h('p', { class: 'hint', style: { fontSize: '14px' } }, `للاستفسار يرجى التواصل مع إدارة ${edition.name}.`) : null,
    open && (edition.contact_phone || edition.contact_whatsapp) ? h('div', { class: 'acts' },
      edition.contact_phone ? h('a', { class: 'btn pine', href: 'tel:' + edition.contact_phone.replace(/\s/g, '') }, 'اتصال الآن') : null,
      edition.contact_whatsapp || edition.contact_phone ? h('a', { class: 'btn wa', href: waLink(edition.contact_whatsapp || edition.contact_phone, msg), target: '_blank', rel: 'noopener' }, 'استفسار عبر واتساب') : null)
      : null));
  mv.setSelected([k.code]);
}

function closed(text) {
  document.querySelector('.pub-ctl').hidden = true;
  $('#map').replaceChildren(h('p', { class: 'closed' }, text));
}
function addDaysISO(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

fromI.onchange = () => { if (toI.value < fromI.value) toI.value = fromI.value; load(); };
toI.onchange = () => { if (toI.value < fromI.value) fromI.value = toI.value; load(); };
$('#all').onclick = () => { fromI.value = edition.start_date; toI.value = edition.end_date; load(); };
q.oninput = filter;
q.onkeydown = e => { if (e.key === 'Enter') { const s = normDigits(q.value).trim().toUpperCase().replace(/\s+/g, ''); if (data.kiosks.some(k => k.code === s)) { selected = s; sheet(); mv.focus(s); } } };

startI18n();
load(true);
setInterval(() => { if (!document.hidden) load(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && data) load(); });
