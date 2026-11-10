const assert = require('node:assert/strict');
const test = require('node:test');
const { uploadImage } = require('./uploadController');

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
