import { pool } from './db/connection.js';

async function testDb() {
  try {
    console.log('Testing database connection...\n');
    
    // Test 1: Count skins
    const skinCount = await pool.query('SELECT COUNT(*) as count FROM skins');
    console.log(`✅ Skins in database: ${skinCount.rows[0].count}`);
    
    // Test 2: List all skins
    const skins = await pool.query('SELECT id, name, website_id, is_active FROM skins ORDER BY id');
    console.log(`\n📋 All skins:`);
    if (skins.rows.length === 0) {
      console.log('  ❌ No skins found! Run: npm run seed');
    } else {
      skins.rows.forEach(s => {
        console.log(`  ID: ${s.id}, Name: ${s.name}, Website: ${s.website_id}, Active: ${s.is_active}`);
      });
    }
    
    // Test 3: Check if website 1 exists
    const website = await pool.query('SELECT id, name, domain FROM websites WHERE id = 1');
    if (website.rows.length > 0) {
      console.log(`\n✅ Website ID 1: ${website.rows[0].name} (${website.rows[0].domain})`);
    } else {
      console.log(`\n❌ Website ID 1 not found`);
    }
    
  } catch (error: any) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

testDb();

