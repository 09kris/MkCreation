const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const test = require('node:test');
const cloudinary = require('cloudinary').v2;
const database = require('../config/db');

const cloudinaryVariables = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const previousEnvironment = new Map(cloudinaryVariables.map((name) => [name, process.env[name]]));
const originalGetPool = database.getPool;
const originalUploadStream = cloudinary.uploader.upload_stream;
const insertedProducts = [];
let poolQueryCount = 0;
let cloudinaryRequestCount = 0;
let categoryIsAvailable = true;
let subcategoryIsAvailable = true;
const productListQueries = [];

const pool = {
  async query(sql, params = []) {
    poolQueryCount += 1;
    if (/^\s*SELECT p\.id, p\.category_id/i.test(sql)) {
      productListQueries.push({ sql, params });
      return [[], []];
    }
    if (/SELECT id\s+FROM categories/i.test(sql)) {
      return [categoryIsAvailable ? [{ id: params[0] }] : [], []];
    }
    if (/SELECT id\s+FROM subcategories/i.test(sql)) {
      return [subcategoryIsAvailable ? [{ id: params[0] }] : [], []];
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
        subcategory_id: values[1],
        name: values[2],
        description: values[3],
        price: values[4],
        discount_price: values[5],
        stock_quantity: values[6],
        unit: values[7],
        image_url: values[8],
        image_urls: values[9],
        is_featured: values[10],
        is_active: values[11],
        category_root_name: 'Offerings',
        subcategory_name: values[1] == null ? null : 'Incense',
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
cloudinary.uploader.upload_stream = (options, callback) => {
  cloudinaryRequestCount += 1;
  assert.deepEqual(options, { resource_type: 'image', asset_folder: 'mkcreation' });
  const uploadStream = new PassThrough();
  const chunks = [];
  uploadStream.on('data', (chunk) => chunks.push(chunk));
  uploadStream.on('finish', () => {
    assert.deepEqual(Buffer.concat(chunks), Buffer.from('image bytes'));
    callback(null, {
      secure_url: 'https://res.cloudinary.com/store/image/upload/ritual.jpg',
    });
  });
  return uploadStream;
};

const { createProduct, deleteProduct, getAllProducts } = require('./productController');

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

test('builds a valid product list query with category filtering', async () => {
  productListQueries.length = 0;
  const response = createResponse();

  await getAllProducts({ query: { category_id: '4', limit: '100' } }, response);

  assert.equal(response.statusCode, 200);
  assert.match(productListQueries[0].sql, /c\.slug AS category_slug,\s*p\.name/);
  assert.deepEqual(productListQueries[0].params, [4, 100, 0]);
});

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
  assert.equal(insertedProducts[0][0], 3);
  assert.equal(insertedProducts[0][1], null);
  assert.equal(insertedProducts[0][8], 'https://res.cloudinary.com/store/image/upload/ritual.jpg');
  assert.deepEqual(JSON.parse(insertedProducts[0][9]), [insertedProducts[0][8]]);
  assert.equal(insertedProducts[0][10], 0);
  assert.equal(insertedProducts[0][11], 1);
  assert.equal(response.body.product.image_url, insertedProducts[0][8]);
  assert.deepEqual(response.body.product.image_urls, [insertedProducts[0][8]]);
});

test('links a product to a subcategory and its root category', async () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  insertedProducts.length = 0;
  categoryIsAvailable = true;
  subcategoryIsAvailable = true;

  const response = createResponse();
  await createProduct({
    body: {
      category_id: '3',
      subcategory_id: '8',
      name: 'Incense',
      price: '249',
    },
  }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(insertedProducts[0][0], 3);
  assert.equal(insertedProducts[0][1], 8);
  assert.equal(response.body.product.subcategory_id, 8);
});

test('rejects a subcategory that does not belong to the selected root category', async () => {
  categoryIsAvailable = true;
  subcategoryIsAvailable = false;
  insertedProducts.length = 0;

  const response = createResponse();
  await createProduct({
    body: {
      category_id: '3',
      subcategory_id: '8',
      name: 'Incense',
      price: '249',
    },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(insertedProducts.length, 0);
  subcategoryIsAvailable = true;
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
  cloudinary.uploader.upload_stream = originalUploadStream;
  for (const [name, value] of previousEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
