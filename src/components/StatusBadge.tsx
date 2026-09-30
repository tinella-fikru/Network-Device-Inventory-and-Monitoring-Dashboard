import { Router, Network, Shield, Wifi, type LucideIcon } from 'lucide-react';
import type { DeviceType, DeviceStatus } from '@/types';

export const deviceIcons: Record<DeviceType, LucideIcon> = {
  router: Router,
  switch: Network,
  firewall: Shield,
  ap: Wifi,
};

export const deviceTypeLabels: Record<DeviceType, string> = {
  router: 'Router',
  switch: 'Switch',
  firewall: 'Firewall',
  ap: 'Access Point',
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const config = {
    online: { color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', dot: 'bg-emerald-400', label: 'Online' },
    offline: { color: 'bg-red-500/15 text-red-400 border border-red-500/30', dot: 'bg-red-400', label: 'Offline' },
    warning: { color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30', dot: 'bg-amber-400', label: 'Warning' },
  };
  const c = config[status];
  return (
    <span className={`badge ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'offline' ? 'pulse-ring' : ''}`} />
      {c.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const config = {
    critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    info: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  };
  return <span className={`badge ${config[severity]}`}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>;
}
