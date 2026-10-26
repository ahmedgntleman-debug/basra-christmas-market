// App state for the admin portal: loaded from Supabase, refreshed live on changes.
import { sb, toast, errText } from './common.js';

export const S = {
  user: null,
  profile: null,
  editions: [],
  edition: null,
  kiosks: [],
  reservations: [],   // rows of reservation_summary for the current edition
  customers: [],
  payments: [],       // rows of payment_list for the current edition
  loaded: false,
};

const listeners = new Set();
export const onChange = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

export const role = () => S.profile?.role;
export const can = {
  book: () => ['super_admin', 'reservations'].includes(role()),
  pay: () => ['super_admin', 'reservations', 'finance'].includes(role()),
  customers: () => ['super_admin', 'reservations', 'finance'].includes(role()),
  admin: () => role() === 'super_admin',
};

export const settings = () => ({
  reminders: true, reminder_days: 3, reminders_overdue_only: false,
  contract_prompt: 'ask',          // ask | always | never
  show_analytics: true,
  receipts: true, extended_customer: true, advanced_reports: true,
  assistant: false, gemini_model: 'gemini-2.5-flash',
  contract_template: DEFAULT_CONTRACT,
  ...(S.edition?.settings || {}),
});
export const colors = () => ({
  available: '#2e8b57', reserved: '#c0392b', held: '#e67e22', partial: '#f1c40f', disabled: '#9e9e9e',
  ...(S.edition?.colors || {}),
});

export async function loadEditions() {
  const { data, error } = await sb.from('editions').select('*').order('start_date', { ascending: false });
  if (error) throw error;
  S.editions = data;
  const saved = localStorage.getItem('bcm.edition');
  S.edition = data.find(e => e.id === saved) || data.find(e => !e.archived) || data[0] || null;
}

export async function loadEditionData() {
  if (!S.edition) { S.kiosks = []; S.reservations = []; S.payments = []; return; }
  const eid = S.edition.id;
  const [k, r, c, p] = await Promise.all([
    sb.from('kiosks').select('*').eq('edition_id', eid).order('code'),
    sb.from('reservation_summary').select('*').eq('edition_id', eid).order('created_at', { ascending: false }),
    sb.from('customers').select('*').order('name'),
    sb.from('payment_list').select('*').eq('edition_id', eid).order('created_at', { ascending: false }),
  ]);
  for (const x of [k, r, c, p]) if (x.error) throw x.error;
  S.kiosks = k.data.sort((a, b) => codeSort(a.code, b.code));
  S.reservations = r.data;
  S.customers = c.data;
  S.payments = p.data;
  S.loaded = true;
}

export function codeSort(a, b) {
  const ra = /^([A-Za-z]+)\s*(\d+)/.exec(a), rb = /^([A-Za-z]+)\s*(\d+)/.exec(b);
  if (ra && rb && ra[1] === rb[1]) return +ra[2] - +rb[2];
  return a.localeCompare(b, 'en');
}

export async function refresh({ quiet = true } = {}) {
  try { await loadEditionData(); emit(); }
  catch (e) { if (!quiet) toast(errText(e), { error: true }); console.error(e); }
}

export async function switchEdition(id) {
  S.edition = S.editions.find(e => e.id === id) || S.edition;
  localStorage.setItem('bcm.edition', S.edition?.id || '');
  await refresh({ quiet: false });
}

let channel, timer;
export function subscribeLive() {
  try {
    channel?.unsubscribe();
    channel = sb.channel('bcm-live');
    for (const t of ['reservations', 'reservation_kiosks', 'payments', 'kiosks', 'customers'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => {
        clearTimeout(timer); timer = setTimeout(() => refresh(), 400);
      });
    channel.subscribe();
  } catch (e) { console.warn('live updates unavailable', e); }
}

export const kioskById = id => S.kiosks.find(k => k.id === id);
export const kioskByCode = code => S.kiosks.find(k => k.code.toUpperCase() === String(code).trim().toUpperCase().replace(/\s+/g, ''));
export const customerById = id => S.customers.find(c => c.id === id);

export const DEFAULT_CONTRACT = `عقد إيجار كشك — {festival}

إنه في يوم {today} تم الاتفاق بين كل من:
الطرف الأول: إدارة {festival} (شركة هورايزن البصرة).
الطرف الثاني: {customer}{company_line}، رقم الهاتف: {phone}.

على ما يلي:
1. يؤجر الطرف الأول للطرف الثاني الكشك/الأكشاك رقم ({kiosks}) ضمن موقع المهرجان.
2. مدة الإيجار من {start} ولغاية {end}، أي ({days}) يوماً.
3. بدل الإيجار الكلي {total}، دفع منه الطرف الثاني مبلغ {paid}، والمتبقي {remaining} يسدد في موعد أقصاه {deadline}.
4. يلتزم الطرف الثاني بتعليمات إدارة المهرجان وأوقات العمل والنظافة والسلامة، ولا يجوز له التنازل عن الكشك أو تأجيره للغير إلا بموافقة تحريرية من الطرف الأول.
5. يتحمل الطرف الثاني مسؤولية أي ضرر يلحق بالكشك أو تجهيزاته خلال مدة الإيجار.

{notes}

الطرف الأول                                    الطرف الثاني
التوقيع: ..................                      التوقيع: ..................`;
