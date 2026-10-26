// Reservations list, customers, reports, settings.
import {
  sb, h, $, $$, toast, errText, money, fmtNum, fmtDate, fmtDateLong, fmtDateTime, todayISO, addDays, daysBetween,
  computeStatuses, statusBg, STATUS_LABEL, PAY_LABEL, RES_LABEL, ROLE_LABEL, DEFAULT_COLORS, badge, modal, confirmBox, exportRows, printHTML, esc,
} from './common.js';
import { S, can, refresh, settings, colors, kioskById, codeSort, loadEditions, switchEdition, DEFAULT_CONTRACT } from './state.js';
import { openBooking, openReservation, openPayment, openCustomer, field } from './booking.js';
import { listModels } from './assistant.js';

const numCell = (v, unknown = '—') => h('td', { class: 'money' }, v == null ? h('span', { class: 'hint' }, unknown) : h('span', { class: 'num' }, fmtNum(v)));

function exportBar(getRows, columns, name, title) {
  return h('div', { class: 'exportbar' },
    h('button', { class: 'btn small', onclick: () => exportRows(getRows(), columns, name, 'xlsx') }, 'Excel'),
    h('button', { class: 'btn small', onclick: () => exportRows(getRows(), columns, name, 'csv') }, 'CSV'),
    h('button', { class: 'btn small', onclick: () => printTable(title, getRows(), columns) }, 'طباعة / PDF'));
}
function printTable(title, rows, columns) {
  const money = new Set(columns.filter(c => c.money).map(c => c.label));
  const body = rows.map(r => '<tr>' + columns.map(c => `<td class="${c.money ? 'money' : ''}">${esc(c.money ? fmtNum(c.value(r)) : c.value(r))}</td>`).join('') + '</tr>').join('');
  const foot = columns.some(c => c.sum) ? '<tfoot><tr>' + columns.map((c, i) => `<td class="${c.money ? 'money' : ''}">${c.sum ? fmtNum(rows.reduce((a, r) => a + (Number(c.value(r)) || 0), 0)) : i === 0 ? 'المجموع' : ''}</td>`).join('') + '</tr></tfoot>' : '';
  printHTML(title, `<h1>${esc(title)}</h1><p class="meta">${esc(S.edition.name)} — طُبع ${esc(fmtDateTime(new Date()))} — ${rows.length} سجل</p>
<table><thead><tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${body}</tbody>${foot}</table>`);
}

// ================= reservations =================
const RES_COLUMNS = [
  { label: 'العميل', value: r => r.customer_name || 'حجز مؤقت' },
  { label: 'الهاتف', value: r => r.customer_phone || '' },
  { label: 'الأكشاك', value: r => r.kiosk_codes.join('، ') },
  { label: 'من', value: r => fmtDate(r.start_date) },
  { label: 'إلى', value: r => fmtDate(r.end_date) },
  { label: 'الأيام', value: r => r.days },
  { label: 'المبلغ الكلي', value: r => r.total ?? '', money: true, sum: true },
  { label: 'المدفوع', value: r => r.paid, money: true, sum: true },
  { label: 'المتبقي', value: r => r.remaining ?? '', money: true, sum: true },
  { label: 'موعد التسديد', value: r => fmtDate(r.next_due_date) },
  { label: 'حالة الدفع', value: r => PAY_LABEL[r.pay_status] },
  { label: 'حالة الحجز', value: r => RES_LABEL[r.status] },
  { label: 'ملاحظات', value: r => r.notes || '' },
];

export function pageReservations(root) {
  const q = h('input', { class: 'in', type: 'search', placeholder: 'بحث بالاسم أو الهاتف أو رقم الكشك' });
  const st = h('select', { class: 'in' }, h('option', { value: 'live' }, 'الحجوزات الفعّالة'), h('option', { value: 'confirmed' }, 'المؤكدة'), h('option', { value: 'held' }, 'المؤقتة'), h('option', { value: 'cancelled' }, 'الملغاة'), h('option', { value: '' }, 'الكل'));
  const pay = h('select', { class: 'in' }, h('option', { value: '' }, 'كل حالات الدفع'), Object.entries(PAY_LABEL).filter(([k]) => k !== 'cancelled').map(([k, v]) => h('option', { value: k }, v)));
  const groups = [...new Set(S.kiosks.map(k => k.grp).filter(Boolean))].sort();
  const grp = h('select', { class: 'in' }, h('option', { value: '' }, 'كل المجموعات'), groups.map(g => h('option', { value: g }, 'أكشاك ' + g)));
  const sortSel = h('select', { class: 'in' }, h('option', { value: 'new' }, 'الأحدث أولاً'), h('option', { value: 'kiosk' }, 'حسب رقم الكشك'), h('option', { value: 'remaining' }, 'الأعلى متبقياً'), h('option', { value: 'deadline' }, 'أقرب موعد تسديد'));
  const tableBox = h('div');
  const rows = () => {
    const s = q.value.trim().toLowerCase().replace(/\s+/g, '');
    let list = S.reservations.filter(r =>
      (st.value === '' || (st.value === 'live' ? r.status !== 'cancelled' : r.status === st.value)) &&
      (!pay.value || r.pay_status === pay.value) &&
      (!grp.value || r.kiosk_ids.some(id => kioskById(id)?.grp === grp.value)) &&
      (!s || [(r.customer_name || ''), (r.customer_company || ''), (r.customer_phone || ''), r.kiosk_codes.join(' ')].join(' ').toLowerCase().replace(/\s+/g, '').includes(s)));
    const by = {
      new: (a, b) => b.created_at.localeCompare(a.created_at),
      kiosk: (a, b) => codeSort(a.kiosk_codes[0] || '', b.kiosk_codes[0] || ''),
      remaining: (a, b) => (b.remaining ?? -1) - (a.remaining ?? -1),
      deadline: (a, b) => (a.next_due_date || '9999').localeCompare(b.next_due_date || '9999'),
    }[sortSel.value];
    return list.sort(by);
  };
  const draw = () => {
    const list = rows();
    if (!list.length) { tableBox.replaceChildren(h('div', { class: 'empty' }, h('strong', {}, S.reservations.length ? 'لا توجد حجوزات مطابقة' : 'لا توجد حجوزات بعد'), S.reservations.length ? 'غيّر البحث أو الفلاتر.' : 'ابدأ من الخريطة: اضغط على كشك متوفر ثم «حجز هذا الكشك».')); return; }
    const sum = f => list.reduce((a, r) => a + (f(r) || 0), 0);
    tableBox.replaceChildren(h('div', { class: 'table-wrap' }, h('table', { class: 't' },
      h('thead', {}, h('tr', {}, ['العميل', 'الأكشاك', 'الفترة', 'الأيام', 'المبلغ', 'المدفوع', 'المتبقي', 'الدفع', 'الحجز'].map((t, i) => h('th', { class: i >= 4 && i <= 6 ? 'money' : '' }, t)))),
      h('tbody', {}, list.map(r => h('tr', { class: 'click', onclick: () => openReservation(r.id) },
        h('td', {}, h('strong', {}, r.customer_name || 'حجز مؤقت'), r.customer_phone ? h('div', { class: 'hint num' }, r.customer_phone) : null),
        h('td', {}, h('b', {}, r.kiosk_codes.join('، '))),
        h('td', {}, `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`),
        h('td', {}, r.days),
        numCell(r.total, 'غير محدد'), numCell(r.paid), numCell(r.remaining),
        h('td', {}, badge('pay', r.pay_status, PAY_LABEL)),
        h('td', {}, badge('res', r.status, RES_LABEL))))),
      h('tfoot', {}, h('tr', {}, h('td', { colspan: 4 }, `${list.length} حجز`),
        numCell(sum(r => r.total)), numCell(sum(r => r.paid)), numCell(sum(r => r.remaining)), h('td', { colspan: 2 }))))));
  };
  [q, st, pay, grp, sortSel].forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', draw));
  root.replaceChildren(
    h('div', { class: 'pagebar' },
      can.book() ? h('button', { class: 'btn primary', onclick: () => openBooking() }, 'حجز جديد') : null,
      can.pay() ? h('button', { class: 'btn', onclick: () => openPayment() }, 'إضافة دفعة') : null,
      h('div', { class: 'filters' }, q, st, pay, grp, sortSel),
      exportBar(rows, RES_COLUMNS, 'reservations-' + S.edition.slug, 'تقرير الحجوزات')),
    tableBox);
  draw();
  root._refresh = draw;
}

// ================= customers =================
export function pageCustomers(root) {
  const q = h('input', { class: 'in', type: 'search', placeholder: 'بحث بالاسم أو الشركة أو الهاتف أو رقم الكشك' });
  const scope = h('select', { class: 'in' }, h('option', { value: 'edition' }, 'المشاركون في هذه النسخة'), h('option', { value: 'all' }, 'كل العملاء'));
  const box = h('div');
  const agg = () => {
    const m = new Map();
    for (const r of S.reservations) {
      if (!r.customer_id || r.status === 'cancelled') continue;
      const a = m.get(r.customer_id) || { n: 0, kiosks: new Set(), total: 0, paid: 0, remaining: 0, unpriced: 0 };
      a.n++; r.kiosk_codes.forEach(c => a.kiosks.add(c)); a.paid += r.paid;
      if (r.total == null) a.unpriced++; else { a.total += r.total; a.remaining += Math.max(0, r.remaining); }
      m.set(r.customer_id, a);
    }
    return m;
  };
  const rows = () => {
    const m = agg(), s = q.value.trim().toLowerCase().replace(/\s+/g, '');
    return S.customers.filter(c => scope.value === 'all' || m.has(c.id))
      .map(c => ({ ...c, a: m.get(c.id) || { n: 0, kiosks: new Set(), total: 0, paid: 0, remaining: 0, unpriced: 0 } }))
      .filter(c => !s || [c.name, c.company, c.phone, c.phone2, c.contact_person, [...c.a.kiosks].join(' ')].join(' ').toLowerCase().replace(/\s+/g, '').includes(s));
  };
  const cols = [
    { label: 'الاسم', value: c => c.name }, { label: 'الشركة', value: c => c.company || '' }, { label: 'الهاتف', value: c => c.phone || '' },
    { label: 'المسؤول', value: c => c.contact_person || '' }, { label: 'الفئة', value: c => c.category || '' },
    { label: 'الأكشاك', value: c => [...c.a.kiosks].sort(codeSort).join('، ') },
    { label: 'قيمة العقود', value: c => c.a.total, money: true, sum: true }, { label: 'المدفوع', value: c => c.a.paid, money: true, sum: true },
    { label: 'المتبقي', value: c => c.a.remaining, money: true, sum: true },
  ];
  const draw = () => {
    const list = rows();
    if (!list.length) { box.replaceChildren(h('div', { class: 'empty' }, h('strong', {}, 'لا يوجد عملاء مطابقون'), scope.value === 'edition' ? 'اعرض «كل العملاء» لرؤية عملاء النسخ السابقة.' : 'أضف عميلاً جديداً أو أنشئ حجزاً.')); return; }
    box.replaceChildren(h('div', { class: 'table-wrap' }, h('table', { class: 't' },
      h('thead', {}, h('tr', {}, ['الاسم', 'الهاتف', 'الأكشاك', 'العقود', 'المدفوع', 'المتبقي'].map((t, i) => h('th', { class: i >= 3 ? 'money' : '' }, t)))),
      h('tbody', {}, list.map(c => h('tr', { class: 'click', onclick: () => openCustomer(c.id) },
        h('td', {}, h('strong', {}, c.name), c.company ? h('div', { class: 'hint' }, c.company) : null),
        h('td', {}, h('span', { class: 'num' }, c.phone || '')),
        h('td', {}, [...c.a.kiosks].sort(codeSort).join('، ')),
        numCell(c.a.n ? c.a.total : null), numCell(c.a.n ? c.a.paid : null),
        h('td', { class: 'money' }, c.a.remaining ? h('b', { class: 'num', style: { color: 'var(--wine)' } }, fmtNum(c.a.remaining)) : c.a.unpriced ? h('span', { class: 'hint' }, 'بلا سعر') : h('span', { class: 'hint' }, '—'))))))));
  };
  q.oninput = draw; scope.onchange = draw;
  root.replaceChildren(h('div', { class: 'pagebar' },
    can.customers() ? h('button', { class: 'btn primary', onclick: () => openCustomer(null) }, 'عميل جديد') : null,
    h('div', { class: 'filters' }, q, scope),
    exportBar(rows, cols, 'customers-' + S.edition.slug, 'قائمة العملاء')), box);
  draw();
  root._refresh = draw;
}

// ================= reports =================
const TABS = [
  ['outstanding', 'المبالغ المتبقية'], ['payments', 'الدفعات'], ['daily', 'التحصيل اليومي'], ['availability', 'توفر الأكشاك'],
  ['reservations', 'الحجوزات حسب الفترة'], ['editions', 'مقارنة النسخ'], ['log', 'سجل النشاط'],
];
export function pageReports(root) {
  let tab = sessionStorage.getItem('bcm.rtab') || 'outstanding';
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const body = h('div', { class: 'rbody' });
  const adv = settings().advanced_reports;
  if (!adv && ['reservations', 'editions'].includes(tab)) tab = 'outstanding';
  const drawTabs = () => tabs.replaceChildren(...TABS.filter(([k]) => (k !== 'log' || can.admin()) && (adv || !['reservations', 'editions'].includes(k))).map(([k, l]) =>
    h('button', { role: 'tab', 'aria-selected': k === tab, onclick: () => { tab = k; sessionStorage.setItem('bcm.rtab', k); drawTabs(); draw(); } }, l)));
  const draw = () => ({ outstanding: rOutstanding, payments: rPayments, daily: rDaily, availability: rAvailability, reservations: rReservations, editions: rEditions, log: rLog }[tab] || rOutstanding)(body);
  drawTabs(); draw();
  root.replaceChildren(tabs, body);
  root._refresh = draw;
}

function rOutstanding(el) {
  const rows = () => S.reservations.filter(r => r.status !== 'cancelled' && (r.remaining > 0 || r.total == null))
    .sort((a, b) => (a.next_due_date || '9999').localeCompare(b.next_due_date || '9999'));
  const cols = [
    { label: 'العميل', value: r => r.customer_name || 'حجز مؤقت' }, { label: 'الهاتف', value: r => r.customer_phone || '' },
    { label: 'الأكشاك', value: r => r.kiosk_codes.join('، ') },
    { label: 'المبلغ الكلي', value: r => r.total ?? 'غير محدد', money: true, sum: true }, { label: 'المدفوع', value: r => r.paid, money: true, sum: true },
    { label: 'المتبقي', value: r => r.remaining ?? 'غير محدد', money: true, sum: true },
    { label: 'موعد التسديد', value: r => fmtDate(r.next_due_date) }, { label: 'الحالة', value: r => PAY_LABEL[r.pay_status] },
  ];
  const list = rows();
  el.replaceChildren(h('div', { class: 'pagebar' }, h('p', { class: 'hint', style: { margin: 0 } }, 'كل الحجوزات التي عليها مبلغ متبقٍ أو لم يُحدد سعرها بعد، مرتبة حسب موعد التسديد.'), exportBar(rows, cols, 'outstanding-' + S.edition.slug, 'المبالغ المتبقية')),
    reportTable(list, cols, r => openReservation(r.id)));
}

function dateRange(onChange, from = S.edition.start_date, to = S.edition.end_date) {
  const a = h('input', { class: 'in', type: 'date', value: from }), b = h('input', { class: 'in', type: 'date', value: to });
  a.onchange = b.onchange = () => onChange(a.value, b.value);
  return { el: h('div', { class: 'range' }, h('span', { class: 'hint' }, 'من'), a, h('span', { class: 'hint' }, 'إلى'), b), get: () => [a.value, b.value] };
}

function rPayments(el) {
  const first = S.payments.length ? S.payments.reduce((m, p) => p.paid_on < m ? p.paid_on : m, todayISO()) : addDays(todayISO(), -30);
  const rng = dateRange(() => draw(), first < S.edition.start_date ? first : addDays(S.edition.start_date, -60), todayISO() > S.edition.end_date ? todayISO() : S.edition.end_date);
  const cols = [
    { label: 'التاريخ', value: p => fmtDate(p.paid_on) }, { label: 'العميل', value: p => p.customer_name || '' }, { label: 'الأكشاك', value: p => p.kiosk_codes.join('، ') },
    { label: 'النوع', value: p => ({ payment: 'دفعة', refund: 'استرجاع', correction: 'تصحيح' }[p.kind]) },
    { label: 'المبلغ', value: p => p.amount, money: true, sum: true }, { label: 'الطريقة', value: p => p.method || '' },
    { label: 'ملاحظة', value: p => p.note || '' }, { label: 'سجّلها', value: p => p.staff_email || '' },
  ];
  const box = h('div');
  const rows = () => { const [a, b] = rng.get(); return S.payments.filter(p => p.paid_on >= a && p.paid_on <= b).sort((x, y) => y.paid_on.localeCompare(x.paid_on) || y.created_at.localeCompare(x.created_at)); };
  function draw() {
    const list = rows();
    const byMethod = {};
    for (const p of list) byMethod[p.method || 'غير محدد'] = (byMethod[p.method || 'غير محدد'] || 0) + p.amount;
    box.replaceChildren(
      h('p', { class: 'hint' }, 'الإجمالي حسب طريقة الدفع: ', Object.entries(byMethod).map(([k, v]) => `${k}: ${fmtNum(v)}`).join(' — ') || '—'),
      reportTable(list, cols, p => openReservation(p.reservation_id)));
  }
  el.replaceChildren(h('div', { class: 'pagebar' }, rng.el, exportBar(rows, cols, 'payments-' + S.edition.slug, 'تقرير الدفعات')), box);
  draw();
}

function rDaily(el) {
  const d = h('input', { class: 'in', type: 'date', value: todayISO() });
  const box = h('div');
  const cols = [
    { label: 'العميل', value: p => p.customer_name || '' }, { label: 'الأكشاك', value: p => p.kiosk_codes.join('، ') },
    { label: 'المبلغ', value: p => p.amount, money: true, sum: true }, { label: 'الطريقة', value: p => p.method || '' },
    { label: 'ملاحظة', value: p => p.note || '' }, { label: 'سجّلها', value: p => p.staff_email || '' }, { label: 'وقت الإدخال', value: p => fmtDateTime(p.created_at) },
  ];
  const rows = () => S.payments.filter(p => p.paid_on === d.value);
  const draw = () => {
    const list = rows();
    box.replaceChildren(h('p', {}, `مجموع ما استُلم يوم ${fmtDateLong(d.value)}: `, h('b', { class: 'num' }, money(list.reduce((a, p) => a + p.amount, 0))), ` (${list.length} عملية)`),
      reportTable(list, cols, p => openReservation(p.reservation_id)));
  };
  d.onchange = draw;
  el.replaceChildren(h('div', { class: 'pagebar' }, h('label', { class: 'range' }, h('span', { class: 'hint' }, 'اليوم'), d), exportBar(rows, cols, 'daily-' + d.value, 'التحصيل اليومي')), box);
  draw();
}

function rAvailability(el) {
  const rng = dateRange(() => draw());
  const box = h('div');
  const cols = [
    { label: 'الكشك', value: r => r.k.code }, { label: 'المجموعة', value: r => r.k.grp || '' }, { label: 'الحالة', value: r => STATUS_LABEL[r.s] },
    { label: 'الحجوزات في الفترة', value: r => r.rs.map(x => `${x.customer_name || 'مؤقت'} (${fmtDate(x.start_date)}–${fmtDate(x.end_date)})`).join('؛ ') },
  ];
  const rows = () => {
    const [a, b] = rng.get();
    const st = computeStatuses(S.kiosks, S.reservations, a, b <= a ? a : b);
    return S.kiosks.map(k => ({ k, s: st.get(k.id), rs: S.reservations.filter(r => r.status !== 'cancelled' && !r.hold_expired && r.kiosk_ids.includes(k.id) && r.start_date <= b && r.end_date >= a) }));
  };
  const draw = () => {
    const list = rows(), cnt = s => list.filter(r => r.s === s).length;
    box.replaceChildren(h('div', { class: 'legend', style: { marginBottom: '10px' } }, ['available', 'partial', 'held', 'reserved', 'disabled'].map(s => h('span', {}, h('i', { style: { background: statusBg(s, colors()) } }), `${STATUS_LABEL[s]}: ${cnt(s)}`))),
      reportTable(list, cols));
  };
  el.replaceChildren(h('div', { class: 'pagebar' }, rng.el, exportBar(rows, cols, 'availability-' + S.edition.slug, 'توفر الأكشاك')), box);
  draw();
}

function rReservations(el) {
  const rng = dateRange(() => draw());
  const box = h('div');
  const rows = () => { const [a, b] = rng.get(); return S.reservations.filter(r => r.status !== 'cancelled' && r.start_date <= b && r.end_date >= a); };
  const draw = () => box.replaceChildren(reportTable(rows(), RES_COLUMNS.slice(0, 12), r => openReservation(r.id)));
  el.replaceChildren(h('div', { class: 'pagebar' }, rng.el, exportBar(rows, RES_COLUMNS, 'reservations-range-' + S.edition.slug, 'الحجوزات حسب الفترة')), box);
  draw();
}

async function rEditions(el) {
  el.replaceChildren(h('div', { class: 'spinner' }));
  const [r, k] = await Promise.all([sb.from('reservation_summary').select('edition_id,status,total,paid,remaining,customer_id,days,kiosk_ids'), sb.from('kiosks').select('edition_id,active,rentable')]);
  if (r.error || k.error) return el.replaceChildren(h('p', { class: 'hint' }, errText(r.error || k.error)));
  const rows = S.editions.map(e => {
    const rs = r.data.filter(x => x.edition_id === e.id && x.status !== 'cancelled');
    const ks = k.data.filter(x => x.edition_id === e.id && x.active && x.rentable).length;
    const booked = new Set(rs.flatMap(x => x.kiosk_ids)).size;
    const total = rs.reduce((a, x) => a + (x.total || 0), 0), paid = rs.reduce((a, x) => a + x.paid, 0);
    return { e, n: rs.length, ks, booked, occ: ks ? Math.round(100 * booked / ks) : 0, total, paid, rate: total ? Math.round(100 * paid / total) : null, cust: new Set(rs.map(x => x.customer_id).filter(Boolean)).size };
  }).reverse();
  const cols = [
    { label: 'النسخة', value: x => x.e.name }, { label: 'الحجوزات', value: x => x.n }, { label: 'الجهات', value: x => x.cust },
    { label: 'أكشاك عليها حجز', value: x => `${x.booked} / ${x.ks}` }, { label: 'نسبة الإشغال', value: x => x.occ + '%' },
    { label: 'إيراد العقود', value: x => x.total, money: true }, { label: 'المحصل', value: x => x.paid, money: true },
    { label: 'نسبة التحصيل', value: x => x.rate == null ? '—' : x.rate + '%' },
  ];
  el.replaceChildren(h('div', { class: 'pagebar' }, h('p', { class: 'hint', style: { margin: 0 } }, 'أرقام فعلية من الحجوزات المسجلة في كل نسخة. النسخ التي لم تُسجل في النظام لا تظهر لها أرقام.'), exportBar(() => rows, cols, 'editions-compare', 'مقارنة نسخ المهرجان')), reportTable(rows, cols));
}

async function rLog(el) {
  el.replaceChildren(h('div', { class: 'spinner' }));
  const [{ data, error }, prof] = await Promise.all([sb.from('activity_log').select('*').order('at', { ascending: false }).limit(300), sb.from('profiles').select('user_id,email,full_name')]);
  if (error) return el.replaceChildren(h('p', { class: 'hint' }, errText(error)));
  const who = id => { const p = (prof.data || []).find(x => x.user_id === id); return p ? (p.full_name || p.email) : 'النظام'; };
  const ent = { reservations: 'حجز', reservation_kiosks: 'أكشاك حجز', payments: 'دفعة', kiosks: 'كشك', customers: 'عميل', editions: 'نسخة', profiles: 'مستخدم' };
  const act = { insert: 'إضافة', update: 'تعديل', delete: 'حذف' };
  const summary = x => {
    const d = x.details || {};
    if (x.action === 'update') return Object.entries(d).map(([k, v]) => `${k}: ${short(v.old)} ← ${short(v.new)}`).join('، ');
    if (x.entity === 'payments') return `${fmtNum(d.amount)} — ${d.note || ''}`;
    if (x.entity === 'reservations') return `${d.start_date || ''} → ${d.end_date || ''} ${d.agreed_amount ? '— ' + fmtNum(d.agreed_amount) : ''}`;
    return d.code || d.name || d.email || '';
  };
  const short = v => { const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—'); return s.length > 40 ? s.slice(0, 40) + '…' : s; };
  const cols = [{ label: 'الوقت', value: x => fmtDateTime(x.at) }, { label: 'المستخدم', value: x => who(x.actor) }, { label: 'العملية', value: x => `${act[x.action] || x.action} ${ent[x.entity] || x.entity}` }, { label: 'التفاصيل', value: summary }];
  el.replaceChildren(h('div', { class: 'pagebar' }, h('p', { class: 'hint', style: { margin: 0 } }, 'آخر 300 عملية. السجل لا يمكن تعديله أو حذفه.'), exportBar(() => data, cols, 'activity-log', 'سجل النشاط')), reportTable(data, cols));
}

function reportTable(list, cols, onRow) {
  if (!list.length) return h('div', { class: 'empty' }, h('strong', {}, 'لا توجد بيانات'), 'غيّر الفترة أو الفلتر.');
  return h('div', { class: 'table-wrap' }, h('table', { class: 't' },
    h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c.money ? 'money' : '' }, c.label)))),
    h('tbody', {}, list.map(r => h('tr', { class: onRow ? 'click' : '', onclick: onRow ? () => onRow(r) : null },
      cols.map(c => { const v = c.value(r); return c.money ? numCell(typeof v === 'number' ? v : null, v || '—') : h('td', {}, v); })))),
    cols.some(c => c.sum) ? h('tfoot', {}, h('tr', {}, cols.map((c, i) => c.sum ? numCell(list.reduce((a, r) => a + (typeof c.value(r) === 'number' ? c.value(r) : 0), 0)) : h('td', {}, i === 0 ? `المجموع (${list.length})` : '')))) : null));
}

// ================= settings =================
export function pageSettings(root) {
  const E = S.edition, admin = can.admin(), cfg = settings();
  const sec = (title, ...kids) => h('section', { class: 'panel' }, h('div', { class: 'panel-h' }, h('h2', {}, title)), ...kids);
  const dis = !admin;

  // --- edition info ---
  const I = {
    name: h('input', { class: 'in', value: E.name, disabled: dis }),
    slug: h('input', { class: 'in', value: E.slug, disabled: dis, dir: 'ltr' }),
    start_date: h('input', { class: 'in', type: 'date', value: E.start_date, disabled: dis }),
    end_date: h('input', { class: 'in', type: 'date', value: E.end_date, disabled: dis }),
  };
  // inquiry contacts shown on the public page (each with call + WhatsApp)
  const contactRows = [];
  const contactList = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
  const addContact = (name = '', phone = '') => {
    const n = h('input', { class: 'in', value: name, disabled: dis, placeholder: 'الاسم، مثل Mr. Samer' });
    const p = h('input', { class: 'in', value: phone, disabled: dis, inputmode: 'tel', dir: 'ltr', placeholder: '07xx xxx xxxx' });
    const st = { n, p };
    const row = h('div', { class: 'grid3', style: { alignItems: 'center' } }, n, p,
      dis ? h('span') : h('button', { type: 'button', class: 'btn small danger', style: { justifySelf: 'start' }, onclick: () => { row.remove(); contactRows.splice(contactRows.indexOf(st), 1); } }, 'حذف'));
    contactRows.push(st); contactList.append(row);
  };
  const initialContacts = (E.contacts && E.contacts.length) ? E.contacts
    : (E.contact_phone || E.contact_whatsapp) ? [{ name: '', phone: E.contact_whatsapp || E.contact_phone }] : [];
  initialContacts.forEach(c => addContact(c.name, c.phone));
  if (!initialContacts.length) addContact();
  const pub = h('input', { type: 'checkbox', checked: E.public_enabled, disabled: dis });
  const arch = h('input', { type: 'checkbox', checked: E.archived, disabled: dis });
  const publicUrl = () => new URL('public.html?e=' + encodeURIComponent(E.slug), location.href).href;
  const linkBox = h('div', { class: 'linkbox' }, h('code', { dir: 'ltr' }, publicUrl()),
    h('button', { class: 'btn small', onclick: () => navigator.clipboard.writeText(publicUrl()).then(() => toast('تم نسخ الرابط')) }, 'نسخ الرابط'),
    h('a', { class: 'btn small', href: publicUrl(), target: '_blank', rel: 'noopener' }, 'فتح الصفحة العامة'),
    h('a', { class: 'btn small wa', href: 'https://wa.me/?text=' + encodeURIComponent(`خريطة الأكشاك المتوفرة للحجز — ${E.name}\n${publicUrl()}`), target: '_blank', rel: 'noopener' }, 'مشاركة عبر واتساب'));
  const saveInfo = admin ? h('button', { class: 'btn primary', onclick: async () => {
    const patch = Object.fromEntries(Object.entries(I).map(([k, v]) => [k, v.value.trim() || null]));
    const contacts = [];
    for (const r of contactRows) {
      const name = r.n.value.trim(), phone = r.p.value.trim();
      if (!name && !phone) continue;
      if (!phone) return toast('أضف رقم الهاتف لكل جهة اتصال', { error: true });
      contacts.push({ name, phone });
    }
    patch.contacts = contacts;
    patch.contact_phone = contacts[0]?.phone || null;
    patch.contact_whatsapp = contacts[0]?.phone || null;
    if (!patch.name || !patch.slug || !patch.start_date || !patch.end_date) return toast('الاسم والرابط والتواريخ مطلوبة', { error: true });
    if (!/^[a-z0-9-]+$/.test(patch.slug)) return toast('الرابط المختصر: أحرف إنجليزية صغيرة وأرقام وشرطة فقط', { error: true });
    if (patch.end_date < patch.start_date) return toast('تاريخ النهاية قبل البداية', { error: true });
    patch.public_enabled = pub.checked; patch.archived = arch.checked;
    await saveEdition(patch, 'تم حفظ بيانات النسخة');
  } }, 'حفظ') : null;

  // --- colors ---
  const col = colors();
  const colorInputs = Object.fromEntries(Object.keys(DEFAULT_COLORS).map(k => [k, h('input', { type: 'color', value: col[k], disabled: dis })]));
  const colorRow = h('div', { class: 'colors' }, Object.entries(colorInputs).map(([k, inp]) => h('label', { class: 'check' }, inp, STATUS_LABEL[k])));

  // --- features ---
  const F = {
    reminders: h('input', { type: 'checkbox', checked: cfg.reminders, disabled: dis }),
    overdue: h('input', { type: 'checkbox', checked: cfg.reminders_overdue_only, disabled: dis }),
    days: h('input', { class: 'in', type: 'number', min: 0, max: 60, value: cfg.reminder_days, disabled: dis, style: { width: '90px' } }),
    analytics: h('input', { type: 'checkbox', checked: cfg.show_analytics, disabled: dis }),
    receipts: h('input', { type: 'checkbox', checked: cfg.receipts, disabled: dis }),
    extended: h('input', { type: 'checkbox', checked: cfg.extended_customer, disabled: dis }),
    advanced: h('input', { type: 'checkbox', checked: cfg.advanced_reports, disabled: dis }),
    contract: h('select', { class: 'in', disabled: dis, style: { maxWidth: '320px' } }, [['ask', 'اسأل في كل مرة'], ['always', 'افتح العقد تلقائياً بعد الحفظ'], ['never', 'لا تسأل (أنشئ العقد من الحجز عند الحاجة)']].map(([v, l]) => h('option', { value: v, selected: cfg.contract_prompt === v }, l))),
  };
  const tpl = h('textarea', { class: 'in', style: { minHeight: '320px', fontSize: '14px', lineHeight: 1.8 }, disabled: dis }, cfg.contract_template || DEFAULT_CONTRACT);
  const logoUrl = h('input', { class: 'in', dir: 'ltr', value: cfg.logo_url || '', disabled: dis, placeholder: 'https://…' });
  const logoFile = h('input', { type: 'file', accept: 'image/*', disabled: dis });
  logoFile.onchange = async () => {
    const f = logoFile.files[0]; if (!f) return;
    const path = `${E.id}/logo-${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
    const up = await sb.storage.from('maps').upload(path, f, { upsert: true, contentType: f.type });
    if (up.error) return toast(errText(up.error), { error: true });
    logoUrl.value = sb.storage.from('maps').getPublicUrl(path).data.publicUrl;
    toast('تم رفع الشعار — اضغط حفظ');
  };
  const saveFeatures = admin ? h('button', { class: 'btn primary', onclick: async () => {
    const settingsPatch = { ...(E.settings || {}), reminders: F.reminders.checked, reminders_overdue_only: F.overdue.checked,
      reminder_days: Math.max(0, +F.days.value || 0), show_analytics: F.analytics.checked, contract_prompt: F.contract.value,
      receipts: F.receipts.checked, extended_customer: F.extended.checked, advanced_reports: F.advanced.checked,
      contract_template: tpl.value, logo_url: logoUrl.value.trim() || null };
    const colorsPatch = Object.fromEntries(Object.entries(colorInputs).map(([k, v]) => [k, v.value]));
    await saveEdition({ settings: settingsPatch, colors: colorsPatch }, 'تم حفظ الإعدادات');
  } }, 'حفظ الإعدادات') : null;

  async function saveEdition(patch, msg) {
    const { error } = await sb.from('editions').update(patch).eq('id', E.id);
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'الرابط المختصر مستخدم لنسخة أخرى' : errText(error), { error: true });
    Object.assign(E, patch);
    toast(msg);
    window.dispatchEvent(new Event('bcm:settings'));
    pageSettings(root);
  }

  const children = [
    sec('بيانات النسخة',
      h('div', { class: 'grid2' }, field('اسم النسخة', I.name), field('الرابط المختصر (للصفحة العامة)', I.slug),
        field('تاريخ الافتتاح', I.start_date), field('تاريخ الختام', I.end_date)),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('strong', { style: { fontSize: '14px' } }, 'أرقام الاستفسار في الصفحة العامة'),
        h('span', { class: 'hint' }, 'يظهر لكل شخص زر اتصال وزر واتساب عند الضغط على كشك متوفر.'),
        contactList,
        dis ? null : h('button', { type: 'button', class: 'btn small', style: { alignSelf: 'flex-start' }, onclick: () => addContact() }, 'إضافة رقم')),
      h('label', { class: 'check' }, pub, 'الصفحة العامة مفعّلة'),
      h('label', { class: 'check' }, arch, 'نسخة مؤرشفة (منتهية)'),
      saveInfo ? h('div', {}, saveInfo) : null),
    sec('رابط خريطة الأكشاك العامة', h('p', { class: 'hint', style: { margin: 0 } }, 'شاركه على واتساب وفيسبوك وإنستغرام. يعرض الأكشاك المتوفرة والمحجوزة فقط، بدون أسماء أو أرقام أو مبالغ.'), linkBox),
    sec('ألوان الحالات على الخريطة', colorRow),
    sec('الميزات الاختيارية',
      h('label', { class: 'check' }, F.reminders, 'تنبيهات الدفعات المستحقة في الرئيسية'),
      h('div', { class: 'check', style: { paddingInlineStart: '26px', flexWrap: 'wrap' } }, 'أظهر التنبيه قبل موعد التسديد بـ', F.days, 'أيام'),
      h('label', { class: 'check', style: { paddingInlineStart: '26px' } }, F.overdue, 'أظهر المتأخرة فقط'),
      h('label', { class: 'check' }, F.analytics, 'عرض التحليلات في الرئيسية'),
      h('label', { class: 'check' }, F.receipts, 'إرفاق صور الإيصالات مع الدفعات'),
      h('label', { class: 'check' }, F.extended, 'معلومات العميل الإضافية (الشركة، المسؤول، البريد، الفئة)'),
      h('label', { class: 'check' }, F.advanced, 'التقارير المتقدمة (الحجوزات حسب الفترة، مقارنة النسخ)'),
      field('بعد حفظ الحجز — عقد الإيجار', F.contract),
      h('div', { class: 'grid2' }, field('رابط شعار الشركة (يظهر في العقد)', logoUrl), field('أو ارفع صورة الشعار', logoFile)),
      field('نص عقد الإيجار', tpl, h('span', { class: 'hint' }, 'الحقول التي تُملأ تلقائياً: {festival} {customer} {company_line} {phone} {kiosks} {start} {end} {days} {total} {paid} {remaining} {deadline} {today} {notes}')),
      admin ? h('div', { style: { display: 'flex', gap: '8px' } }, saveFeatures, h('button', { class: 'btn ghost', onclick: () => { tpl.value = DEFAULT_CONTRACT; } }, 'استعادة نص العقد الافتراضي')) : null),
  ];
  if (admin) children.push(assistantSection(sec, E, saveEdition), cloneSection(sec), usersSection(sec), backupSection(sec));
  children.push(accountSection(sec));
  if (!admin) children.unshift(h('p', { class: 'warnbox' }, 'تعديل الإعدادات متاح للمدير العام فقط.'));
  root.replaceChildren(h('div', { class: 'settings' }, children));
  root._refresh = () => {};   // don't wipe half-typed settings on live updates
}

const plusYear = iso => (+iso.slice(0, 4) + 1) + iso.slice(4);

function cloneSection(sec) {
  const E = S.edition;
  const nextYear = +E.start_date.slice(0, 4) + 1;
  const I = {
    name: h('input', { class: 'in', value: `Basra Christmas Market ${nextYear}` }),
    slug: h('input', { class: 'in', dir: 'ltr', value: `bcm-${nextYear}` }),
    start: h('input', { class: 'in', type: 'date', value: plusYear(E.start_date) }),
    end: h('input', { class: 'in', type: 'date', value: plusYear(E.end_date) }),
  };
  const C = {
    copy_map: ['الخريطة', true], copy_kiosks: ['أرقام الأكشاك وأماكنها', true], copy_categories: ['فئات الأكشاك', true],
    copy_prices: ['الأسعار الاسترشادية', false], copy_branding: ['الألوان والإعدادات', true],
  };
  const boxes = Object.fromEntries(Object.entries(C).map(([k, [, v]]) => [k, h('input', { type: 'checkbox', checked: v })]));
  const btn = h('button', { class: 'btn pine' }, 'إنشاء النسخة الجديدة');
  btn.onclick = async () => {
    if (!/^[a-z0-9-]+$/.test(I.slug.value)) return toast('الرابط المختصر: أحرف إنجليزية صغيرة وأرقام وشرطة فقط', { error: true });
    if (!(await confirmBox('إنشاء نسخة جديدة', `ستُنشأ «${I.name.value}». لن تُنسخ أي حجوزات أو دفعات، وتبقى النسخة الحالية محفوظة كما هي.`, { okLabel: 'إنشاء' }))) return;
    const p = { name: I.name.value.trim(), slug: I.slug.value.trim(), start_date: I.start.value, end_date: I.end.value, ...Object.fromEntries(Object.entries(boxes).map(([k, b]) => [k, b.checked])) };
    const { data, error } = await sb.rpc('clone_edition', { p_source: E.id, p });
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'الرابط المختصر مستخدم لنسخة أخرى' : errText(error), { error: true });
    if (boxes.copy_branding.checked && E.settings) await sb.from('editions').update({ settings: E.settings }).eq('id', data);
    await loadEditions();
    await switchEdition(data);
    toast('تم إنشاء النسخة الجديدة والانتقال إليها');
  };
  return sec('إنشاء نسخة جديدة من المهرجان',
    h('p', { class: 'hint', style: { margin: 0 } }, 'لنسخة السنة القادمة. اختر ما يُنسخ من النسخة الحالية «' + E.name + '».'),
    h('div', { class: 'grid2' }, field('الاسم', I.name), field('الرابط المختصر', I.slug), field('الافتتاح', I.start), field('الختام', I.end)),
    h('div', { class: 'grid2' }, Object.entries(C).map(([k, [l]]) => h('label', { class: 'check' }, boxes[k], l))),
    h('div', {}, btn));
}

function usersSection(sec) {
  const box = h('div', { class: 'spinner' });
  const out = sec('المستخدمون والصلاحيات',
    h('p', { class: 'hint', style: { margin: 0 } }, 'لإضافة موظف: من لوحة Supabase ← Authentication ← Add user (بريد وكلمة مرور). يظهر هنا بصلاحية «اطلاع فقط»، ثم اختر له الصلاحية المناسبة.'),
    box);
  sb.from('profiles').select('*').order('created_at').then(({ data, error }) => {
    if (error) return box.replaceWith(h('p', { class: 'hint' }, errText(error)));
    box.replaceWith(h('div', { class: 'table-wrap' }, h('table', { class: 't' },
      h('thead', {}, h('tr', {}, ['المستخدم', 'الاسم', 'الصلاحية'].map(t => h('th', {}, t)))),
      h('tbody', {}, data.map(p => {
        const sel = h('select', { class: 'in', disabled: p.user_id === S.user.id }, Object.entries(ROLE_LABEL).map(([k, v]) => h('option', { value: k, selected: p.role === k }, v)));
        const nm = h('input', { class: 'in', value: p.full_name || '', placeholder: 'اسم الموظف' });
        sel.onchange = async () => { const { error } = await sb.from('profiles').update({ role: sel.value }).eq('user_id', p.user_id); toast(error ? errText(error) : 'تم تغيير الصلاحية', { error: !!error }); };
        nm.onchange = async () => { const { error } = await sb.from('profiles').update({ full_name: nm.value.trim() || null }).eq('user_id', p.user_id); toast(error ? errText(error) : 'تم حفظ الاسم', { error: !!error }); };
        return h('tr', {}, h('td', { dir: 'ltr', style: { textAlign: 'start' } }, p.email), h('td', {}, nm), h('td', {}, sel));
      })))),
      h('p', { class: 'hint' }, 'المدير العام: كل شيء. مدير الحجوزات: الحجوزات والعملاء والدفعات. المسؤول المالي: الدفعات والعملاء. اطلاع فقط: مشاهدة بدون تعديل.'));
  });
  return out;
}

function accountSection(sec) {
  const p1 = h('input', { class: 'in', type: 'password', autocomplete: 'new-password' });
  const p2 = h('input', { class: 'in', type: 'password', autocomplete: 'new-password' });
  const btn = h('button', { class: 'btn' }, 'تغيير كلمة المرور');
  btn.onclick = async () => {
    if (p1.value.length < 8) return toast('كلمة المرور 8 أحرف على الأقل', { error: true });
    if (p1.value !== p2.value) return toast('كلمتا المرور غير متطابقتين', { error: true });
    const { error } = await sb.auth.updateUser({ password: p1.value });
    toast(error ? errText(error) : 'تم تغيير كلمة المرور', { error: !!error });
    if (!error) p1.value = p2.value = '';
  };
  return sec('حسابي — ' + (S.user.email || ''), h('div', { class: 'grid2' }, field('كلمة مرور جديدة', p1), field('تأكيدها', p2)), h('div', {}, btn));
}

function backupSection(sec) {
  const btn = h('button', { class: 'btn pine' }, 'تنزيل نسخة احتياطية كاملة (Excel)');
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'جارٍ التجهيز…';
    try {
      const q = (t, o) => sb.from(t).select('*').order(o, { ascending: true }).limit(100000);
      const parts = await Promise.all([q('editions', 'start_date'), q('kiosks', 'code'), q('customers', 'name'), q('reservation_summary', 'created_at'),
        q('payment_list', 'created_at'), q('payment_schedules', 'due_date'), q('contracts', 'created_at'), q('documents', 'created_at'), q('profiles', 'created_at'),
        sb.from('activity_log').select('*').order('at', { ascending: false }).limit(20000)]);
      const bad = parts.find(p => p.error); if (bad) throw bad.error;
      const names = ['editions', 'kiosks', 'customers', 'reservations', 'payments', 'installments', 'contracts', 'documents', 'users', 'activity_log'];
      const wb = XLSX.utils.book_new();
      wb.Workbook = { Views: [{ RTL: true }] };
      parts.forEach((p, i) => {
        const rows = p.data.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v != null && typeof v === 'object' ? JSON.stringify(v) : v])));
        XLSX.utils.book_append_sheet(wb, rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['(empty)']]), names[i]);
      });
      XLSX.writeFile(wb, `bcm-backup-${todayISO()}.xlsx`);
      toast('تم تنزيل النسخة الاحتياطية');
    } catch (e) { toast(errText(e), { error: true }); }
    btn.disabled = false; btn.textContent = 'تنزيل نسخة احتياطية كاملة (Excel)';
  };
  return sec('النسخ الاحتياطي',
    h('p', { class: 'hint', style: { margin: 0 } }, 'ملف Excel واحد فيه كل النسخ والأكشاك والعملاء والحجوزات والدفعات والأقساط والعقود وسجل النشاط. احفظه أسبوعياً في مكان آمن.'),
    h('div', {}, btn));
}

function assistantSection(sec, E, saveEdition) {
  const cfg = settings();
  const on = h('input', { type: 'checkbox', checked: cfg.assistant });
  const key = h('input', { class: 'in', type: 'password', dir: 'ltr', value: cfg.gemini_key || '', placeholder: 'AIza…', autocomplete: 'off' });
  const model = h('input', { class: 'in', dir: 'ltr', value: cfg.gemini_model || 'gemini-2.5-flash', list: 'gem-models' });
  const dl = h('datalist', { id: 'gem-models' });
  const out = h('span', { class: 'hint' });
  const test = h('button', { class: 'btn small', onclick: async () => {
    if (!key.value.trim()) return toast('ضع المفتاح أولاً', { error: true });
    out.textContent = 'جارٍ الفحص…';
    try {
      const ms = await listModels(key.value.trim());
      dl.replaceChildren(...ms.map(m => h('option', { value: m })));
      const flash = ms.filter(m => /flash/.test(m));
      out.textContent = `المفتاح يعمل ✓ — ${ms.length} نموذج متاح. اختر نموذجاً من القائمة (يُفضّل flash).`;
      if (!ms.includes(model.value) && flash.length) model.value = flash.find(m => !/lite|preview|exp|tts|image|live/.test(m)) || flash[0];
    } catch (e) { out.textContent = 'المفتاح لا يعمل: ' + e.message; }
  } }, 'فحص المفتاح');
  const save = h('button', { class: 'btn primary', onclick: () => saveEdition({ settings: { ...(E.settings || {}), assistant: on.checked, gemini_key: key.value.trim() || null, gemini_model: model.value.trim() || 'gemini-2.5-flash' } }, 'تم حفظ إعدادات المساعد') }, 'حفظ');
  return sec('المساعد الذكي (اختياري)',
    h('p', { class: 'hint', style: { margin: 0 } }, 'يفهم الأوامر المكتوبة بالعربية مثل «احجز الكشك A1 لشركة بيبسي…» ويعرض المعاينة قبل التنفيذ. يحتاج مفتاح Google Gemini مجاني من aistudio.google.com ← Get API key. بدون المفتاح يعمل النظام بشكل طبيعي.'),
    h('label', { class: 'check' }, on, 'تفعيل المساعد الذكي'),
    h('div', { class: 'grid2' }, field('مفتاح Gemini API', key), field('النموذج', h('div', {}, model, dl))),
    h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, save, test, out),
    h('p', { class: 'warnbox' }, 'المفتاح يُحفظ في قاعدة البيانات ويراه الموظفون المسجلون فقط. مع المفتاح المجاني قد تستخدم Google النصوص المرسلة لتحسين خدماتها؛ تُرسل أسماء العملاء وأرقام الأكشاك والمبالغ فقط، ولا تُرسل أرقام الهواتف إلا إذا كتبتها في الطلب.'));
}
