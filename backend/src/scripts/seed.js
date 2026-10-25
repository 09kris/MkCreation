const bcrypt = require('bcryptjs');
const { getPool, initDatabase } = require('../config/db');

async function seedData() {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    console.log('[Seed] Checking existing data...');

    // 1. Seed Users
    const [existingUsers] = await conn.query('SELECT COUNT(*) as count FROM users');
    let adminId = null;
    let customerId = null;

    if (existingUsers[0].count === 0) {
      console.log('[Seed] Seeding users...');
      const adminPassword = await bcrypt.hash('admin123', 10);
      const customerPassword = await bcrypt.hash('user123', 10);

      const [adminResult] = await conn.query(
        `INSERT INTO users (name, email, password, phone, role, address) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Pooja Store Admin', 'admin@poojapa.com', adminPassword, '+91 98765 43210', 'admin', 'Shop #12, Mandir Marg, Varanasi, UP']
      );
      adminId = adminResult.insertId;

      const [customerResult] = await conn.query(
        `INSERT INTO users (name, email, password, phone, role, address) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Ramesh Sharma', 'customer@poojapa.com', customerPassword, '+91 91234 56789', 'customer', 'B-402, Shiv Dham Society, Jaipur, Rajasthan']
      );
      customerId = customerResult.insertId;
      console.log('[Seed] Created default Admin (admin@poojapa.com / admin123) and Customer (customer@poojapa.com / user123).');
    } else {
      const [adminRow] = await conn.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
      if (adminRow.length > 0) adminId = adminRow[0].id;
      const [custRow] = await conn.query('SELECT id FROM users WHERE role = "customer" LIMIT 1');
      if (custRow.length > 0) customerId = custRow[0].id;
    }

    // 2. Seed Categories
    const [existingCategories] = await conn.query('SELECT COUNT(*) as count FROM categories');
    if (existingCategories[0].count === 0) {
      console.log('[Seed] Seeding categories...');
      const categories = [
        {
          name: 'Agarbatti & Dhoop',
          slug: 'agarbatti-dhoop',
          description: 'Aromatic incense sticks, pure Guggal, Loban cups, and organic Chandan dhoop.',
          image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
          icon_name: 'spa',
        },
        {
          name: 'Brass & Copper Utensils',
          slug: 'brass-copper-utensils',
          description: 'Handcrafted Akhand Diya, Aarti Thali, Panchapatra, Kalash, and Temple bells.',
          image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=600&q=80',
          icon_name: 'local_fire_department',
        },
        {
          name: 'Hawan & Camphor (Kapur)',
          slug: 'hawan-camphor',
          description: '100% Pure Bhimseni Kapur, Dry Mango Wood, Cow Ghee, and Vedic Hawan Samagri.',
          image_url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=600&q=80',
          icon_name: 'whatshot',
        },
        {
          name: 'Sacred Idols & Murtis',
          slug: 'sacred-idols',
          description: 'Vastu & Mandir brass idols of Lord Ganesha, Lakshmi, Shiva Parivar, and Laddu Gopal.',
          image_url: 'https://images.unsplash.com/photo-1567591974584-f1832d949213?auto=format&fit=crop&w=600&q=80',
          icon_name: 'brightness_7',
        },
        {
          name: 'Pooja Essentials & Roli',
          slug: 'pooja-essentials',
          description: 'Original Ashtagandha Chandan, Sindoor, Pure Ganga Jal, Janeu, and Sacred Kalawa/Mauli.',
          image_url: 'https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=600&q=80',
          icon_name: 'favorite',
        },
        {
          name: 'Jap Malas & Sacred Beads',
          slug: 'jap-malas',
          description: 'Original 108 Beads Rudraksha Mala, Holy Tulsi Mala, and Kamal Gatta Mala with Jap bag.',
          image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
          icon_name: 'all_inclusive',
        },
        {
          name: 'Complete Pooja Kits',
          slug: 'pooja-kits',
          description: 'Convenient curated kits for Daily Nitya Pooja, Navratri, Diwali, and Griha Pravesh.',
          image_url: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=600&q=80',
          icon_name: 'card_giftcard',
        },
      ];

      for (const cat of categories) {
        await conn.query(
          `INSERT INTO categories (name, slug, description, image_url, icon_name) VALUES (?, ?, ?, ?, ?)`,
          [cat.name, cat.slug, cat.description, cat.image_url, cat.icon_name]
        );
      }
      console.log(`[Seed] Seeded ${categories.length} categories.`);
    }

    // 3. Seed Products
    const [existingProducts] = await conn.query('SELECT COUNT(*) as count FROM products');
    if (existingProducts[0].count === 0) {
      console.log('[Seed] Seeding authentic pooja products...');
      const [catRows] = await conn.query('SELECT id, slug FROM categories');
      const catMap = {};
      catRows.forEach(c => { catMap[c.slug] = c.id; });

      const products = [
        // Category 1: Agarbatti & Dhoop
        {
          category_slug: 'agarbatti-dhoop',
          name: 'Pure Mysore Sandalwood Agarbatti (Chandan)',
          description: 'Traditional charcoal-free natural incense sticks made with pure Mysore sandalwood oil. Burns cleanly for 50 minutes leaving an auspicious, calming fragrance.',
          price: 180.00,
          discount_price: 149.00,
          stock_quantity: 120,
          unit: 'Pack of 150 sticks',
          image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
        {
          category_slug: 'agarbatti-dhoop',
          name: 'Organic Guggal & Loban Sambrani Cups',
          description: '100% natural herbal sambrani dhoop cups loaded with pure Guggal, Cow Dung, and Loban for energizing Mandir aura and removing negative energies.',
          price: 240.00,
          discount_price: 199.00,
          stock_quantity: 85,
          unit: 'Box of 24 cups',
          image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
        {
          category_slug: 'agarbatti-dhoop',
          name: 'Kewda & Mogra Flora Incense Sticks',
          description: 'Delicate floral hand-rolled incense sticks made from fresh forest Mogra and Kewda extracts. Perfect for daily evening prayers and meditation.',
          price: 120.00,
          discount_price: 99.00,
          stock_quantity: 60,
          unit: 'Pack of 100 sticks',
          image_url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80',
          is_featured: 0,
        },

        // Category 2: Brass & Copper Utensils
        {
          category_slug: 'brass-copper-utensils',
          name: 'Handcrafted Brass Akhand Jyoti Diya with Glass Chimney',
          description: 'Heavy virgin brass continuous burning Akhand Deep with heat-resistant Borosilicate glass chimney. Ensures constant uninterrupted flame for days during Navratri & Diwali.',
          price: 899.00,
          discount_price: 699.00,
          stock_quantity: 45,
          unit: 'Medium (6.5 inches)',
          image_url: 'https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
        {
          category_slug: 'brass-copper-utensils',
          name: 'Complete Brass Aarti Thali Set (7 Pieces)',
          description: 'Gracefully engraved brass Pooja Thali containing Diya, Agarbatti stand, Kumkum cup, Pancha patra spoon, Bell with Nandi, and Camphor burner.',
          price: 1250.00,
          discount_price: 999.00,
          stock_quantity: 30,
          unit: 'Complete Set',
          image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
        {
          category_slug: 'brass-copper-utensils',
          name: 'Pure Copper Kalash (Lota) with Nariyal Stand',
          description: 'Seamless solid copper Kalash recommended by Vedic scriptures for Sthapana, Gangajal storage, and Surya Arghya offerings.',
          price: 450.00,
          discount_price: 360.00,
          stock_quantity: 50,
          unit: 'Capacity 750 ml',
          image_url: 'https://images.unsplash.com/photo-1615486511484-92e172cc4fe0?auto=format&fit=crop&w=600&q=80',
          is_featured: 0,
        },

        // Category 3: Hawan & Camphor
        {
          category_slug: 'hawan-camphor',
          name: 'Pure Bhimseni Camphor (Kapur) Tablets',
          description: '100% natural, edible grade crystalline Bhimseni Kapur without wax or chemicals. Leaves zero residue and produces an uplifting divine fragrance.',
          price: 350.00,
          discount_price: 280.00,
          stock_quantity: 110,
          unit: 'Jar of 200 grams',
          image_url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
        {
          category_slug: 'hawan-camphor',
          name: 'Vedic Hawan Samagri (51 Sacred Herbs)',
          description: 'Master blend of 51 Ayurvedic and Vedic herbs including Jatamansi, Nagarmotha, Guggal, Black Til, Kamal Gatta, and Sandalwood powder for Yajna.',
          price: 299.00,
          discount_price: 249.00,
          stock_quantity: 75,
          unit: '1 Kg Airtight Bag',
          image_url: 'https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=600&q=80',
          is_featured: 0,
        },
        {
          category_slug: 'hawan-camphor',
          name: 'Dry Mango Wood Sticks for Hawan (Aam ki Lakdi)',
          description: 'Clean cut, sun-dried natural mango tree wood logs suited for ceremonial sacrificial fire rituals and home purification yagnas.',
          price: 150.00,
          discount_price: 120.00,
          stock_quantity: 40,
          unit: '1 Kg Bundle',
          image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
          is_featured: 0,
        },

        // Category 4: Sacred Idols
        {
          category_slug: 'sacred-idols',
          name: 'Brass Lord Ganesha Idol (Blessing Mudra)',
          description: 'Solid brass intricately detailed Ganesh Ji with Modak and Mushak. Highly auspicious for temple altar, study desk, or housewarming gift.',
          price: 1499.00,
          discount_price: 1199.00,
          stock_quantity: 25,
          unit: 'Height: 5 Inches',
          image_url: 'https://images.unsplash.com/photo-1567591974584-f1832d949213?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
        {
          category_slug: 'sacred-idols',
          name: 'Pure Brass Laddu Gopal Ji (Bal Gopal) with Mukut & Flute',
          description: 'Charming brass Bal Gopal idol for daily sewa and shringar. Includes brass flute and royal peacock feather embellishment.',
          price: 799.00,
          discount_price: 649.00,
          stock_quantity: 20,
          unit: 'Size No. 2 (3 Inches)',
          image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
          is_featured: 0,
        },

        // Category 5: Pooja Essentials & Roli
        {
          category_slug: 'pooja-essentials',
          name: 'Original Ashtagandha Chandan & Kesar Tika Paste',
          description: 'Vedic formulation made from 8 fragrant divine herbs including saffron, chandan, and camphor. Provides cool calm focus when applied on forehead.',
          price: 160.00,
          discount_price: 130.00,
          stock_quantity: 90,
          unit: 'Bottle 100g',
          image_url: 'https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=600&q=80',
          is_featured: 0,
        },
        {
          category_slug: 'pooja-essentials',
          name: 'Organic Roli Kumkum & Sacred Red Mauli Rakshasutra',
          description: 'Natural turmeric processed red Roli powder paired with 100% pure cotton Mauli Kalawa sacred thread for tying on wrists.',
          price: 90.00,
          discount_price: 75.00,
          stock_quantity: 150,
          unit: 'Combo Pack',
          image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=600&q=80',
          is_featured: 0,
        },

        // Category 6: Jap Malas
        {
          category_slug: 'jap-malas',
          name: 'Original 5 Mukhi Rudraksha Jap Mala (108+1 Beads)',
          description: 'Certified natural five-faced Rudraksha prayer rosary with knotted cotton thread. Energized for Shiva mantra chanting, health, and peace of mind.',
          price: 499.00,
          discount_price: 399.00,
          stock_quantity: 65,
          unit: '108 Beads with Gomukhi Bag',
          image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },

        // Category 7: Complete Pooja Kits
        {
          category_slug: 'pooja-kits',
          name: 'Daily Nitya Pooja Samagri Kit (30 Essential Items)',
          description: 'Everything required for your everyday prayer ritual in one sacred box: Diya wicks, Roli, Akshat, Chandan, Dhoop, Kapur, Ganga Jal, Itra, Mauli, and Brass Bell.',
          price: 999.00,
          discount_price: 799.00,
          stock_quantity: 35,
          unit: 'All-In-One Box',
          image_url: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
        {
          category_slug: 'pooja-kits',
          name: 'Festive Laxmi-Ganesh Deepawali Maha Pooja Kit',
          description: 'Grand festive box with 45+ authentic items: Brass Diya set, Laxmi Yantra, Silver plated coins, Panchamrit essentials, Kamal Gatta, Supari, and Vastra.',
          price: 1899.00,
          discount_price: 1499.00,
          stock_quantity: 25,
          unit: 'Deluxe Gift Box',
          image_url: 'https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?auto=format&fit=crop&w=600&q=80',
          is_featured: 1,
        },
      ];

      for (const p of products) {
        const catId = catMap[p.category_slug];
        if (!catId) continue;
        await conn.query(
          `INSERT INTO products (category_id, name, description, price, discount_price, stock_quantity, unit, image_url, is_featured, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [catId, p.name, p.description, p.price, p.discount_price, p.stock_quantity, p.unit, p.image_url, p.is_featured, 1]
        );
      }
      console.log(`[Seed] Seeded ${products.length} products.`);
    }

    // 4. Seed Sample Orders if empty
    const [existingOrders] = await conn.query('SELECT COUNT(*) as count FROM orders');
    if (existingOrders[0].count === 0 && customerId) {
      console.log('[Seed] Seeding sample orders for customer & admin analytics...');

      const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const [orderRes] = await conn.query(
        `INSERT INTO orders (order_number, user_id, total_amount, discount_amount, delivery_fee, final_amount, payment_method, payment_status, order_status, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state, shipping_pincode, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          customerId,
          1048.00,
          100.00,
          0.00,
          948.00,
          'UPI / QR Code',
          'paid',
          'processing',
          'Ramesh Sharma',
          '+91 91234 56789',
          'B-402, Shiv Dham Society, Tonk Road',
          'Jaipur',
          'Rajasthan',
          '302015',
          'Please pack delicate brass items carefully with bubble wrap.',
        ]
      );

      const orderId = orderRes.insertId;
      const [prodSample] = await conn.query('SELECT id, name, price, image_url FROM products LIMIT 2');
      for (const p of prodSample) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, total_price, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, p.id, p.name, p.price, 1, p.price, p.image_url]
        );
      }
      console.log(`[Seed] Sample order #${orderNumber} created.`);
    }

    console.log('[Seed] Database initialization and seeding completed successfully!');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
  } finally {
    conn.release();
  }
}

// Standalone execution support
if (require.main === module) {
  (async () => {
    try {
      await initDatabase();
      await seedData();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}

module.exports = { seedData };
