import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, LayoutDashboard, Server, Bell, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ensureSeedDevices } from '@/lib/deviceService';
import { generateNextMetrics, shouldAlert } from '@/lib/metrics';
import type { Device, Alert } from '@/types';
import DashboardOverview from '@/components/DashboardOverview';
import DeviceList from '@/components/DeviceList';
import DeviceDetail from '@/components/DeviceDetail';
import AlertsPage from '@/components/AlertsPage';

type View = 'overview' | 'devices' | 'alerts';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setAlerts(data as Alert[]);
  }, []);

  const fetchDevices = useCallback(async () => {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .order('name', { ascending: true });
    if (data) setDevices(data as Device[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      await ensureSeedDevices(user.id);
      await Promise.all([fetchDevices(), fetchAlerts()]);
      setLoading(false);
    })();
  }, [user, fetchDevices, fetchAlerts]);

  // Polling loop: update metrics every 5 seconds
  useEffect(() => {
    if (loading || devices.length === 0) return;

    const poll = async () => {
      const updates: Device[] = [];
      const newMetrics: { device_id: string; user_id: string; cpu_usage: number; memory_usage: number; traffic_in_mbps: number; traffic_out_mbps: number }[] = [];
      const newAlerts: { device_id: string; device_name: string; type: string; severity: string; message: string }[] = [];

      for (const device of devices) {
        const metrics = generateNextMetrics(device);
        const newUptime = device.status === 'offline' ? device.uptime_seconds : device.uptime_seconds + 5;

        updates.push({
          ...device,
          cpu_usage: metrics.cpu_usage,
          memory_usage: metrics.memory_usage,
          traffic_in_mbps: metrics.traffic_in_mbps,
          traffic_out_mbps: metrics.traffic_out_mbps,
          uptime_seconds: newUptime,
        });

        newMetrics.push({
          device_id: device.id,
          user_id: device.user_id,
          ...metrics,
        });

        if (device.status !== 'offline') {
          const alertCheck = shouldAlert(device, metrics);
          if (alertCheck) {
            // Check for existing unresolved alert of same type for this device
            const existing = alerts.find(
              (a) => a.device_id === device.id && a.type === alertCheck.type && !a.resolved,
            );
            if (!existing) {
              newAlerts.push({
                device_id: device.id,
                device_name: device.name,
                type: alertCheck.type,
                severity: alertCheck.severity,
                message: alertCheck.message,
              });
            }
          }
        }
      }

      // Batch update devices
      for (const u of updates) {
        await supabase
          .from('devices')
          .update({
            cpu_usage: u.cpu_usage,
            memory_usage: u.memory_usage,
            traffic_in_mbps: u.traffic_in_mbps,
            traffic_out_mbps: u.traffic_out_mbps,
            uptime_seconds: u.uptime_seconds,
          })
          .eq('id', u.id);
      }

      // Insert metrics
      if (newMetrics.length > 0) {
        await supabase.from('device_metrics').insert(newMetrics);
      }

      // Insert alerts
      if (newAlerts.length > 0) {
        await supabase.from('alerts').insert(newAlerts);
      }

      // Refresh local state
      setDevices(updates);
      if (selectedDevice) {
        const updated = updates.find((u) => u.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
      }
      if (newAlerts.length > 0) {
        fetchAlerts();
      }
    };

    pollingRef.current = setInterval(poll, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loading, devices, alerts, selectedDevice, fetchAlerts]);

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
    setView('devices');
  };

  const handleDeviceUpdated = (updated: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDevice(updated);
    fetchAlerts();
  };

  const navItems: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'devices', label: 'Devices', icon: Server },
    { key: 'alerts', label: 'Alerts', icon: Bell },
  ];

  const activeAlertCount = alerts.filter((a) => !a.resolved).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-60 lg:min-h-screen bg-slate-900/80 border-b lg:border-b-0 lg:border-r border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 p-4 lg:h-16">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">NetMon</div>
            <div className="text-xs text-slate-500 hidden lg:block">Monitoring Dashboard</div>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-1 p-3 lg:p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setSelectedDevice(null); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 lg:flex-initial ${
                  active ? 'bg-cyan-600/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === 'alerts' && activeAlertCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-red-500 text-white">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block mt-auto p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Signed in as</div>
          <div className="text-sm text-slate-300 truncate mb-3">{user?.email}</div>
          <button onClick={signOut} className="btn-secondary w-full">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sign out */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/80">
        <span className="text-xs text-slate-400 truncate">{user?.email}</span>
        <button onClick={signOut} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Sign Out
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {view === 'overview' && <DashboardOverview devices={devices} alerts={alerts} />}
          {view === 'devices' && !selectedDevice && (
            <DeviceList devices={devices} onSelectDevice={handleSelectDevice} />
          )}
          {view === 'devices' && selectedDevice && (
            <DeviceDetail
              device={selectedDevice}
              onBack={() => setSelectedDevice(null)}
              onDeviceUpdated={handleDeviceUpdated}
            />
          )}
          {view === 'alerts' && <AlertsPage alerts={alerts} onAlertsChanged={fetchAlerts} />}
        </div>
      </main>
    </div>
  );
}
