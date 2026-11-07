const { initDatabase, getPool } = require('../config/db');

const initialCategories = [
  {
    name: 'Agarbatti & Dhoop',
    slug: 'agarbatti-and-dhoop',
    description: 'Natural herbal incense sticks, dhoop sticks, and organic sambrani cups.',
    icon_name: 'local_fire_department',
    image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Diyas & Deepam',
    slug: 'diyas-and-deepam',
    description: 'Handcrafted brass akhand diyas, traditional kuber deepam, and festival lamps.',
    icon_name: 'brightness_7',
    image_url: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Pure Bhimseni Kapoor',
    slug: 'pure-bhimseni-kapoor',
    description: '100% pure medicinal grade camphor flakes and aromatic mangal kapur.',
    icon_name: 'spa',
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Hawan & Yagya Samagri',
    slug: 'hawan-and-yagya-samagri',
    description: 'Auspicious hawan herbs, pure desi cow ghee, dried wood, and sacred navgraha samidha.',
    icon_name: 'whatshot',
    image_url: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Pooja Thali & Brass Ware',
    slug: 'pooja-thali-and-brass-ware',
    description: 'Engraved brass pooja thali sets, panchamrit bowls, ghanti, and shankh.',
    icon_name: 'all_inclusive',
    image_url: 'https://images.unsplash.com/photo-1610484826967-09c5720778c7?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Divine Idols & Murti',
    slug: 'divine-idols-and-murti',
    description: 'Blessed brass and marble dust idols of Lord Ganesha, Lakshmi, and Shiva.',
    icon_name: 'temple',
    image_url: 'https://images.unsplash.com/photo-1582260655291-a169b56f8f55?w=500&auto=format&fit=crop&q=60',
  },
];

const initialProducts = [
  {
    category_slug: 'agarbatti-and-dhoop',
    name: 'Natural Chandan Agarbatti (Pack of 3)',
    description: 'Soothing organic sandalwood fragrance rolled on bamboo sticks. Clean burning and non-toxic.',
    price: 249.00,
    discount_price: 189.00,
    stock_quantity: 45,
    unit: 'Pack of 3 (150 sticks)',
    image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=60',
    is_featured: 1,
  },
  {
    category_slug: 'agarbatti-and-dhoop',
    name: 'Premium Guggal & Loban Sambrani Cups',
    description: 'Ready-to-use charcoal cups infused with pure guggal resin and loban for deep cleansing prayers.',
    price: 320.00,
    discount_price: 260.00,
    stock_quantity: 30,
    unit: 'Box of 12 Cups',
    image_url: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=500&auto=format&fit=crop&q=60',
    is_featured: 1,
  },
  {
    category_slug: 'diyas-and-deepam',
    name: 'Brass Akhand Diya with Borosilicate Glass Chimney',
    description: 'Traditional solid brass oil lamp with heat-resistant protective glass. Burns uninterrupted for 24+ hours.',
    price: 699.00,
    discount_price: 499.00,
    stock_quantity: 25,
    unit: '1 Brass Lamp Unit',
    image_url: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=500&auto=format&fit=crop&q=60',
    is_featured: 1,
  },
  {
    category_slug: 'diyas-and-deepam',
    name: 'Pure Brass Kuber Deepam Pair',
    description: 'Sacred twin kuber lamps for attracting wealth and prosperity during morning and evening sandhya pooja.',
    price: 399.00,
    discount_price: 299.00,
    stock_quantity: 50,
    unit: 'Set of 2 Diyas',
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60',
    is_featured: 0,
  },
  {
    category_slug: 'pure-bhimseni-kapoor',
    name: 'Pure Bhimseni Camphor Crystals (200g)',
    description: '100% natural, unadulterated edible grade bhimseni kapoor with divine soothing aroma. Leaves zero residue.',
    price: 350.00,
    discount_price: 279.00,
    stock_quantity: 60,
    unit: 'Airtight Jar 200g',
    image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop&q=60',
    is_featured: 1,
  },
  {
    category_slug: 'hawan-and-yagya-samagri',
    name: 'Vedic 108 Herb Hawan Samagri Pouch (500g)',
    description: 'Authentic blend of 108 rare ayurvedic herbs, dry roots, seeds, and flowers for homam, grah shanti, and daily hawan.',
    price: 299.00,
    discount_price: 220.00,
    stock_quantity: 40,
    unit: '500g Pouch',
    image_url: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=500&auto=format&fit=crop&q=60',
    is_featured: 0,
  },
  {
    category_slug: 'pooja-thali-and-brass-ware',
    name: 'Carved Brass Pooja Thali Set (7 Pieces)',
    description: 'Includes 9-inch etched thali, bell (ghanti), incense stand, diya, chandan katori, and kalash spoon.',
    price: 1299.00,
    discount_price: 999.00,
    stock_quantity: 15,
    unit: '7-Piece Brass Set',
    image_url: 'https://images.unsplash.com/photo-1610484826967-09c5720778c7?w=500&auto=format&fit=crop&q=60',
    is_featured: 1,
  },
  {
    category_slug: 'divine-idols-and-murti',
    name: 'Brass Lord Ganesha Idol (Vighnaharta)',
    description: 'Intricately handcrafted solid brass Ganpati Bappa murti for your home temple, office desk, or gifting.',
    price: 899.00,
    discount_price: 749.00,
    stock_quantity: 18,
    unit: 'Height 4.5 inches',
    image_url: 'https://images.unsplash.com/photo-1582260655291-a169b56f8f55?w=500&auto=format&fit=crop&q=60',
    is_featured: 1,
  },
];

async function seedCatalog() {
  await initDatabase();
  const pool = getPool();

  console.log('[Catalog Seeder] Seeding categories...');
  const categoryIdMap = {};

  for (const cat of initialCategories) {
    const [existing] = await pool.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [cat.slug]);
    if (existing.length > 0) {
      categoryIdMap[cat.slug] = existing[0].id;
      console.log(`[Category] "${cat.name}" already exists.`);
    } else {
      const [res] = await pool.query(
        'INSERT INTO categories (name, slug, description, image_url, icon_name, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [cat.name, cat.slug, cat.description, cat.image_url, cat.icon_name]
      );
      categoryIdMap[cat.slug] = res.insertId;
      console.log(`[Category] Created "${cat.name}" (ID: ${res.insertId}).`);
    }
  }

  console.log('[Catalog Seeder] Seeding products...');
  for (const prod of initialProducts) {
    const categoryId = categoryIdMap[prod.category_slug];
    if (!categoryId) continue;

    const [existing] = await pool.query('SELECT id FROM products WHERE name = ? LIMIT 1', [prod.name]);
    if (existing.length > 0) {
      console.log(`[Product] "${prod.name}" already exists.`);
    } else {
      const [res] = await pool.query(`
        INSERT INTO products (
          category_id, name, description, price, discount_price, stock_quantity, unit, image_url, is_featured, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        categoryId,
        prod.name,
        prod.description,
        prod.price,
        prod.discount_price,
        prod.stock_quantity,
        prod.unit,
        prod.image_url,
        prod.is_featured,
      ]);
      console.log(`[Product] Created "${prod.name}" (ID: ${res.insertId}).`);
    }
  }

  console.log('[Catalog Seeder] Catalog seeding complete.');
  await pool.end();
}

seedCatalog().catch((err) => {
  console.error('[Catalog Seeder] Failed:', err);
  process.exit(1);
});

