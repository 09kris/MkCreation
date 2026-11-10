const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const test = require('node:test');
const database = require('../config/db');

const cloudinaryVariables = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const previousEnvironment = new Map(cloudinaryVariables.map((name) => [name, process.env[name]]));
const originalGetPool = database.getPool;
const originalHttpsRequest = https.request;
const insertedProducts = [];
let poolQueryCount = 0;
let cloudinaryRequestCount = 0;
let categoryIsAvailable = true;

const pool = {
  async query(sql, params = []) {
    poolQueryCount += 1;
    if (/SELECT c\.id\s+FROM categories/i.test(sql)) {
      return [categoryIsAvailable ? [{ id: params[0] }] : [], []];
    }
    if (/^\s*INSERT\s+INTO products/i.test(sql)) {
      insertedProducts.push(params);
      return [{ insertId: 42 }, []];
    }
    if (/^\s*SELECT p\.\*/i.test(sql)) {
      const values = insertedProducts.at(-1);
      return [[{
        id: 42,
        category_id: values[0],
        name: values[1],
        description: values[2],
        price: values[3],
        discount_price: values[4],
        stock_quantity: values[5],
        unit: values[6],
        image_url: values[7],
        image_urls: values[8],
        is_featured: values[9],
        is_active: values[10],
      }], []];
    }
    if (/^\s*SELECT id FROM products WHERE id = \?/i.test(sql)) {
      return [params[0] === 42 ? [{ id: 42 }] : [], []];
    }
    if (/^\s*UPDATE products SET is_active = 0 WHERE id = \?/i.test(sql)) {
      return [{ affectedRows: 1 }, []];
    }
    throw new Error(`Unexpected database query: ${sql}`);
  },
};

database.getPool = () => pool;
https.request = (options, callback) => {
  cloudinaryRequestCount += 1;
  assert.equal(options.hostname, 'api.cloudinary.com');
  const request = new EventEmitter();
  request.end = (body) => {
    assert.ok(body.includes(Buffer.from('filename="ritual.jpg"')));
    const response = new EventEmitter();
    response.statusCode = 200;
    callback(response);
    process.nextTick(() => {
      response.emit('data', Buffer.from(JSON.stringify({
        secure_url: 'https://res.cloudinary.com/store/image/upload/ritual.jpg',
      })));
      response.emit('end');
    });
  };
  request.destroy = (error) => request.emit('error', error);
  return request;
};

const { createProduct, deleteProduct } = require('./productController');

function createResponse() {
  return {
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
}

test('uploads selected product images before saving Cloudinary URLs with the product', async () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  insertedProducts.length = 0;
  categoryIsAvailable = true;
  poolQueryCount = 0;
  cloudinaryRequestCount = 0;

  const response = createResponse();
  await createProduct({
    body: {
      category_id: '3',
      name: ' Ritual kit ',
      description: ' Daily use ',
      price: '249.50',
      discount_price: '199',
      stock_quantity: '4',
      unit: 'piece',
      is_featured: 'false',
      is_active: 'true',
    },
    files: [{
      originalname: 'ritual.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('image bytes'),
    }],
  }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(cloudinaryRequestCount, 1);
  assert.equal(insertedProducts.length, 1);
  assert.equal(insertedProducts[0][7], 'https://res.cloudinary.com/store/image/upload/ritual.jpg');
  assert.deepEqual(JSON.parse(insertedProducts[0][8]), [insertedProducts[0][7]]);
  assert.equal(insertedProducts[0][9], 0);
  assert.equal(insertedProducts[0][10], 1);
  assert.equal(response.body.product.image_url, insertedProducts[0][7]);
  assert.deepEqual(response.body.product.image_urls, [insertedProducts[0][7]]);
});

test('does not save a product when Cloudinary is not configured', async () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  insertedProducts.length = 0;
  categoryIsAvailable = true;
  poolQueryCount = 0;
  cloudinaryRequestCount = 0;

  const response = createResponse();
  await createProduct({
    body: { category_id: '3', name: 'Ritual kit', price: '249' },
    files: [{
      originalname: 'ritual.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('image bytes'),
    }],
  }, response);

  assert.equal(response.statusCode, 503);
  assert.match(response.body.message, /Cloudinary is not configured/);
  assert.equal(cloudinaryRequestCount, 0);
  assert.equal(poolQueryCount, 1);
});

test('rejects invalid product fields before uploading or writing to the database', async () => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  insertedProducts.length = 0;
  categoryIsAvailable = true;
  poolQueryCount = 0;
  cloudinaryRequestCount = 0;

  const response = createResponse();
  await createProduct({
    body: { category_id: '3', name: 'Ritual kit', price: '-1', stock_quantity: '2' },
    files: [{
      originalname: 'ritual.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('image bytes'),
    }],
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /positive price/);
  assert.equal(cloudinaryRequestCount, 0);
  assert.equal(poolQueryCount, 0);
});

test('soft-deletes products by deactivating them without removing their records', async () => {
  const queries = [];
  pool.query = async (sql, params = []) => {
    queries.push({ sql, params });
    if (sql.startsWith('SELECT id FROM products')) return [[{ id: 42 }], []];
    if (sql.startsWith('UPDATE products SET is_active = 0')) return [{ affectedRows: 1 }, []];
    throw new Error(`Unexpected database query: ${sql}`);
  };

  const response = createResponse();
  await deleteProduct({ params: { id: '42' } }, response);

  assert.equal(response.statusCode, 200);
  assert.match(response.body.message, /deactivated/);
  assert.equal(queries.some(({ sql }) => sql.startsWith('DELETE')), false);
  assert.deepEqual(queries.at(-1), {
    sql: 'UPDATE products SET is_active = 0 WHERE id = ?',
    params: ['42'],
  });
});

test.after(() => {
  database.getPool = originalGetPool;
  https.request = originalHttpsRequest;
  for (const [name, value] of previousEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
