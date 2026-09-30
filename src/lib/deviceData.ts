import type { DeviceType, DeviceStatus } from '@/types';

interface SeedDevice {
  name: string;
  type: DeviceType;
  model: string;
  ip_address: string;
  location: string;
  status: DeviceStatus;
}

const SEED_DEVICES: SeedDevice[] = [
  { name: 'core-rtr-01', type: 'router', model: 'Cisco ISR 4451', ip_address: '10.0.0.1', location: 'Data Center A', status: 'online' },
  { name: 'core-rtr-02', type: 'router', model: 'Cisco ISR 4451', ip_address: '10.0.0.2', location: 'Data Center B', status: 'online' },
  { name: 'edge-rtr-01', type: 'router', model: 'Juniper MX204', ip_address: '10.0.1.1', location: 'Edge PoP', status: 'online' },
  { name: 'dist-sw-01', type: 'switch', model: 'Cisco Catalyst 9300', ip_address: '10.0.2.1', location: 'Data Center A', status: 'online' },
  { name: 'dist-sw-02', type: 'switch', model: 'Cisco Catalyst 9300', ip_address: '10.0.2.2', location: 'Data Center A', status: 'online' },
  { name: 'acc-sw-01', type: 'switch', model: 'Aruba 2930F', ip_address: '10.0.3.1', location: 'Floor 1', status: 'warning' },
  { name: 'acc-sw-02', type: 'switch', model: 'Aruba 2930F', ip_address: '10.0.3.2', location: 'Floor 2', status: 'online' },
  { name: 'fw-01', type: 'firewall', model: 'Fortinet FortiGate 100F', ip_address: '10.0.0.254', location: 'Data Center A', status: 'online' },
  { name: 'fw-02', type: 'firewall', model: 'Palo Alto PA-820', ip_address: '10.0.1.254', location: 'Edge PoP', status: 'online' },
  { name: 'ap-floor-01', type: 'ap', model: 'Cisco AIR-AP2802', ip_address: '10.0.4.1', location: 'Floor 1', status: 'online' },
  { name: 'ap-floor-02', type: 'ap', model: 'Cisco AIR-AP2802', ip_address: '10.0.4.2', location: 'Floor 2', status: 'online' },
  { name: 'ap-floor-03', type: 'ap', model: 'UniFi U6-Pro', ip_address: '10.0.4.3', location: 'Floor 3', status: 'offline' },
];

export function getSeedDevices(): SeedDevice[] {
  return SEED_DEVICES;
}

export function randomMetric(base: number, variance: number, min = 0, max = 100): number {
  const value = base + (Math.random() - 0.5) * variance;
  return Math.round(Math.max(min, Math.min(max, value)) * 10) / 10;
}

export function randomTraffic(base: number, variance: number): number {
  const value = base + (Math.random() - 0.5) * variance;
  return Math.round(Math.max(0, value) * 10) / 10;
}
