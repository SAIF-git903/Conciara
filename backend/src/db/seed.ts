import { pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Step 1: Clear all existing data
    console.log('🧹 Clearing existing data...');
    await pool.query('DELETE FROM dialog_nodes');
    await pool.query('DELETE FROM preprompts');
    await pool.query('DELETE FROM dialog_trees');
    await pool.query('DELETE FROM ab_variations');
    await pool.query('DELETE FROM skins');
    await pool.query('DELETE FROM websites');
    await pool.query('DELETE FROM customer_types');
    console.log('✅ All existing data cleared\n');

    // Step 2: Create Customer Type
    console.log('📦 Creating customer type...');
    const customerTypeResult = await pool.query(`
      INSERT INTO customer_types (name, description)
      VALUES ('Winery', 'Wine producers and vineyards')
      RETURNING *;
    `);
    const customerType = customerTypeResult.rows[0];
    console.log(`✅ Created customer type: ${customerType.name} (ID: ${customerType.id})\n`);

    // Step 3: Create Website
    console.log('🌐 Creating website...');
    const websiteResult = await pool.query(`
      INSERT INTO websites (customer_type_id, name, description)
      VALUES ($1, 'Domaine Carneros', 'Premium sparkling wine producer in Napa Valley')
      RETURNING *;
    `, [customerType.id]);
    const website = websiteResult.rows[0];
    console.log(`✅ Created website: ${website.name} (ID: ${website.id})\n`);

    // Step 4: Create Skin
    console.log('🎨 Creating skin...');
    const skinResult = await pool.query(`
      INSERT INTO skins (website_id, name, description, theme_config)
      VALUES ($1, 'Default Theme', 'Main theme for Domaine Carneros website', '{"primaryColor": "#8B2635", "secondaryColor": "#F4E4BC", "fontFamily": "serif"}')
      RETURNING *;
    `, [website.id]);
    const skin = skinResult.rows[0];
    console.log(`✅ Created skin: ${skin.name} (ID: ${skin.id})\n`);

    // Step 5: Create A/B Variation
    console.log('🔀 Creating A/B variation...');
    const variationResult = await pool.query(`
      INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active)
      VALUES ($1, 'Control', 'Default variation for testing', '{"version": "control", "features": ["standard_layout"]}', true)
      RETURNING *;
    `, [skin.id]);
    const variation = variationResult.rows[0];
    console.log(`✅ Created A/B variation: ${variation.name} (ID: ${variation.id})\n`);

    // Step 6: Create Dialog Tree
    console.log('🌳 Creating dialog tree...');
    const treeResult = await pool.query(`
      INSERT INTO dialog_trees (name, description, ab_variation_id)
      VALUES ('Wine Consultation Flow', 'Main conversation flow for wine recommendations and consultations', $1)
      RETURNING *;
    `, [variation.id]);
    const tree = treeResult.rows[0];
    console.log(`✅ Created dialog tree: ${tree.name} (ID: ${tree.id})\n`);

    // Step 7: Create Preprompt
    console.log('📝 Creating preprompt...');
    const prepromptResult = await pool.query(`
      INSERT INTO preprompts (tree_id, content)
      VALUES ($1, $2)
      RETURNING *;
    `, [
      tree.id,
      `You are a knowledgeable wine consultant for Domaine Carneros, a premium sparkling wine producer in Napa Valley. 
Your role is to help customers discover the perfect wine for their occasion, taste preferences, and budget.

Key information about Domaine Carneros:
- Specializes in méthode traditionnelle sparkling wines
- Produces both sparkling and still wines
- Located in the Carneros AVA of Napa Valley
- Known for elegant, refined wines with French influence

Guidelines:
- Be warm, professional, and approachable
- Ask thoughtful questions to understand customer needs
- Recommend wines based on occasion, food pairings, and preferences
- Share interesting facts about the winery and winemaking process
- Always maintain a premium brand image while being accessible`
    ]);
    console.log(`✅ Created preprompt (ID: ${prepromptResult.rows[0].id})\n`);

    // Step 8: Create Sample Dialog Nodes
    console.log('💬 Creating sample dialog nodes...');
    
    // Root node - Welcome
    const rootNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, NULL, NULL, 'Welcome to Domaine Carneros! I''m here to help you find the perfect wine. Are you looking for something for a special occasion, or would you like to explore our collection?')
      RETURNING *;
    `, [tree.id]);
    const rootNode = rootNodeResult.rows[0];
    console.log(`✅ Created root node: Welcome message (ID: ${rootNode.id})`);

    // Node 1 - Special Occasion
    const occasionNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''m looking for something for a special occasion', 'Wonderful! Special occasions call for something memorable. What type of celebration are you planning? Is it a wedding, anniversary, birthday, or another milestone?')
      RETURNING *;
    `, [tree.id, rootNode.id]);
    console.log(`✅ Created node: Special occasion (ID: ${occasionNodeResult.rows[0].id})`);

    // Node 2 - Explore Collection
    const exploreNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''d like to explore your collection', 'Excellent choice! Our collection includes both sparkling and still wines. Are you more interested in our méthode traditionnelle sparkling wines, or would you like to learn about our still wine offerings?')
      RETURNING *;
    `, [tree.id, rootNode.id]);
    console.log(`✅ Created node: Explore collection (ID: ${exploreNodeResult.rows[0].id})`);

    // Node 3 - Wedding response
    const weddingNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'It''s for a wedding', 'Congratulations! For a wedding, I''d recommend our Le Rêve Blanc de Blancs - it''s our most prestigious sparkling wine, perfect for toasting. It''s elegant, refined, and makes a beautiful statement. Would you like to know more about this wine, or are you looking for something in a different price range?')
      RETURNING *;
    `, [tree.id, occasionNodeResult.rows[0].id]);
    console.log(`✅ Created node: Wedding (ID: ${weddingNodeResult.rows[0].id})`);

    // Node 4 - Sparkling wines
    const sparklingNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''m interested in sparkling wines', 'Perfect! Our sparkling wines are made using the méthode traditionnelle, the same technique used in Champagne. We have several options: our Brut Cuvée is our signature sparkling wine, the Brut Rosé offers beautiful berry notes, and Le Rêve is our ultra-premium offering. Which style appeals to you?')
      RETURNING *;
    `, [tree.id, exploreNodeResult.rows[0].id]);
    console.log(`✅ Created node: Sparkling wines (ID: ${sparklingNodeResult.rows[0].id})`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Customer Type: ${customerType.name}`);
    console.log(`   • Website: ${website.name}`);
    console.log(`   • Skin: ${skin.name}`);
    console.log(`   • A/B Variation: ${variation.name}`);
    console.log(`   • Dialog Tree: ${tree.name}`);
    console.log(`   • Dialog Nodes: 5 nodes created`);
    console.log(`   • Preprompt: Created`);
    
  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase();

