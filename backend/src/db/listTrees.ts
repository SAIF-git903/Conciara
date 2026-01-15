import { pool } from './connection.js';

async function listTrees() {
  try {
    console.log('🌳 Listing all dialog trees...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        ab_variation_id,
        created_at
      FROM dialog_trees
      ORDER BY id ASC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No dialog trees found!');
      console.log('Run: npm run seed');
      return;
    }
    
    console.log(`✅ Found ${result.rows.length} dialog trees:\n`);
    result.rows.forEach(tree => {
      console.log(`  ID: ${tree.id}`);
      console.log(`  Name: ${tree.name}`);
      console.log(`  Description: ${tree.description || 'N/A'}`);
      console.log(`  Variation ID: ${tree.ab_variation_id || 'N/A'}`);
      console.log('');
    });
    
    console.log('\n💡 Use one of these tree_ids in your API calls');
    
  } catch (error: any) {
    console.error('❌ Error listing trees:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('listTrees.ts')) {
  listTrees()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

export { listTrees };

