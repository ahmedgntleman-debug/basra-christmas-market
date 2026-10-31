// Smart Arabic booking assistant (optional).
// The AI only INTERPRETS the sentence into a structured action. The app then checks every
// reference against the real records, shows a preview, and changes nothing until the user confirms.
import { sb, h, toast, errText, money, fmtNum, fmtDate, fmtDateLong, todayISO, addDays, daysBetween, computeStatuses, PAY_LABEL, modal } from './common.js';
import { S, can, refresh, settings, kioskById, kioskByCode, customerById, codeSort } from './state.js';
import { openReservation, conflicts } from './booking.js';

const ENDPOINT = (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

export const assistantReady = () => settings().assistant && !!settings().gemini_key;

function context() {
  const E = S.edition;
  const live = S.reservations.filter(r => r.status !== 'cancelled');
  const custIds = new Set(live.map(r => r.customer_id));
  const customers = S.customers.filter(c => custIds.has(c.id) || S.customers.length <= 400);
  return {
    today: todayISO(),
    weekday_today: new Intl.DateTimeFormat('ar', { weekday: 'long', timeZone: 'Asia/Baghdad' }).format(new Date()),
    festival: { name: E.name, start_date: E.start_date, end_date: E.end_date },
    kiosk_codes: S.kiosks.filter(k => k.active && k.rentable).map(k => k.code),
    customers: customers.map((c, i) => ({ ref: 'C' + (i + 1), name: c.name, company: c.company || undefined, phone: c.phone || undefined })),
    reservations: live.map((r, i) => ({
      ref: 'R' + (i + 1), customer: r.customer_name || '(حجز مؤقت)', kiosks: r.kiosk_codes, start_date: r.start_date, end_date: r.end_date,
      status: r.status, total: r.total, paid: r.paid, remaining: r.remaining, next_due_date: r.next_due_date,
    })),
    _maps: { customers, live },
  };
}

const SYSTEM = ctx => `أنت مساعد حجوزات لإدارة مهرجان «${ctx.festival.name}» في البصرة. مهمتك فقط تحويل أمر المستخدم (بالعربية أو اللهجة العراقية) إلى كائن JSON واحد. لا تنفذ شيئاً بنفسك.

التاريخ اليوم ${ctx.today} (${ctx.weekday_today})، المنطقة الزمنية بغداد. المهرجان من ${ctx.festival.start_date} إلى ${ctx.festival.end_date}.
العملة الدينار العراقي، والمبالغ أعداد صحيحة: "5 مليون"=5000000، "مليونين"=2000000، "مليون ونص"=1500000، "750 الف"=750000، "ربع مليون"=250000.

البيانات:
أرقام الأكشاك: ${ctx.kiosk_codes.join(', ')}
العملاء: ${JSON.stringify(ctx.customers)}
الحجوزات الفعالة: ${JSON.stringify(ctx.reservations)}

أعد JSON فقط بهذا الشكل:
{"action": "...", "params": {...}, "question": "سؤال توضيحي إن لزم", "summary": "وصف قصير بالعربية لما فهمته"}

الأفعال المسموحة والحقول:
- create_reservation: {"kiosks":["A1"], "customer_ref":"C3 أو null", "customer_name":"اسم جديد إن لم يوجد", "customer_phone":null, "start_date":"YYYY-MM-DD", "end_date":"YYYY-MM-DD", "status":"confirmed|held", "agreed_amount":عدد أو null, "first_payment":عدد أو null, "payment_deadline":"YYYY-MM-DD" أو null, "notes":null}
- add_payment: {"reservation_ref":"R2", "amount":عدد, "method":"نقداً|تحويل بنكي|شيك|null"}
- update_price: {"reservation_ref":"R2", "agreed_amount":عدد}
- move_kiosks: {"reservation_ref":"R2", "remove":["A1"], "add":["A2"]}
- add_note: {"reservation_ref":"R2", "note":"..."}
- set_deadline: {"reservation_ref":"R2", "date":"YYYY-MM-DD"}
- set_deadline_all: {"date":"YYYY-MM-DD", "group":"A أو null"} — موعد تسديد واحد لكل الحجوزات التي عليها مبالغ متبقية (غير المدفوعة بالكامل)، أو لمجموعة أكشاك معينة.
- cancel_reservation: {"reservation_ref":"R2", "reason":null}
- query: {"type":"outstanding|overdue|available|reservations|customer", "group":"A أو null", "customer_ref":null, "from":null, "to":null}
- clarify: استخدمه عندما تنقص معلومة ضرورية أو يوجد أكثر من احتمال.

قواعد صارمة:
1. لا تخترع أي معلومة غير موجودة في الأمر أو البيانات. الحقل غير المذكور = null.
2. إذا ذُكرت مدة (مثل "10 أيام") بدون تاريخ بداية واضح، اسأل: من أي تاريخ؟ إلا إذا قال المستخدم "من الافتتاح" أو "من اليوم" أو ذكر يوماً محدداً. "كامل المهرجان" = من بداية المهرجان إلى نهايته.
3. المدة شاملة لليومين: البداية + (الأيام - 1) = النهاية.
4. "الباقي بعد أسبوع" تعني payment_deadline = اليوم + 7 أيام. "يوم الخميس" تعني أقرب خميس قادم.
5. للإشارة إلى حجز موجود استخدم ref من قائمة الحجوزات فقط. إذا تطابق أكثر من حجز (مثلاً لنفس الشركة)، استخدم clarify واذكر الخيارات.
6. إذا كان اسم الشركة يطابق عميلاً موجوداً (حتى مع اختلاف بسيط مثل "شركة بيبسي" و"بيبسي")، استخدم customer_ref.
7. التواريخ المكتوبة بالأرقام تُقرأ يوم/شهر/سنة كما في العراق: "10/11/2026" أو "10\\11\\2026" = 2026-11-10.
8. لا تضع أي نص خارج JSON.`;

// Google retires models from time to time; pick the newest working "flash" model automatically.
let liveModel = null;
export function rankModels(list) {
  const ver = n => { const m = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/.exec(n); return m ? +m[1] - (m[2] ? 0.5 : 0) : -1; };
  const good = list.filter(n => ver(n) >= 0).sort((a, b) => ver(b) - ver(a));
  const other = list.filter(n => !good.includes(n) && /flash/.test(n) && !/image|tts|live|audio|embedding|thinking|exp/.test(n)).sort().reverse();
  return [...good, ...other];
}
export function pickModel(list) { return rankModels(list)[0] || list.find(n => /^gemini/.test(n)) || null; }
const retired = msg => /no longer available|not found|is not supported|deprecated|update your code|does not exist|unknown model/i.test(msg || '');
const busy = (e) => e.status === 503 || e.status === 429 || /high demand|overloaded|unavailable|try again later|quota/i.test(e.message || '');
async function callGemini(history, ctx) {
  const cfg = settings();
  let model = liveModel || (cfg.gemini_model && cfg.gemini_model !== 'auto' ? cfg.gemini_model : null);
  let list = null;
  const models = async () => (list ||= await listModels(cfg.gemini_key));
  if (!model) { model = pickModel(await models()); liveModel = model; }
  const tried = new Set();
  const ask = m => { tried.add(m); return askModel(m, history, ctx, cfg.gemini_key); };
  let err;
  try { return await ask(model); } catch (e) { err = e; }
  if (retired(err.message) || err.status === 404) {
    const next = pickModel((await models()).filter(n => !tried.has(n)));
    if (!next) throw err;
    liveModel = next;
    if (can.admin()) {
      const E = S.edition;
      sb.from('editions').update({ settings: { ...(E.settings || {}), gemini_model: next } }).eq('id', E.id).then(({ error }) => { if (!error) E.settings = { ...(E.settings || {}), gemini_model: next }; });
    }
    try { return await ask(next); } catch (e) { err = e; }
  }
  if (!busy(err)) throw err;
  // temporarily overloaded: try the next best models for this request only
  for (const alt of rankModels(await models()).filter(n => !tried.has(n)).slice(0, 3)) {
    try { return await ask(alt); } catch (e) { err = e; if (!busy(e) && !retired(e.message) && e.status !== 404) throw e; }
  }
  throw new Error('خدمة Google Gemini مزدحمة الآن. انتظر دقيقة ثم أعد المحاولة.');
}
async function askModel(model, history, ctx, key) {
  const res = await fetch(ENDPOINT(model, key), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM(ctx) }] },
      contents: history,
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { const er = new Error(j?.error?.message ? 'خطأ من خدمة الذكاء الاصطناعي: ' + j.error.message : 'تعذر الاتصال بخدمة الذكاء الاصطناعي'); er.status = res.status; throw er; }
  const text = j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  const clean = text.replace(/^```(json)?|```$/g, '').trim();
  try { return { raw: text, out: JSON.parse(clean) }; } catch { throw new Error('لم أفهم رد المساعد. أعد صياغة الطلب.'); }
}

export async function listModels(key) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' + encodeURIComponent(key));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || 'المفتاح غير صالح');
  return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace('models/', ''));
}

// ---------- resolve the AI's action against real records ----------
function resolve(out, ctx) {
  const p = out.params || {};
  const resOf = ref => { const i = /^R(\d+)$/.exec(ref || ''); return i ? ctx._maps.live[+i[1] - 1] : null; };
  const custOf = ref => { const i = /^C(\d+)$/.exec(ref || ''); return i ? ctx._maps.customers[+i[1] - 1] : null; };
  const kiosks = list => (list || []).map(c => ({ c, k: kioskByCode(c) }));
  const errors = [];
  const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  const num = v => v == null || v === '' ? null : Number.isFinite(+v) && +v >= 0 ? Math.round(+v) : NaN;
  const A = { type: out.action, p, errors, lines: [] };

  const needRes = () => { const r = resOf(p.reservation_ref); if (!r) errors.push('لم أتعرف على الحجز المقصود.'); return r; };
  switch (out.action) {
    case 'create_reservation': {
      const ks = kiosks(p.kiosks);
      ks.filter(x => !x.k).forEach(x => errors.push(`لا يوجد كشك بالرقم ${x.c}.`));
      if (!ks.length) errors.push('لم يُذكر رقم الكشك.');
      if (!isDate(p.start_date) || !isDate(p.end_date)) errors.push('تواريخ الحجز غير محددة.');
      else if (p.end_date < p.start_date) errors.push('تاريخ النهاية قبل البداية.');
      const cust = custOf(p.customer_ref);
      if (!cust && !p.customer_name && p.status !== 'held') errors.push('لم يُذكر اسم العميل.');
      const amount = num(p.agreed_amount), pay = num(p.first_payment);
      if (Number.isNaN(amount) || Number.isNaN(pay)) errors.push('أحد المبالغ غير صالح.');
      if (!can.book()) errors.push('ليس لديك صلاحية إنشاء حجز.');
      const ids = ks.filter(x => x.k).map(x => x.k.id);
      if (!errors.length) {
        const c = conflicts(ids, p.start_date, p.end_date);
        if (c.length) errors.push('محجوز في هذه الفترة: ' + [...new Set(c.map(x => `${x.kiosk} (${x.r.customer_name || 'مؤقت'})`))].join('، '));
      }
      Object.assign(A, { ids, cust, amount, pay });
      A.lines = [
        ['الأكشاك', ks.map(x => x.c).join('، ')],
        ['العميل', cust ? `${cust.name} (عميل مسجل)` : p.customer_name ? `${p.customer_name} (عميل جديد)` : '—'],
        ['الفترة', isDate(p.start_date) && isDate(p.end_date) ? `${fmtDateLong(p.start_date)} — ${fmtDateLong(p.end_date)} (${daysBetween(p.start_date, p.end_date)} يوماً)` : '—'],
        ['نوع الحجز', p.status === 'held' ? 'حجز مؤقت (48 ساعة)' : 'مؤكد'],
        ['المبلغ الكلي', amount == null ? 'غير محدد' : money(amount)],
        ['الدفعة الأولى', pay ? money(pay) : 'لا يوجد'],
        ['المتبقي', amount == null ? '—' : money(amount - (pay || 0))],
        ['موعد تسديد المتبقي', isDate(p.payment_deadline) ? fmtDateLong(p.payment_deadline) : 'غير محدد'],
      ];
      break;
    }
    case 'add_payment': {
      const r = needRes(); const amt = num(p.amount);
      if (!amt) errors.push('مبلغ الدفعة غير محدد.');
      if (!can.pay()) errors.push('ليس لديك صلاحية تسجيل دفعات.');
      Object.assign(A, { r, amt });
      if (r) A.lines = [['الحجز', `${r.customer_name || 'مؤقت'} — ${r.kiosk_codes.join('، ')}`], ['الدفعة', money(amt)], ['المتبقي بعدها', r.remaining == null ? 'السعر غير محدد' : money(r.remaining - (amt || 0))]];
      break;
    }
    case 'update_price': {
      const r = needRes(); const amt = num(p.agreed_amount);
      if (amt == null || Number.isNaN(amt)) errors.push('السعر الجديد غير محدد.');
      if (!can.book()) errors.push('ليس لديك صلاحية تعديل الحجز.');
      Object.assign(A, { r, amt });
      if (r) A.lines = [['الحجز', `${r.customer_name || 'مؤقت'} — ${r.kiosk_codes.join('، ')}`], ['السعر الحالي', money(r.agreed_amount)], ['السعر الجديد', money(amt)]];
      break;
    }
    case 'move_kiosks': {
      const r = needRes();
      const rem = kiosks(p.remove), add = kiosks(p.add);
      [...rem, ...add].filter(x => !x.k).forEach(x => errors.push(`لا يوجد كشك بالرقم ${x.c}.`));
      if (!can.book()) errors.push('ليس لديك صلاحية تعديل الحجز.');
      let ids = [];
      if (r && !errors.length) {
        ids = [...new Set([...r.kiosk_ids.filter(id => !rem.some(x => x.k.id === id)), ...add.map(x => x.k.id)])];
        if (!ids.length) errors.push('لن يبقى أي كشك في الحجز.');
        const c = conflicts(ids, r.start_date, r.end_date, r.id);
        if (c.length) errors.push('محجوز لجهة أخرى: ' + [...new Set(c.map(x => x.kiosk))].join('، '));
      }
      Object.assign(A, { r, ids });
      if (r) A.lines = [['الحجز', `${r.customer_name || 'مؤقت'}`], ['الأكشاك الحالية', r.kiosk_codes.join('، ')], ['بعد التعديل', ids.map(id => kioskById(id)?.code).sort(codeSort).join('، ')]];
      break;
    }
    case 'add_note': {
      const r = needRes();
      if (!p.note) errors.push('نص الملاحظة فارغ.');
      if (!can.book()) errors.push('ليس لديك صلاحية تعديل الحجز.');
      Object.assign(A, { r });
      if (r) A.lines = [['الحجز', `${r.customer_name || 'مؤقت'} — ${r.kiosk_codes.join('، ')}`], ['الملاحظة', p.note]];
      break;
    }
    case 'set_deadline': {
      const r = needRes();
      if (!isDate(p.date)) errors.push('التاريخ غير محدد.');
      if (!can.book()) errors.push('ليس لديك صلاحية تعديل الحجز.');
      Object.assign(A, { r });
      if (r) A.lines = [['الحجز', `${r.customer_name || 'مؤقت'} — ${r.kiosk_codes.join('، ')}`], ['موعد التسديد الجديد', isDate(p.date) ? fmtDateLong(p.date) : '—']];
      break;
    }
    case 'set_deadline_all': {
      if (!isDate(p.date)) errors.push('التاريخ غير محدد.');
      if (!can.book()) errors.push('ليس لديك صلاحية تعديل الحجوزات.');
      const targets = S.reservations.filter(r => r.status !== 'cancelled' && !r.hold_expired && r.remaining > 0 &&
        (!p.group || r.kiosk_ids.some(id => kioskById(id)?.grp === p.group)));
      if (!targets.length) errors.push('لا توجد حجوزات عليها مبالغ متبقية.');
      Object.assign(A, { targets });
      A.lines = [['آخر موعد للتسديد', isDate(p.date) ? fmtDateLong(p.date) : '—'],
        ['عدد الحجوزات', `${targets.length} حجز${p.group ? ' في أكشاك ' + p.group : ''}، مجموع المتبقي ${money(targets.reduce((a, r) => a + r.remaining, 0))}`],
        ['الجهات', targets.map(r => `${r.customer_name || 'مؤقت'} (${r.kiosk_codes.join('، ')})`).join('، ')]];
      break;
    }
    case 'cancel_reservation': {
      const r = needRes();
      if (!can.book()) errors.push('ليس لديك صلاحية إلغاء الحجز.');
      Object.assign(A, { r });
      if (r) A.lines = [['الحجز المراد إلغاؤه', `${r.customer_name || 'مؤقت'} — ${r.kiosk_codes.join('، ')} (${fmtDate(r.start_date)}–${fmtDate(r.end_date)})`]];
      break;
    }
    case 'query': A.cust = custOf(p.customer_ref); break;
    case 'clarify': break;
    default: errors.push('لم أفهم الطلب. جرّب صياغة أخرى.');
  }
  return A;
}

async function execute(A) {
  const p = A.p;
  let err, openId;
  if (A.type === 'create_reservation') {
    const payload = {
      edition_id: S.edition.id, kiosk_ids: A.ids, start_date: p.start_date, end_date: p.end_date, status: p.status === 'held' ? 'held' : 'confirmed',
      hold_until: p.status === 'held' ? new Date(Date.now() + 48 * 3600e3).toISOString() : null,
      agreed_amount: A.amount, first_payment: A.pay, payment_method: p.method || 'نقداً', payment_deadline: p.payment_deadline || null, notes: p.notes || null,
      ...(A.cust ? { customer_id: A.cust.id } : p.customer_name ? { new_customer: { name: p.customer_name, phone: p.customer_phone || '' } } : {}),
    };
    const { data, error } = await sb.rpc('create_reservation', { p: payload }); err = error; openId = data;
  } else if (A.type === 'add_payment') {
    ({ error: err } = await sb.from('payments').insert({ reservation_id: A.r.id, amount: A.amt, kind: 'payment', method: p.method || null, note: 'عبر المساعد' })); openId = A.r.id;
  } else if (A.type === 'update_price') {
    ({ error: err } = await sb.from('reservations').update({ agreed_amount: A.amt }).eq('id', A.r.id)); openId = A.r.id;
  } else if (A.type === 'move_kiosks') {
    ({ error: err } = await sb.rpc('set_reservation_kiosks', { p_res: A.r.id, p_kiosks: A.ids })); openId = A.r.id;
  } else if (A.type === 'add_note') {
    const notes = [A.r.notes, p.note].filter(Boolean).join('\n');
    ({ error: err } = await sb.from('reservations').update({ notes }).eq('id', A.r.id)); openId = A.r.id;
  } else if (A.type === 'set_deadline') {
    ({ error: err } = await sb.from('reservations').update({ payment_deadline: p.date }).eq('id', A.r.id)); openId = A.r.id;
  } else if (A.type === 'set_deadline_all') {
    ({ error: err } = await sb.from('reservations').update({ payment_deadline: p.date }).in('id', A.targets.map(r => r.id)));
  } else if (A.type === 'cancel_reservation') {
    ({ error: err } = await sb.from('reservations').update({ status: 'cancelled', cancel_reason: p.reason || 'أُلغي عبر المساعد' }).eq('id', A.r.id)); openId = A.r.id;
  }
  if (err) throw err;
  await refresh();
  return openId;
}

// ---------- local answers for questions (no changes) ----------
function answer(A) {
  const p = A.p, today = todayISO();
  const live = S.reservations.filter(r => r.status !== 'cancelled');
  const table = (rows, cols) => rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 't' },
    h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c.m ? 'money' : '' }, c.l)))),
    h('tbody', {}, rows.map(r => h('tr', { class: r.id ? 'click' : '', onclick: r.id ? () => openReservation(r.id) : null }, cols.map(c => h('td', { class: c.m ? 'money' : '' }, c.m ? h('span', { class: 'num' }, fmtNum(c.v(r))) : c.v(r)))))))) : h('p', { class: 'hint' }, 'لا توجد نتائج.');
  const resCols = [{ l: 'العميل', v: r => r.customer_name || 'مؤقت' }, { l: 'الأكشاك', v: r => r.kiosk_codes.join('، ') }, { l: 'الفترة', v: r => `${fmtDate(r.start_date)}–${fmtDate(r.end_date)}` },
    { l: 'المتبقي', v: r => r.remaining ?? 0, m: true }, { l: 'الدفع', v: r => PAY_LABEL[r.pay_status] }];
  if (p.type === 'outstanding') {
    const rows = live.filter(r => r.remaining > 0).sort((a, b) => b.remaining - a.remaining);
    return [h('p', {}, `${rows.length} جهة عليها مبالغ، المجموع `, h('b', { class: 'num' }, money(rows.reduce((a, r) => a + r.remaining, 0)))), table(rows, resCols)];
  }
  if (p.type === 'overdue') {
    const rows = live.filter(r => r.pay_status === 'overdue');
    return [h('p', {}, `${rows.length} دفعة متأخرة`), table(rows, [...resCols, { l: 'الموعد', v: r => fmtDate(r.next_due_date) }])];
  }
  if (p.type === 'available') {
    const from = p.from || S.edition.start_date, to = p.to || S.edition.end_date;
    const st = computeStatuses(S.kiosks, S.reservations, from, to);
    const ks = S.kiosks.filter(k => st.get(k.id) === 'available' && (!p.group || k.grp === p.group));
    const part = S.kiosks.filter(k => st.get(k.id) === 'partial' && (!p.group || k.grp === p.group));
    return [h('p', {}, `من ${fmtDate(from)} إلى ${fmtDate(to)}: ${ks.length} كشك متوفر بالكامل`, part.length ? ` و${part.length} متوفر جزئياً` : ''),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, ks.map(k => h('span', { class: 'chip' }, k.code))),
      part.length ? h('p', { class: 'hint' }, 'جزئياً: ' + part.map(k => k.code).join('، ')) : null];
  }
  const rows = live.filter(r => (!p.group || r.kiosk_ids.some(id => kioskById(id)?.grp === p.group)) && (!A.cust || r.customer_id === A.cust.id));
  return [h('p', {}, `${rows.length} حجز`), table(rows, resCols)];
}

// ---------- UI ----------
export function openAssistant() {
  if (!assistantReady()) return toast('فعّل المساعد الذكي وأضف مفتاح Gemini من الإعدادات', { error: true });
  const log = h('div', { class: 'chat' });
  const input = h('textarea', { class: 'in', rows: 2, placeholder: 'مثال: احجز الكشك A1 لشركة بيبسي من الافتتاح لمدة 10 أيام بمبلغ 5 مليون، دفعوا مليونين والباقي بعد أسبوع' });
  const send = h('button', { class: 'btn primary' }, 'إرسال');
  const examples = ['منو باقي عليه فلوس؟', 'اعرض الأكشاك المتوفرة', 'اعرض الدفعات المتأخرة', 'اعرض حجوزات أكشاك A'];
  let history = [];
  const bubble = (who, ...kids) => { const b = h('div', { class: 'bub ' + who }, ...kids); log.append(b); log.scrollTop = log.scrollHeight; return b; };
  bubble('bot', 'اكتب ما تريد بالعربية. سأعرض عليك ما فهمته قبل أي تعديل، ولن يتغير شيء إلا بعد ضغطك «تأكيد».',
    h('div', { class: 'ex' }, examples.map(t => h('button', { class: 'btn small ghost', onclick: () => { input.value = t; go(); } }, t))));

  async function go() {
    const text = input.value.trim(); if (!text) return;
    input.value = ''; bubble('me', text);
    const wait = bubble('bot', h('span', { class: 'hint' }, 'جارٍ الفهم…'));
    send.disabled = true;
    const ctx = context();
    history.push({ role: 'user', parts: [{ text }] });
    try {
      const { raw, out } = await callGemini(history, ctx);
      history.push({ role: 'model', parts: [{ text: raw }] });
      wait.remove();
      handle(out, ctx);
    } catch (e) {
      wait.remove(); history.pop();
      bubble('bot err', errText(e));
    }
    send.disabled = false; input.focus();
  }

  function handle(out, ctx) {
    if (out.action === 'clarify' || (out.question && out.action !== 'query' && !out.params)) {
      bubble('bot', out.question || 'هل يمكنك توضيح الطلب أكثر؟'); return;
    }
    const A = resolve(out, ctx);
    if (A.type === 'query') { bubble('bot', out.summary ? h('div', { class: 'hint' }, out.summary) : null, ...answer(A)); history = []; return; }
    if (A.errors.length) {
      bubble('bot err', h('div', {}, out.summary ? h('div', { class: 'hint' }, 'فهمت: ' + out.summary) : null, h('ul', {}, A.errors.map(e => h('li', {}, e))), out.question ? h('div', {}, out.question) : 'صحّح الطلب أو أكمل المعلومة الناقصة.'));
      return;
    }
    const ok = h('button', { class: 'btn primary small' }, 'تأكيد وتنفيذ');
    const no = h('button', { class: 'btn small' }, 'إلغاء');
    const card = bubble('bot', h('div', { class: 'preview' },
      h('strong', {}, TITLE[A.type] || 'تأكيد'),
      h('dl', {}, A.lines.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      h('div', { style: { display: 'flex', gap: '6px' } }, ok, no)));
    no.onclick = () => { card.querySelector('.preview').replaceChildren(h('span', { class: 'hint' }, 'تم الإلغاء، لم يتغير شيء.')); history = []; };
    ok.onclick = async () => {
      ok.disabled = no.disabled = true; ok.textContent = 'جارٍ التنفيذ…';
      try {
        const id = await execute(A);
        card.querySelector('.preview').replaceChildren(h('span', {}, '✓ تم التنفيذ. '), id ? h('button', { class: 'btn small ghost', onclick: () => { m.close(); openReservation(id); } }, 'عرض الحجز') : null);
        history = [];
      } catch (e) {
        ok.disabled = no.disabled = false; ok.textContent = 'تأكيد وتنفيذ';
        bubble('bot err', errText(e));
      }
    };
  }

  send.onclick = go;
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
  const m = modal({ title: 'المساعد الذكي', wide: true, body: [log, h('div', { class: 'chatin' }, input, send),
    h('p', { class: 'hint', style: { margin: 0 } }, 'يُرسَل نص طلبك مع قائمة الأكشاك وأسماء العملاء والحجوزات إلى خدمة Google Gemini لفهمه.')] });
}
const TITLE = {
  create_reservation: 'حجز جديد — هل تؤكد؟', add_payment: 'إضافة دفعة — هل تؤكد؟', update_price: 'تغيير السعر — هل تؤكد؟',
  move_kiosks: 'نقل / تغيير الأكشاك — هل تؤكد؟', add_note: 'إضافة ملاحظة — هل تؤكد؟', set_deadline: 'تعديل موعد التسديد — هل تؤكد؟', set_deadline_all: 'موعد تسديد لكل الحجوزات غير المدفوعة — هل تؤكد؟', cancel_reservation: 'إلغاء الحجز — هل تؤكد؟',
};
