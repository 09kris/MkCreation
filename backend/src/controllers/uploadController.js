const cloudinary = require('cloudinary').v2;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateImageFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    const err = new Error('Please select a valid image file.');
    err.status = 400;
    throw err;
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    const err = new Error('Only JPG, PNG, and WEBP images are allowed.');
    err.status = 400;
    throw err;
  }
  if (file.buffer.length > MAX_IMAGE_SIZE) {
    const err = new Error('Image size must be 5 MB or less.');
    err.status = 400;
    throw err;
  }
}

function createCloudinarySignature(folder, timestamp, apiSecret) {
  return cloudinary.utils.api_sign_request(
    { asset_folder: folder, timestamp },
    apiSecret
  );
}

function assertCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    const err = new Error('Cloudinary is not configured on the server.');
    err.status = 503;
    throw err;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return {
    folder: process.env.CLOUDINARY_FOLDER?.trim() || 'mkcreation',
  };
}

function uploadToCloudinary(file) {
    validateImageFile(file);

    const { folder } = assertCloudinaryConfigured();

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                asset_folder: folder,
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                if (!result?.secure_url) {
                    return reject(
                        new Error('Cloudinary upload failed.')
                    );
                }

                resolve(result.secure_url);
            }
        );

        uploadStream.end(file.buffer);
    });
}

async function uploadFilesToCloudinary(files) {
  const urls = [];
  for (const file of files) {
    urls.push(await uploadToCloudinary(file));
  }
  return urls;
}

function getUploadedFiles(req) {
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  return req.file ? [req.file] : [];
}

async function uploadImages(req, res) {
  const files = getUploadedFiles(req);
  if (!files.length) {
    return res.status(400).json({ success: false, message: 'Please select at least one image to upload.' });
  }

  try {
    const imageUrls = await uploadFilesToCloudinary(files);
    return res.status(201).json({
      success: true,
      message: imageUrls.length === 1 ? 'Image uploaded successfully.' : 'Images uploaded successfully.',
      image_url: imageUrls[0],
      image_urls: imageUrls,
    });
  } catch (err) {
    console.error('[Image upload error]', err.message);
    return res.status(err.status || 502).json({
      success: false,
      message: err.status === 400 || err.status === 503
        ? err.message
        : 'Could not upload the images to Cloudinary.',
    });
  }
}

module.exports = {
  uploadImage: uploadImages,
  uploadImages,
  uploadFilesToCloudinary,
  validateImageFile,
  createCloudinarySignature,
};
