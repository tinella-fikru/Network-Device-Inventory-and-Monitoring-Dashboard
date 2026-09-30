# NetMon — Network Device Inventory & Monitoring Dashboard

A real-time network device monitoring dashboard with simulated SNMP-style polling, uptime and performance charts, automated alerting, and per-user data isolation.

## Features

- **Device Inventory** — 12 simulated devices (routers, switches, firewalls, access points) with realistic names, models, IP addresses, and locations.
- **Live Metric Polling** — CPU usage, memory usage, and network traffic update every 5 seconds and are stored as time-series data for charting.
- **Device Detail View** — Per-device page with live line charts for CPU, memory, inbound traffic, and outbound traffic.
- **Search & Filter** — Search by name, IP, model, or location. Filter by device type and status.
- **Automated Alerts** — Alerts trigger automatically when CPU exceeds 85% or memory exceeds 90%. Device offline events generate critical alerts.
- **Alert History** — Full alert log with severity filtering, resolve actions, and active/resolved toggling.
- **Simulate Outage** — Take any device offline to see status changes, alert generation, and metric drops in real time. Restore it to bring it back.
- **Authentication** — Email and password sign-in/sign-up via Supabase Auth. Each user's data is isolated with row-level security.
- **Demo Account** — Click "Try Demo" on the sign-in page to instantly explore the dashboard without registering.

## Getting Started

1. The app runs automatically — just open the preview.
2. On the sign-in screen, either:
   - Click **Try Demo** to log in with a shared demo account.
   - Or create your own account with **Sign Up** using any email and password (6+ characters).
3. On first login, 12 simulated devices are automatically created for your account.
4. Use the sidebar to navigate between **Overview**, **Devices**, and **Alerts**.

## How It Works

- **Simulated Data**: All device metrics are generated in the browser using randomized values around realistic baselines. No real network devices are polled — this is a demo using simulated data so nothing internal is exposed.
- **Data Storage**: Devices, metric history, and alerts are stored in a Supabase database with row-level security, so each user only sees their own data.
- **Polling Loop**: A background timer runs every 5 seconds, generating new metric values, saving them to the database, and checking alert thresholds.

## Using with Real Devices

The dashboard, database schema, and alerting already work unchanged with real data. What has to change is *where metrics come from*: today the browser invents them in `src/components/Dashboard.tsx`; with real hardware a **collector service** running inside your network polls the devices and writes to the same Supabase tables. Browsers cannot speak SNMP, so this piece must run on a server.

```
[Routers / Switches / Firewalls / APs]
        │  SNMP v2c/v3, ICMP
        ▼
[Collector (Node.js, inside the network)]
        │  supabase-js, service-role key
        ▼
[Supabase: devices · device_metrics · alerts]
        │  RLS + Realtime
        ▼
[NetMon dashboard (this app)]
```

### 1. Prepare the devices

1. Enable SNMP on each device. Prefer **SNMPv3** (authPriv). If you must use v2c, use a read-only community and never the default `public`.
2. Restrict SNMP access with an ACL so only the collector host's IP can query.
3. Note the OIDs you need. Standard ones work everywhere:
   | Metric | OID |
   |---|---|
   | Uptime | `1.3.6.1.2.1.1.3.0` (sysUpTime, 1/100 s) |
   | Interface in/out bytes | `1.3.6.1.2.1.31.1.1.1.6.<ifIndex>` / `.10.<ifIndex>` (ifHCInOctets / ifHCOutOctets) |
   | CPU / memory | vendor-specific, e.g. Cisco `1.3.6.1.4.1.9.9.109.1.1.1.1.7.1` (CPU 1‑min), `1.3.6.1.4.1.9.9.48.1.1.1.5.1` / `.6.1` (mem used / free) |
4. Test from the collector host before writing code: `snmpget -v2c -c <community> 10.0.0.1 1.3.6.1.2.1.1.3.0`.

### 2. Register the real inventory

Replace the seed list in `src/lib/deviceData.ts` with your real devices, or insert them directly:

```sql
insert into public.devices (user_id, name, type, model, ip_address, location)
values ('<your-auth-user-uuid>', 'core-rtr-01', 'router', 'Cisco ISR 4451', '10.0.0.1', 'Data Center A');
```

Store SNMP credentials in the **collector's environment**, not in the `devices` table — that table is readable by the dashboard user.

### 3. Build the collector

Create a separate Node.js project (e.g. `collector/`) on a host that can reach the devices. Suggested dependencies: `net-snmp`, `ping`, `@supabase/supabase-js`.

Environment variables (server only — never ship these to the browser):

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret key from Dashboard > Settings > API>
POLL_INTERVAL_MS=30000
SNMP_COMMUNITY=<ro-community>          # or SNMPv3 user/auth/priv settings
```

Per poll cycle, for every row in `devices`:

1. **Reachability** — ICMP ping (or SNMP `sysUpTime`). Unreachable ⇒ `status = 'offline'`, metrics `0`.
2. **Read counters** — CPU %, memory %, `ifHCInOctets`/`ifHCOutOctets` for the uplink interface, `sysUpTime`.
3. **Derive rates** — traffic Mbps = `(octets_now − octets_prev) × 8 / seconds_elapsed / 1e6`. Keep the previous sample in memory (or in `device_metrics`).
4. **Write** — `update devices set cpu_usage, memory_usage, traffic_in_mbps, traffic_out_mbps, uptime_seconds, status where id = …` and `insert into device_metrics (device_id, user_id, …)`.
5. **Alert** — reuse the thresholds from `src/lib/metrics.ts` (`shouldAlert`): CPU > 85 %, memory > 90 %, offline ⇒ insert into `alerts` if no unresolved alert of that type exists for the device; on recovery insert a `device_restored` alert and resolve the open ones.

Skeleton:

```ts
import snmp from 'net-snmp';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function pollDevice(d: { id: string; user_id: string; ip_address: string }) {
  const session = snmp.createSession(d.ip_address, process.env.SNMP_COMMUNITY!);
  const [uptime, inOct, outOct] = await snmpGet(session, [
    '1.3.6.1.2.1.1.3.0',
    '1.3.6.1.2.1.31.1.1.1.6.1',
    '1.3.6.1.2.1.31.1.1.1.10.1',
  ]);

  const metrics = {
    cpu_usage: await readCpu(session),      // vendor OID
    memory_usage: await readMemory(session), // vendor OID
    traffic_in_mbps: rate(d.id, 'in', inOct),
    traffic_out_mbps: rate(d.id, 'out', outOct),
  };
  session.close();

  await sb.from('devices').update({ ...metrics, status: 'online', uptime_seconds: uptime / 100 }).eq('id', d.id);
  await sb.from('device_metrics').insert({ device_id: d.id, user_id: d.user_id, ...metrics });
}

setInterval(async () => {
  const { data: devices } = await sb.from('devices').select('id,user_id,ip_address');
  await Promise.allSettled((devices ?? []).map((d) => pollDevice(d).catch(() => markOffline(d))));
}, Number(process.env.POLL_INTERVAL_MS));
```

Because the collector uses the service-role key it bypasses RLS, so it must set `user_id` explicitly (the schema default `auth.uid()` on `alerts` is `null` for service-role calls).

Run it as a systemd service, Windows service (e.g. NSSM), or a Docker container on the collector host.

### 4. Switch the dashboard to read-only

1. In `src/components/Dashboard.tsx`, remove the polling `useEffect` that calls `generateNextMetrics` and writes to the database.
2. Replace it with a live subscription so the UI updates when the collector writes:
   ```ts
   useEffect(() => {
     const channel = supabase
       .channel('netmon')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, fetchDevices)
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, fetchAlerts)
       .subscribe();
     return () => { supabase.removeChannel(channel); };
   }, [fetchDevices, fetchAlerts]);
   ```
   Enable Realtime for `devices` and `alerts` in Supabase Dashboard → Database → Publications (`supabase_realtime`). Realtime respects RLS, so users still only receive their own rows.
3. Remove or hide the **Simulate Outage / Restore** buttons in `src/components/DeviceDetail.tsx` — status now comes from the collector.
4. Optionally drop `ensureSeedDevices` from `src/lib/deviceService.ts` so new accounts start empty instead of receiving demo devices.

### 5. Production hardening

- **Retention** — `device_metrics` grows by one row per device per poll. Add a `pg_cron` job (Dashboard → Integrations → Cron):
  ```sql
  select cron.schedule('purge-metrics', '0 3 * * *',
    $$delete from public.device_metrics where recorded_at < now() - interval '30 days'$$);
  ```
- **Multi-user teams** — rows are owned by a single `user_id`. For a shared NOC view, add an `org_id` column plus a membership table and rewrite the RLS policies around it.
- **Secrets** — the service-role key and SNMP credentials live only on the collector. The frontend keeps using the publishable key from `.env`.
- **Auth** — turn email confirmations back on (`supabase/config.toml` → `[auth.email] enable_confirmations = true`, then `supabase config push`) and enable leaked-password protection in Dashboard → Auth.
- **Poll interval** — 30–60 s is typical for SNMP; the 5 s demo cadence will hammer devices and inflate the metrics table.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS for styling
- Supabase for database, auth, and row-level security
- Lucide React for icons
- Canvas-based charts (no chart library dependency)
