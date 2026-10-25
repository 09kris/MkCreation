const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:LPK%24nk%23nkLj@db.meznsrsfstzieunfidru.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const client = await pool.connect();
    await client.query('CREATE TABLE IF NOT EXISTS test_tbl (id SERIAL PRIMARY KEY, name VARCHAR(50))');
    const res = await client.query('INSERT INTO test_tbl (name) VALUES ($1) RETURNING id', ['Pooja Agarbatti']);
    console.log('Inserted ID:', res.rows[0].id);
    const sel = await client.query('SELECT * FROM test_tbl');
    console.log('Rows count:', sel.rows.length, 'Row:', sel.rows[0]);
    await client.query('DROP TABLE test_tbl');
    client.release();
    await pool.end();
    console.log('Postgres tests passed completely!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
