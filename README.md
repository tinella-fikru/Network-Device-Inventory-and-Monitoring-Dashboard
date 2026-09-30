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

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS for styling
- Supabase for database, auth, and row-level security
- Lucide React for icons
- Canvas-based charts (no chart library dependency)
