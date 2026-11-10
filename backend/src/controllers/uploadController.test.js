
require('dotenv').config();

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim()
});

async function testCloudinary() {
    console.log('Cloud Name:', cloudinary.config().cloud_name);
    console.log('API Key:', cloudinary.config().api_key?.slice(0, 4) + '****');
    console.log('Secret Present:', !!cloudinary.config().api_secret);
    console.log('Secret Length:', cloudinary.config().api_secret?.length);

    try {
        const result = await cloudinary.api.ping();

        console.log('\nSUCCESS: Cloudinary authentication works!');
        console.log(result);

    } catch (error) {
        console.error('\nCLOUDINARY AUTHENTICATION ERROR');
        console.error('Raw error:', error);
        console.error('Message:', error?.message);
        console.error('HTTP Code:', error?.http_code);
        console.error('Details:', JSON.stringify(
            error,
            Object.getOwnPropertyNames(error || {}),
            2
        ));
    }
}

testCloudinary();
