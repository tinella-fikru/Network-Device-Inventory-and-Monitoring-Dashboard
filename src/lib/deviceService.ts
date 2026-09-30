import { supabase } from '@/lib/supabaseClient';
import { getSeedDevices, randomMetric, randomTraffic } from '@/lib/deviceData';
import type { Device } from '@/types';

export async function ensureSeedDevices(userId: string): Promise<Device[]> {
  const { data: existing, error: checkError } = await supabase
    .from('devices')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking for existing devices:', checkError);
    return [];
  }

  if (existing) {
    const { data: devices, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching existing devices:', fetchError);
      return [];
    }
    return devices as Device[];
  }

  const seeds = getSeedDevices();
  const rows = seeds.map((s) => ({
    user_id: userId,
    name: s.name,
    type: s.type,
    model: s.model,
    ip_address: s.ip_address,
    location: s.location,
    status: s.status,
    uptime_seconds: Math.floor(Math.random() * 86400 * 30),
    cpu_usage: randomMetric(35, 30),
    memory_usage: randomMetric(45, 25),
    traffic_in_mbps: randomTraffic(120, 80),
    traffic_out_mbps: randomTraffic(80, 60),
  }));

  // Upsert on (user_id, name): concurrent first-load calls (e.g. StrictMode) can't duplicate seeds.
  const { data: inserted, error: insertError } = await supabase
    .from('devices')
    .upsert(rows, { onConflict: 'user_id,name', ignoreDuplicates: true })
    .select();

  if (insertError) {
    console.error('Error seeding devices:', insertError);
    return [];
  }

  if (!inserted || inserted.length < rows.length) {
    const { data: devices } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    return (devices as Device[]) ?? [];
  }

  return (inserted as Device[]).sort((a, b) => a.name.localeCompare(b.name));
}
