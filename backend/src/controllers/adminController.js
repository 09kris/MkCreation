const { getPool } = require('../config/db');

async function getDashboardStats(req, res) {
  try {
    const pool = getPool();

    // 1. Overall Metrics
    const [salesResult] = await pool.query(`
      SELECT 
        COALESCE(SUM(final_amount), 0) AS total_revenue,
        COUNT(id) AS total_orders
      FROM orders
      WHERE order_status != 'cancelled'
    `);

    const [customerResult] = await pool.query(`
      SELECT COUNT(id) AS total_customers FROM users WHERE role = 'customer'
    `);

    const [productResult] = await pool.query(`
      SELECT 
        COUNT(id) AS total_products,
        SUM(CASE WHEN stock_quantity <= 10 THEN 1 ELSE 0 END) AS low_stock_count
      FROM products
      WHERE is_active = 1
    `);

    // 2. Status Breakdown
    const [statusBreakdown] = await pool.query(`
      SELECT order_status, COUNT(id) AS count
      FROM orders
      GROUP BY order_status
    `);

    // 3. Low stock alerts (top 6)
    const [lowStockProducts] = await pool.query(`
      SELECT id, name, price, stock_quantity, unit, image_url
      FROM products
      WHERE stock_quantity <= 10 AND is_active = 1
      ORDER BY stock_quantity ASC
      LIMIT 6
    `);

    // 4. Recent Orders (top 5)
    const [recentOrders] = await pool.query(`
      SELECT o.id, o.order_number, o.final_amount, o.order_status, o.payment_method, o.created_at, u.name AS customer_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      stats: {
        total_revenue: parseFloat(salesResult[0].total_revenue) || 0,
        total_orders: salesResult[0].total_orders || 0,
        total_customers: customerResult[0].total_customers || 0,
        total_products: productResult[0].total_products || 0,
        low_stock_count: productResult[0].low_stock_count || 0,
        status_breakdown: statusBreakdown,
        low_stock_products: lowStockProducts,
        recent_orders: recentOrders,
      },
    });
  } catch (err) {
    console.error('[Admin getDashboardStats error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin dashboard metrics.' });
  }
}

module.exports = {
  getDashboardStats,
};
