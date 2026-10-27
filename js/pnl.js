// Profit & Loss: revenue from kiosk rent and sponsorship (from reservations),
// daily income by source, daily expenses and operating expenses (from the ledger).
import { sb, h, $, toast, errText, money, fmtNum, fmtDate, fmtDateLong, fmtDateTime, todayISO, addDays, daysBetween, parseAmount, modal, confirmBox, esc } from './common.js';
import { S, can, refresh } from './state.js';
import { field } from './booking.js';

export const KIND = {
  daily_income: { label: 'إيراد يومي', group: 'rev', cats: ['تذاكر الدخول', 'الألعاب', 'مواقف السيارات', 'حصة المبيعات', 'الفعاليات والعروض', 'التصوير', 'أخرى'] },
  other_income: { label: 'إيراد آخر', group: 'rev', cats: ['دعم أو منحة', 'إعلانات', 'خدمات للمشاركين', 'أخرى'] },
  daily_expense: { label: 'مصروف يومي', group: 'cogs', cats: ['أجور عمال يومية', 'ضيافة وطعام', 'وقود المولدات', 'نقل', 'تنظيف', 'صيانة طارئة', 'مشتريات يومية', 'أخرى'] },
  operating_expense: { label: 'مصروف تشغيلي', group: 'opex', cats: ['الديكور والزينة', 'الإنشاءات وتجهيز الأكشاك', 'الكهرباء والمولدات', 'الصوت والإضاءة', 'الأمن والحراسة', 'التسويق والإعلان', 'الرواتب', 'الفعاليات والفنانين', 'التراخيص والرسوم', 'التأمين', 'إيجار الموقع', 'أخرى'] },
};
const KIND_BY_LABEL = Object.fromEntries(Object.entries(KIND).map(([k, v]) => [v.label, k]));
const METHODS = ['نقداً', 'تحويل بنكي', 'شيك', 'بطاقة', 'أخرى'];
const C_INC = '#2f7d47', C_EXP = '#e8955a', C_INK = '#1d2420';
const UNSPLIT = 'مدخول يومي (غير مفصّل)';

// ---------------- computation ----------------
const overlap = (s1, e1, s2, e2) => { const s = s1 > s2 ? s1 : s2, e = e1 < e2 ? e1 : e2; return s > e ? 0 : daysBetween(s, e); };
const inRange = (d, from, to) => (!from || d >= from) && (!to || d <= to);
const sum = (a, f = x => x) => a.reduce((t, x) => t + (f(x) || 0), 0);

export function computePnl({ from = null, to = null, basis = 'accrual' } = {}) {
  const E = S.edition;
  const live = S.reservations.filter(r => r.status !== 'cancelled');
  const byDay = new Map();
  const day = d => { if (!byDay.has(d)) byDay.set(d, { day: d, contracts: 0, rental: 0, sponsor: 0, income: 0, other: 0, dexp: 0, opex: 0, visitors: null }); return byDay.get(d); };
  // festival days always listed (within range)
  for (let d = E.start_date; d <= E.end_date; d = addDays(d, 1)) if (inRange(d, from, to)) day(d);

  let rental = 0, sponsor = 0, rentalN = 0, sponsorN = 0;
  if (basis === 'accrual') {
    for (const r of live) {
      if (r.total == null || !r.days) continue;
      const perDay = r.total / r.days;
      const ov = from || to ? overlap(r.start_date, r.end_date, from || r.start_date, to || r.end_date) : r.days;
      if (!ov) continue;
      const amt = perDay * ov;
      if (r.deal_type === 'sponsorship') { sponsor += amt; sponsorN++; } else { rental += amt; rentalN++; }
      for (let d = r.start_date; d <= r.end_date; d = addDays(d, 1)) {
        if (!inRange(d, from, to)) continue;
        const x = day(d); x[r.deal_type === 'sponsorship' ? 'sponsor' : 'rental'] += perDay;
      }
    }
  } else {
    const resById = new Map(S.reservations.map(r => [r.id, r]));
    const seenR = new Set(), seenS = new Set();
    for (const p of S.payments) {
      if (!inRange(p.paid_on, from, to)) continue;
      const r = resById.get(p.reservation_id); const sp = r?.deal_type === 'sponsorship';
      if (sp) { sponsor += p.amount; seenS.add(p.reservation_id); } else { rental += p.amount; seenR.add(p.reservation_id); }
      day(p.paid_on)[sp ? 'sponsor' : 'rental'] += p.amount;
    }
    rentalN = seenR.size; sponsorN = seenS.size;
  }

  const L = S.ledger.filter(e => inRange(e.day, from, to));
  const cats = { daily_income: new Map(), other_income: new Map(), daily_expense: new Map(), operating_expense: new Map() };
  const addCat = (k, c, v) => cats[k].set(c, (cats[k].get(c) || 0) + v);
  const ledgerIncomeDays = new Set(L.filter(e => e.kind === 'daily_income').map(e => e.day));
  for (const e of L) {
    addCat(e.kind, e.category || 'أخرى', e.amount);
    const x = day(e.day);
    if (e.kind === 'daily_income') x.income += e.amount;
    else if (e.kind === 'other_income') x.other += e.amount;
    else if (e.kind === 'daily_expense') x.dexp += e.amount;
    else x.opex += e.amount;
  }
  // days logged only as one total in the daily log count as "unsplit" daily income
  let visitors = 0, visitorDays = 0;
  for (const d of S.daily) {
    if (!inRange(d.day, from, to)) continue;
    if (d.visitors != null) { visitors += d.visitors; visitorDays++; day(d.day).visitors = d.visitors; }
    if (d.income && !ledgerIncomeDays.has(d.day)) { addCat('daily_income', UNSPLIT, d.income); day(d.day).income += d.income; }
  }

  const tot = k => sum([...cats[k].values()]);
  const dailyIncome = tot('daily_income'), otherIncome = tot('other_income'), dexp = tot('daily_expense'), opex = tot('operating_expense');
  rental = Math.round(rental); sponsor = Math.round(sponsor);
  const revenue = rental + sponsor + dailyIncome + otherIncome;
  const gross = revenue - dexp, net = gross - opex, expenses = dexp + opex;
  const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  let cum = 0;
  for (const x of days) {
    x.contracts = x.rental + x.sponsor;
    x.rev = x.contracts + x.income + x.other; x.exp = x.dexp + x.opex; x.net = x.rev - x.exp; cum += x.net; x.cum = cum;
  }
  const festDays = days.filter(x => x.day >= E.start_date && x.day <= E.end_date);
  const sorted = (k) => [...cats[k].entries()].sort((a, b) => b[1] - a[1]);
  const contracted = sum(live, r => r.total), collected = sum(S.reservations, r => r.paid);
  const best = festDays.filter(x => x.rev || x.exp).sort((a, b) => b.net - a.net);
  return {
    from, to, basis, rental, sponsor, rentalN, sponsorN, dailyIncome, otherIncome, revenue, dexp, opex, expenses, gross, net,
    grossMargin: revenue ? gross / revenue : null, netMargin: revenue ? net / revenue : null,
    cats: { daily_income: sorted('daily_income'), other_income: sorted('other_income'), daily_expense: sorted('daily_expense'), operating_expense: sorted('operating_expense') },
    days, visitors, visitorDays,
    perVisitor: visitors ? revenue / visitors : null, costPerVisitor: visitors ? expenses / visitors : null,
    coverage: expenses ? revenue / expenses : null,
    contracted, collected, receivable: Math.max(0, sum(live, r => Math.max(0, r.remaining || 0))),
    unpriced: live.filter(r => r.total == null).length,
    bestDay: best[0] || null, worstDay: best.length > 1 ? best[best.length - 1] : null,
    entries: L.length,
  };
}

// statement rows shared by screen, print and Excel
export function statementRows(P) {
  const R = [];
  const pct = v => (P.revenue ? v / P.revenue : null);
  const line = (label, v, note) => R.push({ t: 'line', label, v, p: pct(v), note });
  R.push({ t: 'head', label: 'الإيرادات' });
  line('إيجار الأكشاك', P.rental, `${P.rentalN} عقد`);
  line('الرعاية', P.sponsor, `${P.sponsorN} عقد`);
  for (const [c, v] of P.cats.daily_income) line('إيراد يومي — ' + c, v);
  for (const [c, v] of P.cats.other_income) line('إيراد آخر — ' + c, v);
  R.push({ t: 'sub', label: 'إجمالي الإيرادات', v: P.revenue, p: P.revenue ? 1 : null });
  R.push({ t: 'head', label: 'المصاريف اليومية (المباشرة)' });
  if (!P.cats.daily_expense.length) R.push({ t: 'empty', label: 'لا توجد مصاريف يومية مسجلة' });
  for (const [c, v] of P.cats.daily_expense) line(c, -v);
  R.push({ t: 'sub', label: 'إجمالي المصاريف اليومية', v: -P.dexp, p: pct(-P.dexp) });
  R.push({ t: 'total', label: 'مجمل الربح', v: P.gross, p: P.grossMargin });
  R.push({ t: 'head', label: 'المصاريف التشغيلية' });
  if (!P.cats.operating_expense.length) R.push({ t: 'empty', label: 'لا توجد مصاريف تشغيلية مسجلة' });
  for (const [c, v] of P.cats.operating_expense) line(c, -v);
  R.push({ t: 'sub', label: 'إجمالي المصاريف التشغيلية', v: -P.opex, p: pct(-P.opex) });
  R.push({ t: 'grand', label: P.net >= 0 ? 'صافي الربح' : 'صافي الخسارة', v: P.net, p: P.netMargin });
  return R;
}

const pctTxt = p => (p == null ? '—' : (p * 100).toFixed(1).replace('.0', '') + '%');
const signed = v => (v < 0 ? '(' + fmtNum(-v) + ')' : fmtNum(v));
const compact = v => { const a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1).replace('.0', '') + 'B' : a >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + 'M' : a >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v)); };

// ---------------- charts (SVG strings, used on screen and in print) ----------------
export function dailyChartSVG(days) {
  const D = days.filter(x => x.rev || x.exp || x.visitors != null);
  if (!D.length) return '';
  const W = 960, H = 280, pl = 56, pr = 12, pt = 16, pb = 40;
  const maxV = Math.max(1, ...D.map(x => Math.max(x.rev, x.exp)));
  const minNet = Math.min(0, ...D.map(x => x.net));
  const top = niceMax(maxV), bot = minNet < 0 ? -niceMax(-minNet) : 0;
  const y = v => pt + (top - v) / (top - bot) * (H - pt - pb);
  const n = D.length, gw = (W - pl - pr) / n, bw = Math.max(2, Math.min(18, gw * .32));
  const ticks = [bot, ...[1, 2, 3, 4].map(i => bot + (top - bot) * i / 4)].filter((v, i, a) => a.indexOf(v) === i);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pl-chart" role="img" aria-label="الإيرادات والمصاريف اليومية" style="width:100%;height:auto;direction:ltr;font-family:inherit">`;
  for (const t of ticks) s += `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="${t === 0 ? '#9aa39e' : '#e7e2da'}" stroke-width="1"/><text x="${pl - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="#7f8984">${compact(t)}</text>`;
  const step = Math.ceil(n / 14);
  D.forEach((x, i) => {
    const cx = pl + gw * i + gw / 2;
    const bar = (v, dx, c) => {
      if (!v) return '';
      const y0 = y(0), y1 = y(v), hgt = y0 - y1, w = bw;
      if (hgt < 5) return `<rect x="${cx + dx}" y="${y1}" width="${w}" height="${Math.max(1, hgt)}" fill="${c}"/>`;
      return `<path d="M${cx + dx},${y0} V${y1 + 3} Q${cx + dx},${y1} ${cx + dx + 3},${y1} H${cx + dx + w - 3} Q${cx + dx + w},${y1} ${cx + dx + w},${y1 + 3} V${y0} Z" fill="${c}"/>`;
    };
    s += `<g class="pl-day">${bar(x.rev, -bw - 1, C_INC)}${bar(x.exp, 1, C_EXP)}`;
    s += `<rect x="${cx - gw / 2}" y="${pt}" width="${gw}" height="${H - pt - pb}" fill="transparent"><title>${fmtDate(x.day)}\nالإيرادات: ${fmtNum(Math.round(x.rev))}\nالمصاريف: ${fmtNum(x.exp)}\nالصافي: ${fmtNum(Math.round(x.net))}${x.visitors != null ? '\nالزوار: ' + fmtNum(x.visitors) : ''}</title></rect></g>`;
    if (i % step === 0) s += `<text x="${cx}" y="${H - pb + 16}" text-anchor="middle" font-size="11" fill="#7f8984">${x.day.slice(8, 10)}/${x.day.slice(5, 7)}</text>`;
  });
  const pts = D.map((x, i) => `${pl + gw * i + gw / 2},${y(x.net)}`).join(' ');
  s += `<polyline points="${pts}" fill="none" stroke="${C_INK}" stroke-width="2" stroke-linejoin="round"/>`;
  D.forEach((x, i) => { s += `<circle cx="${pl + gw * i + gw / 2}" cy="${y(x.net)}" r="3.2" fill="${C_INK}" stroke="#fff" stroke-width="1.5" pointer-events="none"/>`; });
  s += `</svg>`;
  return s;
}
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p; return 10 * p; }
const legendHTML = () => `<div class="pl-legend"><span><i style="background:${C_INC}"></i>الإيرادات</span><span><i style="background:${C_EXP}"></i>المصاريف</span><span><i class="ln" style="background:${C_INK}"></i>صافي اليوم</span></div>`;

export function mixHTML(items, color, total) {
  if (!items.length) return '<p class="hint">لا توجد بيانات بعد.</p>';
  const max = Math.max(...items.map(x => x[1]));
  return `<div class="pl-mix">${items.map(([l, v]) => `<div class="pl-mix-r"><span class="l">${esc(l)}</span><span class="b"><i style="width:${Math.max(1.5, v / max * 100)}%;background:${color}"></i></span><span class="v num">${fmtNum(Math.round(v))}</span><span class="p">${pctTxt(total ? v / total : null)}</span></div>`).join('')}</div>`;
}
const revMix = P => [['إيجار الأكشاك', P.rental], ['الرعاية', P.sponsor], ...P.cats.daily_income, ...P.cats.other_income].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
const expMix = P => [...P.cats.daily_expense.map(([c, v]) => [c + ' (يومي)', v]), ...P.cats.operating_expense].sort((a, b) => b[1] - a[1]);

// ---------------- page ----------------
export function pagePnl(root) {
  const E = S.edition;
  let tab = sessionStorage.getItem('bcm.pltab') || 'report';
  let period = sessionStorage.getItem('bcm.plperiod') || 'all', basis = sessionStorage.getItem('bcm.plbasis') || 'accrual';
  const fromI = h('input', { class: 'in', type: 'date', value: E.start_date, 'aria-label': 'من' });
  const toI = h('input', { class: 'in', type: 'date', value: E.end_date, 'aria-label': 'إلى' });
  const perSel = h('select', { class: 'in', 'aria-label': 'الفترة' },
    [['all', 'كامل النسخة (مع مصاريف التحضير)'], ['festival', 'أيام المهرجان فقط'], ['today', 'اليوم'], ['custom', 'فترة مخصصة']].map(([v, l]) => h('option', { value: v, selected: v === period }, l)));
  const basisSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'أساس الاحتساب' },
    [['accrual', 'حسب العقود'], ['cash', 'حسب المحصّل']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': v === basis, onclick: e => { basis = v; sessionStorage.setItem('bcm.plbasis', v); [...basisSeg.children].forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); draw(); } }, l)));
  const range = h('span', { class: 'range' }, fromI, h('span', { class: 'hint' }, 'إلى'), toI);
  const getRange = () => {
    if (period === 'all') return { from: null, to: null };
    if (period === 'festival') return { from: E.start_date, to: E.end_date };
    if (period === 'today') { const t = todayISO(); return { from: t, to: t }; }
    return { from: fromI.value || null, to: toI.value || null };
  };
  perSel.onchange = () => { period = perSel.value; sessionStorage.setItem('bcm.plperiod', period); range.hidden = period !== 'custom'; draw(); };
  fromI.onchange = toI.onchange = () => draw();
  range.hidden = period !== 'custom';
  const add = (kind, label) => can.ledger() ? h('button', { class: 'btn' + (kind === 'daily_income' ? ' primary' : ''), onclick: () => openEntry({ kind }) }, label) : null;
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const body = h('div', { class: 'rbody' });
  const drawTabs = () => tabs.replaceChildren(...[['report', 'قائمة الأرباح والخسائر'], ['entries', 'قيود الإيرادات والمصاريف']].map(([k, l]) =>
    h('button', { role: 'tab', 'aria-selected': k === tab, onclick: () => { tab = k; sessionStorage.setItem('bcm.pltab', k); drawTabs(); draw(); } }, l)));
  const bar = h('div', { class: 'pagebar pl-bar' },
    h('div', { class: 'filters' }, perSel, range, basisSeg),
    h('div', { class: 'quick' }, add('daily_income', '＋ إيراد يومي'), add('daily_expense', '＋ مصروف يومي'), add('operating_expense', '＋ مصروف تشغيلي'), add('other_income', '＋ إيراد آخر'),
      can.ledger() ? h('button', { class: 'btn ghost', onclick: openImport }, 'استيراد من Excel') : null));
  function draw() {
    const P = computePnl({ ...getRange(), basis });
    if (tab === 'entries') drawEntries(body, getRange()); else drawReport(body, P);
  }
  drawTabs(); draw();
  root.replaceChildren(bar, tabs, body);
  root._refresh = draw;
}

function kpi(label, value, sub, cls = '') {
  return h('div', { class: 'stat pl-kpi ' + cls }, h('div', { class: 'stat-l' }, label), h('div', { class: 'stat-v' }, value), sub ? h('div', { class: 'hint' }, sub) : null);
}
function periodLabel(P) {
  const E = S.edition;
  if (!P.from && !P.to) return 'كامل النسخة — ' + E.name;
  if (P.from === P.to) return fmtDateLong(P.from);
  return `${P.from ? fmtDate(P.from) : '…'} – ${P.to ? fmtDate(P.to) : '…'}`;
}
const basisLabel = b => b === 'cash' ? 'حسب المبالغ المحصّلة فعلياً' : 'حسب قيمة العقود موزعة على الأيام';

function drawReport(body, P) {
  const R = statementRows(P);
  const neg = P.net < 0;
  const kpis = h('section', { class: 'stats pl-kpis' },
    kpi('إجمالي الإيرادات', h('span', { class: 'num' }, money(P.revenue))),
    kpi('إجمالي المصاريف', h('span', { class: 'num' }, money(P.expenses)), `يومية ${fmtNum(P.dexp)} · تشغيلية ${fmtNum(P.opex)}`),
    kpi(neg ? 'صافي الخسارة' : 'صافي الربح', h('span', { class: 'num' }, money(P.net)), 'هامش صافي ' + pctTxt(P.netMargin), neg ? 'alert' : 'good'),
    kpi('مجمل الربح', h('span', { class: 'num' }, money(P.gross)), 'هامش ' + pctTxt(P.grossMargin)),
    kpi('تغطية المصاريف', P.coverage == null ? '—' : h('span', { class: 'num' }, pctTxt(P.coverage)), P.coverage == null ? 'لا توجد مصاريف بعد' : P.coverage >= 1 ? 'الإيرادات تغطي المصاريف' : 'لم تصل لنقطة التعادل بعد'),
    kpi('الزوار', h('span', { class: 'num' }, fmtNum(P.visitors)), P.perVisitor == null ? `${P.visitorDays} يوم مسجل` : `إيراد/زائر ${fmtNum(Math.round(P.perVisitor))} · كلفة/زائر ${fmtNum(Math.round(P.costPerVisitor))}`),
    kpi('مستحقات غير محصّلة', h('span', { class: 'num' }, money(P.receivable)), `محصّل ${pctTxt(P.contracted ? P.collected / P.contracted : null)} من العقود`));
  const tbl = h('table', { class: 't pl-st' },
    h('thead', {}, h('tr', {}, h('th', {}, 'البند'), h('th', { class: 'money' }, 'المبلغ (د.ع)'), h('th', { class: 'money' }, '% من الإيرادات'), h('th', {}, ''))),
    h('tbody', {}, R.map(r => r.t === 'head' ? h('tr', { class: 'pl-h' }, h('td', { colspan: 4 }, r.label))
      : r.t === 'empty' ? h('tr', { class: 'pl-e' }, h('td', { colspan: 4, class: 'hint' }, r.label))
      : h('tr', { class: 'pl-' + r.t + (r.v < 0 && r.t !== 'line' ? ' neg' : '') },
        h('td', {}, r.label), h('td', { class: 'money' }, h('span', { class: 'num' }, signed(Math.round(r.v)))), h('td', { class: 'money' }, h('span', { class: 'num' }, pctTxt(r.p))), h('td', { class: 'hint' }, r.note || '')))));
  const chart = h('div', { class: 'pl-chartbox' }); chart.innerHTML = dailyChartSVG(P.days) || '<p class="hint">سجّل الإيرادات والمصاريف اليومية ليظهر الرسم.</p>';
  const mixR = h('div'); mixR.innerHTML = mixHTML(revMix(P), C_INC, P.revenue);
  const mixE = h('div'); mixE.innerHTML = mixHTML(expMix(P), C_EXP, P.expenses);
  const dayRows = P.days.filter(x => x.rev || x.exp || x.visitors != null);
  const dayTbl = h('table', { class: 't' },
    h('thead', {}, h('tr', {}, ['اليوم', 'الزوار', 'إيرادات العقود', 'إيراد يومي', 'إيراد آخر', 'مصاريف يومية', 'مصاريف تشغيلية', 'صافي اليوم', 'التراكمي'].map((l, i) => h('th', { class: i ? 'money' : '' }, l)))),
    h('tbody', {}, dayRows.map(x => h('tr', { class: x.day < S.edition.start_date || x.day > S.edition.end_date ? 'pl-pre' : '' },
      h('td', {}, fmtDate(x.day)), ...[x.visitors, x.contracts, x.income, x.other, x.dexp, x.opex].map(v => h('td', { class: 'money' }, v == null ? '—' : h('span', { class: 'num' }, fmtNum(Math.round(v))))),
      h('td', { class: 'money ' + (x.net < 0 ? 'neg' : 'pos') }, h('span', { class: 'num' }, signed(Math.round(x.net)))),
      h('td', { class: 'money ' + (x.cum < 0 ? 'neg' : 'pos') }, h('span', { class: 'num' }, signed(Math.round(x.cum))))))),
    h('tfoot', {}, h('tr', {}, h('td', {}, 'المجموع'), ...[P.visitors, P.rental + P.sponsor, P.dailyIncome, P.otherIncome, P.dexp, P.opex, P.net].map(v => h('td', { class: 'money' }, h('span', { class: 'num' }, signed(Math.round(v))))), h('td', {}, ''))));
  const notes = [
    `أساس الاحتساب: ${basisLabel(P.basis)}.`,
    P.unpriced ? `${P.unpriced} حجز بلا سعر لم يُحتسب ضمن الإيرادات.` : null,
    P.cats.daily_income.some(([c]) => c === UNSPLIT) ? 'بعض الأيام مسجلة بإجمالي واحد من «تسجيل يومية» دون تفصيل المصدر. عند إضافة إيراد يومي حسب المصدر لأي يوم يُعتمد التفصيل بدلاً من الإجمالي.' : null,
  ].filter(Boolean);
  body.replaceChildren(
    h('div', { class: 'pl-head' },
      h('div', {}, h('h2', { class: 'pl-title' }, 'قائمة الأرباح والخسائر'), h('p', { class: 'hint', style: { margin: 0 } }, periodLabel(P) + ' · ' + basisLabel(P.basis))),
      h('div', { class: 'exportbar' },
        h('button', { class: 'btn small primary', onclick: () => printPnl(P) }, 'تقرير احترافي / PDF'),
        h('button', { class: 'btn small', onclick: () => exportPnlXlsx(P) }, 'Excel'))),
    kpis,
    h('div', { class: 'pl-grid' },
      h('section', { class: 'panel pl-stpanel' }, h('div', { class: 'panel-h' }, h('h2', {}, 'القائمة المالية')), h('div', { class: 'table-wrap' }, tbl),
        notes.length ? h('ul', { class: 'pl-notes' }, notes.map(n => h('li', {}, n))) : null),
      h('div', { class: 'pl-side' },
        h('section', { class: 'panel' }, h('div', { class: 'panel-h' }, h('h2', {}, 'مصادر الإيرادات')), mixR),
        h('section', { class: 'panel' }, h('div', { class: 'panel-h' }, h('h2', {}, 'توزيع المصاريف')), mixE))),
    h('section', { class: 'panel' }, h('div', { class: 'panel-h' }, h('h2', {}, 'الإيرادات والمصاريف يوماً بيوم'), h('div', { html: legendHTML() })), chart),
    h('section', { class: 'panel' }, h('div', { class: 'panel-h' }, h('h2', {}, 'الحركة اليومية')), dayRows.length ? h('div', { class: 'table-wrap' }, dayTbl) : h('p', { class: 'hint' }, 'لا توجد حركة مالية مسجلة في هذه الفترة.')));
}

// ---------------- entries ----------------
function drawEntries(body, { from, to }) {
  let kindF = '', q = '';
  const kSel = h('select', { class: 'in' }, h('option', { value: '' }, 'كل الأنواع'), Object.entries(KIND).map(([k, v]) => h('option', { value: k }, v.label)));
  const search = h('input', { class: 'in', type: 'search', placeholder: 'بحث في المصدر أو الوصف أو الجهة' });
  const wrap = h('div');
  const rows = () => S.ledger.filter(e => inRange(e.day, from, to) && (!kindF || e.kind === kindF) &&
    (!q || [e.category, e.description, e.party, e.notes].join(' ').toLowerCase().includes(q))).sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at));
  const cols = [
    { label: 'التاريخ', value: e => fmtDate(e.day) }, { label: 'النوع', value: e => KIND[e.kind].label }, { label: 'المصدر / البند', value: e => e.category },
    { label: 'الوصف', value: e => e.description || '' }, { label: 'الجهة', value: e => e.party || '' }, { label: 'طريقة الدفع', value: e => e.method || '' },
    { label: 'المبلغ', value: e => e.amount, money: true },
  ];
  const paint = () => {
    const rs = rows();
    const inc = sum(rs.filter(e => KIND[e.kind].group === 'rev'), e => e.amount), exp = sum(rs.filter(e => KIND[e.kind].group !== 'rev'), e => e.amount);
    wrap.replaceChildren(
      h('p', { class: 'hint' }, `${rs.length} قيد · إيرادات ${fmtNum(inc)} · مصاريف ${fmtNum(exp)} د.ع`),
      rs.length ? h('div', { class: 'table-wrap' }, h('table', { class: 't' },
        h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: c.money ? 'money' : '' }, c.label)))),
        h('tbody', {}, rs.map(e => h('tr', { class: 'click', tabindex: 0, onclick: () => can.ledger() && openEntry(e), onkeydown: ev => ev.key === 'Enter' && can.ledger() && openEntry(e) },
          h('td', {}, fmtDate(e.day)), h('td', {}, h('span', { class: 'badge ' + (KIND[e.kind].group === 'rev' ? 'b-paid' : 'b-unpaid') }, KIND[e.kind].label)),
          h('td', {}, e.category), h('td', {}, e.description || ''), h('td', {}, e.party || ''), h('td', {}, e.method || ''),
          h('td', { class: 'money' }, h('span', { class: 'num' }, fmtNum(e.amount)))))))) :
        h('div', { class: 'empty' }, h('strong', {}, 'لا توجد قيود'), can.ledger() ? 'استخدم أزرار الإضافة في الأعلى أو استورد ملف Excel.' : ''));
  };
  kSel.onchange = () => { kindF = kSel.value; paint(); };
  search.oninput = () => { q = search.value.trim().toLowerCase(); paint(); };
  const xl = h('div', { class: 'exportbar' },
    h('button', { class: 'btn small', onclick: () => exportRowsSafe(rows(), cols, 'pnl-entries') }, 'Excel'));
  body.replaceChildren(h('div', { class: 'pagebar' }, h('div', { class: 'filters' }, kSel, search), xl), wrap);
  paint();
}
function exportRowsSafe(rows, cols, name) {
  if (!window.XLSX) return toast('جارٍ تحميل أداة Excel، حاول بعد لحظة', { error: true });
  const ws = XLSX.utils.json_to_sheet(rows.map(r => Object.fromEntries(cols.map(c => [c.label, c.value(r)]))));
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'Entries'); XLSX.writeFile(wb, name + '.xlsx');
}

export function openEntry(e = {}) {
  const E = S.edition, isNew = !e.id;
  let kind = e.kind || 'daily_income';
  const today = todayISO();
  const date = h('input', { class: 'in', type: 'date', value: e.day || (today >= E.start_date && today <= E.end_date ? today : today < E.start_date ? today : E.end_date) });
  const listId = 'cats-' + Math.random().toString(36).slice(2);
  const dl = h('datalist', { id: listId });
  const cat = h('input', { class: 'in', list: listId, value: e.category || '', placeholder: 'اختر من القائمة أو اكتب مصدراً جديداً' });
  const fillCats = () => {
    const used = [...new Set(S.ledger.filter(x => x.kind === kind).map(x => x.category))];
    dl.replaceChildren(...[...new Set([...KIND[kind].cats, ...used])].map(c => h('option', { value: c })));
    chips.replaceChildren(...KIND[kind].cats.slice(0, 8).map(c => h('button', { type: 'button', class: 'chip', onclick: () => { cat.value = c; } }, c)));
  };
  const chips = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } });
  const amt = h('input', { class: 'in', inputmode: 'decimal', value: e.amount ? fmtNum(e.amount) : '', placeholder: 'مثال: 750,000 أو 2.5 مليون' });
  const amtOut = h('span', { class: 'hint' });
  amt.oninput = () => { const v = parseAmount(amt.value); amtOut.textContent = amt.value.trim() === '' ? '' : Number.isNaN(v) ? 'مبلغ غير صالح' : '= ' + money(v); };
  amt.oninput();
  const party = h('input', { class: 'in', value: e.party || '' });
  const method = h('select', { class: 'in' }, h('option', { value: '' }, '—'), METHODS.map(m => h('option', { value: m, selected: e.method === m }, m)));
  const desc = h('input', { class: 'in', value: e.description || '', placeholder: 'اختياري' });
  const notes = h('input', { class: 'in', value: e.notes || '', placeholder: 'اختياري' });
  const partyLbl = h('span');
  const seg = h('div', { class: 'seg pl-kindseg' }, Object.entries(KIND).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': k === kind, onclick: ev => { kind = k; [...seg.children].forEach(b => b.setAttribute('aria-pressed', b === ev.currentTarget)); paintKind(); } }, v.label)));
  const paintKind = () => { fillCats(); partyLbl.textContent = KIND[kind].group === 'rev' ? 'الجهة الدافعة (اختياري)' : 'المستلم / المورّد (اختياري)'; };
  paintKind();
  const save = h('button', { class: 'btn primary' }, isNew ? 'حفظ' : 'حفظ التعديلات');
  const again = isNew ? h('button', { class: 'btn' }, 'حفظ وإضافة آخر') : null;
  const del = !isNew ? h('button', { class: 'btn danger' }, 'حذف القيد') : null;
  const m = modal({ title: isNew ? 'قيد مالي جديد' : 'تعديل قيد', body: [
    h('div', { class: 'f' }, h('span', {}, 'النوع'), seg),
    h('div', { class: 'grid2' }, field('التاريخ', date), field('المبلغ (د.ع)', amt, amtOut)),
    field('المصدر / البند', cat), dl, chips,
    h('div', { class: 'grid2' }, h('label', { class: 'f' }, partyLbl, party), field('طريقة الدفع', method)),
    field('الوصف', desc), field('ملاحظات', notes)],
    footer: [save, again, del, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')].filter(Boolean) });
  const submit = async keep => {
    const v = parseAmount(amt.value);
    if (!date.value) return toast('اختر التاريخ', { error: true });
    if (!v || Number.isNaN(v) || v <= 0) return toast('اكتب مبلغاً صحيحاً أكبر من صفر', { error: true });
    if (!cat.value.trim()) return toast('اختر المصدر أو البند', { error: true });
    const row = { edition_id: E.id, day: date.value, kind, category: cat.value.trim(), amount: Math.round(v), party: party.value.trim() || null, method: method.value || null,
      description: desc.value.trim() || null, notes: notes.value.trim() || null, updated_at: new Date().toISOString() };
    save.disabled = true; if (again) again.disabled = true;
    const { error } = isNew ? await sb.from('ledger').insert(row) : await sb.from('ledger').update(row).eq('id', e.id);
    save.disabled = false; if (again) again.disabled = false;
    if (error) return toast(errText(error), { error: true });
    await refresh();
    toast(`تم حفظ ${KIND[kind].label}: ${money(row.amount)}`);
    if (keep) { amt.value = ''; amt.oninput(); desc.value = ''; party.value = ''; notes.value = ''; amt.focus(); } else m.close();
  };
  save.onclick = () => submit(false);
  if (again) again.onclick = () => submit(true);
  if (del) del.onclick = async () => {
    if (!(await confirmBox('حذف القيد', `سيُحذف ${KIND[e.kind].label} «${e.category}» بمبلغ ${money(e.amount)}.`, { okLabel: 'حذف', danger: true }))) return;
    const { error } = await sb.from('ledger').delete().eq('id', e.id);
    if (error) return toast(errText(error), { error: true });
    m.close(); await refresh(); toast('تم حذف القيد');
  };
  setTimeout(() => amt.focus(), 50);
}

// ---------------- Excel import ----------------
const TEMPLATE_HEAD = ['التاريخ', 'النوع', 'المصدر / البند', 'المبلغ', 'الجهة', 'طريقة الدفع', 'الوصف', 'ملاحظات'];
function downloadTemplate() {
  if (!window.XLSX) return toast('جارٍ تحميل أداة Excel، حاول بعد لحظة', { error: true });
  const E = S.edition;
  const ex = [
    [E.start_date, 'إيراد يومي', 'تذاكر الدخول', 4500000, '', 'نقداً', 'مبيعات شباك التذاكر', ''],
    [E.start_date, 'إيراد يومي', 'الألعاب', 1200000, '', 'نقداً', '', ''],
    [E.start_date, 'مصروف يومي', 'أجور عمال يومية', 350000, 'فريق التنظيف', 'نقداً', '', ''],
    [addDays(E.start_date, -10), 'مصروف تشغيلي', 'الديكور والزينة', 12000000, 'شركة الزينة', 'تحويل بنكي', 'شجرة الميلاد الرئيسية', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEAD, ...ex]);
  ws['!cols'] = TEMPLATE_HEAD.map(() => ({ wch: 18 }));
  const types = XLSX.utils.aoa_to_sheet([['الأنواع المقبولة', 'أمثلة على المصادر'], ...Object.values(KIND).map(k => [k.label, k.cats.join('، ')])]);
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }, { RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'القيود'); XLSX.utils.book_append_sheet(wb, types, 'الأنواع');
  XLSX.writeFile(wb, 'قالب-الإيرادات-والمصاريف.xlsx');
}
function parseDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
  if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const s = String(v).trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
function kindOf(v) {
  const s = String(v || '').trim();
  if (KIND[s]) return s;
  if (KIND_BY_LABEL[s]) return KIND_BY_LABEL[s];
  if (/تشغيل/.test(s)) return 'operating_expense';
  if (/مصروف|مصاريف|صرف/.test(s)) return 'daily_expense';
  if (/آخر|اخر|أخرى/.test(s)) return 'other_income';
  if (/إيراد|ايراد|مدخول|دخل/.test(s)) return 'daily_income';
  return null;
}
function openImport() {
  const inp = h('input', { type: 'file', accept: '.xlsx,.xls,.csv', class: 'in' });
  const out = h('div', { class: 'xbox' });
  const go = h('button', { class: 'btn primary', disabled: true }, 'استيراد');
  let rows = [];
  const m = modal({ title: 'استيراد الإيرادات والمصاريف من Excel', wide: true, body: [
    h('p', { style: { margin: 0 } }, 'جهّز ملفاً بالأعمدة: التاريخ، النوع، المصدر / البند، المبلغ، ثم اختيارياً الجهة وطريقة الدفع والوصف والملاحظات.'),
    h('button', { class: 'btn small', onclick: downloadTemplate, style: { alignSelf: 'flex-start' } }, 'تنزيل قالب جاهز'),
    field('الملف', inp), out],
    footer: [go, h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء')] });
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (!window.XLSX) return toast('جارٍ تحميل أداة Excel، حاول بعد لحظة', { error: true });
    const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const pick = (r, ...keys) => { for (const k of Object.keys(r)) if (keys.some(x => k.trim().includes(x))) return r[k]; return ''; };
    const bad = [];
    rows = [];
    data.forEach((r, i) => {
      const day = parseDate(pick(r, 'التاريخ', 'تاريخ', 'Date', 'date'));
      const kind = kindOf(pick(r, 'النوع', 'نوع', 'Type', 'type'));
      const category = String(pick(r, 'المصدر', 'البند', 'Category', 'category') || '').trim();
      const a = pick(r, 'المبلغ', 'مبلغ', 'Amount', 'amount'); const amount = typeof a === 'number' ? a : parseAmount(String(a));
      if (!day && !kind && !category && !a) return;
      if (!day || !kind || !category || !amount || Number.isNaN(amount) || amount <= 0) { bad.push(i + 2); return; }
      rows.push({ edition_id: S.edition.id, day, kind, category, amount: Math.round(amount),
        party: String(pick(r, 'الجهة', 'Party') || '').trim() || null, method: String(pick(r, 'طريقة', 'Method') || '').trim() || null,
        description: String(pick(r, 'الوصف', 'Description') || '').trim() || null, notes: String(pick(r, 'ملاحظات', 'Notes') || '').trim() || null });
    });
    const t = k => sum(rows.filter(x => x.kind === k), x => x.amount);
    out.replaceChildren(
      h('p', { class: 'warnbox' }, `جاهز للاستيراد: ${rows.length} قيد — ` + Object.entries(KIND).map(([k, v]) => `${v.label} ${fmtNum(t(k))}`).join(' · ')),
      bad.length ? h('p', { class: 'hint', style: { color: 'var(--bad)' } }, `صفوف لم تُفهم وسيتم تجاهلها: ${bad.slice(0, 30).join('، ')}${bad.length > 30 ? '…' : ''} (تحقق من التاريخ والنوع والمبلغ)`) : null);
    go.disabled = !rows.length;
  };
  go.onclick = async () => {
    go.disabled = true;
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('ledger').insert(rows.slice(i, i + 200));
      if (error) { go.disabled = false; return toast(errText(error), { error: true }); }
    }
    m.close(); await refresh(); toast(`تم استيراد ${rows.length} قيد`);
  };
}

// ---------------- Excel export of the report ----------------
function exportPnlXlsx(P) {
  if (!window.XLSX) return toast('جارٍ تحميل أداة Excel، حاول بعد لحظة', { error: true });
  const E = S.edition;
  const st = [['قائمة الأرباح والخسائر — ' + E.name], [periodLabel(P) + ' · ' + basisLabel(P.basis)], [], ['البند', 'المبلغ (د.ع)', '% من الإيرادات']];
  for (const r of statementRows(P)) st.push(r.t === 'head' ? [r.label] : r.t === 'empty' ? ['  ' + r.label] : [(r.t === 'line' ? '   ' : '') + r.label, Math.round(r.v), r.p == null ? '' : Math.round(r.p * 1000) / 10 + '%']);
  st.push([], ['المؤشرات'], ['الزوار', P.visitors], ['إيراد لكل زائر', P.perVisitor == null ? '' : Math.round(P.perVisitor)], ['كلفة لكل زائر', P.costPerVisitor == null ? '' : Math.round(P.costPerVisitor)],
    ['تغطية المصاريف', P.coverage == null ? '' : Math.round(P.coverage * 1000) / 10 + '%'], ['مستحقات غير محصّلة', P.receivable]);
  const ws1 = XLSX.utils.aoa_to_sheet(st); ws1['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 16 }];
  const dd = [['اليوم', 'الزوار', 'إيرادات العقود', 'إيراد يومي', 'إيراد آخر', 'مصاريف يومية', 'مصاريف تشغيلية', 'صافي اليوم', 'التراكمي'],
    ...P.days.filter(x => x.rev || x.exp || x.visitors != null).map(x => [x.day, x.visitors ?? '', Math.round(x.contracts), x.income, x.other, x.dexp, x.opex, Math.round(x.net), Math.round(x.cum)])];
  const ws2 = XLSX.utils.aoa_to_sheet(dd); ws2['!cols'] = dd[0].map(() => ({ wch: 15 }));
  const L = S.ledger.filter(e => inRange(e.day, P.from, P.to)).sort((a, b) => a.day.localeCompare(b.day));
  const ws3 = XLSX.utils.aoa_to_sheet([TEMPLATE_HEAD, ...L.map(e => [e.day, KIND[e.kind].label, e.category, e.amount, e.party || '', e.method || '', e.description || '', e.notes || ''])]);
  ws3['!cols'] = TEMPLATE_HEAD.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }, { RTL: true }, { RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws1, 'الأرباح والخسائر'); XLSX.utils.book_append_sheet(wb, ws2, 'يومي'); XLSX.utils.book_append_sheet(wb, ws3, 'القيود');
  XLSX.writeFile(wb, `P&L-${E.slug}-${todayISO()}.xlsx`);
}

// ---------------- professional printable report ----------------
function printPnl(P) {
  const E = S.edition;
  const w = window.open('', '_blank');
  if (!w) return toast('اسمح بالنوافذ المنبثقة لهذا الموقع لتتمكن من فتح التقرير', { error: true });
  const logo = new URL('img/logo-static.svg', location.href).href;
  const R = statementRows(P);
  const neg = P.net < 0;
  const card = (l, v, s, cls = '') => `<div class="k ${cls}"><span>${esc(l)}</span><b>${v}</b>${s ? `<small>${esc(s)}</small>` : ''}</div>`;
  const rowsHTML = R.map(r => r.t === 'head' ? `<tr class="h"><td colspan="3">${esc(r.label)}</td></tr>`
    : r.t === 'empty' ? `<tr class="e"><td colspan="3">${esc(r.label)}</td></tr>`
    : `<tr class="${r.t}${r.v < 0 && r.t !== 'line' ? ' neg' : ''}"><td>${esc(r.label)}${r.note ? ` <em>${esc(r.note)}</em>` : ''}</td><td class="m">${signed(Math.round(r.v))}</td><td class="m">${pctTxt(r.p)}</td></tr>`).join('');
  const dayRows = P.days.filter(x => x.rev || x.exp || x.visitors != null);
  const dayHTML = dayRows.map(x => `<tr><td>${fmtDate(x.day)}</td><td class="m">${x.visitors == null ? '—' : fmtNum(x.visitors)}</td><td class="m">${fmtNum(Math.round(x.rev))}</td><td class="m">${fmtNum(x.exp)}</td><td class="m ${x.net < 0 ? 'neg' : ''}">${signed(Math.round(x.net))}</td><td class="m ${x.cum < 0 ? 'neg' : ''}">${signed(Math.round(x.cum))}</td></tr>`).join('');
  const notes = [`أساس الاحتساب: ${basisLabel(P.basis)}. في أساس «العقود» تُوزّع قيمة كل عقد إيجار أو رعاية على أيامه بالتساوي؛ وفي أساس «المحصّل» تُحتسب الدفعات المستلمة فعلاً في الفترة.`,
    P.unpriced ? `${P.unpriced} حجز بلا سعر متفق عليه لم يُدرج في الإيرادات.` : '',
    `المستحقات غير المحصّلة من العقود حتى تاريخ التقرير: ${money(P.receivable)} (نسبة التحصيل ${pctTxt(P.contracted ? P.collected / P.contracted : null)}).`].filter(Boolean);
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>قائمة الأرباح والخسائر — ${esc(E.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lalezar&family=Readex+Pro:wght@400;500;600;700&display=swap">
<style>@page{size:A4;margin:12mm 13mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Readex Pro",Tahoma,sans-serif;color:#1d2420;margin:0;background:#efe9df;font-size:12.5px;line-height:1.55}
.tool{position:sticky;top:0;z-index:5;background:linear-gradient(135deg,#16402a,#1f5236);color:#fff;padding:10px 16px;display:flex;gap:8px;align-items:center}
.tool button{font:inherit;border:0;border-radius:10px;padding:8px 14px;cursor:pointer}.tool .p{background:linear-gradient(180deg,#d8333a,#a81d25);color:#fff;font-weight:600}.tool span{margin-inline-start:auto;font-size:12px;opacity:.85}
.page{max-width:800px;margin:18px auto;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.12);padding:0 30px 26px;position:relative}
.rib{height:9px;margin:0 -30px;background:repeating-linear-gradient(-45deg,#b3212a 0 9px,#fff 9px 14px,#2f6b45 14px 23px,#fff 23px 28px)}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 0 12px;border-bottom:2px solid #b3212a}
header img{height:84px}header h1{font-family:Lalezar,serif;font-weight:400;font-size:30px;color:#16402a;margin:0;line-height:1.1}
header p{margin:2px 0 0;color:#8a6d4d;font-size:12.5px}
.ks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}
.k{border:1px solid #ece2d6;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;border-top:4px solid #2f6b45}
.k span{color:#8a6d4d;font-size:11.5px}.k b{font-size:17px;direction:ltr;text-align:right;font-variant-numeric:tabular-nums}.k small{color:#7f8984;font-size:10.5px}
.k.net{border-top-color:#d4a73c;background:#fffaf0}.k.loss{border-top-color:#b3212a;background:#fff5f4}.k.loss b{color:#b3212a}
h2{font-family:Lalezar,serif;font-weight:400;font-size:19px;color:#16402a;margin:18px 0 8px}h2:before{content:"✦ ";color:#d4a73c;font-size:14px}
table{width:100%;border-collapse:collapse}td,th{padding:6px 10px;text-align:start}th{background:#fdf7ee;color:#8a6d4d;font-weight:500;font-size:11.5px;border-bottom:1px solid #e3d8ca}
.m{text-align:end;direction:ltr;font-variant-numeric:tabular-nums;white-space:nowrap}
.st tr.h td{background:#16402a;color:#fff;font-weight:600;font-size:12.5px;padding:7px 10px}
.st tr.line td{border-bottom:1px solid #f1ebe2}.st tr.line td:first-child{padding-inline-start:22px}
.st tr.e td{color:#9aa39e;font-style:italic;padding-inline-start:22px}
.st tr.sub td{font-weight:700;border-top:1px solid #cbbfae;background:#fbf7f0}
.st tr.total td{font-weight:700;background:#eef5ef;border-top:2px solid #2f6b45;font-size:13.5px}
.st tr.grand td{font-weight:800;font-size:15px;background:#16402a;color:#fff;padding:9px 10px}
.st tr.grand.neg td{background:#8c161d}
.st em{font-style:normal;color:#9aa39e;font-size:11px}
.neg{color:#b3212a}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pl-mix{display:flex;flex-direction:column;gap:6px}.pl-mix-r{display:grid;grid-template-columns:minmax(90px,1.3fr) 2fr auto 40px;gap:8px;align-items:center;font-size:11.5px}
.pl-mix-r .b{height:9px;background:#f3eee6;border-radius:5px;overflow:hidden}.pl-mix-r .b i{display:block;height:100%;border-radius:0 5px 5px 0}
.pl-mix-r .v{direction:ltr;font-variant-numeric:tabular-nums}.pl-mix-r .p{color:#7f8984;text-align:end}
.pl-legend{display:flex;gap:14px;font-size:11px;color:#4a5550;margin:-4px 0 4px}.pl-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-inline-end:5px;vertical-align:-1px}.pl-legend i.ln{height:2px;width:14px;vertical-align:3px}
.dt td{border-bottom:1px solid #f1ebe2;font-size:11.5px;padding:4px 8px}.dt tfoot td{font-weight:700;border-top:2px solid #cbbfae}
.notes{margin:14px 0 0;padding:10px 14px 10px 10px;background:#fdf7ee;border-radius:10px;color:#6b5a45;font-size:11px}.notes li{margin:2px 0}
.sign{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:34px;font-size:12px;text-align:center}.sign div{border-top:1px solid #bbb;padding-top:6px;color:#4a5550}
footer{display:flex;justify-content:space-between;color:#8a6d4d;font-size:10.5px;margin-top:20px;border-top:1px dashed #d4a73c;padding-top:8px}
.break{break-before:page}
@media print{body{background:#fff}.tool{display:none}.page{box-shadow:none;margin:0;max-width:none;padding:0}.rib{margin:0}}</style></head><body>
<div class="tool"><button class="p" onclick="print()">طباعة / حفظ PDF</button><button onclick="close()">إغلاق</button><span>لحفظه PDF اختر «Save as PDF» من نافذة الطباعة.</span></div>
<div class="page"><div class="rib"></div>
<header><div><h1>قائمة الأرباح والخسائر</h1><p>${esc(E.name)} · ${esc(periodLabel(P))}</p><p>${esc(basisLabel(P.basis))} · أُعدّ في ${esc(fmtDateTime(new Date()))}</p></div><img src="${logo}" alt="Market Christmas"></header>
<div class="ks">
${card('إجمالي الإيرادات', fmtNum(P.revenue))}
${card('إجمالي المصاريف', fmtNum(P.expenses), `يومية ${fmtNum(P.dexp)} · تشغيلية ${fmtNum(P.opex)}`)}
${card(neg ? 'صافي الخسارة' : 'صافي الربح', signed(P.net), 'هامش صافي ' + pctTxt(P.netMargin), neg ? 'loss' : 'net')}
${card('الزوار', fmtNum(P.visitors), P.perVisitor == null ? '' : `إيراد/زائر ${fmtNum(Math.round(P.perVisitor))}`)}
</div>
<h2>القائمة المالية</h2>
<table class="st"><thead><tr><th>البند</th><th class="m">المبلغ (د.ع)</th><th class="m">% من الإيرادات</th></tr></thead><tbody>${rowsHTML}</tbody></table>
<div class="two"><div><h2>مصادر الإيرادات</h2>${mixHTML(revMix(P), C_INC, P.revenue)}</div><div><h2>توزيع المصاريف</h2>${mixHTML(expMix(P), C_EXP, P.expenses)}</div></div>
${dayRows.length ? `<h2>الإيرادات والمصاريف يوماً بيوم</h2>${legendHTML()}${dailyChartSVG(P.days)}
<h2 class="${dayRows.length > 12 ? 'break' : ''}">الحركة اليومية</h2><table class="dt"><thead><tr><th>اليوم</th><th class="m">الزوار</th><th class="m">الإيرادات</th><th class="m">المصاريف</th><th class="m">صافي اليوم</th><th class="m">التراكمي</th></tr></thead><tbody>${dayHTML}</tbody>
<tfoot><tr><td>المجموع</td><td class="m">${fmtNum(P.visitors)}</td><td class="m">${fmtNum(P.revenue)}</td><td class="m">${fmtNum(P.expenses)}</td><td class="m ${neg ? 'neg' : ''}">${signed(P.net)}</td><td></td></tr></tfoot></table>` : ''}
<ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
<div class="sign"><div>أعدّه</div><div>دقّقه</div><div>اعتمده</div></div>
<footer><span>Market Christmas — Santa's Factory · Horizon Basra</span><span>${esc(E.name)}</span></footer>
</div></body></html>`);
  w.document.close();
}
