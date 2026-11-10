const { getPool } = require('../config/db');

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function validateName(name) {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 100;
}

function buildSubcategory(parent, subcategory) {
  return {
    ...subcategory,
    parent_category_id: parent.id,
    parent_category_name: parent.name,
  };
}

async function getAllCategories(req, res, { includeInactive = false } = {}) {
  try {
    const pool = getPool();
    const activeFilter = includeInactive ? '' : 'WHERE c.is_active = 1';
    const subcategoryFilter = includeInactive ? '' : 'WHERE s.is_active = 1 AND c.is_active = 1';
    const [categories] = await pool.query(`
      SELECT c.id, c.name, c.slug, c.description, c.image_url, c.icon_name,
        c.is_active, c.created_at,
        COUNT(DISTINCT CASE
          WHEN p.subcategory_id IS NULL OR subcategory.is_active = 1 THEN p.id
        END) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      LEFT JOIN subcategories subcategory ON subcategory.id = p.subcategory_id
      ${activeFilter}
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    const [subcategories] = await pool.query(`
      SELECT s.id, s.category_id, s.name, s.slug, s.description, s.image_url,
        s.icon_name, s.is_active, s.created_at, COUNT(DISTINCT p.id) AS product_count
      FROM subcategories s
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN products p ON p.subcategory_id = s.id AND p.is_active = 1
      ${subcategoryFilter}
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    const subcategoriesByCategory = new Map(categories.map((category) => [Number(category.id), []]));
    for (const subcategory of subcategories) {
      const children = subcategoriesByCategory.get(Number(subcategory.category_id));
      if (children) {
        children.push(buildSubcategory(
          categories.find((category) => Number(category.id) === Number(subcategory.category_id)),
          subcategory
        ));
      }
    }

    return res.json({
      success: true,
      categories: categories.map((category) => ({
        ...category,
        subcategories: subcategoriesByCategory.get(Number(category.id)) || [],
      })),
    });
  } catch (err) {
    console.error('[Categories getAll error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
}

async function getAllCategoriesAdmin(req, res) {
  return getAllCategories(req, res, { includeInactive: true });
}

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE (id = ? OR slug = ?) AND is_active = 1 LIMIT 1',
      [/^\d+$/.test(id) ? Number(id) : -1, id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    const [subcategories] = await pool.query(
      'SELECT * FROM subcategories WHERE category_id = ? AND is_active = 1 ORDER BY name ASC',
      [rows[0].id]
    );
    return res.json({
      success: true,
      category: { ...rows[0], subcategories: subcategories.map((item) => buildSubcategory(rows[0], item)) },
    });
  } catch (err) {
    console.error('[Category getById error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch category.' });
  }
}

async function getSubcategoryById(req, res) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT s.*, c.name AS parent_category_name
      FROM subcategories s
      JOIN categories c ON c.id = s.category_id
      WHERE s.id = ? AND s.is_active = 1 AND c.is_active = 1
      LIMIT 1
    `, [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Subcategory not found.' });
    }
    return res.json({ success: true, subcategory: rows[0] });
  } catch (err) {
    console.error('[Subcategory getById error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch subcategory.' });
  }
}

async function createCategory(req, res) {
  try {
    const { name, description, image_url, icon_name } = req.body;
    if (!validateName(name)) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required and must be 100 characters or fewer.',
      });
    }
    if (req.body.parent_category_id != null && req.body.parent_category_id !== '') {
      return res.status(400).json({
        success: false,
        message: 'Create a subcategory using the selected category instead.',
      });
    }

    const slug = typeof req.body.slug === 'string' && req.body.slug.trim()
      ? req.body.slug.trim()
      : slugify(name.trim());
    if (!slug || slug.length > 120) {
      return res.status(400).json({ success: false, message: 'Category slug must be between 1 and 120 characters.' });
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO categories (name, slug, description, image_url, icon_name)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), slug, description || null, image_url || null, icon_name || 'spa']
    );
    const [created] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: { ...created[0], subcategories: [] },
    });
  } catch (err) {
    console.error('[Category create error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
}

async function createSubcategory(req, res) {
  try {
    const { name, description, image_url, icon_name } = req.body;
    if (!validateName(name)) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name is required and must be 100 characters or fewer.',
      });
    }

    const pool = getPool();
    const [categories] = await pool.query(
      'SELECT id, name, slug, is_active FROM categories WHERE id = ?',
      [req.params.categoryId]
    );
    if (!categories.length || Number(categories[0].is_active) !== 1) {
      return res.status(400).json({ success: false, message: 'Choose an active category for this subcategory.' });
    }
    const slug = typeof req.body.slug === 'string' && req.body.slug.trim()
      ? req.body.slug.trim()
      : `${categories[0].slug}-${slugify(name.trim())}`;
    if (!slug || slug.length > 120) {
      return res.status(400).json({ success: false, message: 'Subcategory slug must be between 1 and 120 characters.' });
    }

    const [result] = await pool.query(
      `INSERT INTO subcategories (category_id, name, slug, description, image_url, icon_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [categories[0].id, name.trim(), slug, description || null, image_url || null, icon_name || 'spa']
    );
    const [created] = await pool.query('SELECT * FROM subcategories WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: 'Subcategory created successfully.',
      subcategory: buildSubcategory(categories[0], created[0]),
    });
  } catch (err) {
    console.error('[Subcategory create error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create subcategory.' });
  }
}

async function updateRecord(req, res, table, recordName) {
  try {
    const { id } = req.params;
    const { name, slug, description, image_url, icon_name, is_active } = req.body;
    if (name !== undefined && !validateName(String(name))) {
      return res.status(400).json({ success: false, message: `${recordName} name must be between 1 and 100 characters.` });
    }
    if (slug !== undefined && (!String(slug).trim() || String(slug).trim().length > 120)) {
      return res.status(400).json({ success: false, message: `${recordName} slug must be between 1 and 120 characters.` });
    }

    const pool = getPool();
    const [existing] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: `${recordName} not found.` });
    }
    const updates = [];
    const values = [];
    for (const [field, value] of Object.entries({
      name: name === undefined ? undefined : String(name).trim(),
      slug: slug === undefined ? undefined : String(slug).trim(),
      description,
      image_url,
      icon_name,
      is_active,
    })) {
      if (value !== undefined) {
        updates.push(`${field} = ?`);
        values.push(value);
      }
    }
    if (updates.length) {
      await pool.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, [...values, id]);
    }
    const [updated] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);

    if (table === 'subcategories') {
      const [parents] = await pool.query('SELECT id, name FROM categories WHERE id = ?', [updated[0].category_id]);
      return res.json({ success: true, message: 'Subcategory updated successfully.', subcategory: buildSubcategory(parents[0], updated[0]) });
    }
    return res.json({ success: true, message: 'Category updated successfully.', category: { ...updated[0], subcategories: [] } });
  } catch (err) {
    console.error(`[${recordName} update error]`, err);
    return res.status(500).json({ success: false, message: `Failed to update ${recordName.toLowerCase()}.` });
  }
}

async function updateCategory(req, res) {
  return updateRecord(req, res, 'categories', 'Category');
}

async function updateSubcategory(req, res) {
  return updateRecord(req, res, 'subcategories', 'Subcategory');
}

async function deactivateRecord(req, res, table, recordName) {
  try {
    const pool = getPool();
    const [records] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [req.params.id]);
    if (!records.length) {
      return res.status(404).json({ success: false, message: `${recordName} not found.` });
    }
    await pool.query(`UPDATE ${table} SET is_active = 0 WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, message: `${recordName} deactivated successfully.` });
  } catch (err) {
    console.error(`[${recordName} delete error]`, err);
    return res.status(500).json({ success: false, message: `Failed to deactivate ${recordName.toLowerCase()}.` });
  }
}

async function deleteCategory(req, res) {
  return deactivateRecord(req, res, 'categories', 'Category');
}

async function deleteSubcategory(req, res) {
  return deactivateRecord(req, res, 'subcategories', 'Subcategory');
}

module.exports = {
  getAllCategories,
  getAllCategoriesAdmin,
  getCategoryById,
  getSubcategoryById,
  createCategory,
  createSubcategory,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubcategory,
};
