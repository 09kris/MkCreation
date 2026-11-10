const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createCloudinarySignature,
  uploadImage,
} = require('./uploadController');

test('generates Cloudinary signatures using the SDK', () => {
  assert.equal(
    createCloudinarySignature('mkcreation', 1234567890, 'test-secret'),
    '8c4572b695e5bd4611c369cdab3e6eae2e8bc36f'
  );
});

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('requires a selected image before uploading', async () => {
  const response = createResponse();
  await uploadImage({}, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
});

test('reports missing Cloudinary configuration without attempting an upload', async () => {
  const names = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  const previousValues = new Map(
    names.map((name) => [name, process.env[name]])
  );
  names.forEach((name) => delete process.env[name]);

  try {
    const response = createResponse();
    await uploadImage(
      { file: { originalname: 'product.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('image') } },
      response
    );

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /Cloudinary is not configured/);
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
});

test('accepts multiple selected images from the images multipart field', async () => {
  const names = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  const previousValues = new Map(
    names.map((name) => [name, process.env[name]])
  );
  names.forEach((name) => delete process.env[name]);

  try {
    const response = createResponse();
    await uploadImage({
      files: {
        images: [
          { originalname: 'product-1.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('image-1') },
          { originalname: 'product-2.png', mimetype: 'image/png', buffer: Buffer.from('image-2') },
        ],
      },
    }, response);

    assert.equal(response.statusCode, 503);
    assert.match(response.body.message, /Cloudinary is not configured/);
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
});

test('rejects unsupported image types before attempting Cloudinary upload', async () => {
  const response = createResponse();
  await uploadImage({
    file: {
      originalname: 'product.gif',
      mimetype: 'image/gif',
      buffer: Buffer.from('image'),
    },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /Only JPG, PNG, and WEBP/);
});

test('rejects images larger than 5 MB before attempting Cloudinary upload', async () => {
  const response = createResponse();
  await uploadImage({
    file: {
      originalname: 'product.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /5 MB or less/);
});
