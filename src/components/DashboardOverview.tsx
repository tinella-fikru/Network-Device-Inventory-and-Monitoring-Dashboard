import { Server, CheckCircle2, AlertTriangle, XCircle, BellRing, Cpu, MemoryStick, Network } from 'lucide-react';
import type { Device, Alert } from '@/types';

interface DashboardOverviewProps {
  devices: Device[];
  alerts: Alert[];
}

export default function DashboardOverview({ devices, alerts }: DashboardOverviewProps) {
  const total = devices.length;
  const online = devices.filter((d) => d.status === 'online').length;
  const offline = devices.filter((d) => d.status === 'offline').length;
  const warning = devices.filter((d) => d.status === 'warning').length;
  const activeAlerts = alerts.filter((a) => !a.resolved).length;

  const avgCpu = total > 0 ? (devices.reduce((s, d) => s + d.cpu_usage, 0) / total).toFixed(1) : '0';
  const avgMem = total > 0 ? (devices.reduce((s, d) => s + d.memory_usage, 0) / total).toFixed(1) : '0';
  const totalTraffic = devices.reduce((s, d) => s + d.traffic_in_mbps + d.traffic_out_mbps, 0).toFixed(0);

  const cards = [
    { label: 'Total Devices', value: total, icon: Server, color: 'text-cyan-400', bg: 'bg-cyan-600/10' },
    { label: 'Online', value: online, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
    { label: 'Warning', value: warning, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-600/10' },
    { label: 'Offline', value: offline, icon: XCircle, color: 'text-red-400', bg: 'bg-red-600/10' },
    { label: 'Active Alerts', value: activeAlerts, icon: BellRing, color: 'text-orange-400', bg: 'bg-orange-600/10' },
  ];

  const metrics = [
    { label: 'Avg CPU', value: `${avgCpu}%`, icon: Cpu, color: 'text-cyan-400' },
    { label: 'Avg Memory', value: `${avgMem}%`, icon: MemoryStick, color: 'text-blue-400' },
    { label: 'Total Traffic', value: `${totalTraffic} Mbps`, icon: Network, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time view of your network infrastructure</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-xs text-slate-400 mt-1">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="card p-5 flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-800">
                <Icon className={`w-6 h-6 ${m.color}`} />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{m.value}</div>
                <div className="text-xs text-slate-400">{m.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {activeAlerts > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Active Alerts</h3>
          <div className="space-y-2">
            {alerts.filter((a) => !a.resolved).slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-slate-800/50">
                <span className="text-slate-300">{alert.message}</span>
                <span className="text-xs text-slate-500">{new Date(alert.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
