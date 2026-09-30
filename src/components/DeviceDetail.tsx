import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Cpu, MemoryStick, Network, Power, PowerOff, MapPin, Clock, Loader2 } from 'lucide-react';
import type { Device, MetricPoint } from '@/types';
import { StatusBadge, deviceIcons, deviceTypeLabels } from '@/components/StatusBadge';
import MetricChart from '@/components/MetricChart';
import { formatUptime } from '@/lib/metrics';
import { supabase } from '@/lib/supabaseClient';

interface DeviceDetailProps {
  device: Device;
  onBack: () => void;
  onDeviceUpdated: (device: Device) => void;
}

export default function DeviceDetail({ device, onBack, onDeviceUpdated }: DeviceDetailProps) {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    const { data } = await supabase
      .from('device_metrics')
      .select('*')
      .eq('device_id', device.id)
      .order('recorded_at', { ascending: true })
      .limit(30);

    if (data) {
      setMetrics(
        data.map((m) => ({
          timestamp: m.recorded_at,
          cpu: m.cpu_usage,
          memory: m.memory_usage,
          trafficIn: m.traffic_in_mbps,
          trafficOut: m.traffic_out_mbps,
        })),
      );
    }
  }, [device.id]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleOutage = async () => {
    setActionLoading(true);
    const { data } = await supabase
      .from('devices')
      .update({ status: 'offline', cpu_usage: 0, memory_usage: 0, traffic_in_mbps: 0, traffic_out_mbps: 0 })
      .eq('id', device.id)
      .select()
      .single();

    if (data) {
      onDeviceUpdated(data as Device);

      await supabase.from('alerts').insert({
        device_id: device.id,
        device_name: device.name,
        type: 'device_offline',
        severity: 'critical',
        message: `Device ${device.name} went offline (simulated outage)`,
      });
    }
    setActionLoading(false);
  };

  const handleRestore = async () => {
    setActionLoading(true);
    const { data } = await supabase
      .from('devices')
      .update({ status: 'online', cpu_usage: 25, memory_usage: 40, traffic_in_mbps: 100, traffic_out_mbps: 60 })
      .eq('id', device.id)
      .select()
      .single();

    if (data) {
      onDeviceUpdated(data as Device);

      await supabase.from('alerts').insert({
        device_id: device.id,
        device_name: device.name,
        type: 'device_restored',
        severity: 'info',
        message: `Device ${device.name} is back online`,
      });

      // Resolve existing offline alerts for this device
      await supabase
        .from('alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('device_id', device.id)
        .eq('resolved', false);
    }
    setActionLoading(false);
  };

  const Icon = deviceIcons[device.type];

  const chartData = (key: keyof MetricPoint) =>
    metrics.slice(-20).map((m) => ({
      label: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: m[key] as number,
    }));

  return (
    <div className="space-y-6 fade-in">
      <button onClick={onBack} className="btn-secondary">
        <ArrowLeft className="w-4 h-4" /> Back to Devices
      </button>

      {/* Device header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-slate-800">
              <Icon className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{device.name}</h2>
              <p className="text-sm text-slate-400">{device.model} · {deviceTypeLabels[device.type]}</p>
              <div className="mt-2">
                <StatusBadge status={device.status} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {device.status === 'offline' ? (
              <button onClick={handleRestore} disabled={actionLoading} className="btn-primary">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                Restore Device
              </button>
            ) : (
              <button onClick={handleOutage} disabled={actionLoading} className="btn-danger">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
                Simulate Outage
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <div className="text-xs text-slate-500 mb-1">IP Address</div>
            <div className="text-sm text-slate-200 font-mono">{device.ip_address}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div>
            <div className="text-sm text-slate-200">{device.location}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Uptime</div>
            <div className="text-sm text-slate-200">{formatUptime(device.uptime_seconds)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Type</div>
            <div className="text-sm text-slate-200">{deviceTypeLabels[device.type]}</div>
          </div>
        </div>
      </div>

      {/* Current metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'CPU Usage', value: device.status === 'offline' ? '—' : `${device.cpu_usage.toFixed(1)}%`, icon: Cpu, color: device.cpu_usage > 85 ? 'text-red-400' : 'text-cyan-400' },
          { label: 'Memory', value: device.status === 'offline' ? '—' : `${device.memory_usage.toFixed(1)}%`, icon: MemoryStick, color: device.memory_usage > 90 ? 'text-red-400' : 'text-blue-400' },
          { label: 'Traffic In', value: device.status === 'offline' ? '—' : `${device.traffic_in_mbps.toFixed(1)} Mbps`, icon: Network, color: 'text-emerald-400' },
          { label: 'Traffic Out', value: device.status === 'offline' ? '—' : `${device.traffic_out_mbps.toFixed(1)} Mbps`, icon: Network, color: 'text-amber-400' },
        ].map((m) => {
          const MIcon = m.icon;
          return (
            <div key={m.label} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <MIcon className={`w-4 h-4 ${m.color}`} />
                <span className="text-xs text-slate-400">{m.label}</span>
              </div>
              <div className="text-xl font-semibold text-white">{m.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">CPU Usage</h3>
          </div>
          <MetricChart data={chartData('cpu')} color="#22d3ee" unit="%" maxValue={100} />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MemoryStick className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Memory Usage</h3>
          </div>
          <MetricChart data={chartData('memory')} color="#60a5fa" unit="%" maxValue={100} />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Traffic In (Mbps)</h3>
          </div>
          <MetricChart data={chartData('trafficIn')} color="#34d399" unit=" Mbps" />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Traffic Out (Mbps)</h3>
          </div>
          <MetricChart data={chartData('trafficOut')} color="#fbbf24" unit=" Mbps" />
        </div>
      </div>
    </div>
  );
}
