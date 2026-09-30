-- Seeding raced under React StrictMode and inserted duplicates. Dedupe, then
-- enforce uniqueness so ensureSeedDevices can use an idempotent upsert.

delete from public.devices d
using public.devices keep
where d.user_id = keep.user_id
  and d.name = keep.name
  and d.created_at > keep.created_at;

alter table public.devices
  add constraint devices_user_id_name_key unique (user_id, name);
