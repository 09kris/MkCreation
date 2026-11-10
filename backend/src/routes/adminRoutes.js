const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminController = require('../controllers/adminController');
const uploadController = require('../controllers/uploadController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image files can be uploaded.'));
      return;
    }
    callback(null, true);
  },
});

// Admin Dashboard stats
router.get('/dashboard', authenticateToken, requireAdmin, adminController.getDashboardStats);
router.post(
  '/upload',
  authenticateToken,
  requireAdmin,
  (req, res, next) => {
    imageUpload.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadController.uploadImage
);

module.exports = router;
