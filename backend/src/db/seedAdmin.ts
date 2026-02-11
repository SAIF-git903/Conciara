/**
 * Seed Admin User
 * Creates an initial admin user for the system
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

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists:', adminEmail);
      console.log('   To create a new admin, use a different email or delete the existing one.');
      return;
    }

    // Create admin user
    console.log('Creating admin user...');
    const admin = await createUser({
      email: adminEmail,
      password: adminPassword,
      fullName: 'System Administrator',
      role: 'admin',
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Credentials:');
    console.log('  Email:', admin.email);
    console.log('  Password:', adminPassword);
    console.log('  Role:', admin.role);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password immediately after first login!');
    console.log('   You can change it via: POST /api/auth/change-password');
    console.log('');
    console.log('To login:');
    console.log('  POST http://localhost:3001/api/auth/login');
    console.log('  Body: { "email": "' + adminEmail + '", "password": "' + adminPassword + '" }');
  } catch (error: any) {
    console.error('❌ Error seeding admin user:', error.message);
    console.error('');
    console.error('Make sure:');
    console.error('  1. Database is running and accessible');
    console.error('  2. Migrations have been run (npm run migrate)');
    console.error('  3. Environment variables are set (optional):');
    console.error('     - ADMIN_EMAIL (default: admin@example.com)');
    console.error('     - ADMIN_PASSWORD (default: admin123)');
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
