const assert = require('node:assert/strict');
const test = require('node:test');

const database = require('../config/db');
let pool;
database.getPool = () => pool;

const {
  deleteCategory,
  getAllCategories,
  getAllCategoriesAdmin,
  updateCategory,
} = require('./categoryController');
const { getAllProducts, getProductById } = require('./productController');

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

test('public category list excludes inactive categories', async () => {
  let query;
  pool = {
    async query(sql) {
      query = sql;
      return [[{ id: 1, name: 'Active' }], []];
    },
  };

  const response = createResponse();
  await getAllCategories({}, response);

  assert.match(query, /WHERE c\.is_active = 1/);
  assert.deepEqual(response.body.categories, [{ id: 1, name: 'Active' }]);
});

test('admin category list includes inactive categories', async () => {
  let query;
  pool = {
    async query(sql) {
      query = sql;
      return [[{ id: 1, name: 'Inactive', is_active: 0 }], []];
    },
  };

  const response = createResponse();
  await getAllCategoriesAdmin({}, response);

  assert.doesNotMatch(query, /WHERE c\.is_active = 1/);
  assert.equal(response.body.categories[0].is_active, 0);
});

test('public product queries exclude products in inactive categories', async () => {
  const queries = [];
  pool = {
    async query(sql) {
      queries.push(sql);
      return [[], []];
    },
  };

  await getAllProducts({ query: {} }, createResponse());
  await getProductById({ params: { id: '12' } }, createResponse());

  assert.match(queries[0], /c\.is_active = 1/);
  assert.match(queries[1], /c\.is_active = 1/);
});

test('category update supports clearing optional fields', async () => {
  const calls = [];
  pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, parent_category_id')) {
        return [[{ id: 4, parent_category_id: null }], []];
      }
      if (sql.trimStart().startsWith('SELECT c.*')) {
        return [[{ id: 4, name: 'New name', description: null, is_active: 0 }], []];
      }
      return [{ affectedRows: 1 }, []];
    },
  };

  const response = createResponse();
  await updateCategory(
    {
      params: { id: '4' },
      body: { name: 'New name', description: '', image_url: null, is_active: false },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  const updateCall = calls.find(({ sql }) => sql.startsWith('UPDATE categories'));
  assert.deepEqual(updateCall.params, ['New name', '', null, false, '4']);
  assert.equal(response.body.category.is_active, 0);
});

test('creates a subcategory under an active top-level category', async () => {
  const calls = [];
  pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, name, slug, parent_category_id')) {
        return [[{
          id: 2,
          name: 'Offerings',
          slug: 'offerings',
          parent_category_id: null,
          is_active: 1,
        }], []];
      }
      if (sql.startsWith('SELECT slug FROM categories')) {
        return [[{ slug: 'offerings' }], []];
      }
      if (sql.startsWith('INSERT INTO categories')) return [{ insertId: 7 }, []];
      if (sql.trimStart().startsWith('SELECT c.*, parent.name')) {
        return [[{
          id: 7,
          name: 'Incense',
          slug: 'offerings-incense',
          parent_category_id: 2,
          parent_category_name: 'Offerings',
        }], []];
      }
      throw new Error(`Unexpected database query: ${sql}`);
    },
  };

  const response = createResponse();
  await require('./categoryController').createCategory(
    { body: { name: 'Incense', parent_category_id: 2 } },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.category.parent_category_name, 'Offerings');
  assert.deepEqual(calls.find(({ sql }) => sql.startsWith('INSERT')).params.slice(0, 3), [
    'Incense',
    'offerings-incense',
    2,
  ]);
});

test('rejects a subcategory as the parent to prevent deeper nesting', async () => {
  pool = {
    async query(sql) {
      if (sql.startsWith('SELECT id, name, slug, parent_category_id')) {
        return [[{
          id: 3,
          name: 'Incense',
          slug: 'offerings-incense',
          parent_category_id: 2,
          is_active: 1,
        }], []];
      }
      throw new Error(`Unexpected database query: ${sql}`);
    },
  };

  const response = createResponse();
  await require('./categoryController').createCategory(
    { body: { name: 'Sticks', parent_category_id: 3 } },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /cannot have another parent/);
});

test('category deletion is refused while products still reference it', async () => {
  const calls = [];
  pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT COUNT(*) AS product_count')) {
        return [[{ product_count: '2' }], []];
      }
      return [[{ child_count: '0' }], []];
    },
  };

  const response = createResponse();
  await deleteCategory({ params: { id: '8' } }, response);

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /Deactivate/);
  assert.equal(calls.some(({ sql }) => sql.startsWith('DELETE')), false);
});

test('category deletion succeeds when no products reference it', async () => {
  const calls = [];
  pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT COUNT(*) AS product_count')) return [[{ product_count: 0 }], []];
      if (sql.startsWith('SELECT COUNT(*) AS child_count')) return [[{ child_count: 0 }], []];
      return [{ affectedRows: 1 }, []];
    },
  };

  const response = createResponse();
  await deleteCategory({ params: { id: '8' } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(calls.some(({ sql }) => sql.startsWith('DELETE')), true);
});
