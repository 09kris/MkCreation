const { initDatabase, getPool } = require('../config/db');

async function testSupabaseConnection() {
  if ((process.env.DB_TYPE || '').toLowerCase() !== 'supabase') {
    throw new Error('Set DB_TYPE=supabase in the backend environment before running this check.');
  }

  await initDatabase();
  const [rows] = await getPool().query(
    'SELECT current_database() AS database_name, CURRENT_TIMESTAMP AS current_time'
  );

  if (!rows[0] || !rows[0].database_name) {
    throw new Error('Supabase PostgreSQL returned an invalid connection check result.');
  }

  console.log(`[Test] Supabase PostgreSQL connection successful (${rows[0].database_name}).`);
  await getPool().end();
}

testSupabaseConnection().catch((err) => {
  console.error('[Test] Supabase PostgreSQL connection failed:', err.message);
  process.exitCode = 1;
});
