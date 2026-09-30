import { useState, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import type { Device, DeviceType, DeviceStatus } from '@/types';
import { StatusBadge, deviceIcons, deviceTypeLabels } from '@/components/StatusBadge';
import { formatUptime } from '@/lib/metrics';

interface DeviceListProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
}

export default function DeviceList({ devices, onSelectDevice }: DeviceListProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DeviceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.ip_address.includes(search) ||
          d.model.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [devices, search, typeFilter, statusFilter]);

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h2 className="text-xl font-semibold text-white">Devices</h2>
        <p className="text-sm text-slate-400 mt-1">{devices.length} devices in your network</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, IP, model, location..."
            className="input pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as DeviceType | 'all')}
          className="input sm:w-40 cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="router">Routers</option>
          <option value="switch">Switches</option>
          <option value="firewall">Firewalls</option>
          <option value="ap">Access Points</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | 'all')}
          className="input sm:w-36 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Device</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Type</th>
                <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">IP Address</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">CPU</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">Memory</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Uptime</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No devices match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((device) => {
                  const Icon = deviceIcons[device.type];
                  return (
                    <tr
                      key={device.id}
                      onClick={() => onSelectDevice(device)}
                      className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800">
                            <Icon className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-slate-100 font-medium">{device.name}</div>
                            <div className="text-xs text-slate-500">{device.model}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-slate-400">
                        {deviceTypeLabels[device.type]}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-slate-400 font-mono text-xs">
                        {device.ip_address}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={device.status} />
                      </td>
                      <td className="py-3 px-4 text-right hidden lg:table-cell">
                        <span className={device.cpu_usage > 85 ? 'text-red-400' : device.cpu_usage > 70 ? 'text-amber-400' : 'text-slate-300'}>
                          {device.status === 'offline' ? '—' : `${device.cpu_usage.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right hidden lg:table-cell">
                        <span className={device.memory_usage > 90 ? 'text-red-400' : device.memory_usage > 75 ? 'text-amber-400' : 'text-slate-300'}>
                          {device.status === 'offline' ? '—' : `${device.memory_usage.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-slate-400 text-xs">
                        {formatUptime(device.uptime_seconds)}
                      </td>
                      <td className="py-3 px-4">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
