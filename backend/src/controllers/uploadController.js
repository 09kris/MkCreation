const crypto = require('node:crypto');
const https = require('node:https');

function assertCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const err = new Error('Cloudinary is not configured on the server.');
    err.status = 503;
    throw err;
  }
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'mkcreation',
  };
}

function uploadToCloudinary(file) {
  const { cloudName, apiKey, apiSecret, folder } = assertCloudinaryConfigured();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureBase = `asset_folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
  const boundary = `----MkCreation${crypto.randomBytes(16).toString('hex')}`;

  const fields = { api_key: apiKey, asset_folder: folder, timestamp, signature };
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }

  const safeFilename = file.originalname.replace(/["\r\n]/g, '');
  parts.push(
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeFilename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`),
    file.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  );
  const body = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'api.cloudinary.com',
        path: `/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          let result;
          try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
          catch { return reject(new Error('Cloudinary returned an invalid response.')); }

          if (res.statusCode < 200 || res.statusCode >= 300 || !result.secure_url) {
            return reject(new Error(result.error?.message || 'Cloudinary could not store this image.'));
          }
          resolve(result.secure_url);
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Cloudinary upload timed out.')));
    req.on('error', reject);
    req.end(body);
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
      message: err.status === 503 ? err.message : 'Could not upload the images to Cloudinary.',
    });
  }
}

module.exports = { uploadImage: uploadImages, uploadImages, uploadFilesToCloudinary };
