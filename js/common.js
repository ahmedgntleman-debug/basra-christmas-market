// Shared helpers for the admin portal and the public page.

export const cfg = window.BCM_CONFIG || {};
export const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_URL.includes('YOUR-PROJECT') && !cfg.SUPABASE_ANON_KEY.includes('YOUR-'));

export const sb = configured
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

// ---------- DOM ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- numbers & money (Iraqi dinar, whole numbers) ----------
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩', FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export function normDigits(s) {
  return String(s ?? '').replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d)).replace(/[۰-۹]/g, d => FA_DIGITS.indexOf(d));
}
// "5 مليون" → 5000000, "2.5م" → 2500000, "750 الف" → 750000, "3,000,000" → 3000000. Empty → null.
export function parseAmount(raw) {
  let s = normDigits(raw).trim().replace(/[٬,،\s]/g, '').replace('٫', '.');
  if (!s) return null;
  let mult = 1;
  if (/(مليون|ملايين|مليونين|m)$/i.test(s)) {
    if (/^مليونين$/.test(s)) return 2000000;
    mult = 1e6; s = s.replace(/(مليون|ملايين|مليونين|m)$/i, '');
  } else if (/(الف|ألف|آلاف|الاف|k)$/i.test(s)) {
    mult = 1e3; s = s.replace(/(الف|ألف|آلاف|الاف|k)$/i, '');
  } else if (/م$/.test(s)) { mult = 1e6; s = s.slice(0, -1); }
  if (s === '') s = '1';
  const n = Number(s);
  if (!isFinite(n) || n < 0) return NaN;
  return Math.round(n * mult);
}
export const fmtNum = n => (n == null ? '' : Number(n).toLocaleString('en-US'));
export function money(n, { unknown = 'غير محدد' } = {}) {
  if (n == null) return unknown;
  return Number(n).toLocaleString('en-US') + ' د.ع';
}

// ---------- dates (Asia/Baghdad) ----------
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(new Date());
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) { // inclusive count
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5) + 1;
}
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${+d}/${+m}/${y}`;
}
const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export function fmtDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
  return `${WD[d.getUTCDay()]} ${fmtDate(iso)}`;
}
export function fmtDateTime(ts) {
  if (!ts) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts));
}

// ---------- labels ----------
export const STATUS_LABEL = {
  available: 'متوفر', reserved: 'محجوز', held: 'حجز مؤقت', partial: 'متوفر جزئياً', disabled: 'غير متاح',
};
export const PAY_LABEL = {
  paid: 'مسدد بالكامل', partial: 'مسدد جزئياً', unpaid: 'غير مسدد', overdue: 'متأخر', not_priced: 'السعر غير محدد', cancelled: 'ملغى',
};
export const RES_LABEL = { confirmed: 'مؤكد', held: 'حجز مؤقت', cancelled: 'ملغى' };
export const ROLE_LABEL = { super_admin: 'مدير عام', reservations: 'مدير الحجوزات', finance: 'المسؤول المالي', readonly: 'اطلاع فقط' };
export const DEFAULT_COLORS = { available: '#2e8b57', reserved: '#c0392b', held: '#e67e22', partial: '#f1c40f', disabled: '#9e9e9e' };

export function badge(kind, key, labels) {
  return h('span', { class: `badge b-${key}` }, labels[key] || key);
}

// ---------- availability (same rule as the database) ----------
// reservations: rows with status, start_date, end_date, kiosk_ids, hold_expired
export function computeStatuses(kiosks, reservations, from, to) {
  const total = daysBetween(from, to);
  const byKiosk = new Map();
  for (const r of reservations) {
    if (r.status === 'cancelled' || r.hold_expired) continue;
    const s = r.start_date > from ? r.start_date : from;
    const e = r.end_date < to ? r.end_date : to;
    if (s > e) continue;
    for (const kid of r.kiosk_ids || []) {
      if (!byKiosk.has(kid)) byKiosk.set(kid, []);
      byKiosk.get(kid).push({ s, e, confirmed: r.status === 'confirmed' });
    }
  }
  const out = new Map();
  for (const k of kiosks) {
    if (!k.active || !k.rentable) { out.set(k.id, 'disabled'); continue; }
    const spans = byKiosk.get(k.id);
    if (!spans) { out.set(k.id, 'available'); continue; }
    const days = new Set();
    for (const sp of spans) for (let d = sp.s; d <= sp.e; d = addDays(d, 1)) days.add(d);
    if (days.size < total) out.set(k.id, 'partial');
    else out.set(k.id, spans.some(x => x.confirmed) ? 'reserved' : 'held');
  }
  return out;
}

// ---------- WhatsApp ----------
export function waNumber(phone) {
  let p = normDigits(phone || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  else if (p.startsWith('00')) p = p.slice(2);
  else if (p.startsWith('0')) p = '964' + p.slice(1);   // Iraqi local number 07xx → 9647xx
  return p;
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}${text ? '?text=' + encodeURIComponent(text) : ''}`;

// ---------- toast ----------
export function toast(msg, { error = false, actions = [], timeout } = {}) {
  let box = $('.toasts'); if (!box) { box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: 'toast' + (error ? ' err' : '') }, h('span', {}, msg));
  if (actions.length) {
    const acts = h('div', { class: 'acts' });
    for (const a of actions) acts.append(h('button', { class: a.main ? 'main' : '', onclick: () => { t.remove(); a.run?.(); } }, a.label));
    t.append(acts);
  }
  box.append(t);
  setTimeout(() => t.remove(), timeout ?? (actions.length ? 12000 : error ? 7000 : 3500));
  return t;
}
export function errText(e) {
  const m = e?.message || String(e);
  if (/no_double_booking|exclusion|23P01/.test(m + (e?.code || ''))) return m.includes('الكشك') || m.includes('الأكشاك') ? m : 'الكشك محجوز لجهة أخرى في هذه الفترة';
  if (/row-level security|42501|permission denied/i.test(m + (e?.code || ''))) return m.match(/[؀-ۿ]/) ? m : 'ليس لديك صلاحية لهذه العملية';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذر الاتصال بالإنترنت. تحقق من الاتصال وحاول مرة أخرى.';
  if (/Invalid login credentials/i.test(m)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  return m;
}

// ---------- modal ----------
export function modal({ title, body, footer, wide = false, onClose }) {
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const scrim = h('div', { class: 'scrim', onmousedown: e => { if (e.target === scrim) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', {}, h('h2', {}, title), h('button', { class: 'x', 'aria-label': 'إغلاق', onclick: close }, '×')),
      h('div', { class: 'body' }, body),
      footer ? h('footer', {}, footer) : null));
  document.body.append(scrim);
  document.addEventListener('keydown', onKey);
  setTimeout(() => scrim.querySelector('input:not([type=hidden]),select,textarea')?.focus(), 30);
  return { close, el: scrim };
}
export function confirmBox(title, text, { okLabel = 'تأكيد', danger = false } = {}) {
  return new Promise(res => {
    let done = false;
    const m = modal({
      title, body: h('p', { style: { margin: 0 } }, text),
      footer: [
        h('button', { class: 'btn ' + (danger ? 'primary' : 'pine'), onclick: () => { done = true; m.close(); res(true); } }, okLabel),
        h('button', { class: 'btn', onclick: () => m.close() }, 'إلغاء'),
      ],
      onClose: () => { if (!done) res(false); },
    });
  });
}

// ---------- export ----------
export function exportRows(rows, columns, filename, type = 'xlsx') {
  const data = rows.map(r => Object.fromEntries(columns.map(c => [c.label, c.value(r)])));
  if (type === 'csv') {
    const head = columns.map(c => c.label);
    const lines = [head, ...data.map(o => head.map(k => o[k]))]
      .map(a => a.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    download(blob, filename + '.csv');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = columns.map(c => ({ wch: Math.max(10, c.label.length + 4) }));
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename + '.xlsx');
}
function download(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function printHTML(title, html) {
  const w = window.open('', '_blank');
  if (!w) { toast('اسمح بالنوافذ المنبثقة لهذا الموقع لتتمكن من الطباعة', { error: true }); return; }
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;600&display=swap">
<style>body{font-family:"Readex Pro",Tahoma,sans-serif;margin:24px;color:#111;font-size:13px}
h1{font-size:18px;margin:0 0 4px}p.meta{color:#555;margin:0 0 16px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px 8px;text-align:start}
th{background:#eef2ef}td.money{text-align:end;direction:ltr}tfoot td{font-weight:700}
.bar{margin-bottom:12px}@media print{.bar{display:none}}</style></head><body>
<div class="bar"><button onclick="print()">طباعة</button> <button onclick="close()">إغلاق</button></div>${html}</body></html>`);
  w.document.close();
}
