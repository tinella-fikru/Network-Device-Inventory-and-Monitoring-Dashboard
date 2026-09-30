-- NetMon initial schema: devices, device_metrics, alerts with owner-scoped RLS.

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create table public.devices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  type              text not null check (type in ('router', 'switch', 'firewall', 'ap')),
  model             text not null,
  ip_address        text not null,
  location          text not null,
  status            text not null default 'online' check (status in ('online', 'offline', 'warning')),
  uptime_seconds    integer not null default 0,
  cpu_usage         numeric not null default 0,
  memory_usage      numeric not null default 0,
  traffic_in_mbps   numeric not null default 0,
  traffic_out_mbps  numeric not null default 0,
  created_at        timestamptz not null default now()
);

create index devices_user_id_idx on public.devices (user_id);

-- ---------------------------------------------------------------------------
-- device_metrics (time series)
-- ---------------------------------------------------------------------------
create table public.device_metrics (
  id                uuid primary key default gen_random_uuid(),
  device_id         uuid not null references public.devices(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  cpu_usage         numeric not null default 0,
  memory_usage      numeric not null default 0,
  traffic_in_mbps   numeric not null default 0,
  traffic_out_mbps  numeric not null default 0,
  recorded_at       timestamptz not null default now()
);

create index device_metrics_user_id_idx on public.device_metrics (user_id);
create index device_metrics_device_id_recorded_at_idx on public.device_metrics (device_id, recorded_at);

-- ---------------------------------------------------------------------------
-- alerts
-- The app inserts alerts without user_id, so it defaults to the caller.
-- ---------------------------------------------------------------------------
create table public.alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id    uuid not null references public.devices(id) on delete cascade,
  device_name  text not null,
  type         text not null check (type in ('cpu_high', 'memory_high', 'device_offline', 'device_restored')),
  severity     text not null check (severity in ('critical', 'warning', 'info')),
  message      text not null,
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index alerts_user_id_idx on public.alerts (user_id);
create index alerts_user_id_created_at_idx on public.alerts (user_id, created_at desc);
create index alerts_device_id_idx on public.alerts (device_id);

-- ---------------------------------------------------------------------------
-- Row level security: each user sees and manages only their own rows.
-- ---------------------------------------------------------------------------
alter table public.devices        enable row level security;
alter table public.device_metrics enable row level security;
alter table public.alerts         enable row level security;

-- devices
create policy "devices: owner select" on public.devices
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "devices: owner insert" on public.devices
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "devices: owner update" on public.devices
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "devices: owner delete" on public.devices
  for delete to authenticated using ((select auth.uid()) = user_id);

-- device_metrics
create policy "device_metrics: owner select" on public.device_metrics
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "device_metrics: owner insert" on public.device_metrics
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "device_metrics: owner delete" on public.device_metrics
  for delete to authenticated using ((select auth.uid()) = user_id);

-- alerts
create policy "alerts: owner select" on public.alerts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "alerts: owner insert" on public.alerts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "alerts: owner update" on public.alerts
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "alerts: owner delete" on public.alerts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Data API access: authenticated users only; anon gets nothing.
revoke all on public.devices, public.device_metrics, public.alerts from anon;
grant select, insert, update, delete on public.devices, public.device_metrics, public.alerts to authenticated;
