const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Customer routes (authenticated)
router.post('/', authenticateToken, orderController.createOrder);
router.get('/my-orders', authenticateToken, orderController.getMyOrders);
router.get('/:id', authenticateToken, orderController.getOrderById);

// Admin-only order routes
router.get('/admin/all', authenticateToken, requireAdmin, orderController.getAllOrdersAdmin);
router.put('/admin/:id/status', authenticateToken, requireAdmin, orderController.updateOrderStatusAdmin);

module.exports = router;
