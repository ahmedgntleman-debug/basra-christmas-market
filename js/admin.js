// Admin portal: shell, login, dashboard and the interactive map (with map editor).
import {
  sb, configured, h, $, $$, toast, errText, money, fmtNum, fmtDate, fmtDateLong, todayISO, addDays, daysBetween,
  computeStatuses, statusBg, RES_LABEL, STATUS_LABEL, PAY_LABEL, ROLE_LABEL, badge, modal, confirmBox, parseAmount, fmtDateTime,
} from './common.js';
import { MapView } from './map.js';
import { S, can, role, onChange, loadEditions, loadEditionData, refresh, switchEdition, subscribeLive, settings, colors, kioskById, kioskByCode, codeSort } from './state.js';
import { openBooking, openReservation, openPayment, openReminder, openCustomer, field } from './booking.js';
import { pageReservations, pageCustomers, pageReports, pageSettings, openDailyEntry } from './pages.js';
import { openAssistant, assistantReady } from './assistant.js';
import { pagePnl } from './pnl.js';
import { startI18n } from './i18n.js';
import { initFestive, garland, baubles, countdown, tree, toggleButton, burst, jingle, sleigh } from './festive.js';

const view = () => $('#view');
const ROUTES = {
  '': { title: 'الرئيسية', render: pageDashboard },
  map: { title: 'خريطة الأكشاك', render: pageMap },
  reservations: { title: 'الحجوزات', render: pageReservations },
  customers: { title: 'العملاء', render: pageCustomers },
  reports: { title: 'التقارير', render: pageReports },
  pnl: { title: 'الأرباح والخسائر', render: pagePnl },
  settings: { title: 'الإعدادات', render: pageSettings },
};
let cleanup = null;

// ================= boot =================
async function boot() {
  startI18n();
  if (!configured) return showSetupNeeded();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return showLogin();
  S.user = session.user;
  try {
    const { data: prof, error } = await sb.from('profiles').select('*').eq('user_id', S.user.id).maybeSingle();
    if (error) throw error;
    S.profile = prof;
    if (!prof) throw new Error('لم يتم إنشاء ملف المستخدم. تأكد من تشغيل ملف قاعدة البيانات schema.sql قبل إنشاء الحساب.');
    sb.rpc('release_expired_holds').then(() => {});
    await loadEditions();
    await loadEditionData();
  } catch (e) {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#login-msg').textContent = errText(e);
    return;
  }
  $('#login').hidden = true;
  $('#app').hidden = false;
  initFestive({ density: 34 });
  shell();
  subscribeLive();
  onChange(() => render(false));
  window.addEventListener('hashchange', () => render(true));
  render(true);
}

function showSetupNeeded() {
  $('#login').hidden = false;
  $('#login-form').hidden = true;
  $('#login-msg').innerHTML = 'لم يتم ربط التطبيق بقاعدة البيانات بعد.<br>افتح ملف <b>config.js</b> وضع فيه رابط مشروع Supabase والمفتاح العام كما في دليل التشغيل.';
}

function showLogin() {
  $('#login').hidden = false;
  $('#app').hidden = true;
  initFestive({ density: 90 });
  if (!document.querySelector('.fx-sleigh')) sleigh({ first: 3000 });
  if (!$('#login .fx-baubles')) baubles($('#login'), [
    { x: '8%', len: 70, size: 54 }, { x: '18%', len: 130, size: 42, style: 1 }, { x: '30%', len: 40, size: 34, style: 2 },
    { x: '68%', len: 56, size: 38, style: 3 }, { x: '80%', len: 140, size: 56, style: 4 }, { x: '91%', len: 80, size: 40, style: 1 }]);
  const form = $('#login-form');
  form.onsubmit = async e => {
    e.preventDefault();
    const btn = $('button', form); btn.disabled = true;
    $('#login-msg').textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
    btn.disabled = false;
    if (error) { $('#login-msg').textContent = errText(error); return; }
    location.reload();
  };
}

function shell() {
  const pl = $('.nav a[href="#/pnl"]'); if (pl) pl.hidden = !can.pnl();
  garland($('.top'));
  sleigh({ first: 9000, every: [40000, 80000], when: () => !document.querySelector('.scrim') && /^#?\/?$/.test(location.hash) });
  $('.nav .foot').prepend(toggleButton());
  const nl = $('#nav-logo'); if (nl) nl.onclick = e => { jingle(); burst(e.clientX, e.clientY, 16); };
  $('#who').textContent = (S.profile.full_name || S.user.email) + ' — ' + ROLE_LABEL[S.profile.role];
  $('#logout').onclick = async () => { await sb.auth.signOut(); location.hash = ''; location.reload(); };
  const sel = $('#edition');
  const fill = () => {
    sel.textContent = '';
    for (const e of S.editions) sel.append(h('option', { value: e.id, selected: e.id === S.edition?.id }, e.name + (e.archived ? ' (أرشيف)' : '')));
  };
  fill();
  sel.onchange = () => switchEdition(sel.value);
  onChange(fill);
  const ab = $('#assist');
  const showAssist = () => { ab.hidden = !assistantReady(); };
  ab.onclick = openAssistant;
  showAssist(); onChange(showAssist);
  window.addEventListener('bcm:settings', showAssist);
}

function render(full) {
  const key = location.hash.replace(/^#\/?/, '').split('?')[0];
  const r = (key === 'pnl' && !can.pnl() ? null : ROUTES[key]) || ROUTES[''];
  $$('.nav a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#/' + key ? 'page' : 'false'));
  $('#page-title').textContent = r.title;
  document.title = r.title + ' — Basra Christmas Market';
  if (!S.edition) { view().replaceChildren(noEdition()); return; }
  // the map keeps its own state across live refreshes
  if (!full && view()._refresh) { view()._refresh(); return; }
  cleanup?.(); cleanup = null; view()._refresh = null;
  const out = r.render(view());
  if (typeof out === 'function') cleanup = out;
}

function noEdition() {
  return h('div', { class: 'empty' }, h('strong', {}, 'لا توجد نسخة مهرجان بعد'),
    'شغّل ملف seed.sql من دليل التشغيل لإضافة نسخة 2026 والأكشاك، أو أنشئ نسخة من الإعدادات.');
}

// ================= dashboard =================
const CARD_DEFS = [
  ['kiosks', 'إجمالي الأكشاك'], ['reserved', 'محجوزة بالكامل'], ['partial', 'محجوزة جزئياً'], ['available', 'متوفرة'],
  ['held', 'حجوزات مؤقتة'], ['customers', 'العملاء المشاركون'], ['contract', 'قيمة العقود'], ['collected', 'المبالغ المحصلة'],
  ['outstanding', 'المبالغ المتبقية'], ['overdue', 'دفعات متأخرة'], ['unpriced', 'حجوزات بلا سعر'],
  ['visitors', 'إجمالي الزوار'], ['dailyIncome', 'إيراد المهرجان اليومي (المجموع)'],
];
function hiddenCards() { try { return JSON.parse(localStorage.getItem('bcm.hiddenCards') || '[]'); } catch { return []; } }

function stats() {
  const E = S.edition;
  const st = computeStatuses(S.kiosks, S.reservations, E.start_date, E.end_date);
  const cnt = s => [...st.values()].filter(x => x === s).length;
  const live = S.reservations.filter(r => r.status !== 'cancelled');
  const sum = (arr, f) => arr.reduce((a, r) => a + (f(r) || 0), 0);
  return {
    st,
    kiosks: S.kiosks.filter(k => k.active && k.rentable).length,
    reserved: cnt('reserved'), partial: cnt('partial'), available: cnt('available'),
    held: live.filter(r => r.status === 'held' && !r.hold_expired).length,
    customers: new Set(live.map(r => r.customer_id).filter(Boolean)).size,
    contract: sum(live, r => r.total), collected: sum(S.reservations, r => r.paid),
    outstanding: sum(live, r => Math.max(0, r.remaining || 0)),
    overdue: live.filter(r => r.pay_status === 'overdue').length,
    unpriced: live.filter(r => r.pay_status === 'not_priced').length,
    visitors: S.daily.reduce((a, d) => a + (d.visitors || 0), 0),
    dailyIncome: S.daily.reduce((a, d) => a + (d.income || 0), 0),
    live,
  };
}

function pageDashboard(root) {
  const E = S.edition, s = stats(), cfgs = settings();
  const hidden = hiddenCards();
  const today = todayISO();
  const until = daysBetween(today, E.start_date) - 1;
  const phase = until > 0 ? `يفتتح بعد ${until} يوماً` : today <= E.end_date ? 'المهرجان قائم الآن' : 'انتهت هذه النسخة';
  const fmt = {
    contract: v => money(v), collected: v => money(v), outstanding: v => money(v), dailyIncome: v => money(v),
  };
  const card = ([key, label]) => h('div', { class: 'stat' + (key === 'overdue' && s.overdue ? ' alert' : '') },
    h('div', { class: 'stat-l' }, label),
    h('div', { class: 'stat-v' }, h('span', { class: 'num' }, fmt[key] ? fmt[key](s[key]) : fmtNum(s[key]))));
  const quick = h('div', { class: 'quick' },
    can.book() ? h('button', { class: 'btn primary', onclick: () => openBooking() }, 'حجز جديد') : null,
    can.pay() ? h('button', { class: 'btn', onclick: () => openPayment() }, 'إضافة دفعة') : null,
    h('a', { class: 'btn', href: '#/map' }, 'الخريطة'),
    h('a', { class: 'btn', href: '#/customers' }, 'العملاء'),
    h('a', { class: 'btn', href: '#/reports' }, 'التقارير'),
    can.daily() ? h('button', { class: 'btn', onclick: () => openDailyEntry(todayISO() >= E.start_date && todayISO() <= E.end_date ? todayISO() : E.start_date) }, 'تسجيل يومية') : null,
    assistantReady() ? h('button', { class: 'btn pine', onclick: openAssistant }, 'المساعد الذكي') : null,
    h('button', { class: 'btn ghost', onclick: customizeCards }, 'تخصيص البطاقات'));

  const pct = s.kiosks ? Math.round(100 * (s.reserved + s.partial) / s.kiosks) : 0;
  const banner = h('section', { class: 'hero' },
    h('div', { class: 'hero-main' },
      h('img', { class: 'hero-logo', src: 'img/logo-dark.svg', alt: 'Market Christmas' }),
      h('h1', {}, E.name),
      h('p', {}, `${fmtDateLong(E.start_date)} — ${fmtDateLong(E.end_date)} · ${daysBetween(E.start_date, E.end_date)} يوماً`)),
    tree(104),
    h('div', { class: 'hero-side' },
      countdown(E.start_date, E.end_date),
      h('div', { class: 'occ-row' },
        h('div', { class: 'occ-ring', style: { '--p': pct } }, h('b', { class: 'num' }, s.kiosks ? pct + '%' : '—')),
        h('span', {}, 'من الأكشاك عليها حجز'))));
  baubles(banner, [{ x: '6%', len: 26, size: 34 }, { x: '13%', len: 52, size: 26, style: 1 }, { x: '58%', len: 18, size: 24, style: 2 }, { x: '72%', len: 40, size: 30, style: 3 }, { x: '90%', len: 22, size: 28, style: 4 }]);
  void phase;
  root.replaceChildren(...[
    banner, quick,
    h('section', { class: 'stats' }, CARD_DEFS.filter(c => !hidden.includes(c[0])).map(card)),
    cfgs.reminders ? remindersPanel(s, cfgs) : null,
    cfgs.show_analytics ? analyticsPanel(s) : null,
  ].filter(Boolean));
}

function customizeCards() {
  const hidden = hiddenCards();
  const boxes = CARD_DEFS.map(([k, l]) => h('label', { class: 'check' }, h('input', { type: 'checkbox', value: k, checked: !hidden.includes(k) }), l));
  const m = modal({
    title: 'البطاقات الظاهرة في الرئيسية', body: h('div', { class: 'grid2' }, boxes),
    footer: [h('button', { class: 'btn primary', onclick: () => {
      localStorage.setItem('bcm.hiddenCards', JSON.stringify(boxes.map(b => b.firstChild).filter(i => !i.checked).map(i => i.value)));
      m.close(); render(true);
    } }, 'حفظ')],
  });
}

function snoozed() { try { return JSON.parse(localStorage.getItem('bcm.snooze') || '{}'); } catch { return {}; } }
function remindersPanel(s, cfgs) {
  const today = todayISO(), sn = snoozed();
  const limit = addDays(today, cfgs.reminder_days ?? 3);
  const due = s.live.filter(r => r.remaining > 0 && r.next_due_date &&
      (cfgs.reminders_overdue_only ? r.next_due_date < today : r.next_due_date <= limit))
    .filter(r => { const v = sn[r.id + '|' + r.next_due_date]; return !v || (v !== 'x' && v <= today); })
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  if (!due.length) return null;
  const snooze = (r, val) => { const o = snoozed(); o[r.id + '|' + r.next_due_date] = val; localStorage.setItem('bcm.snooze', JSON.stringify(o)); render(true); };
  const when = d => d < today ? `متأخر منذ ${fmtDate(d)}` : d === today ? 'اليوم' : d === addDays(today, 1) ? 'غداً' : fmtDateLong(d);
  return h('section', { class: 'panel' },
    h('div', { class: 'panel-h' }, h('h2', {}, 'دفعات تستحق المتابعة'), h('span', { class: 'hint' }, 'يمكن إيقاف هذه التنبيهات من الإعدادات')),
    h('ul', { class: 'rem' }, due.map(r => h('li', { class: r.next_due_date < today ? 'late' : '' },
      h('div', {}, h('strong', {}, r.customer_name || 'حجز مؤقت'), ` لديه مبلغ متبقٍ قدره `, h('span', { class: 'num' }, money(r.remaining)), `، وموعد التسديد ${when(r.next_due_date)}.`,
        h('div', { class: 'hint' }, 'الأكشاك: ' + r.kiosk_codes.join('، '))),
      h('div', { class: 'rem-acts' },
        r.customer_phone ? h('button', { class: 'btn small wa', onclick: () => openReminder(r.id) }, 'إعداد تذكير') : null,
        h('button', { class: 'btn small', onclick: () => openReservation(r.id) }, 'عرض الحجز'),
        h('button', { class: 'btn small ghost', onclick: () => snooze(r, addDays(today, 1)) }, 'تأجيل يوم'),
        h('button', { class: 'btn small ghost', onclick: () => snooze(r, 'x') }, 'تجاهل'))))));
}

function analyticsPanel(s) {
  const E = S.edition;
  const totalDays = daysBetween(E.start_date, E.end_date);
  const kiosks = S.kiosks.filter(k => k.active && k.rentable);
  const groups = [...new Set(kiosks.map(k => k.grp || '—'))].sort();
  const kRevenue = new Map(), kDays = new Map();
  for (const r of s.live) {
    const n = r.kiosk_ids.length || 1;
    for (const kid of r.kiosk_ids) {
      if (r.total != null) kRevenue.set(kid, (kRevenue.get(kid) || 0) + r.total / n);
      const a = r.start_date > E.start_date ? r.start_date : E.start_date, b = r.end_date < E.end_date ? r.end_date : E.end_date;
      if (a <= b) kDays.set(kid, (kDays.get(kid) || 0) + daysBetween(a, b));
    }
  }
  const rows = groups.map(g => {
    const ks = kiosks.filter(k => (k.grp || '—') === g);
    const days = ks.reduce((a, k) => a + Math.min(totalDays, kDays.get(k.id) || 0), 0);
    return { g, n: ks.length, booked: ks.filter(k => kDays.get(k.id)).length, occ: ks.length ? days / (ks.length * totalDays) : 0, rev: ks.reduce((a, k) => a + (kRevenue.get(k.id) || 0), 0) };
  });
  const allDays = rows.reduce((a, r) => a + r.occ * r.n * totalDays, 0);
  const occAll = kiosks.length ? allDays / (kiosks.length * totalDays) : 0;
  const top = [...kRevenue.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const collectedPct = s.contract ? Math.round(100 * s.live.reduce((a, r) => a + (r.total != null ? r.paid : 0), 0) / s.contract) : null;
  const durations = s.live.map(r => r.days);
  return h('section', { class: 'panel' },
    h('div', { class: 'panel-h' }, h('h2', {}, 'تحليلات هذه النسخة'), h('span', { class: 'hint' }, 'من الحجوزات المسجلة فقط')),
    h('div', { class: 'mini-stats' },
      h('div', {}, h('span', { class: 'hint' }, 'إشغال أيام الأكشاك'), h('b', { class: 'num' }, Math.round(occAll * 100) + '%')),
      h('div', {}, h('span', { class: 'hint' }, 'نسبة التحصيل من العقود المسعّرة'), h('b', { class: 'num' }, collectedPct == null ? '—' : collectedPct + '%')),
      h('div', {}, h('span', { class: 'hint' }, 'متوسط مدة الحجز'), h('b', { class: 'num' }, durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) + ' يوم' : '—')),
      h('div', {}, h('span', { class: 'hint' }, 'الجهات المشاركة'), h('b', { class: 'num' }, s.customers))),
    h('div', { class: 'table-wrap' }, h('table', { class: 't' },
      h('thead', {}, h('tr', {}, ['المجموعة', 'الأكشاك', 'عليها حجز', 'الإشغال', 'الإيراد المتعاقد'].map((t, i) => h('th', { class: i === 4 ? 'money' : '' }, t)))),
      h('tbody', {}, rows.map(r => h('tr', {}, h('td', {}, h('b', {}, r.g)), h('td', {}, r.n), h('td', {}, r.booked),
        h('td', {}, h('div', { class: 'bar' }, h('i', { style: { width: Math.round(r.occ * 100) + '%' } })), h('span', { class: 'hint num' }, Math.round(r.occ * 100) + '%')),
        h('td', { class: 'money' }, h('span', { class: 'num' }, fmtNum(Math.round(r.rev))))))))),
    top.length ? h('p', { class: 'hint', style: { margin: '10px 0 0' } }, 'أعلى الأكشاك إيراداً: ',
      top.map(([id, v]) => `${kioskById(id)?.code} (${fmtNum(Math.round(v))})`).join('، '),
      ' — عند حجز عدة أكشاك بعقد واحد يُقسَم المبلغ عليها بالتساوي.') : null);
}

// ================= map =================
function pageMap(root) {
  const E = S.edition;
  let from = E.start_date, to = E.end_date;
  let multi = false, editing = false, selected = [], grp = '', query = '';
  const fromI = h('input', { class: 'in', type: 'date', value: from, 'aria-label': 'من تاريخ' });
  const toI = h('input', { class: 'in', type: 'date', value: to, 'aria-label': 'إلى تاريخ' });
  const search = h('input', { class: 'in', type: 'search', placeholder: 'ابحث برقم الكشك أو اسم العميل', style: { minWidth: '220px' } });
  const groups = [...new Set(S.kiosks.map(k => k.grp).filter(Boolean))].sort();
  const grpSel = h('select', { class: 'in', 'aria-label': 'المجموعة' }, h('option', { value: '' }, 'كل المجموعات'), groups.map(g => h('option', { value: g }, 'أكشاك ' + g)));
  const multiBtn = h('button', { class: 'btn', 'aria-pressed': 'false' }, 'تحديد عدة أكشاك');
  const editBtn = can.admin() ? h('button', { class: 'btn', 'aria-pressed': 'false' }, 'تحرير الخريطة') : null;
  const areaBtn = can.book() ? h('button', { class: 'btn', 'aria-pressed': 'false' }, 'حجز مساحة') : null;
  const exportBtn = h('button', { class: 'btn' }, 'تصدير الخريطة');
  const addBtn = can.admin() ? h('button', { class: 'btn', 'aria-pressed': 'false' }, '＋ إضافة كشك') : null;
  const delBtn = can.admin() ? h('button', { class: 'btn danger', 'aria-pressed': 'false' }, '－ حذف كشك') : null;
  const swapBtn = can.book() ? h('button', { class: 'btn', 'aria-pressed': 'false' }, '⇄ تبديل كشكين') : null;
  let tool = '', swapA = null;
  const legend = h('div', { class: 'legend' });
  const panel = h('aside', { class: 'mappanel' });
  const box = h('div', { class: 'mapbox' });

  const mv = new MapView(box, {
    onSelect: (k, e) => {
      if (tool === 'del') { removeKiosk(k); return; }
      if (tool === 'swap') { pickSwap(k); return; }
      if (editing) { selected = [k.id]; mv.setSelected(selected); drawPanel(); return; }
      if (multi || e?.shiftKey || e?.ctrlKey || e?.metaKey) {
        selected = selected.includes(k.id) ? selected.filter(x => x !== k.id) : [...selected, k.id];
      } else selected = [k.id];
      mv.setSelected(selected); drawPanel();
    },
    onBackground: () => { if (!multi) { selected = []; mv.setSelected([]); drawPanel(); } },
    onGeom: async (k, geom) => {
      const { error } = await sb.from('kiosks').update({ geom }).eq('id', k.id);
      if (error) toast(errText(error), { error: true });
      drawPanel();
    },
    onAddAt: (cx, cy) => tool === 'add' ? openAddKiosk(cx, cy) : addKioskAt(cx, cy),
    onDraw: geom => createArea(geom),
  });
  mv.setMap(E.map_url, E.map_w, E.map_h);
  mv.setColors(colors());

  const toolbar = h('div', { class: 'maptools' },
    h('div', { class: 'range' }, fromI, h('span', { class: 'hint' }, 'إلى'), toI,
      h('button', { class: 'btn small ghost', onclick: () => { fromI.value = E.start_date; toI.value = E.end_date; upd(); } }, 'كامل المهرجان'),
      h('button', { class: 'btn small ghost', onclick: () => { const t = todayISO(); fromI.value = t; toI.value = t; upd(); } }, 'اليوم')),
    search, grpSel, multiBtn, areaBtn, swapBtn, addBtn, delBtn, exportBtn, editBtn);
  const areaHint = h('div', { class: 'warnbox', hidden: true }, 'اسحب بالماوس أو بإصبعك على الخريطة لرسم المساحة المطلوب تأجيرها. للتحريك أثناء الرسم أوقف «حجز مساحة» مؤقتاً.');
  const toolHint = h('div', { class: 'warnbox', hidden: true });
  root.replaceChildren(h('div', { class: 'mappage' }, toolbar, areaHint, toolHint, legend, h('div', { class: 'mapsplit' }, box, panel)));

  function statuses() {
    from = fromI.value || E.start_date; to = toI.value || E.end_date;
    if (to < from) to = from;
    return computeStatuses(S.kiosks, S.reservations, from, to);
  }
  function drawLegend(st) {
    const c = colors(), count = s => [...st.values()].filter(x => x === s).length;
    legend.replaceChildren(...['available', 'partial', 'held', 'reserved', 'disabled'].map(s =>
      h('span', {}, h('i', { style: { background: statusBg(s, c) } }), `${STATUS_LABEL[s]} (${count(s)})`)),
      h('span', { class: 'hint' }, `الفترة: ${fmtDate(from)} – ${fmtDate(to)}`));
  }
  function applyFilter() {
    const q = query.trim().toLowerCase();
    let ids = null;
    if (q || grp) {
      const byCust = q ? new Set(S.reservations.filter(r => r.status !== 'cancelled' && (r.customer_name || '').toLowerCase().includes(q)).flatMap(r => r.kiosk_ids)) : null;
      ids = S.kiosks.filter(k => (!grp || k.grp === grp) && (!q || k.code.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, '')) || byCust.has(k.id))).map(k => k.id);
    }
    mv.setHighlight(ids);
    return ids;
  }
  function upd() {
    const st = statuses();
    mv.setKiosks(S.kiosks);
    mv.setStatuses(st);
    mv.setColors(colors());
    mv.setSelected(selected = selected.filter(id => kioskById(id)));
    drawLegend(st);
    applyFilter();
    drawPanel(st);
  }
  root._refresh = upd;
  fromI.onchange = toI.onchange = upd;
  search.oninput = () => { query = search.value; const ids = applyFilter(); if (ids && ids.length && ids.length <= 6) mv.fit(ids); };
  search.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const k = kioskByCode(search.value); if (!k) return;
    selected = multi ? [...new Set([...selected, k.id])] : [k.id];
    mv.setSelected(selected); mv.focus(k.id); drawPanel();
  };
  grpSel.onchange = () => { grp = grpSel.value; const ids = applyFilter(); if (ids?.length) mv.fit(ids); else mv.fit(); };
  multiBtn.onclick = () => { multi = !multi; multiBtn.setAttribute('aria-pressed', multi); if (!multi && selected.length > 1) selected = selected.slice(-1); mv.setSelected(selected); drawPanel(); };
  const setArea = on => {
    if (!areaBtn) return;
    areaBtn.setAttribute('aria-pressed', on); areaHint.hidden = !on;
    mv.setMode(on ? 'draw' : (editing ? 'edit' : 'view'));
  };
  if (areaBtn) areaBtn.onclick = () => { setTool(''); setArea(areaBtn.getAttribute('aria-pressed') !== 'true'); };
  // ----- add / remove kiosks (super admin) -----
  function setTool(t) {
    tool = t; if (t !== 'swap') swapA = null;
    addBtn?.setAttribute('aria-pressed', t === 'add'); delBtn?.setAttribute('aria-pressed', t === 'del'); swapBtn?.setAttribute('aria-pressed', t === 'swap');
    toolHint.hidden = !t;
    toolHint.replaceChildren(
      t === 'add' ? 'اضغط على المكان الفارغ في الخريطة حيث تريد إضافة الكشك الجديد.' : t === 'del' ? 'اضغط على الكشك الذي تريد حذفه من الخريطة.'
        : t === 'swap' ? (swapA ? `الكشك الأول: ${swapA.code} — الآن اضغط على الكشك الذي تريد التبديل معه.` : 'اضغط على الكشك الأول الذي تريد تبديله.') : '',
      ' ', h('button', { class: 'btn small', onclick: () => setTool('') }, 'إنهاء'));
    if (t && areaBtn?.getAttribute('aria-pressed') === 'true') { areaBtn.setAttribute('aria-pressed', 'false'); areaHint.hidden = true; }
    mv.setMode(t === 'add' ? 'add' : editing ? 'edit' : 'view');
  }
  if (addBtn) addBtn.onclick = () => setTool(tool === 'add' ? '' : 'add');
  if (delBtn) delBtn.onclick = () => setTool(tool === 'del' ? '' : 'del');
  if (swapBtn) swapBtn.onclick = () => setTool(tool === 'swap' ? '' : 'swap');
  // ----- switch two kiosks -----
  function startSwap(k) { setTool('swap'); pickSwap(k); }
  function pickSwap(k) {
    if (!swapA || swapA.id === k.id) { swapA = k; selected = [k.id]; mv.setSelected(selected); drawPanel(); setTool('swap'); return; }
    const a = swapA, b = k;
    mv.setSelected([a.id, b.id]);
    openSwap(a, b);
  }
  function openSwap(a, b) {
    const liveOn = k => S.reservations.filter(r => r.status !== 'cancelled' && !r.hold_expired && r.kiosk_ids.includes(k.id)).sort((x, y) => x.start_date.localeCompare(y.start_date));
    const side = k => {
      const rs = liveOn(k);
      return h('div', { class: 'swap-side' },
        h('div', { class: 'swap-code' }, k.code),
        h('div', { class: 'hint' }, [k.grp && 'مجموعة ' + k.grp, k.category, k.list_price != null ? 'سعر ' + fmtNum(k.list_price) : null].filter(Boolean).join(' · ') || '—'),
        rs.length ? rs.map(r => h('div', { class: 'swap-res' }, h('strong', {}, r.customer_name || 'حجز مؤقت'), h('span', { class: 'hint' }, `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`),
          r.kiosk_codes.length > 1 ? h('span', { class: 'hint' }, 'ضمن حجز: ' + r.kiosk_codes.join('، ')) : null))
          : h('div', { class: 'swap-res empty' }, 'لا توجد حجوزات — متوفر'));
    };
    const both = S.reservations.filter(r => r.status !== 'cancelled' && r.kiosk_ids.includes(a.id) && r.kiosk_ids.includes(b.id));
    const modeB = h('input', { type: 'radio', name: 'swapmode', value: 'bookings', checked: true });
    const modeP = h('input', { type: 'radio', name: 'swapmode', value: 'position' });
    const ok = h('button', { class: 'btn primary' }, '⇄ تنفيذ التبديل');
    const md = modal({ title: `تبديل ${a.code} و ${b.code}`, wide: true, body: [
      h('div', { class: 'swap-grid' }, side(a), h('div', { class: 'swap-arrow', 'aria-hidden': 'true' }, '⇄'), side(b)),
      h('label', { class: 'check swap-opt' }, modeB, h('span', {}, h('b', {}, 'تبديل الحجوزات بين الكشكين'), h('br'),
        h('span', { class: 'hint' }, `كل حجز على ${a.code} ينتقل إلى ${b.code} والعكس، مع دفعاته ومبالغه كما هي. استخدمه عندما يتبادل مشاركان مكانيهما.`))),
      can.admin() ? h('label', { class: 'check swap-opt' }, modeP, h('span', {}, h('b', {}, 'تبديل مكان الكشكين على الخريطة'), h('br'),
        h('span', { class: 'hint' }, 'يبقى كل حجز على رقم كشكه، لكن موقعي الكشكين يتبادلان على الخريطة. استخدمه عند نقل الكشكين فعلياً في الموقع.'))) : null,
      both.length ? h('p', { class: 'warnbox' }, `الحجز ${both.map(r => r.customer_name).join('، ')} يشمل الكشكين معاً، لذلك يبقى كما هو.`) : null,
      h('p', { class: 'hint', style: { margin: 0 } }, 'الأسعار المتفق عليها لا تتغير. العقود المطبوعة سابقاً تبقى بالرقم القديم؛ افتح العقد من الحجز لطباعته بالرقم الجديد.')],
      footer: [ok, h('button', { class: 'btn', onclick: () => md.close() }, 'إلغاء')],
      onClose: () => { swapA = null; if (tool === 'swap') setTool(''); mv.setSelected(selected); } });
    ok.onclick = async () => {
      ok.disabled = true;
      const mode = modeP.checked ? 'position' : 'bookings';
      const { data, error } = await sb.rpc('swap_kiosks', { p_a: a.id, p_b: b.id, p_mode: mode });
      ok.disabled = false;
      if (error) return toast(errText(error), { error: true });
      md.close(); setTool('');
      await refresh();
      selected = [b.id]; mv.setSelected(selected); drawPanel();
      toast(data || 'تم التبديل', { actions: [{ label: 'تراجع', run: async () => {
        const { error: e2 } = await sb.rpc('swap_kiosks', { p_a: a.id, p_b: b.id, p_mode: mode });
        if (e2) return toast(errText(e2), { error: true });
        await refresh(); toast('تم التراجع عن التبديل');
      } }] });
    };
  }
  function nearest(cx, cy) {
    let best = null, bd = Infinity;
    for (const k of S.kiosks) { const d = (k.geom.cx - cx) ** 2 + (k.geom.cy - cy) ** 2; if (d < bd && k.grp !== 'AR') { bd = d; best = k; } }
    return best;
  }
  function nextCode(g) {
    const nums = S.kiosks.filter(k => k.grp === g && new RegExp('^' + g + '\\d+$').test(k.code)).map(k => +k.code.slice(g.length));
    return g + ((nums.length ? Math.max(...nums) : 0) + 1);
  }
  function openAddKiosk(cx, cy) {
    const near = nearest(cx, cy);
    const g0 = near?.grp || 'A';
    const I = {
      code: h('input', { class: 'in', value: nextCode(g0), dir: 'ltr' }),
      grp: h('input', { class: 'in', value: g0, dir: 'ltr' }),
      category: h('input', { class: 'in', value: near?.category || '' }),
      size: h('select', { class: 'in' }, S.kiosks.filter(k => k.grp !== 'AR').sort((a, b) => codeSort(a.code, b.code)).map(k => h('option', { value: k.id, selected: k.id === near?.id }, 'مثل ' + k.code))),
      price: h('input', { class: 'in', inputmode: 'decimal', value: near?.list_price == null ? '' : fmtNum(near.list_price), placeholder: 'اختياري' }),
    };
    I.grp.oninput = () => { const g = I.grp.value.trim().toUpperCase(); if (g) I.code.value = nextCode(g); };
    const ok = h('button', { class: 'btn primary' }, 'إضافة الكشك');
    const md = modal({ title: 'كشك جديد', body: [
      h('p', { class: 'hint', style: { margin: 0 } }, 'سيظهر الكشك في المكان الذي ضغطت عليه. يمكنك تحريكه أو تغيير حجمه لاحقاً من «تحرير الخريطة».'),
      h('div', { class: 'grid2' }, field('رقم الكشك', I.code), field('المجموعة', I.grp), field('الفئة (اختياري)', I.category), field('الحجم والاتجاه', I.size)),
      field('السعر الاسترشادي (اختياري)', I.price)],
      footer: [ok, h('button', { class: 'btn', onclick: () => md.close() }, 'إلغاء')] });
    ok.onclick = async () => {
      const code = I.code.value.trim().toUpperCase().replace(/\s+/g, '');
      if (!code) return toast('اكتب رقم الكشك', { error: true });
      if (kioskByCode(code)) return toast('يوجد كشك بنفس الرقم ' + code, { error: true });
      const lp = I.price.value.trim() ? parseAmount(I.price.value) : null;
      if (Number.isNaN(lp)) return toast('السعر غير صالح', { error: true });
      const ref = kioskById(I.size.value);
      const geom = ref ? { ...ref.geom, cx, cy } : { cx, cy, w: 36 / E.map_w, h: 28 / E.map_h, rot: 0 };
      ok.disabled = true;
      const { data, error } = await sb.from('kiosks').insert({ edition_id: E.id, code, grp: I.grp.value.trim().toUpperCase() || null, category: I.category.value.trim() || null,
        geom, shape: ref?.shape === 'ellipse' ? 'ellipse' : 'rect', list_price: lp }).select().single();
      ok.disabled = false;
      if (error) return toast(/duplicate|unique/i.test(error.message) ? 'يوجد كشك بنفس الرقم' : errText(error), { error: true });
      md.close(); setTool('');
      await refresh();
      selected = [data.id]; mv.setSelected(selected); drawPanel();
      toast('تمت إضافة الكشك ' + code, { actions: [{ label: 'إضافة كشك آخر', main: true, run: () => setTool('add') }] });
    };
  }
  async function removeKiosk(k) {
    const rs = S.reservations.filter(r => r.kiosk_ids.includes(k.id));
    const live = rs.filter(r => r.status !== 'cancelled');
    if (rs.length) {
      const md = modal({ title: 'لا يمكن حذف الكشك ' + k.code, body: [
        h('p', { style: { margin: 0 } }, live.length
          ? `على هذا الكشك ${live.length} حجز: ${live.map(r => r.customer_name || 'حجز مؤقت').join('، ')}. انقل الحجز إلى كشك آخر أو ألغِه أولاً، ثم احذف الكشك.`
          : 'على هذا الكشك حجوزات ملغاة محفوظة في السجل، لذلك لا يُحذف. يمكنك إخفاؤه كـ«غير متاح» بدلاً من ذلك.')],
        footer: [
          live.length ? h('button', { class: 'btn primary', onclick: () => { md.close(); openReservation(live[0].id); } }, 'فتح الحجز') : null,
          !live.length && k.active ? h('button', { class: 'btn primary', onclick: async () => {
            const { error } = await sb.from('kiosks').update({ active: false, rentable: false }).eq('id', k.id);
            md.close(); if (error) return toast(errText(error), { error: true }); await refresh(); toast('أصبح الكشك ' + k.code + ' غير متاح');
          } }, 'جعله غير متاح') : null,
          h('button', { class: 'btn', onclick: () => md.close() }, 'إغلاق')].filter(Boolean) });
      return;
    }
    const erase = h('input', { type: 'checkbox' });
    const ok = h('button', { class: 'btn primary' }, 'حذف الكشك');
    mv.setSelected([k.id]);
    const md = modal({ title: 'حذف الكشك ' + k.code, body: [
      h('p', { style: { margin: 0 } }, 'سيُحذف الكشك من الخريطة ومن قائمة الأكشاك. لا توجد عليه حجوزات.'),
      h('label', { class: 'check' }, erase, 'امسح رسم الكشك المطبوع على صورة الخريطة أيضاً'),
      h('p', { class: 'hint', style: { margin: 0 } }, 'فعّل هذا الخيار إذا كان الكشك مرسوماً في صورة المخطط الأصلية، حتى لا يبقى مربعه ظاهراً بعد الحذف. يمكنك التراجع عن المسح بعد الحذف مباشرة.')],
      footer: [ok, h('button', { class: 'btn', onclick: () => md.close() }, 'إلغاء')],
      onClose: () => mv.setSelected(selected) });
    ok.onclick = async () => {
      ok.disabled = true;
      const geom = { ...k.geom }, code = k.code;
      const { error } = await sb.from('kiosks').delete().eq('id', k.id);
      if (error) { ok.disabled = false; return toast(errText(error), { error: true }); }
      md.close(); selected = selected.filter(x => x !== k.id);
      await refresh();
      if (erase.checked) {
        const old = { map_url: E.map_url, map_w: E.map_w, map_h: E.map_h };
        try {
          await eraseFromMap([geom]);
          toast('تم حذف الكشك ' + code + ' ومسح رسمه من الخريطة', { actions: [{ label: 'تراجع عن مسح الرسم', run: async () => {
            const { error: e2 } = await sb.from('editions').update(old).eq('id', E.id);
            if (e2) return toast(errText(e2), { error: true });
            Object.assign(E, old); mv.setMap(E.map_url, E.map_w, E.map_h); toast('أُعيدت صورة الخريطة السابقة');
          } }] });
        } catch (e) { toast('حُذف الكشك، لكن تعذر مسح رسمه من الصورة: ' + errText(e), { error: true }); }
      } else toast('تم حذف الكشك ' + code);
    };
  }
  async function eraseFromMap(geoms) {
    const img = new Image(); img.crossOrigin = 'anonymous';
    const src = new URL(E.map_url, location.href).href;
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('تعذر تحميل صورة الخريطة')); img.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now(); });
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    ctx.fillStyle = '#fff';
    for (const g of geoms) {
      ctx.save(); ctx.translate(g.cx * W, g.cy * H); ctx.rotate((g.rot || 0) * Math.PI / 180);
      const w = g.w * W * 1.2 + 6, hh = g.h * H * 1.2 + 6;
      ctx.fillRect(-w / 2, -hh / 2, w, hh); ctx.restore();
    }
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    const path = `${E.id}/map-${Date.now()}.jpg`;
    const up = await sb.storage.from('maps').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (up.error) throw up.error;
    const pub = sb.storage.from('maps').getPublicUrl(path).data.publicUrl;
    const { error } = await sb.from('editions').update({ map_url: pub, map_w: E.map_w, map_h: E.map_h }).eq('id', E.id);
    if (error) throw error;
    E.map_url = pub; mv.setMap(pub, E.map_w, E.map_h);
  }
  exportBtn.onclick = () => openMapExport({ E, from, to, statuses: statuses() });
  async function createArea(geom) {
    setArea(false);
    const existing = S.kiosks.filter(k => /^AR\d+$/.test(k.code)).map(k => +k.code.slice(2));
    const next = 'AR' + ((existing.length ? Math.max(...existing) : 0) + 1);
    const code = h('input', { class: 'in', value: next, dir: 'ltr' });
    const label = h('input', { class: 'in', placeholder: 'مثال: ساحة العروض، مساحة سيارة، منطقة ألعاب' });
    const ok = h('button', { class: 'btn primary' }, 'إنشاء المساحة وحجزها');
    const cancel = h('button', { class: 'btn' }, 'إلغاء');
    const md = modal({ title: 'مساحة جديدة للإيجار', body: [
      h('p', { class: 'hint', style: { margin: 0 } }, 'ستُضاف المساحة إلى الخريطة كمكان قابل للحجز، ثم يُفتح نموذج الحجز مباشرة.'),
      h('div', { class: 'grid2' }, field('رمز المساحة', code), field('الوصف (اختياري)', label))], footer: [ok, cancel] });
    cancel.onclick = () => md.close();
    ok.onclick = async () => {
      const c = code.value.trim().toUpperCase().replace(/\s+/g, '');
      if (!c) return toast('اكتب رمز المساحة', { error: true });
      ok.disabled = true;
      const { data, error } = await sb.from('kiosks').insert({ edition_id: E.id, code: c, grp: 'AR', category: 'مساحة', zone: label.value.trim() || null, geom, shape: 'rect' }).select().single();
      ok.disabled = false;
      if (error) return toast(/duplicate|unique/i.test(error.message) ? 'يوجد كشك أو مساحة بنفس الرمز' : errText(error), { error: true });
      md.close();
      await refresh();
      selected = [data.id]; mv.setSelected(selected); drawPanel();
      openBooking({ kioskIds: [data.id], from, to });
    };
  }
  if (editBtn) editBtn.onclick = () => {
    setTool('');
    editing = !editing; editBtn.setAttribute('aria-pressed', editing); multi = false; multiBtn.setAttribute('aria-pressed', false);
    multiBtn.hidden = editing;
    mv.setMode(editing ? 'edit' : 'view'); selected = selected.slice(-1); mv.setSelected(selected); drawPanel();
  };

  // ----- side panel -----
  function drawPanel(st = statuses()) {
    if (editing) return drawEditPanel();
    if (!selected.length) {
      panel.replaceChildren(h('div', { class: 'pp' },
        h('h2', { class: 'kufi' }, 'اختر كشكاً'),
        h('p', { class: 'hint' }, 'اضغط على أي كشك في الخريطة لعرض حجوزاته أو حجزه. لحجز عدة أكشاك لنفس الجهة فعّل «تحديد عدة أكشاك».'),
        unverifiedNote()));
      return;
    }
    if (selected.length > 1) {
      const ks = selected.map(kioskById).filter(Boolean);
      const busy = ks.filter(k => st.get(k.id) !== 'available');
      panel.replaceChildren(h('div', { class: 'pp' },
        h('h2', { class: 'kufi' }, `${ks.length} أكشاك محددة`),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, ks.map(k => h('span', { class: 'chip' }, k.code))),
        busy.length ? h('p', { class: 'hint', style: { color: 'var(--bad)' } }, 'عليها حجوزات في الفترة المختارة: ' + busy.map(k => k.code).join('، ')) : null,
        can.book() ? h('button', { class: 'btn primary', onclick: () => openBooking({ kioskIds: selected, from, to }) }, 'حجز الأكشاك المحددة') : null,
        h('button', { class: 'btn ghost', onclick: () => { selected = []; mv.setSelected([]); drawPanel(); } }, 'إلغاء التحديد')));
      return;
    }
    const k = kioskById(selected[0]);
    if (!k) return;
    const s = st.get(k.id);
    const rs = S.reservations.filter(r => r.kiosk_ids.includes(k.id)).sort((a, b) => a.start_date.localeCompare(b.start_date));
    const live = rs.filter(r => r.status !== 'cancelled' && !r.hold_expired);
    const gaps = freeGaps(live, E.start_date, E.end_date);
    const bookable = k.active && k.rentable && gaps.length;
    const firstGap = gaps.find(g => g.e >= from && g.s <= to) || gaps[0];
    panel.replaceChildren(h('div', { class: 'pp' },
      h('div', { class: 'kh' },
        h('h2', { class: 'kufi code' }, k.code),
        h('span', { class: 'status-pill', style: { background: statusBg(s, colors()) } }, STATUS_LABEL[s])),
      h('div', { class: 'hint' }, [k.grp && 'مجموعة ' + k.grp, k.category, k.zone].filter(Boolean).join(' · '),
        k.list_price != null ? h('div', {}, 'السعر الاسترشادي: ', h('span', { class: 'num' }, money(k.list_price))) : null),
      k.needs_verify ? h('p', { class: 'warnbox' }, 'رقم هذا الكشك بحاجة لتأكيد. ', k.note || '') : null,
      bookable && can.book() ? h('button', { class: 'btn primary', onclick: () => openBooking({
        kioskIds: [k.id],
        from: firstGap.s > from ? firstGap.s : (from >= firstGap.s && from <= firstGap.e ? from : firstGap.s),
        to: firstGap.e < to ? firstGap.e : to >= firstGap.s && to <= firstGap.e ? to : firstGap.e,
      }) }, 'حجز هذا الكشك') : null,
      can.book() ? h('button', { class: 'btn', onclick: () => startSwap(k) }, '⇄ تبديل مع كشك آخر') : null,
      s === 'partial' ? h('p', { class: 'hint', style: { margin: 0 } }, 'محجوز لجزء من الفترة المعروضة فقط، وباقي الأيام متاحة للحجز.') : null,
      gaps.length && live.length ? h('div', { class: 'hint' }, 'أيام متوفرة: ', gaps.map(g => g.s === g.e ? fmtDate(g.s) : `${fmtDate(g.s)}–${fmtDate(g.e)}`).join('، ')) : null,
      !k.active || !k.rentable ? h('p', { class: 'hint' }, 'هذا الكشك غير متاح للإيجار.') : null,
      h('h3', {}, rs.length ? 'الحجوزات' : 'لا توجد حجوزات على هذا الكشك'),
      rs.map(r => h('article', { class: 'rescard' + (r.status === 'cancelled' ? ' off' : ''), onclick: () => openReservation(r.id), tabindex: 0, onkeydown: e => e.key === 'Enter' && openReservation(r.id) },
        h('div', { class: 'rc-top' }, h('strong', {}, r.customer_name || 'حجز مؤقت'), h('span', { style: { display: 'flex', gap: '4px' } }, badge('res', r.status, RES_LABEL), badge('pay', r.pay_status, PAY_LABEL))),
        h('div', { class: 'hint' }, `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)} · ${r.days} يوماً`, r.kiosk_codes.length > 1 ? ` · مع ${r.kiosk_codes.filter(c => c !== k.code).join('، ')}` : ''),
        r.status === 'held' ? h('div', { class: 'hint', style: { color: '#a0520b' } }, 'حجز مؤقت' + (r.hold_until ? ' حتى ' + fmtDateTime(r.hold_until) : '')) : null,
        h('div', { class: 'rc-money' },
          h('span', {}, 'الكلي ', h('b', { class: r.total == null ? '' : 'num' }, r.total == null ? 'غير محدد' : fmtNum(r.total))),
          h('span', {}, 'مدفوع ', h('b', { class: 'num' }, fmtNum(r.paid))),
          h('span', {}, 'متبقٍ ', h('b', { class: r.remaining == null ? '' : 'num' }, r.remaining == null ? '—' : fmtNum(r.remaining)))),
        r.status !== 'cancelled' && can.pay() ? h('button', { class: 'btn small', onclick: e => { e.stopPropagation(); openPayment(r.id); } }, 'إضافة دفعة') : null))));
  }
  function unverifiedNote() {
    const n = S.kiosks.filter(k => k.needs_verify);
    return n.length ? h('p', { class: 'warnbox' }, `${n.length} كشك بحاجة لتأكيد الرقم: ${n.map(k => k.code).join('، ')}`) : null;
  }

  // ----- map editor -----
  function drawEditPanel() {
    const k = kioskById(selected[0]);
    const tools = h('div', { class: 'pp-tools' },
      h('button', { class: 'btn small', onclick: () => { mv.setMode(mv.mode === 'add' ? 'edit' : 'add'); toast(mv.mode === 'add' ? 'اضغط على مكان الكشك الجديد في الخريطة' : 'تم إيقاف الإضافة'); } }, 'إضافة كشك'),
      h('button', { class: 'btn small', onclick: uploadMap }, 'استبدال صورة الخريطة'),
      h('button', { class: 'btn small', onclick: verifyAll }, 'تأكيد كل الأكشاك'));
    const help = h('p', { class: 'hint' }, 'اختر كشكاً ثم اسحبه لتحريكه. المقبض الذهبي في الزاوية يغيّر الحجم، والدائرة أعلاه تدوّره. كل تغيير يُحفظ فوراً.');
    if (!k) { panel.replaceChildren(h('div', { class: 'pp' }, h('h2', { class: 'kufi' }, 'تحرير الخريطة'), help, tools, unverifiedNote())); return; }
    const I = {
      code: h('input', { class: 'in', value: k.code }), grp: h('input', { class: 'in', value: k.grp || '' }),
      category: h('input', { class: 'in', value: k.category || '' }), zone: h('input', { class: 'in', value: k.zone || '' }),
      shape: h('select', { class: 'in' }, [['rect', 'مستطيل'], ['triangle', 'مثلث'], ['ellipse', 'دائرة / بيضوي']].map(([v, l]) => h('option', { value: v, selected: k.shape === v }, l))),
      rot: h('input', { class: 'in', type: 'number', step: 1, value: Math.round(k.geom.rot || 0) }),
      list_price: h('input', { class: 'in', inputmode: 'decimal', value: k.list_price == null ? '' : fmtNum(k.list_price), placeholder: 'اختياري' }),
      note: h('input', { class: 'in', value: k.note || '' }),
    };
    const C = {
      rentable: h('input', { type: 'checkbox', checked: k.rentable }), active: h('input', { type: 'checkbox', checked: k.active }),
      needs_verify: h('input', { type: 'checkbox', checked: k.needs_verify }),
    };
    I.rot.onchange = () => { k.geom.rot = +I.rot.value || 0; mv.setKiosks(S.kiosks); mv.setSelected(selected); save({ geom: k.geom }, true); };
    I.shape.onchange = () => { k.shape = I.shape.value; mv.setKiosks(S.kiosks); mv.setSelected(selected); };
    const saveBtn = h('button', { class: 'btn primary' }, 'حفظ');
    saveBtn.onclick = () => {
      const lp = I.list_price.value.trim() ? parseAmount(I.list_price.value) : null;
      if (Number.isNaN(lp)) return toast('السعر غير صالح', { error: true });
      const code = I.code.value.trim().toUpperCase().replace(/\s+/g, '');
      if (!code) return toast('اكتب رقم الكشك', { error: true });
      save({ code, grp: I.grp.value.trim() || null, category: I.category.value.trim() || null, zone: I.zone.value.trim() || null, shape: I.shape.value,
        list_price: lp, note: I.note.value.trim() || null, rentable: C.rentable.checked, active: C.active.checked, needs_verify: C.needs_verify.checked });
    };
    async function save(patch, quiet) {
      const { error } = await sb.from('kiosks').update(patch).eq('id', k.id);
      if (error) return toast(/duplicate|unique/i.test(error.message) ? 'يوجد كشك آخر بنفس الرقم' : errText(error), { error: true });
      Object.assign(k, patch);
      if (!quiet) { toast('تم حفظ الكشك ' + k.code); await refresh(); }
    }
    const del = h('button', { class: 'btn danger' }, 'حذف الكشك');
    del.onclick = async () => {
      const used = S.reservations.some(r => r.kiosk_ids.includes(k.id));
      if (used) return toast('على هذا الكشك حجوزات مسجلة؛ ألغِ تفعيله بدلاً من حذفه', { error: true });
      if (!(await confirmBox('حذف الكشك ' + k.code, 'سيُحذف الكشك من خريطة هذه النسخة.', { okLabel: 'حذف', danger: true }))) return;
      const { error } = await sb.from('kiosks').delete().eq('id', k.id);
      if (error) return toast(errText(error), { error: true });
      selected = []; await refresh(); toast('تم حذف الكشك');
    };
    panel.replaceChildren(h('div', { class: 'pp' },
      h('h2', { class: 'kufi code' }, k.code), help,
      h('div', { class: 'grid2' }, field('رقم الكشك', I.code), field('المجموعة', I.grp), field('الفئة', I.category), field('المنطقة', I.zone),
        field('الشكل', I.shape), field('الدوران (درجة)', I.rot)),
      field('السعر الاسترشادي (اختياري)', I.list_price), field('ملاحظة داخلية', I.note),
      h('label', { class: 'check' }, C.rentable, 'متاح للإيجار'),
      h('label', { class: 'check' }, C.active, 'مفعّل (يظهر كمتوفر/محجوز)'),
      h('label', { class: 'check' }, C.needs_verify, 'الرقم بحاجة لتأكيد'),
      h('div', { style: { display: 'flex', gap: '8px' } }, saveBtn, del),
      h('hr', { style: { border: 0, borderTop: '1px solid var(--line)', width: '100%' } }), tools));
  }

  async function addKioskAt(cx, cy) {
    const last = kioskById(selected[0]);
    const g = last ? { ...last.geom, cx, cy } : { cx, cy, w: 17 / E.map_w, h: 25 / E.map_h, rot: 0 };
    const code = prompt('رقم الكشك الجديد (مثل B20):');
    mv.setMode('edit');
    if (!code) return;
    const c = code.trim().toUpperCase().replace(/\s+/g, '');
    const grpGuess = (/^[A-Z]+/.exec(c) || [''])[0] || null;
    const { data, error } = await sb.from('kiosks').insert({ edition_id: E.id, code: c, grp: grpGuess, category: last?.category || null, geom: g, shape: 'rect' }).select().single();
    if (error) return toast(/duplicate|unique/i.test(error.message) ? 'يوجد كشك بنفس الرقم' : errText(error), { error: true });
    selected = [data.id]; await refresh(); toast('تمت إضافة الكشك ' + c);
  }
  async function verifyAll() {
    const n = S.kiosks.filter(k => k.needs_verify);
    if (!n.length) return toast('كل الأكشاك مؤكدة');
    if (!(await confirmBox('تأكيد كل الأكشاك', `سيتم تأكيد ${n.length} كشك: ${n.map(k => k.code).join('، ')}. تأكد من مطابقتها للخريطة الأصلية.`))) return;
    const { error } = await sb.from('kiosks').update({ needs_verify: false }).eq('edition_id', E.id).eq('needs_verify', true);
    if (error) return toast(errText(error), { error: true });
    await refresh(); toast('تم تأكيد الأكشاك');
  }
  function uploadMap() {
    const inp = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml' });
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = async () => {
        const w = img.naturalWidth || 1109, hgt = img.naturalHeight || 1600;
        const ratioOld = E.map_w / E.map_h, ratioNew = w / hgt;
        const msg = Math.abs(ratioOld - ratioNew) > 0.02
          ? 'نسبة أبعاد الصورة الجديدة تختلف عن الحالية، لذلك قد تحتاج لتحريك الأكشاك بعد الرفع. هل تريد المتابعة؟'
          : 'ستبقى الأكشاك في أماكنها النسبية على الصورة الجديدة. هل تريد المتابعة؟';
        if (!(await confirmBox('استبدال صورة الخريطة', msg, { okLabel: 'رفع الصورة' }))) return;
        const path = `${E.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`;
        const up = await sb.storage.from('maps').upload(path, f, { upsert: true, contentType: f.type });
        if (up.error) return toast(errText(up.error), { error: true });
        const pub = sb.storage.from('maps').getPublicUrl(path).data.publicUrl;
        const { error } = await sb.from('editions').update({ map_url: pub, map_w: w, map_h: hgt }).eq('id', E.id);
        if (error) return toast(errText(error), { error: true });
        Object.assign(E, { map_url: pub, map_w: w, map_h: hgt });
        mv.setMap(pub, w, hgt); mv.fit(); toast('تم تحديث صورة الخريطة');
      };
      img.src = url;
    };
    inp.click();
  }

  upd();
  requestAnimationFrame(() => mv.fit());
  return () => { root._refresh = null; };
}

// ---------- map export (PNG image or printable PDF) ----------
function openMapExport({ E, from, to, statuses }) {
  const names = h('input', { type: 'checkbox' });
  const fmtSel = h('select', { class: 'in' }, h('option', { value: 'png' }, 'صورة PNG'), h('option', { value: 'pdf' }, 'PDF / طباعة'));
  const go = h('button', { class: 'btn primary' }, 'تصدير');
  const m = modal({ title: 'تصدير الخريطة', body: [
    h('p', { class: 'hint', style: { margin: 0 } }, `تُصدَّر الخريطة بألوان حالة الأكشاك للفترة ${fmtDate(from)} – ${fmtDate(to)} كما تظهر الآن.`),
    field('الصيغة', fmtSel),
    h('label', { class: 'check' }, names, 'إظهار أسماء العملاء على الأكشاك المحجوزة (للاستخدام الداخلي فقط)')],
    footer: [go, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')] });
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'جارٍ التجهيز…';
    try {
      const canvas = await renderMapCanvas({ E, from, to, statuses, withNames: names.checked });
      const name = `kiosk-map-${E.slug}-${from}_${to}`;
      if (fmtSel.value === 'png') {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const a = h('a', { href: URL.createObjectURL(blob), download: name + '.png' }); document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      } else {
        const url = canvas.toDataURL('image/jpeg', 0.92);
        const w = window.open('', '_blank');
        if (!w) throw new Error('اسمح بالنوافذ المنبثقة لهذا الموقع لتتمكن من الطباعة');
        w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${name}</title><style>@page{size:A3 portrait;margin:8mm}body{margin:0;text-align:center}img{max-width:100%;max-height:97vh}.bar{padding:8px;font-family:sans-serif}@media print{.bar{display:none}}</style></head><body><div class="bar"><button onclick="print()">طباعة / حفظ PDF</button></div><img src="${url}" onload="setTimeout(()=>print(),300)"></body></html>`);
        w.document.close();
      }
      m.close(); toast('تم تصدير الخريطة');
    } catch (e) { toast(errText(e), { error: true }); }
    go.disabled = false; go.textContent = 'تصدير';
  };
}

async function renderMapCanvas({ E, from, to, statuses, withNames }) {
  const c = colors();
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('تعذر تحميل صورة الخريطة')); i.src = E.map_url; });
  const W = E.map_w || img.naturalWidth, H = E.map_h || img.naturalHeight;
  const head = Math.round(W * 0.085), cv = document.createElement('canvas');
  cv.width = W; cv.height = H + head;
  const x = cv.getContext('2d');
  try { await document.fonts.load(`600 40px "Readex Pro"`); } catch {}
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, cv.width, cv.height);
  x.drawImage(img, 0, head, W, H);
  // stripes for partly booked
  const pc = document.createElement('canvas'); pc.width = pc.height = 16; const px = pc.getContext('2d');
  px.fillStyle = c.available; px.fillRect(0, 0, 16, 16); px.strokeStyle = c.reserved; px.lineWidth = 5;
  px.beginPath(); px.moveTo(-4, 4); px.lineTo(4, -4); px.moveTo(0, 16); px.lineTo(16, 0); px.moveTo(12, 20); px.lineTo(20, 12); px.stroke();
  const stripes = x.createPattern(pc, 'repeat');
  const custOf = id => { const r = S.reservations.find(r => r.status !== 'cancelled' && !r.hold_expired && r.kiosk_ids.includes(id) && r.start_date <= to && r.end_date >= from); return r?.customer_name || ''; };
  const font = '"Readex Pro", Tahoma, sans-serif';
  for (const k of S.kiosks) {
    const g = k.geom, cx = g.cx * W, cy = g.cy * H + head, w = g.w * W, hh = g.h * H, st = statuses.get(k.id) || 'available';
    x.save(); x.translate(cx, cy); x.rotate((g.rot || 0) * Math.PI / 180);
    x.beginPath();
    if (k.shape === 'triangle') { x.moveTo(0, -hh / 2); x.lineTo(w / 2, hh / 2); x.lineTo(-w / 2, hh / 2); x.closePath(); }
    else if (k.shape === 'ellipse') x.ellipse(0, 0, w / 2, hh / 2, 0, 0, Math.PI * 2);
    else x.rect(-w / 2, -hh / 2, w, hh);
    x.globalAlpha = 0.85; x.fillStyle = st === 'partial' ? stripes : (c[st] || '#888'); x.fill();
    x.globalAlpha = 1; x.lineWidth = Math.max(1.5, W / 1200); x.strokeStyle = 'rgba(0,0,0,.55)'; x.stroke();
    const vertical = hh > w * 1.3; if (vertical) x.rotate(Math.PI / 2);
    const len = vertical ? hh : w, thick = vertical ? w : hh;
    const fs = Math.max(8, Math.min(thick * 0.5, len * 0.32, W / 90));
    x.font = `700 ${fs}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = fs / 5; x.strokeStyle = 'rgba(0,0,0,.6)'; x.fillStyle = '#fff';
    x.strokeText(k.code, 0, 0); x.fillText(k.code, 0, 0);
    x.restore();
    const nm = withNames && st !== 'available' && st !== 'disabled' ? custOf(k.id) : '';
    if (nm) {
      const fs2 = Math.max(9, W / 150);
      x.font = `600 ${fs2}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'top';
      const tw = x.measureText(nm).width + fs2 * 0.6, ty = cy + Math.max(w, hh) / 2 + fs2 * 0.2;
      x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(cx - tw / 2, ty, tw, fs2 * 1.3);
      x.fillStyle = '#12372a'; x.fillText(nm, cx, ty + fs2 * 0.12);
    }
  }
  // header: title, period, legend with counts
  x.fillStyle = '#12372a'; x.fillRect(0, 0, W, head);
  x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'middle';
  x.fillStyle = '#ffffff'; x.font = `700 ${head * 0.3}px ${font}`; x.fillText(E.name, W - head * 0.3, head * 0.3);
  x.fillStyle = '#b8913a'; x.font = `500 ${head * 0.17}px ${font}`;
  x.fillText(`خريطة الأكشاك — ${fmtDate(from)} إلى ${fmtDate(to)} — صدرت ${fmtDateTime(new Date())}`, W - head * 0.3, head * 0.62);
  const cnt = s => [...statuses.values()].filter(v => v === s).length;
  let lx = W - head * 0.3; const ly = head * 0.86, sw = head * 0.12;
  x.font = `500 ${head * 0.13}px ${font}`;
  for (const s of ['available', 'partial', 'held', 'reserved', 'disabled']) {
    const label = `${STATUS_LABEL[s]} ${cnt(s)}`;
    x.fillStyle = s === 'partial' ? stripes : c[s]; x.fillRect(lx - sw, ly - sw / 2, sw, sw);
    x.fillStyle = '#ffffff'; x.fillText(label, lx - sw * 1.4, ly);
    lx -= sw * 1.4 + x.measureText(label).width + head * 0.25;
  }
  return cv;
}

function freeGaps(rs, start, end) {
  const busy = new Set();
  for (const r of rs) for (let d = r.start_date < start ? start : r.start_date; d <= r.end_date && d <= end; d = addDays(d, 1)) busy.add(d);
  const gaps = []; let cur = null;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!busy.has(d)) { if (!cur) cur = { s: d, e: d }; else cur.e = d; }
    else if (cur) { gaps.push(cur); cur = null; }
  }
  if (cur) gaps.push(cur);
  return gaps;
}

boot();
