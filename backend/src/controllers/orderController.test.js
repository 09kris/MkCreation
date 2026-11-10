const assert = require('node:assert/strict');
const test = require('node:test');

const db = require('../config/db');
let pool;
db.getPool = () => pool;
const { cancelMyOrder, updateOrderStatusAdmin } = require('./orderController');

function createHarness({ order, items = [] }) {
  const calls = [];
  const transaction = { committed: false, rolledBack: false, released: false };
  const connection = {
    beginTransaction: async () => calls.push({ sql: 'BEGIN' }),
    commit: async () => {
      transaction.committed = true;
    },
    rollback: async () => {
      transaction.rolledBack = true;
    },
    release: () => {
      transaction.released = true;
    },
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, order_status FROM orders')) {
        return [order ? [order] : []];
      }
      if (sql.startsWith('SELECT product_id, quantity FROM order_items')) {
        return [items];
      }
      return [{ affectedRows: 1 }, []];
    },
  };
  pool = { getConnection: async () => connection };

  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  return { calls, transaction, response };
}

test('cancels the signed-in customer order and restores product stock', async () => {
  const harness = createHarness({
    order: { id: 12, order_status: 'processing' },
    items: [
      { product_id: 7, quantity: 2 },
      { product_id: null, quantity: 1 },
    ],
  });

  await cancelMyOrder(
    { params: { id: '12' }, user: { id: 5 } },
    harness.response
  );

  assert.equal(harness.response.statusCode, 200);
  assert.equal(harness.response.body.order.order_status, 'cancelled');
  assert.equal(harness.transaction.committed, true);
  assert.equal(harness.transaction.released, true);
  assert.equal(harness.calls[1].params[1], 5);
  assert.deepEqual(
    harness.calls.filter((call) => call.sql.startsWith('UPDATE products')).map((call) => call.params),
    [[2, 7]]
  );
  assert.equal(
    harness.calls.some((call) => call.sql.startsWith('UPDATE orders')),
    true
  );
});

test('does not cancel orders that are already shipped', async () => {
  const harness = createHarness({
    order: { id: 12, order_status: 'shipped' },
    items: [{ product_id: 7, quantity: 2 }],
  });

  await cancelMyOrder(
    { params: { id: '12' }, user: { id: 5 } },
    harness.response
  );

  assert.equal(harness.response.statusCode, 409);
  assert.equal(harness.transaction.rolledBack, true);
  assert.equal(
    harness.calls.some((call) => call.sql.startsWith('UPDATE products')),
    false
  );
});

test('does not reveal orders belonging to another customer', async () => {
  const harness = createHarness({ order: null });

  await cancelMyOrder(
    { params: { id: '12' }, user: { id: 5 } },
    harness.response
  );

  assert.equal(harness.response.statusCode, 404);
  assert.equal(harness.transaction.rolledBack, true);
  assert.deepEqual(harness.calls[1].params, ['12', 5]);
});

test('restores stock when an admin cancels an order', async () => {
  const harness = createHarness({
    order: { id: 12, order_status: 'confirmed' },
    items: [{ product_id: 7, quantity: 3 }],
  });

  await updateOrderStatusAdmin(
    { params: { id: '12' }, body: { order_status: 'cancelled' } },
    harness.response
  );

  assert.equal(harness.response.statusCode, 200);
  assert.equal(harness.transaction.committed, true);
  assert.deepEqual(
    harness.calls.filter((call) => call.sql.startsWith('UPDATE products')).map((call) => call.params),
    [[3, 7]]
  );
});
