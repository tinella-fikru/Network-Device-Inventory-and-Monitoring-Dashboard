import { useState, useMemo } from 'react';
import { Bell, CheckCircle, AlertOctagon, Info } from 'lucide-react';
import type { Alert, AlertSeverity } from '@/types';
import { SeverityBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/metrics';
import { supabase } from '@/lib/supabaseClient';

interface AlertsPageProps {
  alerts: Alert[];
  onAlertsChanged: () => void;
}

export default function AlertsPage({ alerts, onAlertsChanged }: AlertsPageProps) {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [showResolved, setShowResolved] = useState(false);

  const filtered = useMemo(() => {
    return alerts
      .filter((a) => (showResolved ? true : !a.resolved))
      .filter((a) => severityFilter === 'all' || a.severity === severityFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [alerts, severityFilter, showResolved]);

  const resolveAlert = async (id: string) => {
    await supabase
      .from('alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    onAlertsChanged();
  };

  const activeCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;

  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Alerts</h2>
          <p className="text-sm text-slate-400 mt-1">
            {activeCount} active · {criticalCount} critical
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
            className="input w-36 cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={showResolved ? 'btn-primary' : 'btn-secondary'}
          >
            {showResolved ? 'Showing All' : 'Active Only'}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Bell className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">No alerts to display</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((alert) => {
              const icon =
                alert.severity === 'critical' ? AlertOctagon :
                alert.severity === 'warning' ? Bell :
                alert.type === 'device_restored' ? CheckCircle : Info;
              const color =
                alert.severity === 'critical' ? 'text-red-400' :
                alert.severity === 'warning' ? 'text-amber-400' :
                'text-cyan-400';
              const Icon = icon;

              return (
                <div key={alert.id} className="flex items-start gap-4 p-4 hover:bg-slate-800/30 transition-colors">
                  <Icon className={`w-5 h-5 ${color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm ${alert.resolved ? 'text-slate-500' : 'text-slate-100'}`}>
                        {alert.message}
                      </span>
                      <SeverityBadge severity={alert.severity} />
                      {alert.resolved && (
                        <span className="badge bg-slate-700/50 text-slate-400 border border-slate-600/30">
                          Resolved
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {timeAgo(alert.created_at)}
                      {alert.resolved && alert.resolved_at ? ` · resolved ${timeAgo(alert.resolved_at)}` : ''}
                    </div>
                  </div>
                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex-shrink-0"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
