import type { Device } from '@/types';
import { randomMetric, randomTraffic } from '@/lib/deviceData';

export interface UpdatedDevice extends Device {
  metrics: { cpu: number; memory: number; trafficIn: number; trafficOut: number };
}

export function generateNextMetrics(device: Device) {
  if (device.status === 'offline') {
    return {
      cpu_usage: 0,
      memory_usage: 0,
      traffic_in_mbps: 0,
      traffic_out_mbps: 0,
    };
  }

  const cpuBase = device.cpu_usage || 35;
  const memBase = device.memory_usage || 45;
  const trafficInBase = device.traffic_in_mbps || 120;
  const trafficOutBase = device.traffic_out_mbps || 80;

  return {
    cpu_usage: randomMetric(cpuBase, 20, 2, 98),
    memory_usage: randomMetric(memBase, 10, 10, 95),
    traffic_in_mbps: randomTraffic(trafficInBase, 40),
    traffic_out_mbps: randomTraffic(trafficOutBase, 30),
  };
}

export function shouldAlert(
  device: Device,
  metrics: { cpu_usage: number; memory_usage: number },
): { type: 'cpu_high' | 'memory_high'; severity: 'critical' | 'warning'; message: string } | null {
  if (metrics.cpu_usage > 85) {
    return {
      type: 'cpu_high',
      severity: metrics.cpu_usage > 92 ? 'critical' : 'warning',
      message: `CPU usage at ${metrics.cpu_usage}% on ${device.name}`,
    };
  }
  if (metrics.memory_usage > 90) {
    return {
      type: 'memory_high',
      severity: metrics.memory_usage > 95 ? 'critical' : 'warning',
      message: `Memory usage at ${metrics.memory_usage}% on ${device.name}`,
    };
  }
  return null;
}

export function formatUptime(seconds: number): string {
  if (seconds <= 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
