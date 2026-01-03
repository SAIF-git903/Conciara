import { pool } from './connection.js';

async function checkSkins() {
  try {
    console.log('Checking skins in database...\n');
    
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        website_id, 
        is_active,
        CASE 
          WHEN theme_config IS NULL THEN 'NULL'
          WHEN jsonb_typeof(theme_config) = 'object' THEN 'Has config'
          ELSE 'Invalid'
        END as config_status
      FROM skins 
      ORDER BY id
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No skins found in database!');
      console.log('Run: npm run seed');
    } else {
      console.log(`✅ Found ${result.rows.length} skins:\n`);
      result.rows.forEach(skin => {
        console.log(`  ID: ${skin.id}`);
        console.log(`  Name: ${skin.name}`);
        console.log(`  Website ID: ${skin.website_id}`);
        console.log(`  Active: ${skin.is_active}`);
        console.log(`  Config: ${skin.config_status}`);
        console.log('');
      });
    }
    
    // Check variations and trees
    console.log('\nChecking variations and trees:\n');
    const treeResult = await pool.query(`
      SELECT 
        s.id as skin_id,
        s.name as skin_name,
        av.id as variation_id,
        av.name as variation_name,
        av.is_active as variation_active,
        dt.id as tree_id,
        dt.name as tree_name
      FROM skins s
      LEFT JOIN ab_variations av ON av.skin_id = s.id AND av.is_active = true
      LEFT JOIN dialog_trees dt ON dt.ab_variation_id = av.id
      ORDER BY s.id
    `);
    
    treeResult.rows.forEach(row => {
      console.log(`Skin ${row.skin_id} (${row.skin_name}):`);
      if (row.variation_id) {
        console.log(`  ✅ Variation: ${row.variation_id} (${row.variation_name})`);
        if (row.tree_id) {
          console.log(`  ✅ Tree: ${row.tree_id} (${row.tree_name})`);
        } else {
          console.log(`  ❌ No tree for variation`);
        }
      } else {
        console.log(`  ❌ No variation`);
      }
      console.log('');
    });
    
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSkins();

