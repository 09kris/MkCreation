const assert = require('node:assert/strict');
const test = require('node:test');
const { createPostgresAdapter, toPostgresQuery } = require('./db');

test('converts MySQL placeholders to PostgreSQL placeholders', () => {
  assert.equal(
    toPostgresQuery('SELECT * FROM products WHERE category_id = ? AND is_active = ? LIMIT ? OFFSET ?'),
    'SELECT * FROM products WHERE category_id = $1 AND is_active = $2 LIMIT $3 OFFSET $4'
  );
});

test('maps PostgreSQL query results to the controller result shape', async () => {
  const calls = [];
  const pgPool = {
    query: async (sql, params) => {
      calls.push({ sql, params });

      if (sql.startsWith('INSERT')) {
        return { rows: [{ id: 42 }], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE')) {
        return { rows: [], rowCount: 3 };
      }
      return { rows: [{ id: 7 }], rowCount: 1 };
    },
  };
  const pool = createPostgresAdapter(pgPool);

  const [insertResult] = await pool.query('INSERT INTO users (name) VALUES (?)', ['A']);
  const [updateResult] = await pool.query('UPDATE users SET name = ? WHERE id = ?', ['B', 7]);
  const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [7]);

  assert.equal(calls[0].sql, 'INSERT INTO users (name) VALUES ($1) RETURNING id');
  assert.deepEqual(calls[0].params, ['A']);
  assert.equal(insertResult.insertId, 42);
  assert.equal(updateResult.affectedRows, 3);
  assert.deepEqual(rows, [{ id: 7 }]);
});
