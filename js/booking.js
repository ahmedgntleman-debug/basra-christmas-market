// Reservations, payments, customers, contracts and reminders.
import {
  sb, h, $, $$, modal, toast, errText, confirmBox, parseAmount, money, fmtNum, fmtDate, fmtDateLong,
  todayISO, addDays, daysBetween, badge, PAY_LABEL, RES_LABEL, waLink, esc, fmtDateTime,
} from './common.js';
import { S, can, refresh, settings, kioskById, kioskByCode, customerById, codeSort, DEFAULT_CONTRACT } from './state.js';

const METHODS = ['نقداً', 'تحويل بنكي', 'شيك', 'بطاقة', 'أخرى'];

// ---------- small inputs ----------
function amountInput(name, value, { placeholder = 'مثال: 5 مليون أو 5,000,000' } = {}) {
  const inp = h('input', { class: 'in', name, inputmode: 'decimal', autocomplete: 'off', placeholder, value: value == null ? '' : fmtNum(value) });
  const out = h('span', { class: 'hint' });
  const upd = () => {
    const v = parseAmount(inp.value);
    out.textContent = inp.value.trim() === '' ? '' : Number.isNaN(v) ? 'مبلغ غير صالح' : '= ' + money(v);
    out.style.color = Number.isNaN(v) ? 'var(--bad)' : '';
  };
  inp.addEventListener('input', upd); upd();
  return { inp, out, get: () => parseAmount(inp.value) };
}
const field = (label, input, hint) => h('label', { class: 'f' }, h('span', {}, label), input, hint || null);

// conflicts for a kiosk set and date range (client-side preview; the database has the final word)
function conflicts(kioskIds, from, to, ignoreRes) {
  const out = [];
  for (const r of S.reservations) {
    if (r.id === ignoreRes || r.status === 'cancelled' || r.hold_expired) continue;
    if (r.end_date < from || r.start_date > to) continue;
    for (const kid of r.kiosk_ids) if (kioskIds.includes(kid)) out.push({ kiosk: kioskById(kid)?.code, r });
  }
  return out;
}

// ---------- kiosk chips editor ----------
function kioskPicker(initial = []) {
  const ids = [...initial];
  const wrap = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' } });
  const inp = h('input', { class: 'in', placeholder: 'أضف رقم كشك مثل B5', style: { width: '170px' }, autocomplete: 'off', list: 'kiosk-codes' });
  const dl = h('datalist', { id: 'kiosk-codes' }, S.kiosks.filter(k => k.active && k.rentable).map(k => h('option', { value: k.code })));
  const listeners = [];
  const draw = () => {
    wrap.textContent = '';
    for (const id of ids) {
      const k = kioskById(id);
      wrap.append(h('span', { class: 'chip' }, k?.code || '?',
        h('button', { type: 'button', 'aria-label': 'إزالة ' + (k?.code || ''), onclick: () => { ids.splice(ids.indexOf(id), 1); draw(); } }, '×')));
    }
    wrap.append(inp, dl);
    listeners.forEach(f => f());
  };
  const add = () => {
    const parts = inp.value.split(/[,،\s]+/).filter(Boolean);
    let bad = [];
    for (const p of parts) {
      const k = kioskByCode(p);
      if (!k) bad.push(p);
      else if (!ids.includes(k.id)) ids.push(k.id);
    }
    inp.value = bad.join(' ');
    if (bad.length) toast('لا يوجد كشك بالرقم: ' + bad.join('، '), { error: true });
    draw(); inp.focus();
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  inp.addEventListener('change', () => { if (kioskByCode(inp.value)) add(); });
  draw();
  return { el: wrap, ids, onChange: f => listeners.push(f), flush: () => { if (inp.value.trim()) add(); } };
}

// ---------- customer picker ----------
function customerPicker(initialId) {
  let selected = initialId ? customerById(initialId) : null;
  const box = h('div', { style: { position: 'relative' } });
  const name = h('input', { class: 'in', placeholder: 'اكتب اسم الشركة أو الشخص أو رقم الهاتف', autocomplete: 'off' });
  const list = h('div', { style: { position: 'absolute', insetInline: 0, top: '100%', zIndex: 5, background: '#fff', border: '1px solid var(--line-2)', borderRadius: '8px', boxShadow: 'var(--shadow)', maxHeight: '240px', overflow: 'auto' }, hidden: true });
  const phone = h('input', { class: 'in', placeholder: '07xx xxx xxxx', inputmode: 'tel', name: 'phone' });
  const extra = {
    company: h('input', { class: 'in' }), contact_person: h('input', { class: 'in' }), phone2: h('input', { class: 'in', inputmode: 'tel' }),
    email: h('input', { class: 'in', type: 'email' }), category: h('input', { class: 'in', placeholder: 'مثلاً: طعام، ألعاب، ملابس' }),
  };
  const newFields = h('div', { class: 'grid2' }, field('رقم الهاتف', phone),
    !settings().extended_customer ? null : h('details', { style: { gridColumn: '1/-1' } }, h('summary', { class: 'hint', style: { cursor: 'pointer' } }, 'معلومات إضافية عن العميل (اختياري)'),
      h('div', { class: 'grid2', style: { marginTop: '10px' } },
        field('اسم الشركة', extra.company), field('الشخص المسؤول', extra.contact_person),
        field('هاتف ثانٍ', extra.phone2), field('البريد الإلكتروني', extra.email), field('فئة العميل', extra.category))));
  const chosen = h('div');
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
  const search = () => {
    const q = norm(name.value);
    list.textContent = '';
    if (!q) { list.hidden = true; return; }
    const hits = S.customers.filter(c => norm(c.name).includes(q) || norm(c.company).includes(q) || norm(c.phone).includes(q)).slice(0, 8);
    if (!hits.length) { list.hidden = true; return; }
    for (const c of hits) list.append(h('button', {
      type: 'button', class: 'btn ghost', style: { width: '100%', justifyContent: 'flex-start', borderRadius: 0 },
      onmousedown: e => { e.preventDefault(); pick(c); },
    }, h('strong', {}, c.name), c.phone ? h('span', { class: 'hint num', style: { marginInlineStart: '8px' } }, c.phone) : null));
    list.hidden = false;
  };
  const pick = c => { selected = c; draw(); };
  const draw = () => {
    box.textContent = ''; chosen.textContent = '';
    if (selected) {
      box.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px solid var(--line-2)', borderRadius: '6px', background: '#f7faf8' } },
        h('div', {}, h('strong', {}, selected.name), selected.phone ? h('div', { class: 'hint num' }, selected.phone) : null),
        h('button', { type: 'button', class: 'btn small ghost', style: { marginInlineStart: 'auto' }, onclick: () => { selected = null; draw(); name.focus(); } }, 'تغيير')));
    } else {
      box.append(name, list);
      chosen.append(newFields);
    }
  };
  name.addEventListener('input', search);
  name.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 150));
  draw();
  return {
    el: h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, box, chosen),
    value: () => selected ? { customer_id: selected.id } : (name.value.trim() ? {
      new_customer: { name: name.value.trim(), phone: phone.value.trim(), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v.value.trim()])) },
    } : {}),
  };
}

// ---------- NEW RESERVATION ----------
export function openBooking({ kioskIds = [], customerId, from, to } = {}) {
  if (!can.book()) return toast('ليس لديك صلاحية إنشاء حجز', { error: true });
  const E = S.edition;
  const kp = kioskPicker(kioskIds);
  const cp = customerPicker(customerId);
  const start = h('input', { class: 'in', type: 'date', value: from || E.start_date });
  const end = h('input', { class: 'in', type: 'date', value: to || E.end_date });
  const daysOut = h('span', { class: 'hint' });
  const warn = h('div', { class: 'hint', style: { color: 'var(--bad)', fontWeight: 500 } });
  let status = 'confirmed';
  const holdSel = h('select', { class: 'in' }, [['24', '24 ساعة'], ['48', '48 ساعة'], ['72', '3 أيام'], ['168', 'أسبوع'], ['', 'بدون انتهاء']].map(([v, l]) => h('option', { value: v }, l)));
  holdSel.value = '48';
  const holdRow = field('ينتهي الحجز المؤقت بعد', holdSel, h('span', { class: 'hint' }, 'إذا لم يُؤكَّد يُحرَّر الكشك تلقائياً'));
  holdRow.hidden = true;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'نوع الحجز' },
    h('button', { type: 'button', 'aria-pressed': 'true', onclick: e => setStatus('confirmed', e) }, 'حجز مؤكد'),
    h('button', { type: 'button', 'aria-pressed': 'false', onclick: e => setStatus('held', e) }, 'حجز مؤقت'));
  function setStatus(v, e) { status = v; $$('button', seg).forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); holdRow.hidden = v !== 'held'; }

  const price = amountInput('price');
  const discount = amountInput('discount', null, { placeholder: '0' });
  const extra = amountInput('extra', null, { placeholder: '0' });
  const pay = amountInput('pay');
  const method = h('select', { class: 'in' }, METHODS.map(m => h('option', {}, m)));
  const deadline = h('input', { class: 'in', type: 'date' });
  const notes = h('textarea', { class: 'in', placeholder: 'ملاحظات (اختياري)' });

  const recheck = () => {
    const ok = start.value && end.value && end.value >= start.value;
    daysOut.textContent = ok ? `${daysBetween(start.value, end.value)} يوماً` : 'تاريخ النهاية قبل البداية';
    const c = ok ? conflicts(kp.ids, start.value, end.value) : [];
    warn.textContent = c.length ? 'محجوز في هذه الفترة: ' + [...new Set(c.map(x => `${x.kiosk} (${x.r.customer_name || 'حجز مؤقت'} ${fmtDate(x.r.start_date)}–${fmtDate(x.r.end_date)})`))].join('، ') : '';
  };
  kp.onChange(recheck); start.addEventListener('change', recheck); end.addEventListener('change', recheck);
  const fullBtn = h('button', { type: 'button', class: 'btn small ghost', onclick: () => { start.value = E.start_date; end.value = E.end_date; recheck(); } }, 'كامل المهرجان');
  recheck();

  const save = h('button', { class: 'btn primary', type: 'submit' }, 'حفظ الحجز');
  const form = h('form', { style: { display: 'contents' } },
    field('الأكشاك', kp.el), warn,
    field('العميل أو الجهة', cp.el),
    h('div', { class: 'grid2' }, field('من تاريخ', start), field('إلى تاريخ', end)),
    h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginTop: '-6px' } }, daysOut, fullBtn),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, seg, holdRow),
    field('مبلغ الإيجار المتفق عليه', price.inp, h('span', {}, price.out, h('span', { class: 'hint' }, ' — اتركه فارغاً إذا لم يُتفق على السعر بعد'))),
    h('details', {}, h('summary', { class: 'hint', style: { cursor: 'pointer' } }, 'خصم أو رسوم إضافية'),
      h('div', { class: 'grid2', style: { marginTop: '10px' } }, field('خصم', discount.inp, discount.out), field('رسوم إضافية', extra.inp, extra.out))),
    h('div', { class: 'grid3' }, field('دفعة أولى (اختياري)', pay.inp, pay.out), field('طريقة الدفع', method), field('موعد تسديد المتبقي', deadline)),
    notes);

  const m = modal({ title: 'حجز جديد', body: form, footer: [save, h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'إلغاء')] });
  save.setAttribute('form', ''); save.addEventListener('click', submit);
  form.addEventListener('submit', submit);

  async function submit(e) {
    e.preventDefault();
    kp.flush();
    if (!kp.ids.length) return toast('اختر كشكاً واحداً على الأقل', { error: true });
    const cust = cp.value();
    if (status === 'confirmed' && !cust.customer_id && !cust.new_customer) return toast('اكتب اسم العميل، أو اختر «حجز مؤقت» إذا لم يُعرف بعد', { error: true });
    if (!(end.value >= start.value)) return toast('تاريخ النهاية قبل تاريخ البداية', { error: true });
    for (const a of [price, discount, extra, pay]) if (Number.isNaN(a.get())) return toast('أحد المبالغ غير صالح', { error: true });
    if (pay.get() && price.get() == null) { /* allowed: payment before price is agreed */ }
    const p = {
      edition_id: E.id, kiosk_ids: kp.ids, start_date: start.value, end_date: end.value, status,
      hold_until: status === 'held' && holdSel.value ? new Date(Date.now() + holdSel.value * 3600e3).toISOString() : null,
      agreed_amount: price.get(), discount: discount.get() || 0, extra_charges: extra.get() || 0,
      first_payment: pay.get(), payment_method: method.value, payment_deadline: deadline.value || null,
      notes: notes.value.trim(), ...cust,
    };
    save.disabled = true; save.textContent = 'جارٍ الحفظ…';
    const { data, error } = await sb.rpc('create_reservation', { p });
    save.disabled = false; save.textContent = 'حفظ الحجز';
    if (error) return toast(errText(error), { error: true });
    m.close();
    await refresh();
    afterSave(data);
  }
}

function afterSave(resId) {
  const pref = settings().contract_prompt;
  if (pref === 'always') { toast('تم حفظ الحجز بنجاح'); return openContract(resId); }
  if (pref === 'never') return toast('تم حفظ الحجز بنجاح', { actions: [{ label: 'عرض الحجز', run: () => openReservation(resId) }] });
  toast('تم حفظ الحجز بنجاح. هل ترغب في إنشاء عقد إيجار لهذا الكشك؟', {
    actions: [{ label: 'إنشاء العقد', main: true, run: () => openContract(resId) }, { label: 'ليس الآن' }],
  });
}

// ---------- RESERVATION DETAILS ----------
export async function openReservation(id) {
  const r = S.reservations.find(x => x.id === id) || (await sb.from('reservation_summary').select('*').eq('id', id).single()).data;
  if (!r) return toast('لم يتم العثور على الحجز', { error: true });
  const pays = (await sb.from('payment_list').select('*').eq('reservation_id', id).order('created_at')).data || [];
  const cust = customerById(r.customer_id);
  const stat = (label, value, strong) => h('div', {}, h('div', { class: 'hint' }, label), h('div', { style: { fontWeight: strong ? 700 : 500, fontSize: strong ? '18px' : '15px' } }, value));
  const live = r.status !== 'cancelled';
  const acts = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
    live && can.pay() ? h('button', { class: 'btn primary', onclick: () => { m.close(); openPayment(id); } }, 'إضافة دفعة') : null,
    live && can.book() ? h('button', { class: 'btn', onclick: () => { m.close(); openEditReservation(id); } }, 'تعديل') : null,
    live && can.book() ? h('button', { class: 'btn', onclick: () => { m.close(); openChangeKiosks(id); } }, 'تغيير / نقل الأكشاك') : null,
    live && r.status === 'held' && can.book() ? h('button', { class: 'btn pine', onclick: () => confirmHold(r, m) }, 'تأكيد الحجز') : null,
    h('button', { class: 'btn', onclick: () => { m.close(); openContract(id); } }, 'عقد الإيجار'),
    live && r.remaining > 0 && r.customer_phone ? h('button', { class: 'btn wa', onclick: () => { m.close(); openReminder(id); } }, 'تذكير واتساب') : null,
    live && can.book() ? h('button', { class: 'btn danger', style: { marginInlineStart: 'auto' }, onclick: () => cancelRes(r, m) }, 'إلغاء الحجز') : null,
  );
  const payTable = pays.length ? h('div', { class: 'table-wrap' }, h('table', { class: 't' },
    h('thead', {}, h('tr', {}, ['التاريخ', 'النوع', 'المبلغ', 'الطريقة', 'ملاحظة', 'سجّلها', ''].map(t => h('th', {}, t)))),
    h('tbody', {}, pays.map(p => h('tr', {},
      h('td', {}, fmtDate(p.paid_on)),
      h('td', {}, { payment: 'دفعة', refund: 'استرجاع', correction: 'تصحيح' }[p.kind]),
      h('td', { class: 'money' }, h('span', { class: 'num', style: { color: p.amount < 0 ? 'var(--bad)' : '' } }, fmtNum(p.amount))),
      h('td', {}, p.method || ''), h('td', {}, p.note || ''), h('td', { class: 'hint' }, p.staff_email || ''),
      h('td', {}, p.receipt_path ? h('button', { class: 'btn small ghost', onclick: () => openReceipt(p.receipt_path) }, 'الإيصال') : null,
        p.kind === 'payment' && can.pay() ? h('button', { class: 'btn small ghost', onclick: () => { m.close(); openCorrection(p); } }, 'تصحيح') : null))))))
    : h('div', { class: 'hint' }, 'لا توجد دفعات مسجلة بعد.');

  const schedBox = h('div', { class: 'xbox' }), docsBox = h('div', { class: 'xbox' }), histBox = h('div', { class: 'xbox' });
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
      badge('res', r.status, RES_LABEL), badge('pay', r.pay_status, PAY_LABEL),
      r.hold_until && r.status === 'held' ? h('span', { class: 'hint' }, 'ينتهي الحجز المؤقت ' + fmtDateTime(r.hold_until)) : null),
    h('div', { class: 'grid3' },
      stat('الأكشاك', r.kiosk_codes.join('، ') || '—', true),
      stat('الفترة', `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`),
      stat('عدد الأيام', r.days + ' يوماً')),
    h('div', { class: 'grid3', style: { padding: '14px', background: '#f7faf8', borderRadius: '10px' } },
      stat('المبلغ الكلي', h('span', { class: r.total == null ? '' : 'num' }, money(r.total)), true),
      stat('المدفوع', h('span', { class: 'num' }, money(r.paid)), true),
      stat('المتبقي', h('span', { class: r.remaining == null ? '' : 'num', style: { color: r.remaining > 0 ? 'var(--wine)' : '' } }, money(r.remaining)), true),
      r.discount || r.extra_charges ? stat('السعر المتفق / خصم / إضافات', h('span', { class: 'num' }, `${fmtNum(r.agreed_amount)} / -${fmtNum(r.discount)} / +${fmtNum(r.extra_charges)}`)) : null,
      stat(r.installments ? 'القسط القادم' : 'موعد التسديد', r.next_due_date ? fmtDateLong(r.next_due_date) : 'غير محدد')),
    cust ? h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' } },
      h('div', {}, h('div', { class: 'hint' }, 'العميل'), h('button', { class: 'btn ghost', style: { padding: 0, fontWeight: 600 }, onclick: () => { m.close(); openCustomer(cust.id); } }, cust.name)),
      cust.phone ? h('a', { class: 'btn small', href: 'tel:' + cust.phone }, h('span', { class: 'num' }, cust.phone)) : null,
      cust.contact_person ? h('span', { class: 'hint' }, 'المسؤول: ' + cust.contact_person) : null)
      : h('div', { class: 'hint' }, 'حجز مؤقت بدون عميل محدد.'),
    r.notes ? h('div', {}, h('div', { class: 'hint' }, 'ملاحظات'), h('div', { style: { whiteSpace: 'pre-wrap' } }, r.notes)) : null,
    r.cancel_reason ? h('div', { class: 'hint' }, 'سبب الإلغاء: ' + r.cancel_reason) : null,
    acts,
    h('h3', { style: { margin: '4px 0 0', fontSize: '15px' } }, 'سجل الدفعات'), payTable,
    schedBox, docsBox, histBox,
    h('div', { class: 'hint' }, `أُنشئ ${fmtDateTime(r.created_at)} · آخر تعديل ${fmtDateTime(r.updated_at)}`));
  const m = modal({ title: (r.customer_name || 'حجز مؤقت') + ' — ' + (r.kiosk_codes.join('، ')), body, wide: true });
  fillExtras(r, live, m, { schedBox, docsBox, histBox });
}

// installments, saved contracts, attachments and change history of one reservation
async function fillExtras(r, live, m, { schedBox, docsBox, histBox }) {
  const [sc, ct, dc, lg] = await Promise.all([
    sb.from('payment_schedules').select('*').eq('reservation_id', r.id).order('due_date'),
    sb.from('contracts').select('*').eq('reservation_id', r.id).order('created_at', { ascending: false }),
    sb.from('documents').select('*').eq('reservation_id', r.id).order('created_at', { ascending: false }),
    can.admin() ? sb.from('activity_log').select('*').eq('entity_id', r.id).order('at', { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
  ]);
  const H3 = t => h('h3', { style: { margin: '4px 0 0', fontSize: '15px' } }, t);
  // installments
  const rows = sc.data || [];
  let cum = 0;
  const today = todayISO();
  schedBox.replaceChildren(
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, H3('الأقساط'),
      live && can.pay() ? h('button', { class: 'btn small', onclick: () => { m.close(); openSchedule(r.id, rows); } }, rows.length ? 'تعديل الأقساط' : 'جدولة أقساط') : null),
    rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 't' },
      h('thead', {}, h('tr', {}, ['موعد القسط', 'المبلغ', 'الحالة', 'ملاحظة'].map((t, i) => h('th', { class: i === 1 ? 'money' : '' }, t)))),
      h('tbody', {}, rows.map(x => {
        cum += x.amount;
        const paid = r.paid >= cum, late = !paid && x.due_date < today;
        return h('tr', {}, h('td', {}, fmtDateLong(x.due_date)), h('td', { class: 'money' }, h('span', { class: 'num' }, fmtNum(x.amount))),
          h('td', {}, h('span', { class: 'badge ' + (paid ? 'b-paid' : late ? 'b-overdue' : 'b-unpaid') }, paid ? 'مسدد' : late ? 'متأخر' : 'مستحق')),
          h('td', {}, x.note || ''));
      }))))
      : h('div', { class: 'hint' }, 'بدون أقساط. يُعتمد موعد التسديد الواحد إن وُجد.'));
  // contracts + attachments
  const docs = dc.data || [], cons = ct.data || [];
  const upload = h('input', { type: 'file', hidden: true });
  upload.onchange = async () => {
    const f = upload.files[0]; if (!f) return;
    const path = `${r.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
    const up = await sb.storage.from('documents').upload(path, f);
    if (up.error) return toast('تعذر رفع الملف: ' + errText(up.error), { error: true });
    const { error } = await sb.from('documents').insert({ reservation_id: r.id, customer_id: r.customer_id, name: f.name, storage_path: path });
    if (error) return toast(errText(error), { error: true });
    toast('تم إرفاق الملف'); m.close(); openReservation(r.id);
  };
  docsBox.replaceChildren(
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, H3('العقود والمرفقات'),
      can.pay() ? h('button', { class: 'btn small', onclick: () => upload.click() }, 'إرفاق ملف') : null, upload),
    !cons.length && !docs.length ? h('div', { class: 'hint' }, 'لا توجد عقود محفوظة أو مرفقات.') : null,
    h('ul', { class: 'filelist' },
      cons.map(c => h('li', {}, h('span', { class: 'badge b-confirmed' }, 'عقد'), h('button', { class: 'btn ghost small', onclick: () => openContract(r.id, { body: c.body }) }, c.title || 'عقد إيجار'), h('span', { class: 'hint' }, fmtDateTime(c.created_at)))),
      docs.map(d => h('li', {}, h('span', { class: 'badge' }, 'ملف'), h('button', { class: 'btn ghost small', onclick: () => openFile('documents', d.storage_path) }, d.name), h('span', { class: 'hint' }, fmtDateTime(d.created_at))))));
  // history (super admin)
  const log = (lg.data || []).filter(x => x.entity === 'reservations');
  if (log.length) histBox.replaceChildren(H3('سجل التعديلات'), h('ul', { class: 'filelist' }, log.map(x => h('li', {},
    h('span', { class: 'hint' }, fmtDateTime(x.at)),
    h('span', {}, x.action === 'insert' ? 'إنشاء الحجز' : Object.entries(x.details || {}).map(([k, v]) => `${FIELD_AR[k] || k}: ${shortV(v.old)} ← ${shortV(v.new)}`).join('، '))))));
}
const FIELD_AR = { status: 'الحالة', start_date: 'البداية', end_date: 'النهاية', agreed_amount: 'السعر', discount: 'الخصم', extra_charges: 'الإضافات', payment_deadline: 'موعد التسديد', notes: 'الملاحظات', customer_id: 'العميل', hold_until: 'انتهاء الحجز المؤقت', cancel_reason: 'سبب الإلغاء' };
const shortV = v => v == null ? '—' : typeof v === 'number' ? fmtNum(v) : String(v).slice(0, 30);

async function openFile(bucket, path) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 300);
  if (error) return toast(errText(error), { error: true });
  window.open(data.signedUrl, '_blank');
}

// ---------- INSTALLMENTS ----------
export function openSchedule(resId, existing = []) {
  const r = S.reservations.find(x => x.id === resId);
  const list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
  const sumOut = h('div', { class: 'hint' });
  const rowsState = [];
  const addRow = (date = '', amount = null, note = '') => {
    const a = amountInput('inst', amount, { placeholder: 'المبلغ' });
    const d = h('input', { class: 'in', type: 'date', value: date });
    const n = h('input', { class: 'in', value: note, placeholder: 'ملاحظة' });
    const st = { a, d, n };
    const row = h('div', { class: 'grid3', style: { alignItems: 'start' } }, h('div', {}, d), h('div', {}, a.inp, a.out),
      h('div', { style: { display: 'flex', gap: '6px' } }, n, h('button', { type: 'button', class: 'btn small danger', 'aria-label': 'حذف القسط', onclick: () => { row.remove(); rowsState.splice(rowsState.indexOf(st), 1); upd(); } }, '×')));
    a.inp.addEventListener('input', upd);
    rowsState.push(st); list.append(row); upd();
  };
  const upd = () => {
    const tot = rowsState.reduce((s, x) => s + (x.a.get() || 0), 0);
    sumOut.textContent = `مجموع الأقساط: ${money(tot)}` + (r.total != null ? ` — المبلغ الكلي ${money(r.total)}${tot !== r.total ? ' (غير متطابق)' : ''}` : '');
  };
  existing.forEach(x => addRow(x.due_date, x.amount, x.note || ''));
  // quick split helper
  const nI = h('input', { class: 'in', type: 'number', min: 1, max: 24, value: 3, style: { width: '80px' } });
  const firstI = h('input', { class: 'in', type: 'date', value: todayISO() });
  const everyI = h('input', { class: 'in', type: 'number', min: 1, value: 7, style: { width: '80px' } });
  const split = () => {
    const base = r.remaining > 0 ? r.remaining : r.total;
    if (!base) return toast('حدد سعر الحجز أولاً حتى يمكن تقسيمه', { error: true });
    const n = Math.max(1, +nI.value || 1), every = Math.max(1, +everyI.value || 7);
    rowsState.splice(0); list.textContent = '';
    const part = Math.floor(base / n / 1000) * 1000;
    for (let i = 0; i < n; i++) addRow(addDays(firstI.value || todayISO(), i * every), i === n - 1 ? base - part * (n - 1) : part);
  };
  const save = h('button', { class: 'btn primary' }, 'حفظ الأقساط');
  const m = modal({
    title: 'جدولة الأقساط — ' + (r.customer_name || '') + ' (' + r.kiosk_codes.join('، ') + ')',
    body: [h('p', { class: 'hint', style: { margin: 0 } }, `المتبقي حالياً: ${money(r.remaining)}. يُعتبر القسط مسدداً عندما يغطيه مجموع الدفعات بالترتيب.`),
      h('div', { class: 'panel', style: { padding: '12px' } }, h('div', { class: 'check', style: { flexWrap: 'wrap' } }, 'قسّم المتبقي إلى', nI, 'أقساط، أولها', firstI, 'وكل', everyI, 'يوماً',
        h('button', { type: 'button', class: 'btn small pine', onclick: split }, 'تقسيم'))),
      list, h('button', { type: 'button', class: 'btn small', style: { alignSelf: 'flex-start' }, onclick: () => addRow() }, 'إضافة قسط'), sumOut],
    footer: [save, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')], wide: true,
  });
  save.onclick = async () => {
    const rows = [];
    for (const x of rowsState) {
      const v = x.a.get();
      if (!x.d.value && !v) continue;
      if (!x.d.value || !v || Number.isNaN(v)) return toast('كل قسط يحتاج تاريخاً ومبلغاً', { error: true });
      rows.push({ reservation_id: resId, due_date: x.d.value, amount: v, note: x.n.value.trim() || null });
    }
    save.disabled = true;
    const del = await sb.from('payment_schedules').delete().eq('reservation_id', resId);
    if (del.error) { save.disabled = false; return toast(errText(del.error), { error: true }); }
    if (rows.length) {
      const { error } = await sb.from('payment_schedules').insert(rows);
      if (error) { save.disabled = false; return toast(errText(error), { error: true }); }
    }
    m.close(); await refresh(); toast(rows.length ? 'تم حفظ الأقساط' : 'تم حذف الأقساط'); openReservation(resId);
  };
}

async function confirmHold(r, m) {
  if (!r.customer_id) { m.close(); toast('أضف اسم العميل أولاً ثم أكّد الحجز', { error: true }); return openEditReservation(r.id, { confirm: true }); }
  const { error } = await sb.from('reservations').update({ status: 'confirmed', hold_until: null }).eq('id', r.id);
  if (error) return toast(errText(error), { error: true });
  m.close(); await refresh(); toast('تم تأكيد الحجز');
}

async function cancelRes(r, m) {
  const reason = h('input', { class: 'in', placeholder: 'سبب الإلغاء (اختياري)' });
  const ok = await new Promise(res => {
    let done = false;
    const c = modal({
      title: 'إلغاء الحجز', body: [h('p', { style: { margin: 0 } }, `سيتم إلغاء حجز ${r.customer_name || ''} للأكشاك ${r.kiosk_codes.join('، ')} وتصبح متوفرة. تبقى الدفعات في السجل${r.paid > 0 ? '، وإذا أعدت المبلغ سجّله كاسترجاع' : ''}.`), reason],
      footer: [h('button', { class: 'btn primary', onclick: () => { done = true; c.close(); res(true); } }, 'إلغاء الحجز'), h('button', { class: 'btn', onclick: () => c.close() }, 'رجوع')],
      onClose: () => !done && res(false),
    });
  });
  if (!ok) return;
  const { error } = await sb.from('reservations').update({ status: 'cancelled', cancel_reason: reason.value.trim() || null }).eq('id', r.id);
  if (error) return toast(errText(error), { error: true });
  m.close(); await refresh(); toast('تم إلغاء الحجز وأصبحت الأكشاك متوفرة');
}

// ---------- EDIT ----------
export function openEditReservation(id, { confirm = false } = {}) {
  const r = S.reservations.find(x => x.id === id);
  const cp = customerPicker(r.customer_id);
  const start = h('input', { class: 'in', type: 'date', value: r.start_date });
  const end = h('input', { class: 'in', type: 'date', value: r.end_date });
  const status = h('select', { class: 'in' }, h('option', { value: 'confirmed' }, 'مؤكد'), h('option', { value: 'held' }, 'حجز مؤقت'));
  status.value = confirm ? 'confirmed' : r.status;
  const price = amountInput('price', r.agreed_amount);
  const discount = amountInput('discount', r.discount || null, { placeholder: '0' });
  const extra = amountInput('extra', r.extra_charges || null, { placeholder: '0' });
  const deadline = h('input', { class: 'in', type: 'date', value: r.payment_deadline || '' });
  const notes = h('textarea', { class: 'in' }, r.notes || '');
  const save = h('button', { class: 'btn primary' }, 'حفظ التعديلات');
  const m = modal({
    title: 'تعديل الحجز — ' + r.kiosk_codes.join('، '),
    body: [field('العميل', cp.el), h('div', { class: 'grid3' }, field('من', start), field('إلى', end), field('الحالة', status)),
      field('مبلغ الإيجار المتفق عليه', price.inp, h('span', {}, price.out, h('span', { class: 'hint' }, ' — فارغ يعني السعر غير محدد'))),
      h('div', { class: 'grid3' }, field('خصم', discount.inp, discount.out), field('رسوم إضافية', extra.inp, extra.out), field('موعد التسديد', deadline)),
      field('ملاحظات', notes)],
    footer: [save, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')],
  });
  save.onclick = async () => {
    for (const a of [price, discount, extra]) if (Number.isNaN(a.get())) return toast('أحد المبالغ غير صالح', { error: true });
    if (end.value < start.value) return toast('تاريخ النهاية قبل تاريخ البداية', { error: true });
    let customer_id = r.customer_id;
    const cv = cp.value();
    if (cv.customer_id) customer_id = cv.customer_id;
    else if (cv.new_customer) {
      const { data, error } = await sb.from('customers').insert(clean(cv.new_customer)).select().single();
      if (error) return toast(errText(error), { error: true });
      customer_id = data.id;
    }
    if (status.value === 'confirmed' && !customer_id) return toast('الحجز المؤكد يحتاج اسم العميل', { error: true });
    const upd = {
      customer_id, start_date: start.value, end_date: end.value, status: status.value,
      hold_until: status.value === 'held' ? r.hold_until : null,
      agreed_amount: price.get(), discount: discount.get() || 0, extra_charges: extra.get() || 0,
      payment_deadline: deadline.value || null, notes: notes.value.trim() || null,
    };
    save.disabled = true;
    const { error } = await sb.from('reservations').update(upd).eq('id', id);
    save.disabled = false;
    if (error) return toast(errText(error), { error: true });
    m.close(); await refresh(); toast('تم حفظ التعديلات');
  };
}
const clean = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));

export function openChangeKiosks(id) {
  const r = S.reservations.find(x => x.id === id);
  const kp = kioskPicker(r.kiosk_ids);
  const warn = h('div', { class: 'hint', style: { color: 'var(--bad)' } });
  kp.onChange(() => {
    const c = conflicts(kp.ids, r.start_date, r.end_date, id);
    warn.textContent = c.length ? 'محجوز لجهة أخرى: ' + [...new Set(c.map(x => x.kiosk))].join('، ') : '';
  });
  const save = h('button', { class: 'btn primary' }, 'حفظ');
  const m = modal({
    title: 'تغيير أكشاك الحجز', body: [h('p', { class: 'hint', style: { margin: 0 } }, 'لنقل الحجز من A1 إلى A2: احذف A1 وأضف A2 ثم احفظ.'), kp.el, warn],
    footer: [save, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')],
  });
  save.onclick = async () => {
    kp.flush();
    const { error } = await sb.rpc('set_reservation_kiosks', { p_res: id, p_kiosks: kp.ids });
    if (error) return toast(errText(error), { error: true });
    m.close(); await refresh(); toast('تم تحديث الأكشاك');
  };
}

// ---------- PAYMENTS ----------
export function openPayment(resId) {
  if (!can.pay()) return toast('ليس لديك صلاحية تسجيل دفعات', { error: true });
  const r = resId ? S.reservations.find(x => x.id === resId) : null;
  let target = r;
  let picker = null;
  if (!r) {
    const open = S.reservations.filter(x => x.status !== 'cancelled').sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
    picker = h('select', { class: 'in' }, h('option', { value: '' }, '— اختر الحجز —'),
      open.map(x => h('option', { value: x.id }, `${x.customer_name || 'حجز مؤقت'} — ${x.kiosk_codes.join('، ')} — المتبقي: ${x.remaining == null ? 'غير محدد' : fmtNum(x.remaining)}`)));
    picker.onchange = () => { target = S.reservations.find(x => x.id === picker.value); info(); };
  }
  let kind = 'payment';
  const amt = amountInput('amount');
  const method = h('select', { class: 'in' }, METHODS.map(x => h('option', {}, x)));
  const date = h('input', { class: 'in', type: 'date', value: todayISO() });
  const note = h('input', { class: 'in', placeholder: 'اختياري' });
  const file = h('input', { type: 'file', accept: 'image/*,application/pdf' });
  const infoEl = h('div', { class: 'hint' });
  const info = () => { infoEl.textContent = target ? `المبلغ الكلي: ${money(target.total)} — المدفوع: ${money(target.paid)} — المتبقي: ${money(target.remaining)}` : ''; };
  info();
  const seg = h('div', { class: 'seg' },
    h('button', { type: 'button', 'aria-pressed': 'true', onclick: e => setK('payment', e) }, 'دفعة'),
    h('button', { type: 'button', 'aria-pressed': 'false', onclick: e => setK('refund', e) }, 'استرجاع مبلغ للعميل'));
  function setK(k, e) { kind = k; $$('button', seg).forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); }
  const fillRest = h('button', { type: 'button', class: 'btn small ghost', onclick: () => { if (target?.remaining > 0) { amt.inp.value = fmtNum(target.remaining); amt.inp.dispatchEvent(new Event('input')); } } }, 'كامل المتبقي');
  const save = h('button', { class: 'btn primary' }, 'تسجيل');
  const m = modal({
    title: r ? `إضافة دفعة — ${r.customer_name || ''} (${r.kiosk_codes.join('، ')})` : 'إضافة دفعة',
    body: [picker ? field('الحجز', picker) : null, infoEl, seg,
      h('div', { class: 'grid2' }, field('المبلغ', amt.inp, h('span', {}, amt.out, ' ', fillRest)), field('التاريخ', date)),
      h('div', { class: 'grid2' }, field('طريقة الدفع', method), field('ملاحظة', note)),
      settings().receipts ? field('صورة الإيصال (اختياري)', file) : null],
    footer: [save, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')],
  });
  save.onclick = async () => {
    if (!target) return toast('اختر الحجز', { error: true });
    const v = amt.get();
    if (!v || Number.isNaN(v)) return toast('اكتب المبلغ', { error: true });
    save.disabled = true;
    let receipt_path = null;
    if (file.files[0]) {
      const f = file.files[0];
      receipt_path = `${target.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
      const up = await sb.storage.from('receipts').upload(receipt_path, f);
      if (up.error) { save.disabled = false; return toast('تعذر رفع الإيصال: ' + errText(up.error), { error: true }); }
    }
    const { error } = await sb.from('payments').insert({
      reservation_id: target.id, amount: kind === 'refund' ? -v : v, kind, method: method.value,
      paid_on: date.value || todayISO(), note: note.value.trim() || null, receipt_path,
    });
    save.disabled = false;
    if (error) return toast(errText(error), { error: true });
    m.close(); await refresh();
    const now = S.reservations.find(x => x.id === target.id);
    toast(`تم تسجيل ${kind === 'refund' ? 'الاسترجاع' : 'الدفعة'}. المتبقي الآن: ${money(now?.remaining)}`, { actions: [{ label: 'عرض الحجز', run: () => openReservation(target.id) }] });
  };
}

function openCorrection(p) {
  const amt = amountInput('amount', p.amount);
  const note = h('input', { class: 'in', placeholder: 'سبب التصحيح' });
  const save = h('button', { class: 'btn primary' }, 'تسجيل التصحيح');
  const m = modal({
    title: 'تصحيح دفعة',
    body: [h('p', { style: { margin: 0 } }, `الدفعة الأصلية: ${money(p.amount)} بتاريخ ${fmtDate(p.paid_on)}. لن تُحذف، بل يُسجَّل قيد تصحيح بالسالب حتى يبقى السجل كاملاً.`),
      field('المبلغ المراد عكسه', amt.inp, amt.out), field('السبب', note)],
    footer: [save, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')],
  });
  save.onclick = async () => {
    const v = amt.get();
    if (!v || Number.isNaN(v) || v > p.amount) return toast('المبلغ يجب أن يكون بين 1 وقيمة الدفعة الأصلية', { error: true });
    const { error } = await sb.from('payments').insert({ reservation_id: p.reservation_id, amount: -v, kind: 'correction', corrects_payment_id: p.id, note: note.value.trim() || `تصحيح دفعة ${fmtDate(p.paid_on)}`, method: p.method });
    if (error) return toast(errText(error), { error: true });
    m.close(); await refresh(); toast('تم تسجيل التصحيح'); openReservation(p.reservation_id);
  };
}

async function openReceipt(path) {
  const { data, error } = await sb.storage.from('receipts').createSignedUrl(path, 300);
  if (error) return toast(errText(error), { error: true });
  window.open(data.signedUrl, '_blank');
}

// ---------- CONTRACT ----------
export function fillTemplate(tpl, r) {
  const c = customerById(r.customer_id) || {};
  const E = S.editions.find(e => e.id === r.edition_id) || S.edition;
  const map = {
    festival: E.name, customer: c.name || r.customer_name || '..................', company_line: c.company ? ` (${c.company})` : '',
    phone: c.phone || '..................', kiosks: r.kiosk_codes.join('، '), start: fmtDate(r.start_date), end: fmtDate(r.end_date),
    days: r.days, total: r.total == null ? '.................. دينار' : money(r.total), paid: money(r.paid),
    remaining: r.remaining == null ? '..................' : money(r.remaining),
    deadline: r.payment_deadline ? fmtDate(r.payment_deadline) : '..................', today: fmtDateLong(todayISO()),
    notes: r.notes ? 'ملاحظات: ' + r.notes : '', contact: c.contact_person || '',
  };
  return tpl.replace(/\{(\w+)\}/g, (m0, k) => (k in map ? map[k] : m0));
}

export function openContract(resId, { body } = {}) {
  const r = S.reservations.find(x => x.id === resId);
  if (!r) return;
  const text = body || fillTemplate(settings().contract_template || DEFAULT_CONTRACT, r);
  const w = window.open('', '_blank');
  if (!w) return toast('اسمح بالنوافذ المنبثقة لهذا الموقع لتتمكن من فتح العقد', { error: true });
  const logo = S.edition?.settings?.logo_url;
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>عقد ${esc(r.kiosk_codes.join('-'))} — ${esc(r.customer_name || '')}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;600&family=Reem+Kufi:wght@600&display=swap">
<style>@page{size:A4;margin:18mm}body{font-family:"Readex Pro",Tahoma,sans-serif;color:#111;max-width:760px;margin:24px auto;padding:0 16px;font-size:15px;line-height:1.9}
.bar{position:sticky;top:0;background:#12372a;color:#fff;padding:10px 14px;border-radius:10px;display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap}
.bar button{font:inherit;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}.bar .p{background:#b8913a;color:#1b1404;font-weight:600}
.bar span{font-size:13px;opacity:.85;margin-inline-start:auto}
.head{display:flex;align-items:center;gap:14px;border-bottom:2px solid #12372a;padding-bottom:10px;margin-bottom:18px}
.head img{height:60px}.head h1{font-family:"Reem Kufi",serif;font-size:22px;margin:0;color:#12372a}
#doc{white-space:pre-wrap;outline:none;min-height:400px}#doc:focus{background:#fffdf3}
@media print{.bar{display:none}body{margin:0}}</style></head><body>
<div class="bar"><button class="p" onclick="print()">طباعة</button><button onclick="print()">حفظ PDF</button>${can.pay() ? '<button id="sv" onclick="bcmSave(document.getElementById(\'doc\').innerText)">حفظ في سجل العميل</button>' : ''}<button onclick="close()">ليس الآن</button>
<span>يمكنك تعديل نص العقد مباشرة قبل الطباعة. لحفظه PDF اختر «Save as PDF» في نافذة الطباعة.</span></div>
<div class="head">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<h1>${esc(S.edition?.name || '')}</h1></div>
<div id="doc" contenteditable="true">${esc(text)}</div></body></html>`);
  w.document.close();
  w.bcmSave = async txt => {
    const btn = w.document.getElementById('sv');
    if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ…'; }
    const { error } = await sb.from('contracts').insert({ reservation_id: r.id, title: `عقد ${r.kiosk_codes.join('، ')} — ${fmtDate(todayISO())}`, body: txt });
    if (btn) { btn.disabled = false; btn.textContent = error ? 'تعذر الحفظ — حاول مجدداً' : 'تم الحفظ ✓'; }
    if (error) toast(errText(error), { error: true }); else toast('تم حفظ العقد في سجل الحجز والعميل');
  };
}

// ---------- REMINDERS ----------
export function reminderText(r) {
  const E = S.edition;
  return `مرحباً ${r.customer_name || ''}،
نود تذكيركم بأن المبلغ المتبقي لحجز الكشك (${r.kiosk_codes.join('، ')}) في ${E.name} هو ${money(r.remaining)}${r.next_due_date ? '، وموعد التسديد ' + fmtDateLong(r.next_due_date) : ''}.
مع التقدير،
إدارة ${E.name}`;
}
export function openReminder(resId) {
  const r = S.reservations.find(x => x.id === resId);
  const ta = h('textarea', { class: 'in', style: { minHeight: '150px' } }, reminderText(r));
  const go = h('a', { class: 'btn wa', target: '_blank', rel: 'noopener' }, 'فتح في واتساب');
  const sync = () => go.href = waLink(r.customer_phone, ta.value);
  ta.addEventListener('input', sync); sync();
  modal({
    title: 'تذكير بالدفع — ' + (r.customer_name || ''),
    body: [h('p', { class: 'hint', style: { margin: 0 } }, `سيفتح واتساب برسالة جاهزة إلى ${r.customer_phone}. لا يُرسل شيء تلقائياً — أنت من يضغط إرسال.`), ta],
    footer: [go],
  });
}

// ---------- CUSTOMERS ----------
export async function openCustomer(id) {
  const c = id ? customerById(id) : { name: '' };
  const fields = settings().extended_customer ? {
    name: ['الاسم (شخص أو جهة)', 'text'], company: ['اسم الشركة', 'text'], contact_person: ['الشخص المسؤول', 'text'],
    phone: ['رقم الهاتف', 'tel'], phone2: ['هاتف ثانٍ', 'tel'], email: ['البريد الإلكتروني', 'email'], category: ['فئة العميل', 'text'],
  } : { name: ['الاسم (شخص أو جهة)', 'text'], phone: ['رقم الهاتف', 'tel'] };
  const inputs = {};
  const ro = !can.customers();
  const grid = h('div', { class: 'grid2' }, Object.entries(fields).map(([k, [l, t]]) => field(l, inputs[k] = h('input', { class: 'in', type: t, value: c[k] || '', disabled: ro }))));
  const notes = h('textarea', { class: 'in', disabled: ro }, c.notes || '');
  let hist = h('div', { class: 'spinner' });
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, grid, field('ملاحظات', notes));
  if (id) body.append(h('h3', { style: { margin: '6px 0 0', fontSize: '15px' } }, 'الحجوزات في كل النسخ'), hist);
  const save = ro ? null : h('button', { class: 'btn primary' }, id ? 'حفظ' : 'إضافة العميل');
  const m = modal({
    title: id ? c.name : 'عميل جديد', wide: !!id, body,
    footer: [save, id && can.book() ? h('button', { class: 'btn pine', onclick: () => { m.close(); openBooking({ customerId: id }); } }, 'حجز جديد لهذا العميل') : null,
      c.phone ? h('a', { class: 'btn wa', href: waLink(c.phone), target: '_blank', rel: 'noopener' }, 'واتساب') : null],
  });
  if (save) save.onclick = async () => {
    const row = clean(Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value.trim()])));
    row.notes = notes.value.trim() || null;
    if (!row.name) return toast('اكتب اسم العميل', { error: true });
    const dup = !id && row.phone && S.customers.find(x => x.phone && x.phone.replace(/\D/g, '') === row.phone.replace(/\D/g, ''));
    if (dup && !(await confirmBox('عميل مسجل مسبقاً', `رقم الهاتف مسجل باسم «${dup.name}». هل تريد إضافة عميل جديد بالرغم من ذلك؟`, { okLabel: 'إضافة' }))) return;
    const q = id ? sb.from('customers').update(row).eq('id', id) : sb.from('customers').insert(row);
    const { error } = await q;
    if (error) return toast(errText(error), { error: true });
    m.close(); await refresh(); toast(id ? 'تم حفظ بيانات العميل' : 'تمت إضافة العميل');
  };
  if (id) {
    const { data, error } = await sb.from('reservation_summary').select('*').eq('customer_id', id).order('start_date', { ascending: false });
    const box = error ? h('div', { class: 'hint' }, errText(error)) : !data.length ? h('div', { class: 'hint' }, 'لا توجد حجوزات.') :
      h('div', { class: 'table-wrap' }, h('table', { class: 't' },
        h('thead', {}, h('tr', {}, ['النسخة', 'الأكشاك', 'الفترة', 'المبلغ', 'المدفوع', 'المتبقي', 'الحالة'].map(t => h('th', {}, t)))),
        h('tbody', {}, data.map(r => h('tr', { class: 'click', onclick: () => { if (r.edition_id === S.edition.id) { m.close(); openReservation(r.id); } } },
          h('td', {}, S.editions.find(e => e.id === r.edition_id)?.name || ''), h('td', {}, r.kiosk_codes.join('، ')),
          h('td', {}, `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`),
          h('td', { class: 'money' }, h('span', { class: 'num' }, r.total == null ? '—' : fmtNum(r.total))),
          h('td', { class: 'money' }, h('span', { class: 'num' }, fmtNum(r.paid))),
          h('td', { class: 'money' }, h('span', { class: 'num' }, r.remaining == null ? '—' : fmtNum(r.remaining))),
          h('td', {}, badge('pay', r.pay_status, PAY_LABEL)))))));
    hist.replaceWith(box);
    const ids = (data || []).map(r => r.id);
    if (ids.length) {
      const [ct, dc] = await Promise.all([sb.from('contracts').select('*').in('reservation_id', ids).order('created_at', { ascending: false }),
        sb.from('documents').select('*').in('reservation_id', ids).order('created_at', { ascending: false })]);
      const cons = ct.data || [], docs = dc.data || [];
      if (cons.length || docs.length) box.after(h('h3', { style: { margin: '6px 0 0', fontSize: '15px' } }, 'العقود والمرفقات'), h('ul', { class: 'filelist' },
        cons.map(c => h('li', {}, h('span', { class: 'badge b-confirmed' }, 'عقد'), h('button', { class: 'btn ghost small', onclick: () => openContract(c.reservation_id, { body: c.body }) }, c.title || 'عقد إيجار'), h('span', { class: 'hint' }, fmtDateTime(c.created_at)))),
        docs.map(d => h('li', {}, h('span', { class: 'badge' }, 'ملف'), h('button', { class: 'btn ghost small', onclick: () => openFile('documents', d.storage_path) }, d.name), h('span', { class: 'hint' }, fmtDateTime(d.created_at))))));
    }
  }
}

export { kioskPicker, amountInput, field, conflicts, METHODS, codeSort };
