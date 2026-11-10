const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadImages } = require('../controllers/uploadController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

function parseImages(req, res, next) {
  upload.array('images', 10)(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next();
  });
}

router.post('/', authenticateToken, requireAdmin, parseImages, uploadImages);

module.exports = router;
