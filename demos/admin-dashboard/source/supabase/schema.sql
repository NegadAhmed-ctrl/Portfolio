-- Supabase schema for the admin dashboard (run in the SQL editor of the client's project).
-- Roles live in public.profiles; Row Level Security enforces them for every query,
-- so a staff member can't change prices even with a hand-made API call.

create type public.role as enum ('admin', 'staff');
create type public.movement_kind as enum ('in', 'out', 'adjust');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null unique,
  role public.role not null default 'staff',
  active boolean not null default true,
  last_seen_at timestamptz
);

create table public.categories (id text primary key, name text not null, sort int not null default 0);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^[A-Z]-[0-9]{2}-[0-9]$'),
  name text not null check (length(trim(name)) >= 3),
  category text not null references public.categories,
  unit text not null,
  cost numeric(12,2) not null check (cost > 0),
  price numeric(12,2) not null check (price >= cost),
  stock int not null default 0 check (stock >= 0),
  reorder_at int not null default 0 check (reorder_at >= 0),
  supplier text not null,
  updated_at timestamptz not null default now()
);

create table public.movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products on delete set null,
  kind public.movement_kind not null,
  qty int not null,
  balance int not null check (balance >= 0),
  ref text not null,
  by_user uuid not null references public.profiles,
  at timestamptz not null default now()
);
create index on public.movements (product_id, at desc);
create index on public.movements (at desc);

create view public.products_view with (security_invoker = on) as
select p.*,
  case when p.stock <= 0 then 'out' when p.stock <= p.reorder_at then 'low' else 'ok' end as stock_state,
  p.stock * p.cost as value,
  to_tsvector('simple', p.name || ' ' || p.sku || ' ' || p.supplier) as search
from public.products p;

create function public.my_role() returns public.role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.movements enable row level security;

create policy "signed-in staff read" on public.categories for select using (my_role() is not null);
create policy "signed-in staff read" on public.products for select using (my_role() is not null);
create policy "signed-in staff read" on public.movements for select using (my_role() is not null);
create policy "admins write products" on public.products for all using (my_role() = 'admin') with check (my_role() = 'admin');
create policy "read own or admin" on public.profiles for select using (id = auth.uid() or my_role() = 'admin');
create policy "admins manage profiles" on public.profiles for update using (my_role() = 'admin');
-- movements are only written by record_movement() below (no insert policy).

-- Locks the product row so two people issuing the last piece can't both succeed.
create function public.record_movement(product_id uuid, kind public.movement_kind, qty int, ref text)
returns json language plpgsql security definer set search_path = public as $$
declare p products; m movements; new_stock int; old_stock int;
begin
  if my_role() is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into p from products where id = product_id for update;
  if not found then raise exception 'not found'; end if;
  old_stock := p.stock;
  if kind = 'adjust' then new_stock := qty;
  elsif qty <= 0 then raise exception 'اكتب كمية صحيحة أكبر من صفر';
  elsif kind = 'out' and qty > p.stock then raise exception 'الموجود على الرف % بس', p.stock;
  elsif kind = 'out' then new_stock := p.stock - qty;
  else new_stock := p.stock + qty; end if;
  update products set stock = new_stock, updated_at = now() where id = product_id returning * into p;
  insert into movements (product_id, kind, qty, balance, ref, by_user)
    values (product_id, kind, case when kind = 'adjust' then new_stock - old_stock else qty end, new_stock, ref, auth.uid())
    returning * into m;
  return json_build_object('product', row_to_json(p), 'movement', row_to_json(m));
end $$;

create function public.create_product(p json, opening_stock int) returns json
language plpgsql security definer set search_path = public as $$
declare r products;
begin
  if my_role() <> 'admin' then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into products (sku, name, category, unit, cost, price, reorder_at, supplier, stock)
  values (p->>'sku', p->>'name', p->>'category', p->>'unit', (p->>'cost')::numeric, (p->>'price')::numeric,
          (p->>'reorder_at')::int, p->>'supplier', opening_stock)
  returning * into r;
  insert into movements (product_id, kind, qty, balance, ref, by_user)
  values (r.id, 'adjust', opening_stock, opening_stock, 'صنف جديد · رصيد افتتاحي', auth.uid());
  return row_to_json(r);
end $$;
