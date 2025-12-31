import { pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Step 1: Clear all existing data (including conversation history)
    console.log('🧹 Clearing existing data...');
    await pool.query('DELETE FROM conversation_history');
    await pool.query('DELETE FROM conversation_sessions');
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
    
    const types = [
      { name: 'E-Commerce', description: 'Online retail stores and marketplaces' },
      { name: 'SaaS', description: 'Software as a Service companies' },
      { name: 'Healthcare', description: 'Medical and healthcare providers' },
      { name: 'Education', description: 'Educational institutions and platforms' },
      { name: 'Real Estate', description: 'Real estate agencies and platforms' }
    ];

    for (const type of types) {
      const result = await pool.query(`
        INSERT INTO customer_types (name, description)
        VALUES ($1, $2)
        RETURNING *;
      `, [type.name, type.description]);
      customerTypes.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name}`);
    }
    console.log('');

    // Step 3: Create Multiple Websites
    console.log('🌐 Creating websites...');
    const websites = [];
    
    const websiteData = [
      { customerType: 0, name: 'TechStore Pro', description: 'Premium electronics and gadgets online store', domain: 'techstore.com' },
      { customerType: 0, name: 'FashionHub', description: 'Trendy fashion and accessories marketplace', domain: 'fashionhub.com' },
      { customerType: 1, name: 'CloudSync', description: 'Enterprise cloud storage and collaboration platform', domain: 'cloudsync.io' },
      { customerType: 1, name: 'TaskMaster', description: 'Project management and productivity SaaS', domain: 'taskmaster.app' },
      { customerType: 2, name: 'HealthCare Plus', description: 'Telemedicine and health consultation platform', domain: 'healthcareplus.com' },
      { customerType: 3, name: 'LearnOnline Academy', description: 'Online courses and educational content', domain: 'learnonline.edu' },
      { customerType: 4, name: 'PropertyFinder', description: 'Real estate listings and property search', domain: 'propertyfinder.com' }
    ];

    for (const website of websiteData) {
      const result = await pool.query(`
        INSERT INTO websites (customer_type_id, name, description, domain)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `, [customerTypes[website.customerType].id, website.name, website.description, website.domain]);
      websites.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name} (${website.domain})`);
    }
    console.log('');

    // Step 4: Create Multiple Skins
    console.log('🎨 Creating skins...');
    const skins = [];
    
    const skinData = [
      { website: 0, name: 'Default Theme', description: 'Main theme for TechStore Pro', theme: '{"primaryColor": "#2563eb", "secondaryColor": "#f1f5f9"}' },
      { website: 0, name: 'Dark Mode', description: 'Dark theme variant', theme: '{"primaryColor": "#1e40af", "secondaryColor": "#1e293b"}' },
      { website: 1, name: 'Fashion Theme', description: 'Elegant theme for FashionHub', theme: '{"primaryColor": "#ec4899", "secondaryColor": "#fdf2f8"}' },
      { website: 2, name: 'Professional Theme', description: 'Corporate theme for CloudSync', theme: '{"primaryColor": "#0f172a", "secondaryColor": "#f8fafc"}' }
    ];

    for (const skin of skinData) {
      const result = await pool.query(`
        INSERT INTO skins (website_id, name, description, theme_config)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `, [websites[skin.website].id, skin.name, skin.description, skin.theme]);
      skins.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name}`);
    }
    console.log('');

    // Step 5: Create Multiple A/B Variations
    console.log('🔀 Creating A/B variations...');
    const variations = [];
    
    const variationData = [
      { skin: 0, name: 'Control', description: 'Default variation', config: '{"version": "control"}', active: true },
      { skin: 0, name: 'Variant A', description: 'Enhanced features', config: '{"version": "variant_a", "features": ["quick_replies"]}', active: true },
      { skin: 0, name: 'Variant B', description: 'Minimal design', config: '{"version": "variant_b", "features": ["minimal_ui"]}', active: false },
      { skin: 2, name: 'Control', description: 'Default fashion theme', config: '{"version": "control"}', active: true }
    ];

    for (const variation of variationData) {
      const result = await pool.query(`
        INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `, [skins[variation.skin].id, variation.name, variation.description, variation.config, variation.active]);
      variations.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name}`);
    }
    console.log('');

    // Step 6: Create Multiple Dialog Trees
    console.log('🌳 Creating dialog trees...');
    const trees = [];
    
    const treeData = [
      { variation: 0, name: 'Product Inquiry Flow', description: 'Handles product questions, recommendations, and comparisons' },
      { variation: 0, name: 'Order Support Flow', description: 'Assists with orders, shipping, and returns' },
      { variation: 0, name: 'Technical Support Flow', description: 'Helps with technical issues and troubleshooting' },
      { variation: 3, name: 'Style Consultation Flow', description: 'Fashion advice and style recommendations' }
    ];

    for (const tree of treeData) {
      const result = await pool.query(`
        INSERT INTO dialog_trees (name, description, ab_variation_id)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [tree.name, tree.description, variations[tree.variation].id]);
      trees.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name}`);
    }
    console.log('');

    // Step 7: Create Preprompts
    console.log('📝 Creating preprompts...');
    
    const preprompts = [
      {
        tree: 0,
        content: `You are a helpful product consultant for TechStore Pro, an online electronics store.
Your role is to help customers find the perfect products based on their needs, budget, and preferences.

Guidelines:
- Be friendly, knowledgeable, and patient
- Ask clarifying questions to understand customer needs
- Provide accurate product information
- Compare products when asked
- Suggest alternatives if budget is a concern
- Always maintain a professional and helpful tone`
      },
      {
        tree: 1,
        content: `You are a customer service representative for TechStore Pro.
Your role is to assist customers with orders, shipping, returns, and account issues.

Guidelines:
- Be empathetic and solution-oriented
- Provide accurate order and shipping information
- Help resolve issues quickly
- Escalate complex problems when needed
- Always be polite and professional`
      },
      {
        tree: 2,
        content: `You are a technical support specialist for TechStore Pro.
Your role is to help customers with technical issues, product setup, and troubleshooting.

Guidelines:
- Be patient and methodical
- Ask detailed questions to diagnose issues
- Provide step-by-step solutions
- Use simple, non-technical language when possible
- Escalate hardware issues to warranty department
- Document all interactions`
      },
      {
        tree: 3,
        content: `You are a fashion stylist consultant for FashionHub.
Your role is to help customers find the perfect outfits and accessories for their style and occasions.

Guidelines:
- Be creative and fashion-forward
- Understand current trends
- Consider customer's body type, skin tone, and preferences
- Suggest complete outfits, not just individual items
- Be encouraging and positive
- Help customers express their personal style`
      }
    ];

    for (const preprompt of preprompts) {
      await pool.query(`
        INSERT INTO preprompts (tree_id, content)
        VALUES ($1, $2)
        RETURNING *;
      `, [trees[preprompt.tree].id, preprompt.content]);
      console.log(`✅ Created preprompt for ${trees[preprompt.tree].name}`);
    }
    console.log('');

    // Step 8: Create Comprehensive Dialog Nodes for Tree 1 (Product Inquiry)
    console.log('💬 Creating dialog nodes for Product Inquiry Flow...');
    
    const root1 = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, NULL, NULL, 'Hello! Welcome to TechStore Pro. I''m here to help you find the perfect product. What are you looking for today?')
      RETURNING *;
    `, [trees[0].id])).rows[0];
    console.log(`✅ Created root node`);

    // Main branches
    const laptopBranch = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''m looking for a laptop', 'Great choice! Laptops are one of our most popular categories. What will you primarily use it for? Work, gaming, creative projects, or general use?')
      RETURNING *;
    `, [trees[0].id, root1.id])).rows[0];

    const phoneBranch = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I need a smartphone', 'Excellent! We have a wide selection of smartphones. What''s most important to you: camera quality, battery life, performance, or price?')
      RETURNING *;
    `, [trees[0].id, root1.id])).rows[0];

    const budgetBranch = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'What''s your budget?', 'I''d be happy to help you find something within your budget! Our products range from budget-friendly options starting around $200 to premium devices over $2000. What price range are you comfortable with?')
      RETURNING *;
    `, [trees[0].id, root1.id])).rows[0];

    // Laptop sub-branches
    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'For work and productivity', 'Perfect! For work, I''d recommend our business laptops with long battery life and excellent keyboards. We have options from $600-$1500. Do you need something lightweight for travel, or is a larger screen more important?')
    `, [trees[0].id, laptopBranch.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'For gaming', 'Awesome! Gaming laptops need powerful graphics and processors. We have gaming laptops starting at $1000 with RTX graphics cards. What games do you play, and what''s your budget?')
    `, [trees[0].id, laptopBranch.id]);

    // Phone sub-branches
    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'Camera quality is most important', 'Excellent! For photography, I''d recommend our flagship phones with advanced camera systems. They feature multiple lenses, night mode, and 4K video. Would you like to see our top camera phones?')
    `, [trees[0].id, phoneBranch.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I want the best battery life', 'Smart choice! Battery life is crucial. We have phones with 5000mAh+ batteries that can last 2 days. Our mid-range options offer great battery life at affordable prices. What''s your budget?')
    `, [trees[0].id, phoneBranch.id]);

    console.log(`✅ Created 9 nodes for Product Inquiry Flow\n`);

    // Step 9: Create Dialog Nodes for Tree 2 (Order Support)
    console.log('💬 Creating dialog nodes for Order Support Flow...');
    
    const root2 = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, NULL, NULL, 'Hi! I''m here to help with your order. How can I assist you today?')
      RETURNING *;
    `, [trees[1].id])).rows[0];

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I want to check my order status', 'I''d be happy to check your order status! Please provide your order number, and I''ll look it up for you right away.')
    `, [trees[1].id, root2.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'When will my order ship?', 'Shipping times vary by location and product availability. Standard shipping typically takes 3-5 business days. For expedited options, please provide your zip code and I can give you specific delivery dates.')
    `, [trees[1].id, root2.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I need to cancel my order', 'I can help you cancel your order. Please provide your order number. Note: orders that have already shipped cannot be cancelled, but we can help you with a return once it arrives.')
    `, [trees[1].id, root2.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I want to return something', 'I''m here to help with your return! We have a 30-day return policy. Please provide your order number and the reason for return, and I''ll guide you through the process.')
    `, [trees[1].id, root2.id]);

    console.log(`✅ Created 5 nodes for Order Support Flow\n`);

    // Step 10: Create Dialog Nodes for Tree 3 (Technical Support)
    console.log('💬 Creating dialog nodes for Technical Support Flow...');
    
    const root3 = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, NULL, NULL, 'Hello! I''m here to help with any technical issues. What problem are you experiencing?')
      RETURNING *;
    `, [trees[2].id])).rows[0];

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'My device won''t turn on', 'Let''s troubleshoot this step by step. First, try holding the power button for 10 seconds. If that doesn''t work, check if the device is charging. Is the charging indicator showing?')
    `, [trees[2].id, root3.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I can''t connect to WiFi', 'WiFi connection issues are common. Let''s start by restarting your router and device. Have you tried forgetting the network and reconnecting? Also, check if other devices can connect to the same network.')
    `, [trees[2].id, root3.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'The screen is frozen', 'A frozen screen can often be fixed with a simple restart. Try holding the power button for 10-15 seconds to force restart. If the problem persists, it might be a software issue. What device are you using?')
    `, [trees[2].id, root3.id]);

    console.log(`✅ Created 4 nodes for Technical Support Flow\n`);

    // Step 11: Create Dialog Nodes for Tree 4 (Fashion Consultation)
    console.log('💬 Creating dialog nodes for Style Consultation Flow...');
    
    const root4 = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, NULL, NULL, 'Hi there! Welcome to FashionHub. I''m your personal style consultant. What are you shopping for today?')
      RETURNING *;
    `, [trees[3].id])).rows[0];

    const occasionBranch = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I need an outfit for a special occasion', 'How exciting! Special occasions deserve special outfits. What''s the occasion? Is it a wedding, party, date night, or business event?')
      RETURNING *;
    `, [trees[3].id, root4.id])).rows[0];

    const casualBranch = (await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'I''m looking for casual everyday wear', 'Perfect! Casual wear should be comfortable and stylish. What''s your style preference: minimalist, bohemian, streetwear, or classic?')
      RETURNING *;
    `, [trees[3].id, root4.id])).rows[0];

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'It''s for a wedding', 'Weddings are perfect for elegant outfits! For a wedding, I''d suggest a beautiful midi dress or a sophisticated jumpsuit. What''s your color preference? Pastels, bold colors, or classic black?')
    `, [trees[3].id, occasionBranch.id]);

    await pool.query(`
      INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
      VALUES ($1, $2, 'It''s for a date night', 'Date nights are all about confidence! I''d recommend something that makes you feel amazing. Are you thinking of a dress, a chic top with jeans, or something more formal?')
    `, [trees[3].id, occasionBranch.id]);

    console.log(`✅ Created 6 nodes for Style Consultation Flow\n`);

    // Summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Customer Types: ${customerTypes.length} (E-Commerce, SaaS, Healthcare, Education, Real Estate)`);
    console.log(`   • Websites: ${websites.length} (TechStore Pro, FashionHub, CloudSync, TaskMaster, HealthCare Plus, LearnOnline Academy, PropertyFinder)`);
    console.log(`   • Skins: ${skins.length} (Default Theme, Dark Mode, Fashion Theme, Professional Theme)`);
    console.log(`   • A/B Variations: ${variations.length} (Control, Variant A, Variant B)`);
    console.log(`   • Dialog Trees: ${trees.length} (Product Inquiry, Order Support, Technical Support, Style Consultation)`);
    console.log(`   • Dialog Nodes: 24 total nodes created`);
    console.log(`   • Preprompts: ${preprompts.length} created`);
    console.log('\n✨ Your database is now ready for demo!');
    console.log('\n💡 Quick Start:');
    console.log('   • Test Product Inquiry: Tree ID 1');
    console.log('   • Test Order Support: Tree ID 2');
    console.log('   • Test Technical Support: Tree ID 3');
    console.log('   • Test Style Consultation: Tree ID 4');
    
  } catch (error: any) {
    console.error('❌ Error seeding database:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedDatabase();
