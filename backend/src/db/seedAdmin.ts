/**
 * Seed initial owner user
 *
 * Usage: npm run seed-admin
 * Or: tsx src/db/seedAdmin.ts
 */

import dotenv from 'dotenv';
import { createUser } from '../services/userService.js';
import { pool } from '../db/connection.js';

dotenv.config();

async function seedAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length > 0) {
      console.log('⚠️  Owner user already exists:', adminEmail);
      return;
    }

    console.log('Creating initial owner user (no workspace; create via onboarding)...');
    const user = await createUser({
      email: adminEmail,
      password: adminPassword,
      fullName: 'System Owner',
      role: 'owner',
    });

    console.log('✅ Owner user created successfully!');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  POST http://localhost:3001/api/auth/login');
    console.log('  Body: { "email": "' + adminEmail + '", "password": "' + adminPassword + '" }');
  } catch (error: any) {
    console.error('❌ Error seeding owner user:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('seedAdmin.ts')) {
  seedAdmin()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedAdmin };
