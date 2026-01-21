/**
 * Script to check and fix skin theme_config in database
 * Run with: npx tsx src/db/fixSkinConfig.ts
 */

import { pool } from './connection.js';

async function checkAndFixSkinConfigs() {
  try {
    console.log('🔍 Checking skin configurations...\n');

    const result = await pool.query('SELECT id, name, theme_config FROM skins');
    
    for (const skin of result.rows) {
      console.log(`\n📦 Skin ID ${skin.id}: ${skin.name}`);
      console.log(`   Type: ${typeof skin.theme_config}`);
      
      if (!skin.theme_config) {
        console.log('   ⚠️  No theme_config found');
        continue;
      }

      let parsed: any;
      let needsFix = false;

      try {
        // If it's a string, try to parse it
        if (typeof skin.theme_config === 'string') {
          console.log('   📝 theme_config is a string, attempting to parse...');
          
          try {
            parsed = JSON.parse(skin.theme_config);
            
            // Check if it's double-encoded
            if (typeof parsed === 'string') {
              console.log('   🔄 Detected double-encoded JSON, parsing again...');
              parsed = JSON.parse(parsed);
              needsFix = true;
            }
          } catch (e) {
            console.log('   ❌ Failed to parse:', e instanceof Error ? e.message : String(e));
            console.log('   📄 First 200 chars:', skin.theme_config.substring(0, 200));
            continue;
          }
        } else {
          // Already an object
          parsed = skin.theme_config;
        }

        // Check if it has the expected structure
        if (parsed.theme) {
          console.log('   ✅ Has theme object');
          console.log('   🎨 Theme colors:', {
            primaryColor: parsed.theme.primaryColor,
            backgroundColor: parsed.theme.backgroundColor,
            textColor: parsed.theme.textColor
          });
          
          // If it was double-encoded and we parsed it, fix it in the database
          if (needsFix) {
            console.log('   🔧 Fixing double-encoded JSON in database...');
            await pool.query(
              'UPDATE skins SET theme_config = $1::jsonb WHERE id = $2',
              [JSON.stringify(parsed), skin.id]
            );
            console.log('   ✅ Fixed!');
          }
        } else if (parsed.primaryColor) {
          console.log('   ⚠️  Legacy format (has primaryColor but no theme object)');
        } else {
          console.log('   ❌ Invalid structure - missing theme object');
          console.log('   📄 Structure:', Object.keys(parsed));
        }
      } catch (error) {
        console.log('   ❌ Error processing:', error instanceof Error ? error.message : String(error));
      }
    }

    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndFixSkinConfigs();
