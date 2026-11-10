const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Customer routes (authenticated)
router.post('/', authenticateToken, orderController.createOrder);
router.get('/my-orders', authenticateToken, orderController.getMyOrders);
router.put('/:id/cancel', authenticateToken, orderController.cancelMyOrder);

// Admin-only order routes (registered before /:id)
router.get('/admin/all', authenticateToken, requireAdmin, orderController.getAllOrdersAdmin);
router.put('/admin/:id/status', authenticateToken, requireAdmin, orderController.updateOrderStatusAdmin);

// Specific order detail route
router.get('/:id', authenticateToken, orderController.getOrderById);

module.exports = router;
