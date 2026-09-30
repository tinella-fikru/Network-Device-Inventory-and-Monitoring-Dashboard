export type DeviceType = 'router' | 'switch' | 'firewall' | 'ap';
export type DeviceStatus = 'online' | 'offline' | 'warning';
export type AlertType = 'cpu_high' | 'memory_high' | 'device_offline' | 'device_restored';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Device {
  id: string;
  user_id: string;
  name: string;
  type: DeviceType;
  model: string;
  ip_address: string;
  location: string;
  status: DeviceStatus;
  uptime_seconds: number;
  cpu_usage: number;
  memory_usage: number;
  traffic_in_mbps: number;
  traffic_out_mbps: number;
  created_at: string;
}

export interface DeviceMetric {
  id: string;
  device_id: string;
  user_id: string;
  cpu_usage: number;
  memory_usage: number;
  traffic_in_mbps: number;
  traffic_out_mbps: number;
  recorded_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  trafficIn: number;
  trafficOut: number;
}
