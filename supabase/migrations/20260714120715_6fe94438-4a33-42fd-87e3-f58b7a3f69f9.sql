
create extension if not exists btree_gist;

create type public.app_role as enum ('admin', 'recepcionista');
create type public.reservation_status as enum ('pendente','confirmada','checkin','checkout','cancelada','no_show');
create type public.payment_status as enum ('pendente','pago','estornado','falhou');
create type public.payment_method as enum ('dinheiro','cartao_credito','cartao_debito','pix','transferencia','outro');
create type public.room_status as enum ('disponivel','ocupado','manutencao','limpeza','bloqueado');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.hotels to authenticated;
grant all on public.hotels to service_role;
alter table public.hotels enable row level security;
create trigger trg_hotels_updated_at before update on public.hotels
  for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete restrict,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_hotel_id_idx on public.profiles(hotel_id);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, hotel_id, role)
);
create index user_roles_user_hotel_idx on public.user_roles(user_id, hotel_id);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.current_hotel_id()
returns uuid language sql stable security definer set search_path = public as $$
  select hotel_id from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(_user_id uuid, _hotel_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles
    where user_id = _user_id and hotel_id = _hotel_id and role = _role)
$$;

create policy "hotels_select_own" on public.hotels for select to authenticated
  using (id = public.current_hotel_id());
create policy "hotels_update_admin" on public.hotels for update to authenticated
  using (id = public.current_hotel_id() and public.has_role(auth.uid(), id, 'admin'))
  with check (id = public.current_hotel_id() and public.has_role(auth.uid(), id, 'admin'));

create policy "profiles_select_same_hotel" on public.profiles for select to authenticated
  using (id = auth.uid() or hotel_id = public.current_hotel_id());
create policy "profiles_insert_self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated
  using (id = auth.uid() or (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin')))
  with check (id = auth.uid() or (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin')));

create policy "user_roles_select_self_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin')));
create policy "user_roles_admin_insert" on public.user_roles for insert to authenticated
  with check (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));
create policy "user_roles_admin_update" on public.user_roles for update to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'))
  with check (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));
create policy "user_roles_admin_delete" on public.user_roles for delete to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));

create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete restrict,
  name text not null,
  description text,
  base_price numeric(10,2) not null check (base_price >= 0),
  max_occupancy int not null check (max_occupancy > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, name)
);
create index room_types_hotel_idx on public.room_types(hotel_id);
grant select, insert, update, delete on public.room_types to authenticated;
grant all on public.room_types to service_role;
alter table public.room_types enable row level security;
create trigger trg_room_types_updated_at before update on public.room_types
  for each row execute function public.set_updated_at();
create policy "room_types_select" on public.room_types for select to authenticated
  using (hotel_id = public.current_hotel_id());
create policy "room_types_admin_insert" on public.room_types for insert to authenticated
  with check (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));
create policy "room_types_admin_update" on public.room_types for update to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'))
  with check (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));
create policy "room_types_admin_delete" on public.room_types for delete to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete restrict,
  room_type_id uuid not null references public.room_types(id) on delete restrict,
  number text not null,
  floor int,
  status public.room_status not null default 'disponivel',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, number)
);
create index rooms_hotel_idx on public.rooms(hotel_id);
create index rooms_hotel_status_idx on public.rooms(hotel_id, status);
grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create trigger trg_rooms_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();

create or replace function public.validate_room_tenant()
returns trigger language plpgsql set search_path = public as $$
declare rt_hotel uuid;
begin
  select hotel_id into rt_hotel from public.room_types where id = new.room_type_id;
  if rt_hotel is null or rt_hotel <> new.hotel_id then
    raise exception 'room_type_id % nao pertence ao hotel %', new.room_type_id, new.hotel_id;
  end if;
  return new;
end; $$;
create trigger trg_rooms_validate_tenant before insert or update on public.rooms
  for each row execute function public.validate_room_tenant();

create policy "rooms_select" on public.rooms for select to authenticated
  using (hotel_id = public.current_hotel_id());
create policy "rooms_admin_insert" on public.rooms for insert to authenticated
  with check (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));
create policy "rooms_admin_update" on public.rooms for update to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'))
  with check (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));
create policy "rooms_admin_delete" on public.rooms for delete to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete restrict,
  full_name text not null,
  document_type text,
  document_number text,
  email text,
  phone text,
  birth_date date,
  nationality text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guests_hotel_idx on public.guests(hotel_id);
create index guests_hotel_name_idx on public.guests(hotel_id, full_name);
create unique index guests_hotel_document_uniq on public.guests(hotel_id, document_type, document_number)
  where document_type is not null and document_number is not null;
grant select, insert, update, delete on public.guests to authenticated;
grant all on public.guests to service_role;
alter table public.guests enable row level security;
create trigger trg_guests_updated_at before update on public.guests
  for each row execute function public.set_updated_at();

create policy "guests_select" on public.guests for select to authenticated
  using (hotel_id = public.current_hotel_id());
create policy "guests_insert" on public.guests for insert to authenticated
  with check (hotel_id = public.current_hotel_id());
create policy "guests_update" on public.guests for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());
create policy "guests_admin_delete" on public.guests for delete to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete restrict,
  guest_id uuid not null references public.guests(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  status public.reservation_status not null default 'pendente',
  adults int not null default 1 check (adults > 0),
  children int not null default 0 check (children >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index reservations_hotel_idx on public.reservations(hotel_id);
create index reservations_hotel_status_idx on public.reservations(hotel_id, status);
create index reservations_room_dates_idx on public.reservations(hotel_id, room_id, check_in, check_out);
grant select, insert, update, delete on public.reservations to authenticated;
grant all on public.reservations to service_role;
alter table public.reservations enable row level security;
create trigger trg_reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

create or replace function public.validate_reservation_tenant()
returns trigger language plpgsql set search_path = public as $$
declare g_hotel uuid; r_hotel uuid;
begin
  select hotel_id into g_hotel from public.guests where id = new.guest_id;
  select hotel_id into r_hotel from public.rooms  where id = new.room_id;
  if g_hotel is null or g_hotel <> new.hotel_id then
    raise exception 'guest_id % nao pertence ao hotel %', new.guest_id, new.hotel_id;
  end if;
  if r_hotel is null or r_hotel <> new.hotel_id then
    raise exception 'room_id % nao pertence ao hotel %', new.room_id, new.hotel_id;
  end if;
  return new;
end; $$;
create trigger trg_reservations_validate_tenant before insert or update on public.reservations
  for each row execute function public.validate_reservation_tenant();

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (status in ('pendente','confirmada','checkin'));

create policy "reservations_select" on public.reservations for select to authenticated
  using (hotel_id = public.current_hotel_id());
create policy "reservations_insert" on public.reservations for insert to authenticated
  with check (hotel_id = public.current_hotel_id());
create policy "reservations_update" on public.reservations for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());
create policy "reservations_admin_delete" on public.reservations for delete to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete restrict,
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  method public.payment_method not null,
  status public.payment_status not null default 'pendente',
  paid_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_hotel_idx on public.payments(hotel_id);
create index payments_reservation_idx on public.payments(hotel_id, reservation_id);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create or replace function public.validate_payment_tenant()
returns trigger language plpgsql set search_path = public as $$
declare r_hotel uuid;
begin
  select hotel_id into r_hotel from public.reservations where id = new.reservation_id;
  if r_hotel is null or r_hotel <> new.hotel_id then
    raise exception 'reservation_id % nao pertence ao hotel %', new.reservation_id, new.hotel_id;
  end if;
  return new;
end; $$;
create trigger trg_payments_validate_tenant before insert or update on public.payments
  for each row execute function public.validate_payment_tenant();

create policy "payments_select" on public.payments for select to authenticated
  using (hotel_id = public.current_hotel_id());
create policy "payments_insert" on public.payments for insert to authenticated
  with check (hotel_id = public.current_hotel_id());
create policy "payments_update" on public.payments for update to authenticated
  using (hotel_id = public.current_hotel_id())
  with check (hotel_id = public.current_hotel_id());
create policy "payments_admin_delete" on public.payments for delete to authenticated
  using (hotel_id = public.current_hotel_id() and public.has_role(auth.uid(), hotel_id, 'admin'));

-- SEED
insert into public.hotels (id, name, slug, timezone)
values ('00000000-0000-0000-0000-00000000dead'::uuid, 'Hotel Demo', 'hotel-demo', 'America/Sao_Paulo');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  demo_hotel uuid := '00000000-0000-0000-0000-00000000dead';
  admin_exists boolean;
begin
  insert into public.profiles (id, hotel_id, full_name, email)
  values (new.id, demo_hotel,
    coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;

  select exists(select 1 from public.user_roles where hotel_id = demo_hotel and role = 'admin')
    into admin_exists;

  insert into public.user_roles (user_id, hotel_id, role)
  values (new.id, demo_hotel,
    case when admin_exists then 'recepcionista'::public.app_role else 'admin'::public.app_role end)
  on conflict do nothing;

  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
