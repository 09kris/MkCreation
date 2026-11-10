const crypto = require('node:crypto');
const https = require('node:https');

function uploadToCloudinary(file) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const assetFolder = process.env.CLOUDINARY_FOLDER || 'mkcreation';

  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Cloudinary is not configured on the server.');
    error.status = 503;
    throw error;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureBase = `asset_folder=${assetFolder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
  const boundary = `----MkCreation${crypto.randomBytes(16).toString('hex')}`;
  const fields = {
    api_key: apiKey,
    asset_folder: assetFolder,
    timestamp,
    signature,
  };
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
    );
  }

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.originalname.replace(/["\r\n]/g, '')}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`
    ),
    file.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  );
  const body = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const request = https.request(
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
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          let result;
          try {
            result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            reject(new Error('Cloudinary returned an invalid response.'));
            return;
          }

          if (response.statusCode < 200 || response.statusCode >= 300 || !result.secure_url) {
            reject(new Error(result.error?.message || 'Cloudinary could not store this image.'));
            return;
          }

          resolve(result.secure_url);
        });
      }
    );

    request.on('timeout', () => request.destroy(new Error('Cloudinary upload timed out.')));
    request.on('error', reject);
    request.end(body);
  });
}

async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please select an image to upload.' });
  }

  try {
    const imageUrl = await uploadToCloudinary(req.file);
    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      image_url: imageUrl,
    });
  } catch (err) {
    console.error('[Image upload error]', err.message);
    return res.status(err.status || 502).json({
      success: false,
      message: err.status === 503 ? err.message : 'Could not upload the image to Cloudinary.',
    });
  }
}

module.exports = { uploadImage };
