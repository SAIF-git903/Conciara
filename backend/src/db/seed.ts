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

    // Step 2: Create Multiple Customer Types
    console.log('📦 Creating customer types...');
    const customerTypes = [];
    
    const wineryResult = await pool.query(`
      INSERT INTO customer_types (name, description)
      VALUES ('Winery', 'Wine producers and vineyards')
      RETURNING *;
    `);
    customerTypes.push(wineryResult.rows[0]);
    console.log(`✅ Created: ${wineryResult.rows[0].name}`);

    const restaurantResult = await pool.query(`
      INSERT INTO customer_types (name, description)
      VALUES ('Restaurant', 'Fine dining and casual restaurants')
      RETURNING *;
    `);
    customerTypes.push(restaurantResult.rows[0]);
    console.log(`✅ Created: ${restaurantResult.rows[0].name}`);

    const retailResult = await pool.query(`
      INSERT INTO customer_types (name, description)
      VALUES ('Retail', 'Wine shops and specialty stores')
      RETURNING *;
    `);
    customerTypes.push(retailResult.rows[0]);
    console.log(`✅ Created: ${retailResult.rows[0].name}\n`);

    // Step 3: Create Multiple Websites
    console.log('🌐 Creating websites...');
    const websites = [];
    
    const domaineCarnerosResult = await pool.query(`
      INSERT INTO websites (customer_type_id, name, description)
      VALUES ($1, 'Domaine Carneros', 'Premium sparkling wine producer in Napa Valley')
      RETURNING *;
    `, [customerTypes[0].id]);
    websites.push(domaineCarnerosResult.rows[0]);
    console.log(`✅ Created: ${domaineCarnerosResult.rows[0].name}`);

    const vineyardResult = await pool.query(`
      INSERT INTO websites (customer_type_id, name, description)
      VALUES ($1, 'Sunset Vineyards', 'Boutique winery specializing in Pinot Noir')
      RETURNING *;
    `, [customerTypes[0].id]);
    websites.push(vineyardResult.rows[0]);
    console.log(`✅ Created: ${vineyardResult.rows[0].name}\n`);

    // Step 4: Create Multiple Skins
    console.log('🎨 Creating skins...');
    const skins = [];
    
    const defaultSkinResult = await pool.query(`
      INSERT INTO skins (website_id, name, description, theme_config)
      VALUES ($1, 'Default Theme', 'Main theme for Domaine Carneros', '{"primaryColor": "#8B2635", "secondaryColor": "#F4E4BC", "fontFamily": "serif", "accentColor": "#D4AF37"}')
      RETURNING *;
    `, [websites[0].id]);
    skins.push(defaultSkinResult.rows[0]);
    console.log(`✅ Created: ${defaultSkinResult.rows[0].name}`);

    const modernSkinResult = await pool.query(`
      INSERT INTO skins (website_id, name, description, theme_config)
      VALUES ($1, 'Modern Theme', 'Contemporary design for younger audience', '{"primaryColor": "#2C3E50", "secondaryColor": "#ECF0F1", "fontFamily": "sans-serif", "accentColor": "#E74C3C"}')
      RETURNING *;
    `, [websites[0].id]);
    skins.push(modernSkinResult.rows[0]);
    console.log(`✅ Created: ${modernSkinResult.rows[0].name}\n`);

    // Step 5: Create Multiple A/B Variations
    console.log('🔀 Creating A/B variations...');
    const variations = [];
    
    const controlResult = await pool.query(`
      INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active)
      VALUES ($1, 'Control', 'Default variation', '{"version": "control", "features": ["standard_layout", "basic_chat"]}', true)
      RETURNING *;
    `, [skins[0].id]);
    variations.push(controlResult.rows[0]);
    console.log(`✅ Created: ${controlResult.rows[0].name}`);

    const variantAResult = await pool.query(`
      INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active)
      VALUES ($1, 'Variant A', 'Enhanced features', '{"version": "variant_a", "features": ["enhanced_layout", "quick_replies", "product_carousel"]}', true)
      RETURNING *;
    `, [skins[0].id]);
    variations.push(variantAResult.rows[0]);
    console.log(`✅ Created: ${variantAResult.rows[0].name}\n`);

    // Step 6: Create Multiple Dialog Trees
    console.log('🌳 Creating dialog trees...');
    const trees = [];
    
    // Tree 1: Wine Consultation Flow
    const wineConsultTreeResult = await pool.query(`
      INSERT INTO dialog_trees (name, description, ab_variation_id)
      VALUES ('Wine Consultation Flow', 'Main conversation flow for wine recommendations and consultations', $1)
      RETURNING *;
    `, [variations[0].id]);
    trees.push(wineConsultTreeResult.rows[0]);
    console.log(`✅ Created: ${wineConsultTreeResult.rows[0].name}`);

    // Tree 2: Customer Support Flow
    const supportTreeResult = await pool.query(`
      INSERT INTO dialog_trees (name, description, ab_variation_id)
      VALUES ('Customer Support Flow', 'Handles customer inquiries, orders, and support requests', $1)
      RETURNING *;
    `, [variations[0].id]);
    trees.push(supportTreeResult.rows[0]);
    console.log(`✅ Created: ${supportTreeResult.rows[0].name}\n`);

    // Step 7: Create Preprompts
    console.log('📝 Creating preprompts...');
    
    const winePrepromptResult = await pool.query(`
      INSERT INTO preprompts (tree_id, content)
      VALUES ($1, $2)
      RETURNING *;
    `, [
      trees[0].id,
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
    console.log(`✅ Created preprompt for Wine Consultation Flow`);

    const supportPrepromptResult = await pool.query(`
      INSERT INTO preprompts (tree_id, content)
      VALUES ($1, $2)
      RETURNING *;
    `, [
      trees[1].id,
      `You are a helpful customer support representative for Domaine Carneros. 
Your role is to assist customers with orders, shipping inquiries, returns, and general questions.

Guidelines:
- Be friendly, patient, and solution-oriented
- Provide accurate information about orders and shipping
- Help resolve issues quickly and efficiently
- Escalate complex issues when necessary
- Always maintain a professional and courteous tone`
    ]);
    console.log(`✅ Created preprompt for Customer Support Flow\n`);

    // Step 8: Create Comprehensive Dialog Nodes for Tree 1 (Wine Consultation)
    console.log('💬 Creating dialog nodes for Wine Consultation Flow...');
    
    // Root node - Welcome
    const rootNode1Result = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, NULL, NULL, 'Welcome to Domaine Carneros! 🍾 I''m here to help you find the perfect wine. Are you looking for something for a special occasion, or would you like to explore our collection?')
      RETURNING *;
    `, [trees[0].id]);
    const rootNode1 = rootNode1Result.rows[0];
    console.log(`✅ Created root node: Welcome message`);

    // Branch 1: Special Occasion
    const occasionNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''m looking for something for a special occasion', 'Wonderful! Special occasions call for something memorable. What type of celebration are you planning? Is it a wedding, anniversary, birthday, or another milestone?')
      RETURNING *;
    `, [trees[0].id, rootNode1.id]);
    const occasionNode = occasionNodeResult.rows[0];

    // Branch 2: Explore Collection
    const exploreNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''d like to explore your collection', 'Excellent choice! Our collection includes both sparkling and still wines. Are you more interested in our méthode traditionnelle sparkling wines, or would you like to learn about our still wine offerings?')
      RETURNING *;
    `, [trees[0].id, rootNode1.id]);
    const exploreNode = exploreNodeResult.rows[0];

    // Branch 3: Price Range
    const priceNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'What''s your price range?', 'Great question! We have options for every budget. Our Brut Cuvée starts around $35, while our premium Le Rêve is around $85. What range are you comfortable with?')
      RETURNING *;
    `, [trees[0].id, rootNode1.id]);

    // Wedding sub-branch
    const weddingNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'It''s for a wedding', 'Congratulations! 🎉 For a wedding, I''d recommend our Le Rêve Blanc de Blancs - it''s our most prestigious sparkling wine, perfect for toasting. It''s elegant, refined, and makes a beautiful statement. Would you like to know more about this wine, or are you looking for something in a different price range?')
      RETURNING *;
    `, [trees[0].id, occasionNode.id]);

    // Anniversary sub-branch
    const anniversaryNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'It''s for an anniversary', 'How romantic! 💕 For an anniversary, I''d suggest our Brut Rosé - it''s elegant, romantic, and pairs beautifully with a special dinner. The beautiful pink hue and delicate berry notes make it perfect for celebrating love. Would you like pairing suggestions?')
      RETURNING *;
    `, [trees[0].id, occasionNode.id]);

    // Sparkling wines sub-branch
    const sparklingNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''m interested in sparkling wines', 'Perfect! Our sparkling wines are made using the méthode traditionnelle, the same technique used in Champagne. We have several options: our Brut Cuvée is our signature sparkling wine, the Brut Rosé offers beautiful berry notes, and Le Rêve is our ultra-premium offering. Which style appeals to you?')
      RETURNING *;
    `, [trees[0].id, exploreNode.id]);

    // Still wines sub-branch
    const stillWinesNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'Tell me about your still wines', 'Excellent! While we''re known for sparkling, our still wines are equally impressive. We produce Pinot Noir and Chardonnay that showcase the unique terroir of Carneros. The cool climate gives our wines elegance and complexity. Are you more interested in red or white?')
      RETURNING *;
    `, [trees[0].id, exploreNode.id]);

    console.log(`✅ Created 8 nodes for Wine Consultation Flow\n`);

    // Step 9: Create Dialog Nodes for Tree 2 (Customer Support)
    console.log('💬 Creating dialog nodes for Customer Support Flow...');
    
    const rootNode2Result = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, NULL, NULL, 'Hello! I''m here to help with your Domaine Carneros order or any questions you might have. How can I assist you today?')
      RETURNING *;
    `, [trees[1].id]);
    const rootNode2 = rootNode2Result.rows[0];

    const orderStatusNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I want to check my order status', 'I''d be happy to help you check your order status! Please provide your order number, and I''ll look it up for you right away.')
      RETURNING *;
    `, [trees[1].id, rootNode2.id]);

    const shippingNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'When will my order ship?', 'Shipping times vary by location. Standard shipping typically takes 3-5 business days. For expedited shipping options, please let me know your zip code and I can provide more specific information.')
      RETURNING *;
    `, [trees[1].id, rootNode2.id]);

    const returnNodeResult = await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I need to return or exchange something', 'I''m sorry to hear that! We''re here to help make it right. Please provide your order number and the reason for the return, and I''ll guide you through the process.')
      RETURNING *;
    `, [trees[1].id, rootNode2.id]);

    console.log(`✅ Created 4 nodes for Customer Support Flow\n`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Customer Types: ${customerTypes.length} (Winery, Restaurant, Retail)`);
    console.log(`   • Websites: ${websites.length} (Domaine Carneros, Sunset Vineyards)`);
    console.log(`   • Skins: ${skins.length} (Default Theme, Modern Theme)`);
    console.log(`   • A/B Variations: ${variations.length} (Control, Variant A)`);
    console.log(`   • Dialog Trees: ${trees.length} (Wine Consultation, Customer Support)`);
    console.log(`   • Dialog Nodes: 12 total nodes created`);
    console.log(`   • Preprompts: 2 created`);
    console.log('\n✨ Your database is now ready for demo!');
    
  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase();

