// Edge Function "staff-admin": the super admin creates and manages staff accounts from the app.
// Runs on Supabase with the service key from the environment — the key never reaches the browser.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const STAFF_DOMAIN = 'staff.bcm.iq';
const PERMS = ['book', 'pay', 'customers', 'checkin', 'daily', 'pnl_view', 'pnl_edit', 'reports', 'map_edit', 'settings', 'projects', 'log'];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const fail = (msg: string, status = 400) => json({ error: msg }, status);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail('POST only', 405);
  const url = Deno.env.get('SUPABASE_URL')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // who is calling? must be an active super admin
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: me, error: meErr } = await admin.auth.getUser(token);
  if (meErr || !me?.user) return fail('سجّل الدخول أولاً', 401);
  const { data: prof } = await admin.from('profiles').select('role, active').eq('user_id', me.user.id).single();
  if (!prof || prof.role !== 'super_admin' || prof.active === false) return fail('إدارة الحسابات للمدير العام فقط', 403);

  let b: Record<string, any>;
  try { b = await req.json(); } catch { return fail('طلب غير صالح'); }
  const cleanPerms = (p: unknown) => Array.isArray(p) ? [...new Set(p.filter((x) => PERMS.includes(String(x))).map(String))] : [];
  const cleanProjects = (p: unknown) => Array.isArray(p) && p.length ? p.map(String) : null;
  const loginOf = (v: string) => { const s = String(v || '').trim().toLowerCase(); return s.includes('@') ? s : s ? `${s}@${STAFF_DOMAIN}` : ''; };
  const okPass = (p: string) => typeof p === 'string' && p.length >= 6;

  try {
    if (b.action === 'create') {
      const email = loginOf(b.login);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('اسم المستخدم أو البريد غير صالح');
      if (!okPass(b.password)) return fail('كلمة المرور 6 أحرف على الأقل');
      const { data, error } = await admin.auth.admin.createUser({ email, password: b.password, email_confirm: true, user_metadata: { full_name: b.full_name || '' } });
      if (error) return fail(/already|registered|exists/i.test(error.message) ? 'اسم المستخدم مستخدم لحساب آخر' : error.message);
      const id = data.user.id;
      const row = { user_id: id, email, username: email.endsWith('@' + STAFF_DOMAIN) ? email.split('@')[0] : null, full_name: b.full_name || null,
        role: b.role === 'super_admin' ? 'super_admin' : 'staff', title: b.title || null, permissions: cleanPerms(b.permissions), projects: cleanProjects(b.projects), active: true };
      const { error: e2 } = await admin.from('profiles').upsert(row, { onConflict: 'user_id' });
      if (e2) { await admin.auth.admin.deleteUser(id); return fail(e2.message); }
      return json({ ok: true, user_id: id, email });
    }
    const id = String(b.user_id || '');
    if (!id) return fail('الحساب غير محدد');
    if (b.action === 'password') {
      if (!okPass(b.password)) return fail('كلمة المرور 6 أحرف على الأقل');
      const { error } = await admin.auth.admin.updateUserById(id, { password: b.password });
      return error ? fail(error.message) : json({ ok: true });
    }
    if (b.action === 'active') {
      if (id === me.user.id) return fail('لا يمكنك إيقاف حسابك');
      const on = !!b.active;
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: on ? 'none' : '876000h' });
      if (error) return fail(error.message);
      await admin.from('profiles').update({ active: on }).eq('user_id', id);
      return json({ ok: true });
    }
    if (b.action === 'delete') {
      if (id === me.user.id) return fail('لا يمكنك حذف حسابك');
      const { data: t } = await admin.from('profiles').select('role').eq('user_id', id).single();
      if (t?.role === 'super_admin') return fail('لا يمكن حذف حساب مدير عام من هنا. غيّر صلاحيته أولاً');
      const { error } = await admin.auth.admin.deleteUser(id);
      return error ? fail(error.message) : json({ ok: true });
    }
    return fail('إجراء غير معروف');
  } catch (e) {
    return fail(String((e as Error)?.message || e), 500);
  }
});
