const { getPool } = require('../config/db');

async function createOrder(req, res) {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const {
      items,
      shipping_name,
      shipping_phone,
      shipping_address,
      shipping_city,
      shipping_state,
      shipping_pincode,
      payment_method = 'Cash on Delivery',
      notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty. Please add items to place an order.' });
    }

    if (!shipping_name || !shipping_phone || !shipping_address || !shipping_city || !shipping_pincode) {
      return res.status(400).json({ success: false, message: 'Please provide full shipping details.' });
    }

    await conn.beginTransaction();

    let totalAmount = 0;
    const orderItemsToInsert = [];

    // Verify each item and check stock
    for (const item of items) {
      const [productRows] = await conn.query(
        'SELECT id, name, price, discount_price, stock_quantity, image_url, is_active FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (productRows.length === 0 || productRows[0].is_active === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Product ID #${item.product_id} is no longer available.`,
        });
      }

      const product = productRows[0];
      const qty = parseInt(item.quantity, 10) || 1;

      if (product.stock_quantity < qty) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}`,
        });
      }

      const effectivePrice = product.discount_price !== null && product.discount_price < product.price
        ? parseFloat(product.discount_price)
        : parseFloat(product.price);

      const itemTotal = effectivePrice * qty;
      totalAmount += itemTotal;

      orderItemsToInsert.push({
        product_id: product.id,
        product_name: product.name,
        price: effectivePrice,
        quantity: qty,
        total_price: itemTotal,
        image_url: product.image_url,
      });

      // Decrement stock
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, product.id]);
    }

    const deliveryFee = totalAmount >= 499 ? 0 : 50; // Free delivery over ₹499
    const discountAmount = 0;
    const finalAmount = totalAmount + deliveryFee - discountAmount;
    const orderNumber = 'POOJA-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);

    const [orderResult] = await conn.query(`
      INSERT INTO orders (
        order_number, user_id, total_amount, discount_amount, delivery_fee, final_amount,
        payment_method, payment_status, order_status, shipping_name, shipping_phone,
        shipping_address, shipping_city, shipping_state, shipping_pincode, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderNumber,
      req.user.id,
      totalAmount,
      discountAmount,
      deliveryFee,
      finalAmount,
      payment_method,
      'pending',
      'pending',
      shipping_name.trim(),
      shipping_phone.trim(),
      shipping_address.trim(),
      shipping_city.trim(),
      shipping_state ? shipping_state.trim() : '',
      shipping_pincode.trim(),
      notes || null,
    ]);

    const orderId = orderResult.insertId;

    for (const oi of orderItemsToInsert) {
      await conn.query(`
        INSERT INTO order_items (
          order_id, product_id, product_name, price, quantity, total_price, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [orderId, oi.product_id, oi.product_name, oi.price, oi.quantity, oi.total_price, oi.image_url]);
    }

    await conn.commit();
    const [createdOrders] = await conn.query(
      'SELECT * FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );
    const [createdItems] = await conn.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    return res.status(201).json({
      success: true,
      message: 'Auspicious pooja order placed successfully!',
      order: { ...createdOrders[0], items: createdItems },
    });
  } catch (err) {
    await conn.rollback();
    console.error('[Order create error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to place order. Please try again.',
      error: err.message,
    });
  } finally {
    conn.release();
  }
}

async function getMyOrders(req, res) {
  try {
    const pool = getPool();

    const [orders] = await pool.query(`
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS total_items
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    // Attach items to each order
    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    return res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error('[Orders getMyOrders error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer orders.' });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const pool = getPool();

    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? OR order_number = ? LIMIT 1', [id, id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];

    // Authorization check: User can only view their own orders unless they are admin
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this order.' });
    }

    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = items;

    return res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error('[Order getById error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
}

async function getAllOrdersAdmin(req, res) {
  try {
    const { status, limit = 100, page = 1 } = req.query;
    const pool = getPool();

    let query = `
      SELECT 
        o.*,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS total_items
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'all') {
      query += ' AND o.order_status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const numLimit = Math.max(1, parseInt(limit, 10));
    const offset = Math.max(0, (parseInt(page, 10) - 1) * numLimit);
    query += ' LIMIT ? OFFSET ?';
    params.push(numLimit, offset);

    const [orders] = await pool.query(query, params);

    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    return res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error('[Admin getAllOrders error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin orders.' });
  }
}

async function updateOrderStatusAdmin(req, res) {
  try {
    const { id } = req.params;
    const { order_status, payment_status } = req.body;
    const pool = getPool();

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (order_status && !validStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed: ${validStatuses.join(', ')}`,
      });
    }

    await pool.query(`
      UPDATE orders 
      SET 
        order_status = COALESCE(?, order_status),
        payment_status = COALESCE(?, payment_status)
      WHERE id = ?
    `, [order_status || null, payment_status || null, id]);

    const [updated] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({
      success: true,
      message: 'Order status updated successfully.',
      order: updated[0],
    });
  } catch (err) {
    console.error('[Admin updateOrderStatus error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
};
