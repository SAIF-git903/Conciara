import { pool } from './connection.js';
import { getOrCreateUserProfile } from '../services/userMemoryService.js';

async function testProfileCreation() {
  try {
    console.log('🧪 Testing user profile creation...\n');

    // 1. Check if table exists
    console.log('1. Checking if user_profiles table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ user_profiles table does not exist!');
      console.log('   Run: npm run migrate');
      process.exit(1);
    }
    console.log('✅ user_profiles table exists\n');

    // 2. Check table structure
    console.log('2. Checking table structure...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `);
    console.log('   Columns:', columns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    console.log('');

    // 3. Check existing profiles
    console.log('3. Checking existing profiles...');
    const existing = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', ['testing']);
    if (existing.rows.length > 0) {
      console.log('   Found existing profile:', existing.rows[0]);
      console.log('   Deleting for fresh test...');
      await pool.query('DELETE FROM user_profiles WHERE user_id = $1', ['testing']);
    } else {
      console.log('   No existing profile found');
    }
    console.log('');

    // 4. Test profile creation
    console.log('4. Testing profile creation...');
    const profile = await getOrCreateUserProfile('testing');
    console.log('   ✅ Profile created:', {
      id: profile.id,
      user_id: profile.user_id,
      created_at: profile.created_at
    });
    console.log('');

    // 5. Verify in database
    console.log('5. Verifying in database...');
    const verify = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', ['testing']);
    if (verify.rows.length > 0) {
      console.log('   ✅ Profile found in database:', verify.rows[0]);
    } else {
      console.error('   ❌ Profile NOT found in database!');
      process.exit(1);
    }
    console.log('');

    // 6. Test duplicate creation (should return existing)
    console.log('6. Testing duplicate creation (should return existing)...');
    const profile2 = await getOrCreateUserProfile('testing');
    if (profile2.id === profile.id) {
      console.log('   ✅ Correctly returned existing profile');
    } else {
      console.error('   ❌ Created duplicate profile!');
      process.exit(1);
    }
    console.log('');

    console.log('✅ All tests passed! Profile creation is working correctly.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testProfileCreation();

