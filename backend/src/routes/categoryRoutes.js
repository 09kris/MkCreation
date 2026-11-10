const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.get('/admin/all', authenticateToken, requireAdmin, categoryController.getAllCategoriesAdmin);
router.get('/subcategories/:id', categoryController.getSubcategoryById);
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, categoryController.createCategory);
router.post('/:categoryId/subcategories', authenticateToken, requireAdmin, categoryController.createSubcategory);
router.put('/subcategories/:id', authenticateToken, requireAdmin, categoryController.updateSubcategory);
router.delete('/subcategories/:id', authenticateToken, requireAdmin, categoryController.deleteSubcategory);
router.put('/:id', authenticateToken, requireAdmin, categoryController.updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, categoryController.deleteCategory);

module.exports = router;
