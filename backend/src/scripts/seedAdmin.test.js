const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const test = require('node:test');
const { seedAdmin } = require('./seedAdmin');

test('creates an admin with a normalized email and hashed password', async () => {
  const calls = [];
  const pool = {
    query: async (sql, params) => {
      calls.push({ sql, params });

      if (sql.startsWith('SELECT')) {
        return [[], []];
      }

      return [{ insertId: 12 }, []];
    },
  };

  const result = await seedAdmin({
    pool,
    name: ' Store Admin ',
    email: ' ADMIN@example.com ',
    password: 'secure-password',
  });

  assert.deepEqual(result, { created: true, id: 12 });
  assert.equal(calls[0].params[0], 'admin@example.com');
  assert.deepEqual(calls[1].params.slice(0, 2), ['Store Admin', 'admin@example.com']);
  assert.equal(calls[1].params[3], 'admin');
  assert.notEqual(calls[1].params[2], 'secure-password');
  assert.equal(await bcrypt.compare('secure-password', calls[1].params[2]), true);
});

test('does not insert an admin that already exists', async () => {
  let insertCalled = false;
  const pool = {
    query: async (sql) => {
      if (sql.startsWith('SELECT')) {
        return [[{ id: 7, role: 'admin' }], []];
      }

      insertCalled = true;
      return [{ insertId: 8 }, []];
    },
  };

  const result = await seedAdmin({
    pool,
    name: 'Store Admin',
    email: 'admin@example.com',
    password: 'secure-password',
  });

  assert.deepEqual(result, { created: false, id: 7 });
  assert.equal(insertCalled, false);
});

test('does not overwrite an existing non-admin account', async () => {
  const pool = {
    query: async () => [[{ id: 7, role: 'customer' }], []],
  };

  await assert.rejects(
    seedAdmin({
      pool,
      name: 'Store Admin',
      email: 'customer@example.com',
      password: 'secure-password',
    }),
    /already belongs to a non-admin account/
  );
});

test('requires admin credentials', async () => {
  await assert.rejects(
    seedAdmin({
      pool: { query: async () => [[], []] },
      name: '',
      email: '',
      password: '',
    }),
    /Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in backend\/.env/
  );
});
