const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool = null;

function toPostgresQuery(sql) {
  let parameterIndex = 0;
  let query = sql.replace(/\?/g, () => `$${++parameterIndex}`);

  if (/^\s*INSERT\s+INTO\b/i.test(query) && !/\bRETURNING\b/i.test(query)) {
    query = query.replace(/;\s*$/, '') + ' RETURNING id';
  }

  return query;
}

async function queryPostgres(client, sql, params = []) {
  const result = await client.query(toPostgresQuery(sql), params);

  if (/^\s*INSERT\s+INTO\b/i.test(sql)) {
    return [{
      insertId: result.rows[0] && result.rows[0].id,
      affectedRows: result.rowCount,
    }, []];
  }

  if (/^\s*(UPDATE|DELETE)\b/i.test(sql)) {
    return [{ affectedRows: result.rowCount }, []];
  }

  return [result.rows, []];
}

function wrapPostgresClient(client) {
  return {
    query: (sql, params) => queryPostgres(client, sql, params),
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release(),
  };
}

function createPostgresAdapter(pgPool) {
  return {
    query: (sql, params) => queryPostgres(pgPool, sql, params),
    getConnection: async () => wrapPostgresClient(await pgPool.connect()),
    end: () => pgPool.end(),
  };
}

async function createSupabaseTables(pgPool) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
      address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(120) NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      icon_name VARCHAR(50) DEFAULT 'local_fire_department',
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      discount_price DECIMAL(10, 2),
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'piece',
      image_url TEXT,
      is_featured SMALLINT NOT NULL DEFAULT 0,
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS addresses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      street_address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      postal_code VARCHAR(20) NOT NULL,
      is_default SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_amount DECIMAL(10, 2) NOT NULL,
      discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      final_amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
      payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
      order_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
      shipping_name VARCHAR(100) NOT NULL,
      shipping_phone VARCHAR(20) NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city VARCHAR(100) NOT NULL,
      shipping_state VARCHAR(100) NOT NULL,
      shipping_pincode VARCHAR(20) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(200) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id)',
    'CREATE INDEX IF NOT EXISTS products_active_featured_idx ON products(is_active, is_featured)',
    'CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON orders(user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id)',
  ];

  for (const statement of statements) {
    await pgPool.query(statement);
  }
}

async function initSupabaseDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required when DB_TYPE=supabase.');
  }

  const pgPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 10000,
  });

  try {
    await pgPool.query('SELECT 1');
    await createSupabaseTables(pgPool);
    pool = createPostgresAdapter(pgPool);
    console.log('[DB] Supabase PostgreSQL connection established; tables verified.');
    return pool;
  } catch (err) {
    await pgPool.end();
    throw err;
  }
}

async function initMySqlDatabase() {
  const rootConn = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    port: dbConfig.port,
  });

  const dbName = process.env.DB_NAME || 'poojapa_db';
  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await rootConn.end();
  console.log(`[DB] Database "${dbName}" verified / created.`);

  pool = mysql.createPool({
    ...dbConfig,
    database: dbName,
  });

  const testConn = await pool.getConnection();
  console.log('[DB] MySQL connection pool successfully established.');
  testConn.release();
  await createMySqlTables();
  return pool;
}

async function createMySqlTables() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(160) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NULL,
        role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
        address TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(120) NOT NULL UNIQUE,
        description TEXT NULL,
        image_url TEXT NULL,
        icon_name VARCHAR(50) DEFAULT 'local_fire_department',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10, 2) NOT NULL,
        discount_price DECIMAL(10, 2) NULL,
        stock_quantity INT NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'piece',
        image_url TEXT NULL,
        is_featured TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        street_address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        is_default TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0.00,
        delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
        final_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
        payment_status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
        order_status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
        shipping_name VARCHAR(100) NOT NULL,
        shipping_phone VARCHAR(20) NOT NULL,
        shipping_address TEXT NOT NULL,
        shipping_city VARCHAR(100) NOT NULL,
        shipping_state VARCHAR(100) NOT NULL,
        shipping_pincode VARCHAR(20) NOT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NULL,
        product_name VARCHAR(200) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        image_url TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    console.log('[DB] All database tables verified / created.');
  } finally {
    conn.release();
  }
}

async function initDatabase() {
  const provider = (process.env.DB_TYPE || 'mysql').toLowerCase();
  if (provider === 'supabase') {
    return initSupabaseDatabase();
  }
  if (provider === 'mysql') {
    return initMySqlDatabase();
  }
  throw new Error(`Unsupported DB_TYPE "${provider}". Use "supabase" or "mysql".`);
}

function getPool() {
  if (!pool) {
    throw new Error('Database connection pool is not yet active. Initialize the configured database before handling requests.');
  }
  return pool;
}

module.exports = {
  initDatabase,
  getPool,
  createPostgresAdapter,
  toPostgresQuery,
};
