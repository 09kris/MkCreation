const { getPool } = require('../config/db');

function parseParentCategoryId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parentId = Number(value);
  return Number.isSafeInteger(parentId) && parentId > 0 ? parentId : undefined;
}

async function validateParentCategory(pool, parentId, currentId = null) {
  if (parentId === null) return null;
  if (parentId === undefined || parentId === currentId) {
    return { status: 400, message: 'Choose a valid parent category.' };
  }

  const [parents] = await pool.query(
    'SELECT id, name, slug, parent_category_id, is_active FROM categories WHERE id = ?',
    [parentId]
  );
  if (!parents.length) {
    return { status: 400, message: 'The selected parent category does not exist.' };
  }
  if (Number(parents[0].is_active) !== 1) {
    return { status: 400, message: 'The selected parent category is inactive.' };
  }
  if (parents[0].parent_category_id !== null) {
    return { status: 400, message: 'Subcategories cannot have another parent category.' };
  }
  if (currentId !== null) {
    const [children] = await pool.query(
      'SELECT id FROM categories WHERE parent_category_id = ? LIMIT 1',
      [currentId]
    );
    if (children.length) {
      return { status: 409, message: 'A category with subcategories cannot become a subcategory.' };
    }
  }
  return null;
}

async function getAllCategories(req, res, { includeInactive = false } = {}) {
  try {
    const pool = getPool();
    const [categories] = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.parent_category_id,
        parent.name AS parent_category_name,
        c.description, 
        c.image_url, 
        c.icon_name, 
        c.is_active, 
        c.created_at,
        COUNT(DISTINCT p.id) + COUNT(DISTINCT child_product.id) AS product_count
      FROM categories c
      LEFT JOIN categories parent ON parent.id = c.parent_category_id
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      LEFT JOIN categories child ON child.parent_category_id = c.id AND child.is_active = 1
      LEFT JOIN products child_product
        ON child_product.category_id = child.id AND child_product.is_active = 1
      ${includeInactive
        ? ''
        : 'WHERE c.is_active = 1 AND (parent.id IS NULL OR parent.is_active = 1)'}
      GROUP BY c.id, parent.name
      ORDER BY c.name ASC
    `);

    return res.json({
      success: true,
      categories,
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
    const isNumericId = /^\d+$/.test(id);
    const [rows] = isNumericId
      ? await pool.query(`
          SELECT c.*, parent.name AS parent_category_name
          FROM categories c
          LEFT JOIN categories parent ON parent.id = c.parent_category_id
          WHERE (c.id = ? OR c.slug = ?)
            AND c.is_active = 1 AND (parent.id IS NULL OR parent.is_active = 1)
          LIMIT 1
        `, [parseInt(id, 10), id])
      : await pool.query(`
          SELECT c.*, parent.name AS parent_category_name
          FROM categories c
          LEFT JOIN categories parent ON parent.id = c.parent_category_id
          WHERE c.slug = ? AND c.is_active = 1
            AND (parent.id IS NULL OR parent.is_active = 1)
          LIMIT 1
        `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, category: rows[0] });
  } catch (err) {
    console.error('[Category getById error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch category.' });
  }
}

async function createCategory(req, res) {
  try {
    const { name, description, image_url, icon_name } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required and must be 100 characters or fewer.',
      });
    }

    const pool = getPool();
    const parentCategoryId = parseParentCategoryId(req.body.parent_category_id);
    const parentError = await validateParentCategory(pool, parentCategoryId);
    if (parentError) {
      return res.status(parentError.status).json({ success: false, message: parentError.message });
    }
    const [parents] = parentCategoryId === null
      ? [[]]
      : await pool.query('SELECT slug FROM categories WHERE id = ?', [parentCategoryId]);
    const categorySlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = typeof req.body.slug === 'string' && req.body.slug.trim()
      ? req.body.slug.trim()
      : [parents[0]?.slug, categorySlug].filter(Boolean).join('-');
    if (!slug || slug.length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Category slug must be between 1 and 120 characters.',
      });
    }

    const [result] = await pool.query(
      `INSERT INTO categories
        (name, slug, parent_category_id, description, image_url, icon_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), slug, parentCategoryId, description || null, image_url || null, icon_name || 'spa']
    );

    const [newCat] = await pool.query(`
      SELECT c.*, parent.name AS parent_category_name
      FROM categories c
      LEFT JOIN categories parent ON parent.id = c.parent_category_id
      WHERE c.id = ?
    `, [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: newCat[0],
    });
  } catch (err) {
    console.error('[Category create error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create category.', error: err.message });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, slug, description, image_url, icon_name, is_active } = req.body;
    if (name !== undefined && (!String(name).trim() || String(name).trim().length > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be between 1 and 100 characters.',
      });
    }
    if (slug !== undefined && (!String(slug).trim() || String(slug).trim().length > 120)) {
      return res.status(400).json({
        success: false,
        message: 'Category slug must be between 1 and 120 characters.',
      });
    }

    const pool = getPool();
    const [existing] = await pool.query(
      'SELECT id, parent_category_id FROM categories WHERE id = ?',
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const updates = [];
    const values = [];
    if (Object.hasOwn(req.body, 'parent_category_id')) {
      const parentCategoryId = parseParentCategoryId(req.body.parent_category_id);
      const existingParentId = existing[0].parent_category_id == null
        ? null
        : Number(existing[0].parent_category_id);
      if (parentCategoryId !== existingParentId) {
        const parentError = await validateParentCategory(pool, parentCategoryId, Number(id));
        if (parentError) {
          return res.status(parentError.status).json({ success: false, message: parentError.message });
        }
        const [children] = await pool.query(
          'SELECT id FROM categories WHERE parent_category_id = ? LIMIT 1',
          [id]
        );
        if (children.length && parentCategoryId !== null) {
          return res.status(409).json({
            success: false,
            message: 'A category with subcategories cannot become a subcategory.',
          });
        }
      }
      updates.push('parent_category_id = ?');
      values.push(parentCategoryId);
    }
    const fields = {
      name: name === undefined ? undefined : String(name).trim(),
      slug: slug === undefined ? undefined : String(slug).trim(),
      description,
      image_url,
      icon_name,
      is_active,
    };

    for (const [field, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${field} = ?`);
        values.push(value);
      }
    }

    if (updates.length) {
      await pool.query(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        [...values, id]
      );
    }

    const [updated] = await pool.query(`
    SELECT c.*, parent.name AS parent_category_name
    FROM categories c
    LEFT JOIN categories parent ON parent.id = c.parent_category_id
    WHERE c.id = ?
    `, [id]);
    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      category: updated[0],
    });
  } catch (err) {
    console.error('[Category update error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [categories] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await pool.query('UPDATE categories SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Category deactivated successfully.' });
  } catch (err) {
    console.error('[Category delete error]', err);
    return res.status(500).json({ success: false, message: 'Failed to deactivate category.' });
  }
}

module.exports = {
  getAllCategories,
  getAllCategoriesAdmin,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
