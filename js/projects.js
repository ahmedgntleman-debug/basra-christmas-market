// Projects: create a new event (concert, match, Eid party, festival …) and edit everything about it.
import { sb, h, toast, errText, modal, fmtDate, todayISO, addDays, esc } from './common.js';
import { S, can, loadEditions, switchEdition, isActive, adminLink, publicLink } from './state.js';
import { THEMES, THEME_ORDER, UNITS, logoNode, applyTheme, printLogo } from './themes.js';
import { qrSVG, svgToPng } from './qr.js';
import { field } from './booking.js';

export const GENERIC_CONTRACT = `اتفاقية حجز

الجهة المنظمة: إدارة {festival}، ويُشار إليها فيما يلي باسم "الطرف الأول".
الطرف الثاني: {customer}{company_line}، رقم الهاتف: {phone}.

البند الأول: موضوع الحجز
يحجز الطرف الثاني {unit} رقم ({kiosks}) في {festival}، للفترة من {start} إلى {end}، وعدد الأشخاص: {guests}.
المنطقة: {zone}، والحد الأدنى للطلب: {min_spend}.

البند الثاني: المبلغ
المبلغ الكلي المتفق عليه ({total})، المدفوع ({paid})، والمتبقي ({remaining}) يُسدد في موعد أقصاه {deadline}.

البند الثالث: الالتزامات
1. يلتزم الطرف الثاني بالحضور في الموعد المحدد والالتزام بتعليمات التنظيم والأمن.
2. لا يحق للطرف الثاني التنازل عن الحجز لغيره إلا بموافقة الطرف الأول.
3. في حال الإلغاء من قبل الطرف الثاني لا يُسترد المبلغ المدفوع إلا بموافقة الطرف الأول.

{notes}

حُرر بتاريخ {today}.

الطرف الأول: ....................          الطرف الثاني: ....................`;

const slugify = (type, date) => `${type.replace(/_/g, '-')}-${date}`;
async function uploadTo(path, file) {
  const up = await sb.storage.from('maps').upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) throw up.error;
  return sb.storage.from('maps').getPublicUrl(path).data.publicUrl;
}
const imgSize = file => new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([2000, 1400]); i.src = URL.createObjectURL(file); });

// theme cards used by the wizard and the settings page
export function themePicker(value, onPick) {
  const grid = h('div', { class: 'theme-grid', role: 'radiogroup' });
  const paint = v => [...grid.children].forEach(b => b.setAttribute('aria-checked', b.dataset.id === v));
  for (const id of THEME_ORDER) {
    const T = THEMES[id];
    const b = h('button', { type: 'button', class: 'theme-card', role: 'radio', 'data-id': id, style: { '--a': T.c.dark, '--b': T.c.primary, '--g': T.c.gold } },
      h('span', { class: 'tc-icon' }, T.icon), h('span', { class: 'tc-name' }, T.label),
      h('span', { class: 'tc-sw' }, [T.c.dark, T.c.primary, T.c.gold].map(c => h('i', { style: { background: c } }))));
    b.onclick = () => { paint(id); onPick(id); };
    grid.append(b);
  }
  paint(value);
  return grid;
}

export function openNewProject() {
  if (!can.admin()) return toast('إنشاء المشاريع للمدير العام فقط', { error: true });
  const E = S.edition;
  let type = 'concert';
  const today = todayISO();
  const I = {
    name: h('input', { class: 'in', placeholder: 'مثال: حفل ليلة رأس السنة' }),
    venue: h('input', { class: 'in', placeholder: 'مثال: منتزه البصرة العائلي — القاعة الكبرى' }),
    one: h('input', { type: 'checkbox', checked: true }),
    start: h('input', { class: 'in', type: 'date', value: addDays(today, 14) }),
    end: h('input', { class: 'in', type: 'date', value: addDays(today, 14) }),
    time: h('input', { class: 'in', type: 'time', value: '21:00' }),
    unit: h('select', { class: 'in' }, Object.entries(UNITS).map(([k, u]) => h('option', { value: k }, `${u.icon} ${u.many}`))),
    logo: h('input', { type: 'file', accept: 'image/*' }),
    map: h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml' }),
    copyLayout: h('input', { type: 'checkbox' }),
    copyContacts: h('input', { type: 'checkbox', checked: true }),
  };
  const endWrap = field('إلى تاريخ', I.end); endWrap.hidden = true;
  I.one.onchange = () => { endWrap.hidden = I.one.checked; if (I.one.checked) I.end.value = I.start.value; };
  I.start.onchange = () => { if (I.one.checked || I.end.value < I.start.value) I.end.value = I.start.value; };
  const preview = h('div', { class: 'np-preview' });
  const paintPreview = () => {
    applyTheme(type);
    const url = I.logo.files[0] ? URL.createObjectURL(I.logo.files[0]) : null;
    preview.replaceChildren(h('div', { class: 'np-hero' }, logoNode({ name: I.name.value || THEMES[type].label, event_type: type, logo_url: url }, 'hero'),
      h('span', {}, THEMES[type].countdown + ' …')));
  };
  const pick = id => { type = id; I.unit.value = THEMES[id].unit; if (!I.name.dataset.touched) I.name.value = THEMES[id].label; I.one.checked = THEMES[id].group !== 'festival' && THEMES[id].group !== 'season'; I.one.onchange(); paintPreview(); };
  I.name.oninput = () => { I.name.dataset.touched = '1'; paintPreview(); };
  I.logo.onchange = paintPreview;
  const go = h('button', { class: 'btn primary' }, '✨ إنشاء المشروع');
  const md = modal({ title: 'مشروع جديد', wide: true, body: [
    h('p', { class: 'hint', style: { margin: 0 } }, 'اختر نوع المناسبة: يتغير التصميم والزينة والأصوات والكلمات (أكشاك، طاولات…) تلقائياً، ويمكنك تعديل كل شيء لاحقاً من الإعدادات.'),
    themePicker(type, pick),
    h('div', { class: 'grid2' }, field('اسم المشروع', I.name), field('المكان', I.venue)),
    h('label', { class: 'check' }, I.one, 'المناسبة في يوم واحد'),
    h('div', { class: 'grid3' }, field('التاريخ', I.start), endWrap, field('الوقت (اختياري)', I.time)),
    h('div', { class: 'grid2' }, field('ما الذي يُحجز؟', I.unit), field('شعار المشروع (اختياري)', I.logo)),
    field('خريطة المكان (اختياري — يمكن رفعها لاحقاً)', I.map, h('span', { class: 'hint' }, 'صورة مخطط القاعة أو الملعب أو الساحة. بدونها تظهر أرضية بشبكة تضع عليها الطاولات والأكشاك بنفسك.')),
    h('label', { class: 'check' }, I.copyLayout, `انسخ الخريطة وأماكن ${UNITS[E?.unit_kind || 'kiosk'].many} من «${E?.name || ''}»`),
    h('label', { class: 'check' }, I.copyContacts, 'استخدم نفس أرقام الاستفسار'),
    preview],
    footer: [go, h('button', { class: 'btn', onclick: () => md.close() }, 'إلغاء')],
    onClose: () => applyTheme(S.edition?.event_type || 'christmas') });
  pick(type);
  go.onclick = async () => {
    const name = I.name.value.trim();
    if (!name) return toast('اكتب اسم المشروع', { error: true });
    if (!I.start.value) return toast('اختر التاريخ', { error: true });
    const end = I.one.checked ? I.start.value : (I.end.value || I.start.value);
    if (end < I.start.value) return toast('تاريخ النهاية قبل البداية', { error: true });
    go.disabled = true; go.textContent = 'جارٍ الإنشاء…';
    try {
      let slug = slugify(type, I.start.value), n = 1;
      while (S.editions.some(e => e.slug === slug)) slug = slugify(type, I.start.value) + '-' + (++n);
      let id;
      const base = { name, slug, start_date: I.start.value, end_date: end, event_type: type, venue: I.venue.value.trim() || null, unit_kind: I.unit.value,
        event_time: I.time.value || null };
      if (I.copyLayout.checked && E) {
        const { data, error } = await sb.rpc('clone_edition', { p_source: E.id, p: { ...base, copy_map: true, copy_kiosks: true, copy_categories: true, copy_prices: false, copy_branding: false, public_enabled: false } });
        if (error) throw error; id = data;
        await sb.from('editions').update({ event_type: type, unit_kind: I.unit.value, venue: base.venue, event_time: base.event_time, logo_url: null, public_enabled: false }).eq('id', id);
      } else {
        const { data, error } = await sb.from('editions').insert({ ...base, map_url: 'grid', map_w: 2000, map_h: 1400, public_enabled: false,
          contacts: I.copyContacts.checked ? (E?.contacts || []) : [], contact_phone: I.copyContacts.checked ? E?.contact_phone : null, contact_whatsapp: I.copyContacts.checked ? E?.contact_whatsapp : null,
          settings: I.unit.value === 'kiosk' ? {} : { contract_template: GENERIC_CONTRACT } }).select('id').single();
        if (error) throw error; id = data.id;
      }
      const patch = {};
      if (I.logo.files[0]) patch.logo_url = await uploadTo(`${id}/logo-${Date.now()}.${(I.logo.files[0].name.split('.').pop() || 'png').toLowerCase()}`, I.logo.files[0]);
      if (I.map.files[0]) { const [w, hh] = await imgSize(I.map.files[0]); patch.map_url = await uploadTo(`${id}/map-${Date.now()}.${(I.map.files[0].name.split('.').pop() || 'jpg').toLowerCase()}`, I.map.files[0]); patch.map_w = w; patch.map_h = hh; }
      if (Object.keys(patch).length) { const { error } = await sb.from('editions').update(patch).eq('id', id); if (error) throw error; }
      md.close();
      await loadEditions();
      try { sessionStorage.setItem('bcm.welcome', name); } catch {}
      await switchEdition(id);
    } catch (e) {
      go.disabled = false; go.textContent = '✨ إنشاء المشروع';
      toast(/duplicate|unique/i.test(e.message || '') ? 'يوجد مشروع بنفس الرابط المختصر' : errText(e), { error: true });
    }
  };
}

// project section of the settings page: everything about the project is editable here
export function projectFields(E, dis) {
  let type = E.event_type || 'christmas';
  const I = {
    venue: h('input', { class: 'in', value: E.venue || '', disabled: dis, placeholder: 'مكان المناسبة' }),
    time: h('input', { class: 'in', type: 'time', value: E.event_time || '', disabled: dis }),
    tagline: h('input', { class: 'in', value: E.tagline || '', disabled: dis, placeholder: 'عبارة قصيرة تظهر للزبائن (اختياري)' }),
    unit: h('select', { class: 'in', disabled: dis }, Object.entries(UNITS).map(([k, u]) => h('option', { value: k, selected: (E.unit_kind || 'kiosk') === k }, `${u.icon} ${u.many}`))),
    logo: h('input', { type: 'file', accept: 'image/*', disabled: dis }),
    map: h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', disabled: dis }),
  };
  let logoUrl = E.logo_url || null, mapPatch = null;
  const logoBox = h('div', { class: 'logo-edit' });
  const paintLogo = () => logoBox.replaceChildren(logoNode({ ...E, event_type: type, logo_url: logoUrl }, 'hero'),
    logoUrl && !dis ? h('button', { type: 'button', class: 'btn small danger', onclick: () => { logoUrl = null; paintLogo(); } }, 'إزالة الشعار') : '');
  I.logo.onchange = async () => {
    const f = I.logo.files[0]; if (!f) return;
    try { logoUrl = await uploadTo(`${E.id}/logo-${Date.now()}.${(f.name.split('.').pop() || 'png').toLowerCase()}`, f); paintLogo(); toast('تم رفع الشعار — اضغط حفظ'); }
    catch (e) { toast(errText(e), { error: true }); }
  };
  I.map.onchange = async () => {
    const f = I.map.files[0]; if (!f) return;
    try { const [w, hh] = await imgSize(f); mapPatch = { map_url: await uploadTo(`${E.id}/map-${Date.now()}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`, f), map_w: w, map_h: hh }; toast('تم رفع الخريطة — اضغط حفظ'); }
    catch (e) { toast(errText(e), { error: true }); }
  };
  const picker = themePicker(type, id => { type = id; applyTheme(id); paintLogo(); });
  if (dis) picker.querySelectorAll('button').forEach(b => b.disabled = true);
  paintLogo();
  const node = h('div', { class: 'proj-fields' },
    h('strong', { style: { fontSize: '14px' } }, 'نوع المناسبة والتصميم'), picker,
    h('div', { class: 'grid3' }, field('ما الذي يُحجز؟', I.unit), field('المكان', I.venue), field('الوقت (اختياري)', I.time)),
    field('عبارة للزبائن', I.tagline),
    h('div', { class: 'grid2' }, h('div', {}, field('شعار المشروع', I.logo), logoBox), field('استبدال خريطة المكان', I.map, h('span', { class: 'hint' }, 'تبقى أماكن الأكشاك والطاولات بنفس نسبتها على الصورة الجديدة.'))));
  return {
    node,
    patch: () => ({ event_type: type, unit_kind: I.unit.value, venue: I.venue.value.trim() || null, event_time: I.time.value || null, tagline: I.tagline.value.trim() || null, logo_url: logoUrl, ...(mapPatch || {}) }),
  };
}

const copyBtn = (label, url) => h('button', { type: 'button', class: 'btn small', title: url,
  onclick: () => navigator.clipboard.writeText(url).then(() => toast('تم نسخ الرابط'), () => prompt('انسخ الرابط', url)) }, label);

export function projectsSection(sec) {
  const list = h('div', { class: 'proj-list' }, [...S.editions].sort((a, b) => (isActive(b) - isActive(a)) || a.start_date.localeCompare(b.start_date)).map(e => {
    const T = THEMES[e.event_type] || THEMES.christmas, cur = e.id === S.edition?.id;
    return h('div', { class: 'proj-row' + (cur ? ' cur' : ''), style: { '--a': T.c.dark, '--b': T.c.primary } },
      h('span', { class: 'pr-icon' }, T.icon),
      h('div', { class: 'pr-main' }, h('strong', {}, e.name, ' ', h('span', { class: 'pub-badge ' + (e.public_enabled ? 'on' : 'off') }, e.public_enabled ? '● ظاهر للزبائن' : '○ مخفي عن الزبائن')), h('span', { class: 'hint' }, `${T.label} · ${e.start_date === e.end_date ? fmtDate(e.start_date) : fmtDate(e.start_date) + ' – ' + fmtDate(e.end_date)}${e.venue ? ' · ' + e.venue : ''}${e.archived ? ' · مؤرشف' : ''}`)),
      h('div', { class: 'pr-acts' },
        isActive(e) ? copyBtn('🔗 رابط المنظمين', adminLink(e)) : null,
        can.admin() ? h('button', { type: 'button', class: 'btn small ' + (e.public_enabled ? 'ghost' : 'pine'), onclick: () => togglePublic(e) },
          e.public_enabled ? '⏸ إخفاء عن الزبائن' : '▶ تفعيل للزبائن') : null,
        isActive(e) && e.public_enabled ? copyBtn('🔗 رابط الزبائن', publicLink(e)) : null,
        e.public_enabled ? h('button', { type: 'button', class: 'btn small', onclick: () => openProjectQR(e) }, '▦ QR') : null,
        isActive(e) && e.public_enabled ? h('a', { class: 'btn small wa', target: '_blank', rel: 'noopener',
          href: 'https://wa.me/?text=' + encodeURIComponent(`${T.icon} ${e.name}\n${publicLink(e)}`) }, 'واتساب') : null,
        cur ? h('span', { class: 'badge b-confirmed' }, 'مفتوح الآن') : h('button', { class: 'btn small', onclick: () => switchEdition(e.id) }, 'فتح'),
        can.admin() ? h('button', { type: 'button', class: 'btn small danger', title: 'حذف المشروع نهائياً', onclick: () => deleteProject(e) }, '🗑 حذف') : null));
  }));
  const general = h('div', { class: 'linkbox' }, h('span', { class: 'hint' }, 'الرابط العام (يفتح أقرب مشروع فعّال تلقائياً، ويمكن للزبون التبديل بين المشاريع):'),
    h('code', { dir: 'ltr' }, new URL('public.html', location.href).href), copyBtn('نسخ', new URL('public.html', location.href).href));
  return sec('المشاريع', h('p', { class: 'hint', style: { margin: 0 } }, 'كل مشروع له خريطته وأكشاكه أو طاولاته وحجوزاته وتقاريره وتصميمه الخاص.'),
    list, general, can.admin() ? h('div', {}, h('button', { class: 'btn primary', onclick: openNewProject }, '✨ مشروع جديد')) : null);
}

async function togglePublic(e) {
  const on = !e.public_enabled;
  const { error } = await sb.from('editions').update({ public_enabled: on }).eq('id', e.id);
  if (error) return toast(errText(error), { error: true });
  e.public_enabled = on;
  await loadEditions(); window.dispatchEvent(new Event('bcm:settings'));
  toast(on ? `أصبح «${e.name}» ظاهراً للزبائن في صفحة الخريطة` : `أُخفي «${e.name}» عن الزبائن`);
  location.hash.includes('settings') && window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function deleteProject(e) {
  const nRes = e.id === S.edition?.id ? S.reservations.filter(r => r.status !== 'cancelled').length : null;
  const inp = h('input', { class: 'in', placeholder: e.name, autocomplete: 'off' });
  const go = h('button', { class: 'btn danger', disabled: true }, '🗑 حذف المشروع نهائياً');
  inp.oninput = () => { go.disabled = inp.value.trim() !== e.name.trim(); };
  const md = modal({ title: 'حذف المشروع «' + e.name + '»', body: [
    h('p', { class: 'warnbox', style: { margin: 0 } }, 'سيُحذف المشروع نهائياً مع خريطته وكل الأكشاك أو الطاولات والحجوزات والدفعات والأقساط والعقود والإيرادات اليومية والأرباح والخسائر الخاصة به. لا يمكن التراجع عن هذا.',
      nRes ? h('strong', { style: { display: 'block', marginTop: '6px' } }, `على هذا المشروع ${nRes} حجز قائم.`) : null),
    h('p', { class: 'hint', style: { margin: 0 } }, 'العملاء يبقون في قائمة العملاء لأنهم قد يكونون في مشاريع أخرى. ننصح بتصدير نسخة احتياطية أولاً من الإعدادات ← النسخ الاحتياطي.'),
    h('p', { class: 'hint', style: { margin: 0 } }, 'إذا كنت تريد فقط إيقافه أو إخفاءه فاستخدم «إخفاء عن الزبائن» أو «مشروع مؤرشف» بدلاً من الحذف.'),
    h('label', { class: 'f' }, h('span', {}, 'للتأكيد اكتب اسم المشروع: ', h('b', {}, e.name)), inp)],
    footer: [go, h('button', { class: 'btn', onclick: () => md.close() }, 'إلغاء')] });
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'جارٍ الحذف…';
    const { data, error } = await sb.rpc('delete_edition', { p_edition: e.id, p_confirm: inp.value });
    if (error) { go.disabled = false; go.textContent = '🗑 حذف المشروع نهائياً'; return toast(errText(error), { error: true }); }
    // best-effort: remove its uploaded map and logo
    try { const ls = await sb.storage.from('maps').list(e.id); if (ls.data?.length) await sb.storage.from('maps').remove(ls.data.map(f => `${e.id}/${f.name}`)); } catch {}
    md.close();
    const wasOpen = e.id === S.edition?.id;
    try { sessionStorage.removeItem('bcm.edition'); } catch {}
    toast(`حُذف «${data.name}» (${data.reservations} حجز، ${data.payments} دفعة)`);
    if (wasOpen) { const u = new URL(location.href); u.searchParams.delete('p'); location.replace(u.pathname + u.search + '#/settings'); setTimeout(() => location.reload(), 50); }
    else { await loadEditions(); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  };
}

// printable / downloadable QR poster for a project's booking map
export async function openProjectQR(e) {
  const T = THEMES[e.event_type] || THEMES.christmas, U = UNITS[e.unit_kind] || UNITS.kiosk, url = publicLink(e);
  const svg = await qrSVG(url, { size: 260, dark: T.c.dark, eye: T.c.primary });
  const when = e.start_date === e.end_date ? fmtDate(e.start_date) : `${fmtDate(e.start_date)} – ${fmtDate(e.end_date)}`;
  const card = h('div', { class: 'qr-poster', style: { '--a': T.c.dark, '--b': T.c.primary, '--g': T.c.gold } },
    h('div', { class: 'qp-logo' }, logoNode(e, 'hero')),
    h('h3', {}, e.name), h('p', {}, [when, e.event_time, e.venue].filter(Boolean).join(' · ')),
    h('div', { class: 'qp-code', html: svg }),
    h('strong', { class: 'qp-cta' }, `📱 امسح الرمز واختر ${U.one === 'كشك' ? 'كشكك' : U.one + 'ك'} من الخريطة`),
    h('code', { dir: 'ltr' }, url.replace(/^https?:\/\//, '')));
  const md = modal({ title: 'رمز QR — ' + e.name, body: [
    h('p', { class: 'hint', style: { margin: 0 } }, 'اطبعه على البوسترات والطاولات والفلايرات أو انشره في السوشيال ميديا. يفتح خريطة الحجز لهذا المشروع مباشرة.'), card],
    footer: [
      h('button', { class: 'btn primary', onclick: async () => { const a = h('a', { href: await svgToPng(await qrSVG(url, { size: 1024, dark: T.c.dark, eye: T.c.primary }), 1024), download: `QR-${e.slug}.png` }); a.click(); } }, '⬇ تنزيل الرمز (PNG)'),
      h('button', { class: 'btn', onclick: () => printPoster(e, svg, when, U, url, T) }, '🖨 طباعة بوستر'),
      h('button', { class: 'btn', onclick: () => md.close() }, 'إغلاق')] });
}

function printPoster(e, svg, when, U, url, T) {
  const w = window.open('', '_blank'); if (!w) return toast('اسمح بالنوافذ المنبثقة لطباعة البوستر', { error: true });
  const logo = e.logo_url || printLogo(e), C = T.c;
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>QR — ${esc(e.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lalezar&family=Readex+Pro:wght@400;600&display=swap">
<style>@page{size:A4;margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}
body{margin:0;font-family:"Readex Pro",Tahoma,sans-serif;background:#eee}
.p{width:210mm;height:297mm;margin:0 auto;background:radial-gradient(120% 60% at 50% 0%,${C.primary},transparent 70%),linear-gradient(170deg,${C.dark},${C.deep});color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9mm;text-align:center;padding:18mm;position:relative;overflow:hidden}
.p:before{content:"${T.icon} ${T.icon} ${T.icon}";position:absolute;top:8mm;letter-spacing:18mm;font-size:16mm;opacity:.18}
.p:after{content:"${T.icon} ${T.icon} ${T.icon}";position:absolute;bottom:6mm;letter-spacing:18mm;font-size:16mm;opacity:.18}
img.l{max-height:42mm;max-width:120mm;filter:drop-shadow(0 4mm 6mm rgba(0,0,0,.35))}.ic{font-size:34mm;line-height:1}
h1{font-family:Lalezar,serif;font-weight:400;font-size:17mm;margin:0;line-height:1.1;color:${C.goldHi || C.gold}}
.w{font-size:6mm;opacity:.9}.q{background:#fff;padding:7mm;border-radius:9mm;box-shadow:0 6mm 16mm rgba(0,0,0,.35);border:2mm solid ${C.gold}}.q svg{width:95mm;height:95mm;display:block}
.c{font-size:8mm;font-weight:600}.u{font-size:4.2mm;opacity:.8;direction:ltr}.bar{position:fixed;top:10px;left:10px}@media print{.bar{display:none}body{background:none}}</style></head><body>
<div class="bar"><button onclick="print()" style="font:inherit;padding:8px 16px">طباعة / PDF</button></div>
<div class="p">${logo ? `<img class="l" src="${esc(logo)}">` : `<div class="ic">${T.icon}</div>`}<h1>${esc(e.name)}</h1><div class="w">${esc([when, e.event_time, e.venue].filter(Boolean).join(' · '))}</div>
<div class="q">${svg}</div><div class="c">📱 امسح الرمز للحجز — ${esc(U.many)} متوفرة على الخريطة</div><div class="u">${esc(url.replace(/^https?:\/\//, ''))}</div></div></body></html>`);
  w.document.close();
}
