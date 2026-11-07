const assert = require('node:assert/strict');
const test = require('node:test');
const { toPostgresQuery } = require('./db');

test('toPostgresQuery handles INSERT, UPDATE, SELECT correctly', () => {
  const insertSql = toPostgresQuery('INSERT INTO products (name, price) VALUES (?, ?)');
  assert.equal(insertSql, 'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id');

  const updateSql = toPostgresQuery('UPDATE products SET price = ? WHERE id = ?');
  assert.equal(updateSql, 'UPDATE products SET price = $1 WHERE id = $2');

  const selectSql = toPostgresQuery('SELECT * FROM products WHERE id = ?');
  assert.equal(selectSql, 'SELECT * FROM products WHERE id = $1');
});

