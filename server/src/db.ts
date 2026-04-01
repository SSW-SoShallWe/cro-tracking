import dns from 'dns';
import { Pool } from 'pg';
import { config } from './config';

// Force IPv4 — Render tries IPv6 by default but Supabase doesn't support it
dns.setDefaultResultOrder('ipv4first');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  options: '-csearch_path=cro_tracking',
});

export async function checkConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
