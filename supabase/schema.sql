-- =====================================================================
--  Basra Christmas Market — database schema (Supabase / PostgreSQL)
--  Run this whole file ONCE in Supabase → SQL Editor → New query → Run.
--  Then run seed.sql (kiosks of the official map).
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.baghdad_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Baghdad')::date $$;

-- ---------------------------------------------------------------------
-- Staff profiles & roles
--   super_admin  : everything (map, editions, settings, users)
--   reservations : customers, reservations, payments
--   finance      : customers, payments (read reservations)
--   readonly     : read everything, change nothing
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'readonly'
             check (role in ('super_admin','reservations','finance','readonly')),
  created_at timestamptz not null default now()
);

create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create or replace function public.has_role(variadic roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = any(roles) from public.profiles where user_id = auth.uid()), false)
$$;

-- First account ever created becomes super_admin; everyone after starts read-only.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(user_id, email, role)
  values (new.id, new.email,
          case when exists (select 1 from public.profiles) then 'readonly' else 'super_admin' end)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Festival editions
-- ---------------------------------------------------------------------
create table if not exists public.editions (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  map_url          text not null default 'map.jpg',   -- file next to the site, or a storage URL
  map_w            int  not null default 1109,
  map_h            int  not null default 1600,
  public_enabled   boolean not null default true,
  contact_phone    text,
  contact_whatsapp text,
  colors           jsonb not null default
    '{"available":"#2e8b57","reserved":"#c0392b","held":"#e67e22","partial":"#f1c40f","disabled":"#9e9e9e"}',
  contacts         jsonb not null default '[]',   -- public inquiry contacts: [{"name": "...", "phone": "07..."}]
  settings         jsonb not null default '{}',   -- feature toggles, contract template (staff only)
  archived         boolean not null default false,
  created_at       timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.editions add column if not exists contacts jsonb not null default '[]';

-- ---------------------------------------------------------------------
-- Kiosks (geometry is relative to the map image: cx,cy,w,h in 0..1, rot in degrees)
-- ---------------------------------------------------------------------
create table if not exists public.kiosks (
  id           uuid primary key default gen_random_uuid(),
  edition_id   uuid not null references public.editions(id) on delete cascade,
  code         text not null,
  grp          text,
  category     text,
  zone         text,
  geom         jsonb not null,
  shape        text not null default 'rect' check (shape in ('rect','triangle','ellipse')),
  rentable     boolean not null default true,
  active       boolean not null default true,
  needs_verify boolean not null default false,
  note         text,
  list_price   bigint check (list_price is null or list_price >= 0),
  created_at   timestamptz not null default now(),
  unique (edition_id, code)
);

-- ---------------------------------------------------------------------
-- Customers / agencies (shared across all editions)
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  company        text,
  contact_person text,
  phone          text,
  phone2         text,
  email          text,
  category       text,
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists customers_name_idx on public.customers(lower(name));

-- ---------------------------------------------------------------------
-- Reservations
--   agreed_amount NULL  = price not yet confirmed (NOT zero)
--   total = agreed_amount - discount + extra_charges
-- ---------------------------------------------------------------------
create table if not exists public.reservations (
  id               uuid primary key default gen_random_uuid(),
  edition_id       uuid not null references public.editions(id) on delete restrict,
  customer_id      uuid references public.customers(id) on delete restrict,
  status           text not null default 'confirmed' check (status in ('held','confirmed','cancelled')),
  start_date       date not null,
  end_date         date not null,
  hold_until       timestamptz,
  agreed_amount    bigint check (agreed_amount is null or agreed_amount >= 0),
  discount         bigint not null default 0 check (discount >= 0),
  extra_charges    bigint not null default 0 check (extra_charges >= 0),
  payment_deadline date,
  deal_type        text not null default 'rental' check (deal_type in ('rental','sponsorship')),
  notes            text,
  cancel_reason    text,
  created_at       timestamptz not null default now(),
  created_by       uuid default auth.uid(),
  updated_at       timestamptz not null default now(),
  check (end_date >= start_date),
  check (status <> 'confirmed' or customer_id is not null)
);
alter table public.reservations add column if not exists deal_type text not null default 'rental' check (deal_type in ('rental','sponsorship'));
create index if not exists reservations_edition_idx on public.reservations(edition_id);
create index if not exists reservations_customer_idx on public.reservations(customer_id);

-- One reservation may cover several kiosks. The EXCLUDE constraint makes it
-- impossible (even with two staff saving at the same second) to book the same
-- kiosk twice for overlapping days.
create table if not exists public.reservation_kiosks (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  kiosk_id       uuid not null references public.kiosks(id) on delete restrict,
  period         daterange not null,
  active         boolean not null default true,
  primary key (reservation_id, kiosk_id),
  constraint no_double_booking exclude using gist (kiosk_id with =, period with &&) where (active)
);
create index if not exists rk_kiosk_idx on public.reservation_kiosks(kiosk_id);

create or replace function public.rk_sync_from_parent() returns trigger
language plpgsql as $$
declare r public.reservations;
begin
  select * into r from public.reservations where id = new.reservation_id;
  new.period := daterange(r.start_date, r.end_date, '[]');
  new.active := r.status <> 'cancelled';
  return new;
end $$;
drop trigger if exists rk_sync on public.reservation_kiosks;
create trigger rk_sync before insert or update on public.reservation_kiosks
  for each row execute function public.rk_sync_from_parent();

create or replace function public.res_sync_children() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists res_touch on public.reservations;
create trigger res_touch before update on public.reservations
  for each row execute function public.res_sync_children();

create or replace function public.res_push_children() returns trigger
language plpgsql as $$
begin
  if new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date
     or new.status is distinct from old.status then
    begin
      update public.reservation_kiosks set active = active where reservation_id = new.id; -- fires rk_sync
    exception when exclusion_violation then
      raise exception 'لا يمكن تغيير التواريخ: أحد الأكشاك محجوز لجهة أخرى في هذه الفترة' using errcode = '23P01';
    end;
  end if;
  return null;
end $$;
drop trigger if exists res_push on public.reservations;
create trigger res_push after update on public.reservations
  for each row execute function public.res_push_children();

-- ---------------------------------------------------------------------
-- Payments — never edited or deleted. A correction or refund is a new row
-- with a negative amount, so the original history is always preserved.
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  reservation_id      uuid not null references public.reservations(id) on delete restrict,
  amount              bigint not null check (amount <> 0),
  kind                text not null default 'payment' check (kind in ('payment','refund','correction')),
  method              text,
  paid_on             date not null default public.baghdad_today(),
  note                text,
  receipt_path        text,
  corrects_payment_id uuid references public.payments(id),
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  check ((kind = 'payment' and amount > 0) or (kind = 'refund' and amount < 0) or kind = 'correction')
);
create index if not exists payments_res_idx on public.payments(reservation_id);
create index if not exists payments_day_idx on public.payments(paid_on);

-- ---------------------------------------------------------------------
-- Installment schedule (optional): planned payments for a reservation
-- ---------------------------------------------------------------------
create table if not exists public.payment_schedules (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  due_date       date not null,
  amount         bigint not null check (amount > 0),
  note           text,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);
create index if not exists sched_res_idx on public.payment_schedules(reservation_id, due_date);

-- ---------------------------------------------------------------------
-- Contracts saved to the record (text as printed) and other attachments
-- ---------------------------------------------------------------------
create table if not exists public.contracts (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  title          text,
  body           text not null,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);
create index if not exists contracts_res_idx on public.contracts(reservation_id);

create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete cascade,
  name           text not null,
  storage_path   text not null,
  created_at     timestamptz not null default now(),
  created_by     uuid default auth.uid(),
  check (reservation_id is not null or customer_id is not null)
);

-- ---------------------------------------------------------------------
-- Daily visitors & income of the market (one row per day per edition)
-- ---------------------------------------------------------------------
create table if not exists public.daily_stats (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references public.editions(id) on delete cascade,
  day         date not null,
  visitors    int check (visitors is null or visitors >= 0),
  income      bigint check (income is null or income >= 0),
  notes       text,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  updated_at  timestamptz not null default now(),
  unique (edition_id, day)
);

-- ---------------------------------------------------------------------
-- Activity log (audit trail) — written by triggers only
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  actor     uuid default auth.uid(),
  action    text not null,
  entity    text not null,
  entity_id text,
  details   jsonb
);
create index if not exists activity_at_idx on public.activity_log(at desc);

create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid text; d jsonb;
begin
  if tg_op = 'DELETE' then
    d := to_jsonb(old);
  elsif tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value)) into d
    from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at','period','active');
    if d is null then return null; end if;
  else
    d := to_jsonb(new);
  end if;
  rid := coalesce((to_jsonb(coalesce(new, old))->>'id'),
                  (to_jsonb(coalesce(new, old))->>'reservation_id'));
  insert into public.activity_log(action, entity, entity_id, details)
  values (lower(tg_op), tg_table_name, rid, d);
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['editions','kiosks','customers','reservations','reservation_kiosks','payments','profiles','payment_schedules','contracts','documents','daily_stats'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s
                    for each row execute function public.audit()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Reservation summary view (finance computed here — never by hand)
-- ---------------------------------------------------------------------
drop view if exists public.reservation_summary;
create view public.reservation_summary with (security_invoker = true) as
select r.*,
       c.name            as customer_name,
       c.company         as customer_company,
       c.phone           as customer_phone,
       (r.end_date - r.start_date + 1)                            as days,
       coalesce(k.codes, '{}')                                    as kiosk_codes,
       coalesce(k.ids, '{}')                                      as kiosk_ids,
       case when r.agreed_amount is null then null
            else r.agreed_amount - r.discount + r.extra_charges end as total,
       coalesce(p.paid, 0)::bigint                                as paid,
       case when r.agreed_amount is null then null
            else (r.agreed_amount - r.discount + r.extra_charges - coalesce(p.paid,0))::bigint end as remaining,
       case
         when r.status = 'cancelled' then 'cancelled'
         when r.agreed_amount is null then 'not_priced'
         when r.agreed_amount - r.discount + r.extra_charges - coalesce(p.paid,0) <= 0 then 'paid'
         when sc.n > 0 and coalesce(sc.due_before_today,0) > coalesce(p.paid,0) then 'overdue'
         when sc.n = 0 and r.payment_deadline is not null and r.payment_deadline < public.baghdad_today() then 'overdue'
         when coalesce(p.paid,0) > 0 then 'partial'
         else 'unpaid'
       end as pay_status,
       (r.status = 'held' and r.hold_until is not null and r.hold_until < now()) as hold_expired,
       coalesce(sc.n, 0)::int as installments,
       coalesce(sc.next_due, r.payment_deadline) as next_due_date
from public.reservations r
left join public.customers c on c.id = r.customer_id
left join lateral (
  select array_agg(ki.code order by ki.code) codes, array_agg(ki.id) ids
  from public.reservation_kiosks rk join public.kiosks ki on ki.id = rk.kiosk_id
  where rk.reservation_id = r.id) k on true
left join lateral (
  select sum(amount) paid from public.payments where reservation_id = r.id) p on true
left join lateral (
  select count(*) n,
         sum(amount) filter (where due_date < public.baghdad_today()) due_before_today,
         (select s2.due_date from (
            select due_date, sum(amount) over (order by due_date, created_at) cum
            from public.payment_schedules where reservation_id = r.id) s2
          where s2.cum > coalesce(p.paid, 0) order by s2.due_date limit 1) next_due
  from public.payment_schedules where reservation_id = r.id) sc on true;

create or replace function public.staff_email(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(full_name, email) from public.profiles where user_id = p_user and public.app_role() is not null
$$;

-- Payments with their reservation / customer / kiosks (for reports)
create or replace view public.payment_list with (security_invoker = true) as
select p.*, r.edition_id, c.name as customer_name, c.phone as customer_phone,
       coalesce(k.codes,'{}') as kiosk_codes, public.staff_email(p.created_by) as staff_email
from public.payments p
join public.reservations r on r.id = p.reservation_id
left join public.customers c on c.id = r.customer_id
left join lateral (
  select array_agg(ki.code order by ki.code) codes
  from public.reservation_kiosks rk join public.kiosks ki on ki.id = rk.kiosk_id
  where rk.reservation_id = r.id) k on true;

-- ---------------------------------------------------------------------
-- Create a reservation in one atomic step:
-- optional new customer + reservation + kiosks + optional first payment
-- ---------------------------------------------------------------------
create or replace function public.create_reservation(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_cust uuid := nullif(p->>'customer_id','')::uuid;
  v_res  uuid;
  v_kid  uuid;
  v_pay  bigint := nullif(p->>'first_payment','')::bigint;
  v_taken text;
begin
  if not public.has_role('super_admin','reservations') then
    raise exception 'ليس لديك صلاحية إنشاء حجز' using errcode = '42501';
  end if;
  perform public.release_expired_holds();

  if v_cust is null and coalesce(trim(p->'new_customer'->>'name'),'') <> '' then
    insert into customers(name, company, contact_person, phone, phone2, email, category, notes)
    values (trim(p->'new_customer'->>'name'), nullif(p->'new_customer'->>'company',''),
            nullif(p->'new_customer'->>'contact_person',''), nullif(p->'new_customer'->>'phone',''),
            nullif(p->'new_customer'->>'phone2',''), nullif(p->'new_customer'->>'email',''),
            nullif(p->'new_customer'->>'category',''), nullif(p->'new_customer'->>'notes',''))
    returning id into v_cust;
  end if;

  insert into reservations(edition_id, customer_id, status, start_date, end_date, hold_until,
                           agreed_amount, discount, extra_charges, payment_deadline, notes, deal_type)
  values ((p->>'edition_id')::uuid, v_cust, coalesce(nullif(p->>'status',''),'confirmed'),
          (p->>'start_date')::date, (p->>'end_date')::date, nullif(p->>'hold_until','')::timestamptz,
          nullif(p->>'agreed_amount','')::bigint, coalesce(nullif(p->>'discount','')::bigint,0),
          coalesce(nullif(p->>'extra_charges','')::bigint,0), nullif(p->>'payment_deadline','')::date,
          nullif(p->>'notes',''), coalesce(nullif(p->>'deal_type',''),'rental'))
  returning id into v_res;

  if jsonb_array_length(coalesce(p->'kiosk_ids','[]')) = 0 then
    raise exception 'اختر كشكاً واحداً على الأقل';
  end if;

  begin
    for v_kid in select (jsonb_array_elements_text(p->'kiosk_ids'))::uuid loop
      insert into reservation_kiosks(reservation_id, kiosk_id) values (v_res, v_kid);
    end loop;
  exception when exclusion_violation then
    select string_agg(distinct k.code, '، ') into v_taken
    from reservation_kiosks rk join kiosks k on k.id = rk.kiosk_id
    join reservations r on r.id = rk.reservation_id
    where rk.active and rk.kiosk_id in (select (jsonb_array_elements_text(p->'kiosk_ids'))::uuid)
      and rk.period && daterange((p->>'start_date')::date, (p->>'end_date')::date, '[]');
    raise exception 'الكشك محجوز في هذه الفترة: %', coalesce(v_taken,'') using errcode = '23P01';
  end;

  if v_pay is not null and v_pay > 0 then
    insert into payments(reservation_id, amount, kind, method, paid_on, note)
    values (v_res, v_pay, 'payment', nullif(p->>'payment_method',''),
            coalesce(nullif(p->>'paid_on','')::date, public.baghdad_today()), nullif(p->>'payment_note',''));
  end if;
  return v_res;
end $$;

-- Replace the kiosk list of a reservation (move A1 → A2, add/remove kiosks)
create or replace function public.set_reservation_kiosks(p_res uuid, p_kiosks uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
declare v_taken text; r reservations;
begin
  if not public.has_role('super_admin','reservations') then
    raise exception 'ليس لديك صلاحية تعديل الحجز' using errcode = '42501';
  end if;
  if coalesce(array_length(p_kiosks,1),0) = 0 then raise exception 'اختر كشكاً واحداً على الأقل'; end if;
  select * into r from reservations where id = p_res;
  perform public.release_expired_holds();
  delete from reservation_kiosks where reservation_id = p_res and kiosk_id <> all(p_kiosks);
  begin
    insert into reservation_kiosks(reservation_id, kiosk_id)
    select p_res, k from unnest(p_kiosks) k
    where not exists (select 1 from reservation_kiosks where reservation_id = p_res and kiosk_id = k);
  exception when exclusion_violation then
    select string_agg(distinct k.code, '، ') into v_taken
    from reservation_kiosks rk join kiosks k on k.id = rk.kiosk_id
    where rk.active and rk.reservation_id <> p_res and rk.kiosk_id = any(p_kiosks)
      and rk.period && daterange(r.start_date, r.end_date, '[]');
    raise exception 'الكشك محجوز في هذه الفترة: %', coalesce(v_taken,'') using errcode = '23P01';
  end;
end $$;

-- Expired temporary holds are released automatically (marked cancelled, kept in history)
create or replace function public.release_expired_holds() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update reservations set status = 'cancelled', cancel_reason = 'انتهت مدة الحجز المؤقت'
  where status = 'held' and hold_until is not null and hold_until < now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Kiosk availability for a date range (used by the admin map)
-- ---------------------------------------------------------------------
create or replace function public.kiosk_status(p_edition uuid, p_from date, p_to date)
returns table(kiosk_id uuid, status text, covered_days int, total_days int)
language sql stable security invoker set search_path = public as $$
  with days as (select generate_series(p_from, p_to, interval '1 day')::date d),
  cov as (
    select k.id,
           count(distinct dd.d) filter (where rk.reservation_id is not null) as covered,
           count(distinct dd.d) filter (where r.status = 'confirmed') as confirmed_days,
           bool_or(r.status = 'confirmed') as any_confirmed
    from kiosks k
    cross join days dd
    left join reservation_kiosks rk on rk.kiosk_id = k.id and rk.active and rk.period @> dd.d
    left join reservations r on r.id = rk.reservation_id
    where k.edition_id = p_edition
    group by k.id)
  select k.id,
         case when not k.active or not k.rentable then 'disabled'
              when c.covered = 0 then 'available'
              when c.covered < (p_to - p_from + 1) then 'partial'
              when coalesce(c.any_confirmed,false) then 'reserved'
              else 'held' end,
         c.covered::int, (p_to - p_from + 1)::int
  from kiosks k join cov c on c.id = k.id;
$$;

-- ---------------------------------------------------------------------
-- PUBLIC map — the ONLY thing anonymous visitors can call.
-- Returns kiosk codes, shapes and availability. No names, phones or money.
-- ---------------------------------------------------------------------
create or replace function public.get_public_map(p_slug text, p_from date default null, p_to date default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare e editions; v_from date; v_to date; res jsonb;
begin
  select * into e from editions where slug = p_slug and public_enabled;
  if not found then return null; end if;
  perform public.release_expired_holds();
  v_from := greatest(coalesce(p_from, e.start_date), e.start_date - 60);
  v_to   := least(coalesce(p_to, e.end_date), v_from + 120);
  if v_to < v_from then v_to := v_from; end if;

  select jsonb_build_object(
    'edition', jsonb_build_object('name', e.name, 'slug', e.slug, 'start_date', e.start_date,
               'end_date', e.end_date, 'map_url', e.map_url, 'map_w', e.map_w, 'map_h', e.map_h,
               'contact_phone', e.contact_phone, 'contact_whatsapp', e.contact_whatsapp, 'contacts', e.contacts, 'colors', e.colors),
    'from', v_from, 'to', v_to,
    'kiosks', coalesce(jsonb_agg(jsonb_build_object(
        'code', k.code, 'grp', k.grp, 'geom', k.geom, 'shape', k.shape,
        -- held kiosks show as reserved to the public
        'status', case s.status when 'held' then 'reserved' else s.status end)
        order by k.code), '[]'))
  into res
  from kiosks k
  join public.kiosk_status_internal(e.id, v_from, v_to) s on s.kiosk_id = k.id
  where k.edition_id = e.id;
  return res;
end $$;

-- definer copy of kiosk_status for the public function (bypasses RLS safely: returns no private data)
create or replace function public.kiosk_status_internal(p_edition uuid, p_from date, p_to date)
returns table(kiosk_id uuid, status text, covered_days int, total_days int)
language sql stable security definer set search_path = public as $$
  select * from public.kiosk_status(p_edition, p_from, p_to)
$$;

-- ---------------------------------------------------------------------
-- New edition from a previous one (copies layout only — never bookings or payments)
-- ---------------------------------------------------------------------
create or replace function public.clone_edition(p_source uuid, p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare s editions; v_new uuid;
begin
  if not public.has_role('super_admin') then
    raise exception 'هذه العملية للمدير العام فقط' using errcode = '42501';
  end if;
  select * into s from editions where id = p_source;
  insert into editions(slug, name, start_date, end_date, map_url, map_w, map_h,
                       contact_phone, contact_whatsapp, contacts, colors)
  values (p->>'slug', p->>'name', (p->>'start_date')::date, (p->>'end_date')::date,
          case when coalesce((p->>'copy_map')::boolean, true) then s.map_url else 'map.jpg' end,
          s.map_w, s.map_h,
          s.contact_phone, s.contact_whatsapp, s.contacts,
          case when coalesce((p->>'copy_branding')::boolean, true) then s.colors
               else '{"available":"#2e8b57","reserved":"#c0392b","held":"#e67e22","partial":"#f1c40f","disabled":"#9e9e9e"}'::jsonb end)
  returning id into v_new;

  if coalesce((p->>'copy_kiosks')::boolean, true) then
    insert into kiosks(edition_id, code, grp, category, zone, geom, shape, rentable, active, needs_verify, note, list_price)
    select v_new, code, grp,
           case when coalesce((p->>'copy_categories')::boolean, true) then category end,
           zone, geom, shape, rentable, active, false, note,
           case when coalesce((p->>'copy_prices')::boolean, false) then list_price end
    from kiosks where edition_id = p_source;
  end if;
  return v_new;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security — enforced in the database, not just hidden in the UI
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.editions           enable row level security;
alter table public.kiosks             enable row level security;
alter table public.customers          enable row level security;
alter table public.reservations       enable row level security;
alter table public.reservation_kiosks enable row level security;
alter table public.payments           enable row level security;
alter table public.activity_log       enable row level security;
alter table public.payment_schedules  enable row level security;
alter table public.contracts          enable row level security;
alter table public.documents          enable row level security;
alter table public.daily_stats        enable row level security;

do $$ declare pol record; begin
  for pol in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles','editions','kiosks','customers','reservations','reservation_kiosks','payments','activity_log','payment_schedules','contracts','documents','daily_stats')
  loop execute format('drop policy %I on public.%I', pol.policyname, pol.tablename); end loop;
end $$;

-- profiles
create policy profiles_read   on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.has_role('super_admin'));
create policy profiles_admin  on public.profiles for update to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
create policy profiles_name   on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and role = public.app_role());

-- staff read
create policy editions_read on public.editions for select to authenticated using (public.app_role() is not null);
create policy kiosks_read   on public.kiosks   for select to authenticated using (public.app_role() is not null);
create policy cust_read     on public.customers for select to authenticated using (public.app_role() is not null);
create policy res_read      on public.reservations for select to authenticated using (public.app_role() is not null);
create policy rk_read       on public.reservation_kiosks for select to authenticated using (public.app_role() is not null);
create policy pay_read      on public.payments for select to authenticated using (public.app_role() is not null);
create policy log_read      on public.activity_log for select to authenticated using (public.has_role('super_admin'));

-- map, kiosks, editions: super admin
create policy editions_write on public.editions for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
create policy kiosks_write on public.kiosks for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));
-- reservation managers may add custom rental areas (group AR) drawn on the map
create policy kiosks_area_ins on public.kiosks for insert to authenticated
  with check (grp = 'AR' and public.has_role('super_admin','reservations'));

-- customers: everyone except read-only
create policy cust_ins on public.customers for insert to authenticated
  with check (public.has_role('super_admin','reservations','finance'));
create policy cust_upd on public.customers for update to authenticated
  using (public.has_role('super_admin','reservations','finance'));
create policy cust_del on public.customers for delete to authenticated
  using (public.has_role('super_admin'));

-- reservations: super admin + reservation manager
create policy res_ins on public.reservations for insert to authenticated
  with check (public.has_role('super_admin','reservations'));
create policy res_upd on public.reservations for update to authenticated
  using (public.has_role('super_admin','reservations'));
create policy rk_ins on public.reservation_kiosks for insert to authenticated
  with check (public.has_role('super_admin','reservations'));
create policy rk_upd on public.reservation_kiosks for update to authenticated
  using (public.has_role('super_admin','reservations'));
create policy rk_del on public.reservation_kiosks for delete to authenticated
  using (public.has_role('super_admin','reservations'));
-- (no delete policy on reservations: cancel instead, history is kept)

-- payments: insert only (no update / delete for anyone)
create policy pay_ins on public.payments for insert to authenticated
  with check (public.has_role('super_admin','reservations','finance'));

-- installments: reservation manager + finance
create policy sched_read on public.payment_schedules for select to authenticated using (public.app_role() is not null);
create policy sched_write on public.payment_schedules for all to authenticated
  using (public.has_role('super_admin','reservations','finance')) with check (public.has_role('super_admin','reservations','finance'));

-- contracts & documents: kept on the record; only super admin deletes
create policy contracts_read on public.contracts for select to authenticated using (public.app_role() is not null);
create policy contracts_ins on public.contracts for insert to authenticated with check (public.has_role('super_admin','reservations','finance'));
create policy contracts_del on public.contracts for delete to authenticated using (public.has_role('super_admin'));
create policy docs_read on public.documents for select to authenticated using (public.app_role() is not null);
create policy docs_ins on public.documents for insert to authenticated with check (public.has_role('super_admin','reservations','finance'));
create policy docs_del on public.documents for delete to authenticated using (public.has_role('super_admin'));

-- daily visitors & income: finance + super admin write, all staff read
create policy daily_read on public.daily_stats for select to authenticated using (public.app_role() is not null);
create policy daily_write on public.daily_stats for all to authenticated
  using (public.has_role('super_admin','finance')) with check (public.has_role('super_admin','finance'));

-- Anonymous visitors get nothing except get_public_map()
revoke all on all tables in schema public from anon;
revoke all on public.reservation_summary from anon;
revoke all on public.payment_list from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.get_public_map(text, date, date) to anon, authenticated;
grant execute on function public.app_role(), public.has_role(text[]), public.baghdad_today(),
  public.create_reservation(jsonb), public.set_reservation_kiosks(uuid, uuid[]),
  public.release_expired_holds(), public.kiosk_status(uuid, date, date),
  public.clone_edition(uuid, jsonb), public.staff_email(uuid) to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.reservation_summary, public.payment_list to authenticated;

-- ---------------------------------------------------------------------
-- Storage: maps (public images) and receipts (private)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('maps','maps', true)  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('receipts','receipts', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents','documents', false) on conflict (id) do nothing;

drop policy if exists maps_read on storage.objects;
drop policy if exists maps_write on storage.objects;
drop policy if exists maps_update on storage.objects;
drop policy if exists receipts_read on storage.objects;
drop policy if exists receipts_write on storage.objects;
drop policy if exists documents_read on storage.objects;
drop policy if exists documents_write on storage.objects;
create policy maps_read on storage.objects for select using (bucket_id = 'maps');
create policy maps_write on storage.objects for insert to authenticated
  with check (bucket_id = 'maps' and public.has_role('super_admin'));
create policy maps_update on storage.objects for update to authenticated
  using (bucket_id = 'maps' and public.has_role('super_admin'));
create policy receipts_read on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.app_role() is not null);
create policy receipts_write on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.has_role('super_admin','reservations','finance'));
create policy documents_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.app_role() is not null);
create policy documents_write on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.has_role('super_admin','reservations','finance'));

-- ---------------------------------------------------------------------
-- Live updates for the admin screens
-- ---------------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.reservations; exception when others then null; end;
  begin alter publication supabase_realtime add table public.reservation_kiosks; exception when others then null; end;
  begin alter publication supabase_realtime add table public.payments; exception when others then null; end;
  begin alter publication supabase_realtime add table public.kiosks; exception when others then null; end;
  begin alter publication supabase_realtime add table public.payment_schedules; exception when others then null; end;
end $$;
-- ---------------------------------------------------------------------
-- Finance ledger for the P&L: daily income by source, daily expenses,
-- operating expenses and other income (kiosk rent & sponsorship come from reservations)
-- ---------------------------------------------------------------------
create table if not exists public.ledger (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references public.editions(id) on delete cascade,
  day         date not null,
  kind        text not null check (kind in ('daily_income','other_income','daily_expense','operating_expense')),
  category    text not null,
  description text,
  party       text,
  method      text,
  amount      bigint not null check (amount > 0),
  notes       text,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  updated_at  timestamptz not null default now()
);
create index if not exists ledger_ed_day_idx on public.ledger(edition_id, day);
drop trigger if exists audit_ledger on public.ledger;
create trigger audit_ledger after insert or update or delete on public.ledger for each row execute function public.audit();
alter table public.ledger enable row level security;
drop policy if exists ledger_read on public.ledger;
drop policy if exists ledger_write on public.ledger;
create policy ledger_read on public.ledger for select to authenticated using (public.has_role('super_admin','finance','readonly'));
create policy ledger_write on public.ledger for all to authenticated
  using (public.has_role('super_admin','finance')) with check (public.has_role('super_admin','finance'));
revoke all on public.ledger from anon;
grant select, insert, update, delete on public.ledger to authenticated;
do $$ begin begin alter publication supabase_realtime add table public.ledger; exception when others then null; end; end $$;
-- ---------------------------------------------------------------------
-- Switch two kiosks: exchange their bookings (tenants move together with
-- their payments) or exchange their places on the map. One atomic step.
-- ---------------------------------------------------------------------
create or replace function public.swap_kiosks(p_a uuid, p_b uuid, p_mode text default 'bookings') returns text
language plpgsql security invoker set search_path = public as $$
declare ka kiosks; kb kiosks; na int; nb int; g jsonb; sh text; ra uuid[]; rb uuid[];
begin
  select * into ka from kiosks where id = p_a;
  select * into kb from kiosks where id = p_b;
  if ka.id is null or kb.id is null then raise exception 'الكشك غير موجود'; end if;
  if ka.id = kb.id then raise exception 'اختر كشكين مختلفين'; end if;
  if ka.edition_id <> kb.edition_id then raise exception 'الكشكان من نسختين مختلفتين'; end if;
  if p_mode = 'position' then
    if not public.has_role('super_admin') then raise exception 'تبديل المكان على الخريطة للمدير العام فقط' using errcode = '42501'; end if;
    g := ka.geom; sh := ka.shape;
    update kiosks set geom = kb.geom, shape = kb.shape where id = ka.id;
    update kiosks set geom = g, shape = sh where id = kb.id;
    return format('تم تبديل مكان %s و %s على الخريطة', ka.code, kb.code);
  end if;
  if not public.has_role('super_admin','reservations') then raise exception 'ليس لديك صلاحية تعديل الحجوزات' using errcode = '42501'; end if;
  perform public.release_expired_holds();
  -- reservations that already hold both kiosks stay as they are
  select coalesce(array_agg(rk.reservation_id), '{}') into ra from reservation_kiosks rk
   where rk.kiosk_id = p_a and not exists (select 1 from reservation_kiosks x where x.reservation_id = rk.reservation_id and x.kiosk_id = p_b);
  select coalesce(array_agg(rk.reservation_id), '{}') into rb from reservation_kiosks rk
   where rk.kiosk_id = p_b and not exists (select 1 from reservation_kiosks x where x.reservation_id = rk.reservation_id and x.kiosk_id = p_a);
  na := coalesce(array_length(ra, 1), 0); nb := coalesce(array_length(rb, 1), 0);
  delete from reservation_kiosks where (kiosk_id = p_a and reservation_id = any(ra)) or (kiosk_id = p_b and reservation_id = any(rb));
  insert into reservation_kiosks(reservation_id, kiosk_id) select r, p_b from unnest(ra) r;
  insert into reservation_kiosks(reservation_id, kiosk_id) select r, p_a from unnest(rb) r;
  return format('تم التبديل: %s حجز انتقل من %s إلى %s، و%s حجز من %s إلى %s', na, ka.code, kb.code, nb, kb.code, ka.code);
end $$;
revoke execute on function public.swap_kiosks(uuid, uuid, text) from anon, public;
grant execute on function public.swap_kiosks(uuid, uuid, text) to authenticated;
