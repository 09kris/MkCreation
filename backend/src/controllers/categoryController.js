const { getPool } = require('../config/db');

async function getAllCategories(req, res) {
  try {
    const pool = getPool();
    const [categories] = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.description, 
        c.image_url, 
        c.icon_name, 
        c.is_active, 
        c.created_at,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
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

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ? OR slug = ? LIMIT 1', [id, id]);

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
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const pool = getPool();

    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, description, image_url, icon_name) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), slug, description || null, image_url || null, icon_name || 'spa']
    );

    const [newCat] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);

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
    const pool = getPool();

    await pool.query(
      `UPDATE categories 
       SET name = COALESCE(?, name),
           slug = COALESCE(?, slug),
           description = COALESCE(?, description),
           image_url = COALESCE(?, image_url),
           icon_name = COALESCE(?, icon_name),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        slug ? slug.trim() : null,
        description !== undefined ? description : null,
        image_url !== undefined ? image_url : null,
        icon_name !== undefined ? icon_name : null,
        is_active !== undefined ? is_active : null,
        id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
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

    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('[Category delete error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
