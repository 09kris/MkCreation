const assert = require('node:assert/strict');
const test = require('node:test');

const database = require('../config/db');
let pool;
database.getPool = () => pool;

const {
  createCategory,
  createSubcategory,
  deleteSubcategory,
  getAllCategories,
  getAllCategoriesAdmin,
  updateSubcategory,
} = require('./categoryController');

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

test('category endpoint returns root categories with nested subcategories', async () => {
  pool = {
    async query(sql) {
      if (sql.includes('FROM categories c')) {
        return [[{ id: 1, name: 'Pooja', is_active: 1, product_count: 3 }], []];
      }
      if (sql.includes('FROM subcategories s')) {
        return [[{
          id: 7,
          category_id: 1,
          name: 'Incense',
          product_count: 2,
          is_active: 1,
        }], []];
      }
      throw new Error(`Unexpected database query: ${sql}`);
    },
  };

  const response = createResponse();
  await getAllCategories({}, response);

  assert.equal(response.body.categories.length, 1);
  assert.equal(response.body.categories[0].name, 'Pooja');
  assert.equal(response.body.categories[0].subcategories[0].id, 7);
  assert.equal(response.body.categories[0].subcategories[0].parent_category_id, 1);
});

test('public category list excludes inactive categories and subcategories', async () => {
  const queries = [];
  pool = {
    async query(sql) {
      queries.push(sql);
      return [[], []];
    },
  };

  await getAllCategories({}, createResponse());

  assert.match(queries[0], /WHERE c\.is_active = 1/);
  assert.match(queries[1], /WHERE s\.is_active = 1 AND c\.is_active = 1/);
});

test('admin category list includes inactive category records', async () => {
  const queries = [];
  pool = {
    async query(sql) {
      queries.push(sql);
      return [[], []];
    },
  };

  await getAllCategoriesAdmin({}, createResponse());

  assert.doesNotMatch(queries[0], /WHERE c\.is_active = 1/);
  assert.doesNotMatch(queries[1], /WHERE s\.is_active = 1/);
});

test('creates a root category in the categories table', async () => {
  const calls = [];
  pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('INSERT INTO categories')) return [{ insertId: 4 }, []];
      if (sql.startsWith('SELECT * FROM categories')) {
        return [[{ id: 4, name: 'Offerings', slug: 'offerings', is_active: 1 }], []];
      }
      throw new Error(`Unexpected database query: ${sql}`);
    },
  };

  const response = createResponse();
  await createCategory({ body: { name: 'Offerings' } }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.category.slug, 'offerings');
  assert.deepEqual(response.body.category.subcategories, []);
  assert.deepEqual(calls[0].params, ['Offerings', 'offerings', null, null, 'spa']);
});

test('rejects attempts to create a subcategory through the root category endpoint', async () => {
  const response = createResponse();
  await createCategory({
    body: { name: 'Incense', parent_category_id: 4 },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /using the selected category/);
});

test('creates subcategories separately and attaches them to a root category', async () => {
  const calls = [];
  pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id, name, slug, is_active FROM categories')) {
        return [[{ id: 4, name: 'Offerings', slug: 'offerings', is_active: 1 }], []];
      }
      if (sql.startsWith('INSERT INTO subcategories')) return [{ insertId: 9 }, []];
      if (sql.startsWith('SELECT * FROM subcategories')) {
        return [[{ id: 9, category_id: 4, name: 'Incense', slug: 'offerings-incense' }], []];
      }
      throw new Error(`Unexpected database query: ${sql}`);
    },
  };

  const response = createResponse();
  await createSubcategory({ params: { categoryId: '4' }, body: { name: 'Incense' } }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.subcategory.category_id, 4);
  assert.equal(response.body.subcategory.parent_category_name, 'Offerings');
  assert.deepEqual(calls[1].params, [4, 'Incense', 'offerings-incense', null, null, 'spa']);
});

test('rejects subcategories under inactive or missing categories', async () => {
  pool = {
    async query() {
      return [[], []];
    },
  };
  const response = createResponse();

  await createSubcategory({ params: { categoryId: '99' }, body: { name: 'Incense' } }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /Choose an active category/);
});

test('updates and deactivates subcategories using the separate table', async () => {
  const calls = [];
  pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id FROM subcategories')) return [[{ id: 9 }], []];
      if (sql.startsWith('UPDATE subcategories')) return [{ affectedRows: 1 }, []];
      if (sql.startsWith('SELECT * FROM subcategories')) {
        return [[{ id: 9, category_id: 4, name: 'Dhoop', is_active: 0 }], []];
      }
      if (sql.startsWith('SELECT id, name FROM categories')) {
        return [[{ id: 4, name: 'Offerings' }], []];
      }
      throw new Error(`Unexpected database query: ${sql}`);
    },
  };

  const updateResponse = createResponse();
  await updateSubcategory(
    { params: { id: '9' }, body: { name: 'Dhoop', is_active: false } },
    updateResponse
  );
  assert.equal(updateResponse.body.subcategory.parent_category_name, 'Offerings');
  assert.match(calls[1].sql, /UPDATE subcategories SET/);

  const deleteResponse = createResponse();
  await deleteSubcategory({ params: { id: '9' } }, deleteResponse);
  assert.equal(deleteResponse.statusCode, 200);
  assert.match(calls.at(-1).sql, /UPDATE subcategories SET is_active = 0/);
});
