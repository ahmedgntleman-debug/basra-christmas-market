// Staff accounts and permissions (super admin only). Accounts are created by the
// "staff-admin" Edge Function, so the service key never reaches the browser.
import { sb, h, toast, errText, modal, fmtDateTime, confirmBox } from './common.js';
import { S, PERMS, ROLE_PERMS, JOB_TEMPLATES, roleLabel } from './state.js';

export const STAFF_DOMAIN = 'staff.bcm.iq';
export const loginEmail = v => { const s = String(v || '').trim().toLowerCase(); return !s || s.includes('@') ? s : `${s}@${STAFF_DOMAIN}`; };
const shownLogin = p => p.username || (p.email || '').replace('@' + STAFF_DOMAIN, '');
const permsOf = p => p.role === 'super_admin' ? PERMS.map(x => x[0]) : (p.permissions || ROLE_PERMS[p.role] || []);
const genPass = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(10)); for (const x of r) s += a[x % a.length]; return s; };

async function call(body) {
  const { data, error } = await sb.functions.invoke('staff-admin', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch {}
    if (/Failed to send|NetworkError|FunctionsFetchError|404|not found/i.test(msg)) msg = 'خدمة إدارة الحسابات غير مفعّلة على الخادم بعد (staff-admin).';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function usersSection(sec) {
  const box = h('div', { class: 'staff-list' }, h('div', { class: 'spinner' }));
  const load = async () => {
    const { data, error } = await sb.from('profiles').select('*').order('created_at');
    if (error) return box.replaceChildren(h('p', { class: 'hint' }, errText(error)));
    box.replaceChildren(...data.map(p => {
      const ps = permsOf(p), me = p.user_id === S.user.id, admin = p.role === 'super_admin';
      const projects = p.projects?.length ? p.projects.map(id => S.editions.find(e => e.id === id)?.name || '—').join('، ') : 'كل المشاريع';
      return h('div', { class: 'staff-row' + (p.active === false ? ' off' : '') },
        h('div', { class: 'st-av', 'data-raw': '' }, (p.full_name || shownLogin(p) || '?').trim().slice(0, 1)),
        h('div', { class: 'st-main' },
          h('strong', {}, p.full_name || shownLogin(p), ' ', h('span', { class: 'st-title' + (admin ? ' admin' : '') }, roleLabel(p)), p.active === false ? h('span', { class: 'pub-badge off' }, 'موقوف') : '', me ? h('span', { class: 'hint' }, ' (أنت)') : ''),
          h('span', { class: 'hint', dir: 'ltr', style: { textAlign: 'start' } }, shownLogin(p)),
          h('div', { class: 'st-perms' }, admin ? h('span', { class: 'chip' }, 'كل الصلاحيات') : ps.length ? ps.map(k => h('span', { class: 'chip' }, PERMS.find(x => x[0] === k)?.[1] || k)) : h('span', { class: 'hint' }, 'بدون صلاحيات تعديل')),
          admin ? '' : h('span', { class: 'hint' }, '📁 ' + projects)),
        h('div', { class: 'st-acts' },
          h('button', { class: 'btn small', onclick: () => openStaff(p, load) }, '✎ تعديل'),
          me ? '' : h('button', { class: 'btn small', onclick: () => resetPass(p) }, '🔑 كلمة المرور'),
          me ? '' : h('button', { class: 'btn small ' + (p.active === false ? 'pine' : 'ghost'), onclick: () => setActive(p, load) }, p.active === false ? '▶ تفعيل' : '⏸ إيقاف'),
          me || admin ? '' : h('button', { class: 'btn small danger', onclick: () => delStaff(p, load) }, '🗑')));
    }));
  };
  load();
  return sec('المستخدمون والصلاحيات',
    h('p', { class: 'hint', style: { margin: 0 } }, 'أنشئ حسابات للمشرفين والاستقبال والمحاسبين وغيرهم، واختر بالضبط ما يستطيع كل واحد فعله وأي مشاريع يراها. الموظف يدخل باسم المستخدم وكلمة المرور التي تحددها.'),
    h('div', {}, h('button', { class: 'btn primary', onclick: () => openStaff(null, load) }, '＋ حساب جديد')),
    box);
}

function openStaff(p, reload) {
  const isNew = !p, isAdmin = p?.role === 'super_admin', me = p?.user_id === S.user.id;
  const I = {
    name: h('input', { class: 'in', value: p?.full_name || '', placeholder: 'مثال: علي حسن' }),
    login: h('input', { class: 'in', dir: 'ltr', value: p ? shownLogin(p) : '', disabled: !isNew, placeholder: 'ali  أو  ali@example.com', autocomplete: 'off' }),
    pass: h('input', { class: 'in', dir: 'ltr', value: isNew ? genPass() : '', autocomplete: 'new-password' }),
    title: h('input', { class: 'in', value: p?.title || '', placeholder: 'مشرف، استقبال، محاسب…', list: 'job-titles' }),
    super: h('input', { type: 'checkbox', checked: isAdmin, disabled: me }),
  };
  const titles = h('datalist', { id: 'job-titles' }, JOB_TEMPLATES.map(([t]) => h('option', { value: t })));
  const cur = new Set(p ? permsOf(p) : []);
  const boxes = PERMS.map(([k, l, d]) => { const c = h('input', { type: 'checkbox', checked: cur.has(k), 'data-k': k }); return h('label', { class: 'perm-box' }, c, h('span', {}, h('b', {}, l), h('small', {}, d))); });
  const permGrid = h('div', { class: 'perm-grid' }, boxes);
  const tpl = h('div', { class: 'tpl-row' }, h('span', { class: 'hint' }, 'قوالب جاهزة:'), JOB_TEMPLATES.map(([t, ks]) => h('button', { type: 'button', class: 'btn small ghost', onclick: () => {
    boxes.forEach(b => { const c = b.querySelector('input'); c.checked = ks.includes(c.dataset.k); }); if (!I.title.value || JOB_TEMPLATES.some(([x]) => x === I.title.value)) I.title.value = t;
  } }, t)));
  const allP = h('input', { type: 'radio', name: 'pscope', checked: !p?.projects?.length });
  const someP = h('input', { type: 'radio', name: 'pscope', checked: !!p?.projects?.length });
  const projBoxes = S.editions.map(e => { const c = h('input', { type: 'checkbox', value: e.id, checked: !!p?.projects?.includes(e.id) }); return h('label', { class: 'check' }, c, e.name + (e.archived ? ' (أرشيف)' : '')); });
  const projList = h('div', { class: 'proj-pick' }, projBoxes);
  const syncScope = () => { projList.hidden = allP.checked; };
  allP.onchange = someP.onchange = syncScope; syncScope();
  const permsWrap = h('div', { class: 'perm-wrap' }, tpl, permGrid,
    h('strong', { style: { fontSize: '14px' } }, 'المشاريع التي يراها'),
    h('label', { class: 'check' }, allP, 'كل المشاريع (والمشاريع الجديدة)'), h('label', { class: 'check' }, someP, 'مشاريع محددة فقط:'), projList);
  const syncSuper = () => { permsWrap.hidden = I.super.checked; };
  I.super.onchange = syncSuper; syncSuper();
  const save = h('button', { class: 'btn primary' }, isNew ? 'إنشاء الحساب' : 'حفظ');
  const md = modal({ title: isNew ? 'حساب جديد' : 'تعديل ' + (p.full_name || shownLogin(p)), wide: true, body: [
    h('div', { class: 'grid2' }, h('label', { class: 'f' }, h('span', {}, 'الاسم'), I.name), h('label', { class: 'f' }, h('span', {}, 'المسمى الوظيفي'), I.title, titles)),
    isNew ? h('div', { class: 'grid2' },
      h('label', { class: 'f' }, h('span', {}, 'اسم المستخدم (أو البريد)'), I.login, h('span', { class: 'hint' }, 'أحرف إنجليزية وأرقام، يدخل به الموظف بدل البريد.')),
      h('label', { class: 'f' }, h('span', {}, 'كلمة المرور'), h('div', { style: { display: 'flex', gap: '6px' } }, I.pass, h('button', { type: 'button', class: 'btn small', onclick: () => { I.pass.value = genPass(); } }, '↻')), h('span', { class: 'hint' }, 'أعطها للموظف، ويستطيع تغييرها من «حسابي».'))) : '',
    h('label', { class: 'check super-box' }, I.super, h('b', {}, 'مدير عام'), h('span', { class: 'hint' }, ' — كل الصلاحيات، وإدارة الحسابات والنسخ الاحتياطي')),
    permsWrap],
    footer: [save, h('button', { class: 'btn', onclick: () => md.close() }, 'إلغاء')] });
  save.onclick = async () => {
    const permissions = boxes.map(b => b.querySelector('input')).filter(c => c.checked).map(c => c.dataset.k);
    const projects = someP.checked ? projBoxes.map(b => b.querySelector('input')).filter(c => c.checked).map(c => c.value) : null;
    if (someP.checked && !projects.length && !I.super.checked) return toast('اختر مشروعاً واحداً على الأقل', { error: true });
    const row = { full_name: I.name.value.trim() || null, title: I.title.value.trim() || null, role: I.super.checked ? 'super_admin' : 'staff', permissions: I.super.checked ? null : permissions, projects: I.super.checked ? null : projects };
    save.disabled = true;
    try {
      if (isNew) {
        const login = I.login.value.trim();
        if (!/^[a-z0-9._-]{3,}$/i.test(login) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(login)) throw new Error('اسم المستخدم: 3 أحرف إنجليزية أو أرقام على الأقل، أو بريد إلكتروني');
        if (I.pass.value.length < 6) throw new Error('كلمة المرور 6 أحرف على الأقل');
        await call({ action: 'create', login, password: I.pass.value, ...row });
        md.close(); reload();
        showCredentials(row.full_name || login, login, I.pass.value);
      } else {
        const { error } = await sb.from('profiles').update(row).eq('user_id', p.user_id);
        if (error) throw error;
        md.close(); reload(); toast('تم حفظ صلاحيات ' + (row.full_name || shownLogin(p)));
      }
    } catch (e) { toast(errText(e), { error: true }); }
    finally { save.disabled = false; }
  };
}

function showCredentials(name, login, pass) {
  const link = new URL('index.html', location.href).href;
  const text = `مرحباً ${name}،\nتم إنشاء حسابك في نظام الحجوزات.\nالرابط: ${link}\nاسم المستخدم: ${login}\nكلمة المرور: ${pass}\nيمكنك تغيير كلمة المرور من الإعدادات ← حسابي.`;
  const md = modal({ title: '✓ تم إنشاء الحساب', body: [
    h('p', { style: { margin: 0 } }, 'أرسل بيانات الدخول للموظف. لن تظهر كلمة المرور مرة أخرى.'),
    h('pre', { class: 'cred-box', dir: 'rtl' }, text)],
    footer: [h('button', { class: 'btn primary', onclick: () => navigator.clipboard.writeText(text).then(() => toast('تم النسخ')) }, 'نسخ'),
      h('a', { class: 'btn wa', target: '_blank', rel: 'noopener', href: 'https://wa.me/?text=' + encodeURIComponent(text) }, 'إرسال على واتساب'),
      h('button', { class: 'btn', onclick: () => md.close() }, 'تم')] });
}

function resetPass(p) {
  const inp = h('input', { class: 'in', dir: 'ltr', value: genPass() });
  const ok = h('button', { class: 'btn primary' }, 'تعيين كلمة المرور');
  const md = modal({ title: 'كلمة مرور جديدة — ' + (p.full_name || shownLogin(p)), body: [h('label', { class: 'f' }, h('span', {}, 'كلمة المرور الجديدة'), inp)],
    footer: [ok, h('button', { class: 'btn', onclick: () => md.close() }, 'إلغاء')] });
  ok.onclick = async () => {
    if (inp.value.length < 6) return toast('كلمة المرور 6 أحرف على الأقل', { error: true });
    ok.disabled = true;
    try { await call({ action: 'password', user_id: p.user_id, password: inp.value }); md.close(); showCredentials(p.full_name || shownLogin(p), shownLogin(p), inp.value); }
    catch (e) { toast(errText(e), { error: true }); ok.disabled = false; }
  };
}

async function setActive(p, reload) {
  const on = p.active === false;
  if (!on && !(await confirmBox('إيقاف الحساب', `لن يستطيع «${p.full_name || shownLogin(p)}» الدخول حتى تعيد تفعيله. بياناته وما سجّله يبقى محفوظاً.`, { okLabel: 'إيقاف', danger: true }))) return;
  try { await call({ action: 'active', user_id: p.user_id, active: on }); toast(on ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب'); reload(); }
  catch (e) { toast(errText(e), { error: true }); }
}

async function delStaff(p, reload) {
  if (!(await confirmBox('حذف الحساب', `سيُحذف حساب «${p.full_name || shownLogin(p)}» نهائياً. الحجوزات والدفعات التي سجّلها تبقى محفوظة. إذا أردت منعه مؤقتاً استخدم «إيقاف».`, { okLabel: 'حذف', danger: true }))) return;
  try { await call({ action: 'delete', user_id: p.user_id }); toast('تم حذف الحساب'); reload(); }
  catch (e) { toast(errText(e), { error: true }); }
}
