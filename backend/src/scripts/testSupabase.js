const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const SUPABASE_URL = 'https://meznsrsfstzieunfidru.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2ha8PmqWto1NQqYZMCExAQ_kGJNdPxQ';
const PG_CONN_STRING = 'postgresql://postgres:LPK%24nk%23nkLj@db.meznsrsfstzieunfidru.supabase.co:5432/postgres';

async function testConnections() {
  console.log('[Test] Testing Supabase Client connection...');
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[Test] Supabase client initialized successfully.');
  } catch (err) {
    console.error('[Test] Supabase client error:', err.message);
  }

  console.log('[Test] Testing PostgreSQL direct connection...');
  try {
    const pool = new Pool({
      connectionString: PG_CONN_STRING,
      ssl: { rejectUnauthorized: false },
    });
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, version()');
    console.log('[Test] Postgres DB Connected successfully!');
    console.log('[Test] Server time:', res.rows[0].current_time);
    console.log('[Test] Version:', res.rows[0].version.split(' ')[0], res.rows[0].version.split(' ')[1]);
    client.release();
    await pool.end();
  } catch (err) {
    console.error('[Test] PostgreSQL error:', err.message);
  }
}

testConnections();
