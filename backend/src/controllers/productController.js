const { getPool } = require('../config/db');
const { uploadFilesToCloudinary } = require('./uploadController');

function parseImageUrls(value, fallback) {
  let urls = value;
  if (typeof urls === 'string') {
    try { urls = JSON.parse(urls); } catch { urls = []; }
  }
  if (!Array.isArray(urls)) urls = fallback ? [fallback] : [];
  return urls.filter((u) => typeof u === 'string').map((u) => u.trim()).filter(Boolean).slice(0, 10);
}

function withProductImages(product) {
  const imageUrls = parseImageUrls(product.image_urls, product.image_url);
  return { ...product, image_urls: imageUrls, image_url: product.image_url || imageUrls[0] || null };
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 1 || ['true', '1', 'on'].includes(String(value).toLowerCase());
}

async function categoryIsActive(pool, categoryId, subcategoryId = null) {
  const [categories] = await pool.query(`
    SELECT id
    FROM categories
    WHERE id = ? AND is_active = 1
  `, [categoryId]);
  if (!categories.length) return false;
  if (subcategoryId == null) return true;

  const [subcategories] = await pool.query(`
    SELECT id
    FROM subcategories
    WHERE id = ? AND category_id = ? AND is_active = 1
  `, [subcategoryId, categoryId]);
  return subcategories.length > 0;
}

async function resolveImageUrls(req, existingUrls = []) {
  const uploadedFiles = Array.isArray(req.files) && req.files.length ? req.files : req.file ? [req.file] : [];
  const bodyUrls = parseImageUrls(req.body.image_urls, req.body.image_url);

  let cloudinaryUrls = [];
  if (uploadedFiles.length) {
    cloudinaryUrls = await uploadFilesToCloudinary(uploadedFiles);
  }

  const merged = [...new Set([...cloudinaryUrls, ...bodyUrls])].slice(0, 10);
  return merged.length ? merged : existingUrls;
}

async function getAllProducts(req, res) {
  try {
    const { category_id, subcategory_id, search, featured, sort, limit = 100, page = 1 } = req.query;
    const pool = getPool();

    let query = `
      SELECT p.id, p.category_id, p.subcategory_id,
        CASE WHEN s.id IS NULL THEN c.name
          ELSE CONCAT(c.name, ' / ', s.name) END AS category_name,
        c.name AS category_root_name, s.name AS subcategory_name,
        c.slug AS category_slug,
        p.name, p.description, p.price, p.discount_price, p.stock_quantity, p.unit,
        p.image_url, p.image_urls, p.is_featured, p.is_active, p.created_at, p.updated_at
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories s ON s.id = p.subcategory_id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(parseInt(category_id, 10));
    }
    if (subcategory_id) {
      query += ' AND p.subcategory_id = ?';
      params.push(parseInt(subcategory_id, 10));
    }
    if (search?.trim()) { query += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search.trim()}%`, `%${search.trim()}%`); }
    if (featured === 'true' || featured === '1') query += ' AND p.is_featured = 1';
    if (req.query.all !== 'true') {
      query += ' AND p.is_active = 1 AND c.is_active = 1 AND (s.id IS NULL OR s.is_active = 1)';
    }

    if (sort === 'price_asc') query += ' ORDER BY COALESCE(p.discount_price, p.price) ASC';
    else if (sort === 'price_desc') query += ' ORDER BY COALESCE(p.discount_price, p.price) DESC';
    else if (sort === 'newest') query += ' ORDER BY p.created_at DESC';
    else query += ' ORDER BY p.is_featured DESC, p.id DESC';

    const numLimit = Math.max(1, parseInt(limit, 10));
    const offset = Math.max(0, (parseInt(page, 10) - 1) * numLimit);
    query += ' LIMIT ? OFFSET ?';
    params.push(numLimit, offset);

    const [products] = await pool.query(query, params);
    return res.json({ success: true, count: products.length, products: products.map(withProductImages) });
  } catch (err) {
    console.error('[Products getAll error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
}

async function getFeaturedProducts(req, res) {
  try {
    const pool = getPool();
    const [products] = await pool.query(`
      SELECT p.*,
        CASE WHEN s.id IS NULL THEN c.name
          ELSE CONCAT(c.name, ' / ', s.name) END AS category_name,
        c.name AS category_root_name, s.name AS subcategory_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories s ON s.id = p.subcategory_id
      WHERE p.is_featured = 1 AND p.is_active = 1 AND c.is_active = 1
        AND (s.id IS NULL OR s.is_active = 1)
      ORDER BY p.id DESC LIMIT 10
    `);
    return res.json({ success: true, products: products.map(withProductImages) });
  } catch (err) {
    console.error('[Products getFeatured error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch featured products.' });
  }
}

async function getProductById(req, res) {
  try {
    const pool = getPool();
    const [products] = await pool.query(`
      SELECT p.*,
        CASE WHEN s.id IS NULL THEN c.name
          ELSE CONCAT(c.name, ' / ', s.name) END AS category_name,
        c.name AS category_root_name, s.name AS subcategory_name,
        c.slug AS category_slug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories s ON s.id = p.subcategory_id
      WHERE p.id = ? AND p.is_active = 1 AND c.is_active = 1
        AND (s.id IS NULL OR s.is_active = 1)
      LIMIT 1
    `, [req.params.id]);

    if (!products.length) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product: withProductImages(products[0]) });
  } catch (err) {
    console.error('[Product getById error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
}

async function createProduct(req, res) {
  try {
    const { category_id, subcategory_id, name, description, price, discount_price, stock_quantity, unit, is_featured, is_active } = req.body;
    const productName = typeof name === 'string' ? name.trim() : '';
    const categoryId = Number(category_id);
    const subcategoryId = subcategory_id == null || subcategory_id === '' ? null : Number(subcategory_id);
    const productPrice = Number(price);
    const discountPrice = discount_price === undefined || discount_price === null || discount_price === ''
      ? null
      : Number(discount_price);
    const stockQuantity = stock_quantity === undefined || stock_quantity === '' ? 0 : Number(stock_quantity);
    const productUnit = typeof unit === 'string' && unit.trim() ? unit.trim() : 'piece';

    if (!productName || productName.length > 200 ||
      !Number.isInteger(categoryId) || categoryId < 1 ||
      (subcategoryId !== null && (!Number.isInteger(subcategoryId) || subcategoryId < 1)) ||
      !Number.isFinite(productPrice) || productPrice <= 0 || productPrice > 99999999.99 ||
      (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice < 0 || discountPrice >= productPrice)) ||
      !Number.isSafeInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 2147483647 ||
      productUnit.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Enter a product name, valid category, positive price, valid sale price, and non-negative stock quantity.',
      });
    }

    const pool = getPool();
    if (!await categoryIsActive(pool, categoryId, subcategoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Choose an active category and a subcategory that belongs to it.',
      });
    }

    const imageUrls = await resolveImageUrls(req);
    const primaryImageUrl = imageUrls[0] || null;
    const [result] = await pool.query(`
      INSERT INTO products (category_id, subcategory_id, name, description, price, discount_price, stock_quantity, unit, image_url, image_urls, is_featured, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      categoryId,
      subcategoryId,
      productName,
      typeof description === 'string' && description.trim() ? description.trim() : null,
      productPrice,
      discountPrice,
      stockQuantity,
      productUnit,
      primaryImageUrl,
      JSON.stringify(imageUrls),
      parseBoolean(is_featured) ? 1 : 0,
      parseBoolean(is_active, true) ? 1 : 0,
    ]);

    const [newProduct] = await pool.query(`
      SELECT p.*,
        CASE WHEN s.id IS NULL THEN c.name
          ELSE CONCAT(c.name, ' / ', s.name) END AS category_name,
        c.name AS category_root_name, s.name AS subcategory_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories s ON s.id = p.subcategory_id
      WHERE p.id = ?
    `, [result.insertId]);

    return res.status(201).json({ success: true, message: 'Product created successfully.', product: withProductImages(newProduct[0]) });
  } catch (err) {
    console.error('[Product create error]', err);
    const status = err.status || 500;
    const message = status === 400 || status === 503 ? err.message : 'Failed to create product.';
    return res.status(status).json({ success: false, message });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      category_id,
      subcategory_id,
      name,
      description,
      price,
      discount_price,
      stock_quantity,
      unit,
      is_featured,
      is_active,
    } = req.body;

    const pool = getPool();
    const [existing] = await pool.query(
      'SELECT category_id, subcategory_id, image_url, image_urls FROM products WHERE id = ?',
      [id]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Product not found.' });
    const categoryChanged = category_id !== undefined && category_id !== null;
    const subcategoryChanged = Object.hasOwn(req.body, 'subcategory_id');
    const nextCategoryId = categoryChanged
      ? Number(category_id)
      : Number(existing[0].category_id);
    const nextSubcategoryId = subcategoryChanged
      ? subcategory_id == null || subcategory_id === '' ? null : Number(subcategory_id)
      : categoryChanged ? null : existing[0].subcategory_id;
    if ((categoryChanged || subcategoryChanged) &&
        (!Number.isInteger(nextCategoryId) || nextCategoryId < 1 ||
          (nextSubcategoryId !== null &&
            (!Number.isInteger(Number(nextSubcategoryId)) ||
              Number(nextSubcategoryId) < 1)) ||
          !await categoryIsActive(pool, nextCategoryId, nextSubcategoryId))) {
      return res.status(400).json({
        success: false,
        message: 'Choose an active category and a subcategory that belongs to it.',
      });
    }

    const hasNewImages = (Array.isArray(req.files) && req.files.length) || req.file || req.body.image_urls || req.body.image_url;
    const existingUrls = parseImageUrls(existing[0].image_urls, existing[0].image_url);
    const imageUrls = hasNewImages ? await resolveImageUrls(req, existingUrls) : existingUrls;
    const primaryImageUrl = imageUrls[0] || null;

    const shouldUpdateDiscount = discount_price !== undefined;
    const parsedDiscount = shouldUpdateDiscount && discount_price !== null && discount_price !== '' ? parseFloat(discount_price) : null;

    await pool.query(`
      UPDATE products SET
        category_id    = COALESCE(?, category_id),
        subcategory_id = CASE WHEN ? THEN ? ELSE subcategory_id END,
        name           = COALESCE(?, name),
        description    = COALESCE(?, description),
        price          = COALESCE(?, price),
        discount_price = CASE WHEN ? THEN ? ELSE discount_price END,
        stock_quantity = COALESCE(?, stock_quantity),
        unit           = COALESCE(?, unit),
        image_url      = ?,
        image_urls     = ?,
        is_featured    = COALESCE(?, is_featured),
        is_active      = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      categoryChanged ? nextCategoryId : null,
      categoryChanged || subcategoryChanged,
      nextSubcategoryId,
      name ? name.trim() : null,
      description !== undefined ? description : null,
      price !== undefined ? parseFloat(price) : null,
      shouldUpdateDiscount, parsedDiscount,
      stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null,
      unit || null,
      primaryImageUrl,
      JSON.stringify(imageUrls),
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id,
    ]);

    const [updated] = await pool.query(`
      SELECT p.*,
        CASE WHEN s.id IS NULL THEN c.name
          ELSE CONCAT(c.name, ' / ', s.name) END AS category_name,
        c.name AS category_root_name, s.name AS subcategory_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN subcategories s ON s.id = p.subcategory_id
      WHERE p.id = ?
    `, [id]);

    return res.json({ success: true, message: 'Product updated successfully.', product: withProductImages(updated[0]) });
  } catch (err) {
    console.error('[Product update error]', err);
    const status = err.status || 500;
    const message = status === 400 || status === 503 ? err.message : 'Failed to update product.';
    return res.status(status).json({ success: false, message });
  }
}

async function deleteProduct(req, res) {
  try {
    const pool = getPool();
    const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Product deactivated successfully.' });
  } catch (err) {
    console.error('[Product delete error]', err);
    return res.status(500).json({ success: false, message: 'Failed to deactivate product.' });
  }
}

module.exports = { getAllProducts, getFeaturedProducts, getProductById, createProduct, updateProduct, deleteProduct };
