const bcrypt = require('bcryptjs');
const { initDatabase, getPool } = require('../config/db');

async function seedAdmin({
  pool = getPool(),
  name = process.env.ADMIN_NAME,
  email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD,
} = {}) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedName || !normalizedEmail || typeof password !== 'string' || !password) {
    throw new Error(
      'Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env or the process environment to create the admin account.'
    );
  }

  const [existingUsers] = await pool.query(
    'SELECT id, role FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );

  if (existingUsers.length > 0) {
    if (existingUsers[0].role !== 'admin') {
      throw new Error(`The configured admin email "${normalizedEmail}" already belongs to a non-admin account.`);
    }

    console.log(`[Admin seeder] Admin account "${normalizedEmail}" already exists; nothing to do.`);
    return { created: false, id: existingUsers[0].id };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [normalizedName, normalizedEmail, hashedPassword, 'admin']
  );

  console.log(`[Admin seeder] Created admin account "${normalizedEmail}".`);
  return { created: true, id: result.insertId };
}

async function main() {
  await initDatabase();
  try {
    await seedAdmin();
  } finally {
    await getPool().end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Admin seeder] Failed to seed admin account:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { seedAdmin };
