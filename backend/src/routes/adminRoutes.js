const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Admin Dashboard stats
router.get('/dashboard', authenticateToken, requireAdmin, adminController.getDashboardStats);

module.exports = router;
