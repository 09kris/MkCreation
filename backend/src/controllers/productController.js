const { getPool } = require('../config/db');

function parseImageUrls(value, fallback) {
  let urls = value;
  if (typeof urls === 'string') {
    try {
      urls = JSON.parse(urls);
    } catch {
      urls = [];
    }
  }

  if (!Array.isArray(urls)) {
    urls = fallback ? [fallback] : [];
  }

  return urls
    .filter((url) => typeof url === 'string')
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function withProductImages(product) {
  const imageUrls = parseImageUrls(product.image_urls, product.image_url);
  return {
    ...product,
    image_urls: imageUrls,
    image_url: product.image_url || imageUrls[0] || null,
  };
}

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
        p.image_urls,
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
      params.push(parseInt(category_id, 10));
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

    const productsWithImages = products.map(withProductImages);
    return res.json({
      success: true,
      count: productsWithImages.length,
      products: productsWithImages,
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
      products: products.map(withProductImages),
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
      product: withProductImages(products[0]),
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
      image_urls,
      is_featured,
      is_active,
    } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category_id are required fields.',
      });
    }
    if (image_urls !== undefined && !Array.isArray(image_urls)) {
      return res.status(400).json({ success: false, message: 'image_urls must be an array of image URLs.' });
    }
    if (Array.isArray(image_urls) && image_urls.some((url) => typeof url !== 'string')) {
      return res.status(400).json({ success: false, message: 'Each image URL must be a string.' });
    }
    if (Array.isArray(image_urls) && image_urls.length > 10) {
      return res.status(400).json({ success: false, message: 'A product can have up to 10 images.' });
    }

    const pool = getPool();
    const normalizedImageUrls = parseImageUrls(
      image_urls,
      typeof image_url === 'string' ? image_url : null
    );
    const primaryImageUrl = normalizedImageUrls[0] || image_url || null;
    const [result] = await pool.query(`
      INSERT INTO products (
        category_id, name, description, price, discount_price, stock_quantity, unit, image_url, image_urls, is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id,
      name.trim(),
      description || null,
      parseFloat(price),
      discount_price ? parseFloat(discount_price) : null,
      parseInt(stock_quantity || 0, 10),
      unit || 'piece',
      primaryImageUrl,
      JSON.stringify(normalizedImageUrls),
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
      product: withProductImages(newProduct[0]),
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
      image_urls,
      is_featured,
      is_active,
    } = req.body;

    if (image_urls !== undefined && !Array.isArray(image_urls)) {
      return res.status(400).json({ success: false, message: 'image_urls must be an array of image URLs.' });
    }
    if (Array.isArray(image_urls) && image_urls.some((url) => typeof url !== 'string')) {
      return res.status(400).json({ success: false, message: 'Each image URL must be a string.' });
    }
    if (Array.isArray(image_urls) && image_urls.length > 10) {
      return res.status(400).json({ success: false, message: 'A product can have up to 10 images.' });
    }

    const pool = getPool();

    const shouldUpdateDiscount = discount_price !== undefined;
    const parsedDiscount = shouldUpdateDiscount && discount_price !== null && discount_price !== ''
      ? parseFloat(discount_price)
      : null;
    const shouldUpdateImages = image_urls !== undefined || image_url !== undefined;
    const normalizedImageUrls = image_urls !== undefined
      ? parseImageUrls(image_urls)
      : parseImageUrls(image_url ? [image_url] : []);
    const primaryImageUrl = normalizedImageUrls[0] || null;

    await pool.query(`
      UPDATE products 
      SET 
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        discount_price = CASE WHEN ? THEN ? ELSE discount_price END,
        stock_quantity = COALESCE(?, stock_quantity),
        unit = COALESCE(?, unit),
        image_url = CASE WHEN ? THEN ? ELSE image_url END,
        image_urls = CASE WHEN ? THEN ? ELSE image_urls END,
        is_featured = COALESCE(?, is_featured),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      category_id || null,
      name ? name.trim() : null,
      description !== undefined ? description : null,
      price !== undefined ? parseFloat(price) : null,
      shouldUpdateDiscount,
      parsedDiscount,
      stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null,
      unit || null,
      shouldUpdateImages,
      primaryImageUrl,
      shouldUpdateImages,
      JSON.stringify(normalizedImageUrls),
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
      product: withProductImages(updated[0]),
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
