const { getPool } = require('../config/db');

async function getAllProducts(req, res) {
  try {
    const { category_id, search, featured, sort, limit = 100, page = 1 } = req.query;
    const pool = getPool();

    let query = `
      SELECT 
        p.id,
        p.category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        p.name,
        p.description,
        p.price,
        p.discount_price,
        p.stock_quantity,
        p.unit,
        p.image_url,
        p.is_featured,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;

    const params = [];

    // Filter by category
    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    // Filter by search keyword
    if (search && search.trim() !== '') {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Filter by featured
    if (featured === 'true' || featured === '1') {
      query += ' AND p.is_featured = 1';
    }

    // Only active products for general storefront unless requested otherwise
    if (req.query.all !== 'true') {
      query += ' AND p.is_active = 1';
    }

    // Sorting
    if (sort === 'price_asc') {
      query += ' ORDER BY COALESCE(p.discount_price, p.price) ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY COALESCE(p.discount_price, p.price) DESC';
    } else if (sort === 'newest') {
      query += ' ORDER BY p.created_at DESC';
    } else {
      query += ' ORDER BY p.is_featured DESC, p.id DESC';
    }

    // Pagination
    const numLimit = Math.max(1, parseInt(limit, 10));
    const offset = Math.max(0, (parseInt(page, 10) - 1) * numLimit);
    query += ' LIMIT ? OFFSET ?';
    params.push(numLimit, offset);

    const [products] = await pool.query(query, params);

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.error('[Products getAll error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
}

async function getFeaturedProducts(req, res) {
  try {
    const pool = getPool();
    const [products] = await pool.query(`
      SELECT 
        p.*, 
        c.name AS category_name 
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_featured = 1 AND p.is_active = 1
      ORDER BY p.id DESC
      LIMIT 10
    `);

    return res.json({
      success: true,
      products,
    });
  } catch (err) {
    console.error('[Products getFeatured error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch featured products.' });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();

    const [products] = await pool.query(`
      SELECT 
        p.*, 
        c.name AS category_name,
        c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
      LIMIT 1
    `, [id]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({
      success: true,
      product: products[0],
    });
  } catch (err) {
    console.error('[Product getById error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
}

async function createProduct(req, res) {
  try {
    const {
      category_id,
      name,
      description,
      price,
      discount_price,
      stock_quantity,
      unit,
      image_url,
      is_featured,
      is_active,
    } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category_id are required fields.',
      });
    }

    const pool = getPool();
    const [result] = await pool.query(`
      INSERT INTO products (
        category_id, name, description, price, discount_price, stock_quantity, unit, image_url, is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id,
      name.trim(),
      description || null,
      parseFloat(price),
      discount_price ? parseFloat(discount_price) : null,
      parseInt(stock_quantity || 0, 10),
      unit || 'piece',
      image_url || null,
      is_featured ? 1 : 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
    ]);

    const [newProduct] = await pool.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p 
      LEFT JOIN categories c ON c.id = p.category_id 
      WHERE p.id = ?
    `, [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: newProduct[0],
    });
  } catch (err) {
    console.error('[Product create error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product.',
      error: err.message,
    });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      category_id,
      name,
      description,
      price,
      discount_price,
      stock_quantity,
      unit,
      image_url,
      is_featured,
      is_active,
    } = req.body;

    const pool = getPool();

    await pool.query(`
      UPDATE products 
      SET 
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        discount_price = ?,
        stock_quantity = COALESCE(?, stock_quantity),
        unit = COALESCE(?, unit),
        image_url = COALESCE(?, image_url),
        is_featured = COALESCE(?, is_featured),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      category_id || null,
      name ? name.trim() : null,
      description !== undefined ? description : null,
      price !== undefined ? parseFloat(price) : null,
      discount_price !== undefined ? (discount_price ? parseFloat(discount_price) : null) : null,
      stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null,
      unit || null,
      image_url !== undefined ? image_url : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id,
    ]);

    const [updated] = await pool.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p 
      LEFT JOIN categories c ON c.id = p.category_id 
      WHERE p.id = ?
    `, [id]);

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({
      success: true,
      message: 'Product updated successfully.',
      product: updated[0],
    });
  } catch (err) {
    console.error('[Product update error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();

    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (err) {
    console.error('[Product delete error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
}

module.exports = {
  getAllProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
