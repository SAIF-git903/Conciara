import { pool } from './connection.js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    await pool.query('DELETE FROM products');
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
      { customerType: 4, name: 'PropertyFinder', description: 'Real estate listings and property search', domain: 'propertyfinder.com' },
      { customerType: 0, name: 'Coke Store', description: 'Beverage store – Coca-Cola, Sprite, Fanta and more', domain: 'cokestore.com' }
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

    // Step 3b: Seed Coke products for Coke Store website
    const cokeStoreWebsite = websites[websites.length - 1];
    if (cokeStoreWebsite && cokeStoreWebsite.name === 'Coke Store') {
      console.log('🥤 Seeding Coke products for Coke Store...');
      let productsJson: Array<{ name: string; description?: string; category: string; sku?: string; price: number; currency?: string; unit?: string; is_available?: boolean; attributes?: Record<string, unknown>; sort_order?: number }>;
      try {
        productsJson = JSON.parse(
          readFileSync(join(__dirname, 'seeds', 'example_products.json'), 'utf-8')
        );
      } catch (e) {
        console.warn('⚠️  Could not load seeds/example_products.json, skipping products.');
        productsJson = [];
      }
      for (const p of productsJson) {
        await pool.query(
          `INSERT INTO products (website_id, name, description, category, sku, price, currency, unit, is_available, attributes, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            cokeStoreWebsite.id,
            p.name,
            p.description || null,
            p.category,
            p.sku || null,
            p.price,
            p.currency || 'USD',
            p.unit || null,
            p.is_available !== false,
            JSON.stringify(p.attributes || {}),
            p.sort_order ?? 0
          ]
        );
      }
      console.log(`✅ Created ${productsJson.length} products for Coke Store\n`);
    }

    // Step 4: Create Multiple Skins with Full Config
    console.log('🎨 Creating skins...');
    const skins = [];
    
    const skinData = [
      { 
        website: 0, 
        name: 'Default Theme', 
        description: 'Main theme for TechStore Pro', 
        isActive: true,
        themeConfig: {
          theme: {
            primaryColor: "#2563eb",
            secondaryColor: "#f1f5f9",
            backgroundColor: "#ffffff",
            textColor: "#1f2937",
            borderColor: "#e5e7eb",
            accentColor: "#2563eb"
          },
          components: {
            button: {
              type: "circular",
              size: "large",
              icon: "bot",
              position: "bottom-right",
              showLabel: false
            },
            window: {
              width: 384,
              height: 600,
              borderRadius: 8,
              shadow: "large"
            },
            header: {
              show: true,
              height: 48,
              showTitle: true,
              title: "Chat Assistant",
              showMinimize: true,
              showClose: true
            },
            messages: {
              layout: "bubbles",
              userAlignment: "right",
              botAlignment: "left",
              showAvatars: true,
              bubbleStyle: "rounded"
            },
            input: {
              placeholder: "Type your message...",
              showSendButton: true,
              allowMultiline: false
            },
            quickReplies: {
              show: true,
              layout: "horizontal",
              style: "buttons"
            }
          },
          states: {
            loading: { type: "dots", color: "primary" },
            empty: { message: "Starting conversation..." },
            error: { message: "Sorry, I'm having trouble. Please try again.", showRetry: true }
          }
        }
      },
      { 
        website: 0, 
        name: 'Dark Mode', 
        description: 'Dark theme variant', 
        isActive: false,
        themeConfig: {
          theme: {
            primaryColor: "#3b82f6",
            secondaryColor: "#1e293b",
            backgroundColor: "#0f172a",
            textColor: "#f1f5f9",
            borderColor: "#334155",
            accentColor: "#3b82f6"
          },
          components: {
            button: {
              type: "circular",
              size: "large",
              icon: "bot",
              position: "bottom-right"
            },
            window: {
              width: 400,
              height: 650,
              borderRadius: 12,
              shadow: "large"
            },
            header: {
              show: true,
              height: 56,
              title: "Dark Chat",
              showMinimize: true,
              showClose: true
            },
            messages: {
              layout: "bubbles",
              userAlignment: "right",
              botAlignment: "left",
              showAvatars: true,
              bubbleStyle: "rounded"
            },
            input: {
              placeholder: "Type your message...",
              showSendButton: true
            }
          }
        }
      },
      { 
        website: 1, 
        name: 'Fashion Theme', 
        description: 'Elegant theme for FashionHub', 
        isActive: true,
        themeConfig: {
          theme: {
            primaryColor: "#ec4899",
            secondaryColor: "#fdf2f8",
            backgroundColor: "#ffffff",
            textColor: "#1f2937"
          },
          components: {
            button: {
              type: "circular",
              size: "large",
              icon: "bot",
              position: "bottom-right"
            },
            window: {
              width: 384,
              height: 600,
              borderRadius: 8,
              shadow: "large"
            },
            header: {
              show: true,
              title: "Fashion Assistant",
              showMinimize: true,
              showClose: true
            }
          }
        }
      },
      { 
        website: 2, 
        name: 'Professional Theme', 
        description: 'Corporate theme for CloudSync', 
        isActive: true,
        themeConfig: {
          theme: {
            primaryColor: "#0f172a",
            secondaryColor: "#f8fafc",
            backgroundColor: "#ffffff",
            textColor: "#1e293b"
          },
          components: {
            button: {
              type: "rounded",
              size: "medium",
              icon: "chat",
              position: "bottom-right"
            },
            window: {
              width: 360,
              height: 550,
              borderRadius: 4,
              shadow: "medium"
            },
            header: {
              show: true,
              title: "Support Chat",
              showMinimize: false,
              showClose: true
            }
          }
        }
      },
      {
        website: 7,
        name: 'Coke Store Theme',
        description: 'Beverage ordering – Coke, Sprite, Fanta',
        isActive: true,
        themeConfig: {
          theme: {
            primaryColor: "#F40009",
            secondaryColor: "#fff5f5",
            backgroundColor: "#ffffff",
            textColor: "#1f2937",
            borderColor: "#e5e7eb",
            accentColor: "#F40009"
          },
          components: {
            button: {
              type: "circular",
              size: "large",
              icon: "bot",
              position: "bottom-right",
              showLabel: false
            },
            window: {
              width: 384,
              height: 600,
              borderRadius: 8,
              shadow: "large"
            },
            header: {
              show: true,
              height: 48,
              showTitle: true,
              title: "Order Drinks",
              showMinimize: true,
              showClose: true
            },
            messages: {
              layout: "bubbles",
              userAlignment: "right",
              botAlignment: "left",
              showAvatars: true,
              bubbleStyle: "rounded"
            },
            input: {
              placeholder: "What would you like to order?",
              showSendButton: true,
              allowMultiline: false
            },
            quickReplies: {
              show: true,
              layout: "horizontal",
              style: "buttons"
            }
          }
        }
      }
    ];

    for (const skin of skinData) {
      const result = await pool.query(`
        INSERT INTO skins (website_id, name, description, theme_config, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `, [websites[skin.website].id, skin.name, skin.description, JSON.stringify(skin.themeConfig), skin.isActive]);
      skins.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name} (is_active: ${skin.isActive})`);
    }
    console.log('');

    // Step 5: Create A/B Variations for ALL Skins
    console.log('🔀 Creating A/B variations...');
    const variations = [];
    
    // Create at least one variation for each skin
    for (let i = 0; i < skins.length; i++) {
      const result = await pool.query(`
        INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `, [
        skins[i].id, 
        'Control', 
        `Default variation for ${skins[i].name}`, 
        '{}', 
        true
      ]);
      variations.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name} for ${skins[i].name}`);
    }
    
    // Add extra variations for first skin (for testing)
    const extraVariation = await pool.query(`
      INSERT INTO ab_variations (skin_id, name, description, variation_config, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, [skins[0].id, 'Variant A', 'Enhanced features', '{"overrides": {"components.button.size": "small"}}', true]);
    variations.push(extraVariation.rows[0]);
    console.log(`✅ Created: ${extraVariation.rows[0].name} for ${skins[0].name}`);
    console.log('');

    // Step 6: Create Dialog Trees for ALL Variations
    console.log('🌳 Creating dialog trees...');
    const trees = [];
    
    // Create a dialog tree for each variation
    const treeNames = [
      'Product Inquiry Flow',
      'Order Support Flow',
      'Technical Support Flow',
      'Style Consultation Flow',
      'Coke Ordering Flow',   // index 4 = Coke Store Theme variation
      'General Support Flow'
    ];
    
    for (let i = 0; i < variations.length; i++) {
      const treeName = treeNames[i] || `Chat Flow ${i + 1}`;
      const result = await pool.query(`
        INSERT INTO dialog_trees (name, description, ab_variation_id)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [
        treeName, 
        `Main conversation flow for ${variations[i].name}`, 
        variations[i].id
      ]);
      trees.push(result.rows[0]);
      console.log(`✅ Created: ${result.rows[0].name} for variation ${variations[i].name}`);
    }
    console.log('');

    // Step 7: Create Root Nodes for ALL Dialog Trees
    console.log('💬 Creating root nodes for all dialog trees...');
    
    const rootNodes = [];
    const rootMessages = [
      'Hello! Welcome to TechStore Pro. I\'m here to help you find the perfect product. What are you looking for today?',
      'Hi! I can help you with your orders, shipping, and returns. How can I assist you?',
      'Hello! I\'m here to help with technical issues and troubleshooting. What problem are you experiencing?',
      'Hi! Welcome to FashionHub. I\'m your style consultant. What are you looking for today?',
      'Hi! Welcome to Coke Store. I can help you order Coca-Cola, Sprite, Fanta, and more. What would you like—classic Coke, zero sugar, or something else?',
      'Hello! How can I help you today?'
    ];
    
    for (let i = 0; i < trees.length; i++) {
      const rootMessage = rootMessages[i] || 'Hello! How can I help you today?';
      const root = (await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, NULL, NULL, $2)
        RETURNING *;
      `, [trees[i].id, rootMessage])).rows[0];
      rootNodes.push(root);
      console.log(`✅ Created root node for ${trees[i].name}`);
    }
    console.log('');

    // Step 8: Create Preprompts
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
      },
      {
        tree: 4,
        content: `You are a friendly ordering concierge for Coke Store, a beverage store. You help customers choose and order Coca-Cola, Diet Coke, Zero Sugar, Sprite, Fanta, Minute Maid, and water products. For sugar-free or diet requests, recommend Zero Sugar or Diet Coke. Only suggest products from the provided list; if something isn't available, say so and suggest the closest alternative.`
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

    // Step 9: Create Additional Dialog Nodes for Tree 1 (Product Inquiry)
    console.log('💬 Creating additional dialog nodes for Product Inquiry Flow...');
    
    // Use the root node we already created in Step 7
    const root1 = rootNodes[0];

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

    // Step 12: Create Dialog Nodes for Tree 4 (Coke Ordering – Coke Store)
    console.log('💬 Creating dialog nodes for Coke Ordering Flow...');
    const cokeRoot = rootNodes[4];
    const cokeTreeId = trees[4]?.id;
    if (cokeRoot && cokeTreeId) {
      // Level 1: main branches from root
      const wantCoke = (await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'I want Coke', 'Great choice! We have Coca-Cola Classic in 12pk, 24pk, and 2L, plus Cherry and Vanilla. We also have Coca-Cola Zero Sugar and Diet Coke. Which do you prefer?')
        RETURNING *;
      `, [cokeTreeId, cokeRoot.id])).rows[0];
      const sugarFree = (await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Something sugar-free', 'We have Coca-Cola Zero Sugar and Diet Coke in 12pk and 24pk, plus Sprite Zero. All zero sugar. Which one would you like?')
        RETURNING *;
      `, [cokeTreeId, cokeRoot.id])).rows[0];
      const whatHave = (await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'What do you have?', 'We carry Coca-Cola Classic, Zero Sugar, Diet Coke, Sprite, Fanta Orange and Grape, Minute Maid lemonade and orange juice, plus Smartwater and Dasani. Want details on any of these?')
        RETURNING *;
      `, [cokeTreeId, cokeRoot.id])).rows[0];
      const spriteFanta = (await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Sprite or Fanta', 'We have Sprite and Sprite Zero in 12pk and 2L, and Fanta Orange and Fanta Grape in 12pk and 2L. Which would you like?')
        RETURNING *;
      `, [cokeTreeId, cokeRoot.id])).rows[0];
      const waterJuice = (await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Water or juice', 'We have Minute Maid Lemonade and Orange Juice, plus Smartwater (1L 6pk) and Dasani (24pk 16.9oz). Which are you interested in?')
        RETURNING *;
      `, [cokeTreeId, cokeRoot.id])).rows[0];
      const budget = (await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'What''s on sale? / Best value?', 'Our best value is Coca-Cola Classic 24pk at $8.49. Zero Sugar and Diet Coke 24pk are also $8.49. For single serve, 20oz Zero Sugar is $1.99. Want a specific recommendation?')
        RETURNING *;
      `, [cokeTreeId, cokeRoot.id])).rows[0];

      // Level 2: under "I want Coke" – Classic, Zero, Diet, Cherry, Vanilla
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Classic', 'Coca-Cola Classic: 12pk 12oz $5.99, 24pk $8.49, or 2L bottle $2.29. How many would you like?')
      `, [cokeTreeId, wantCoke.id]);
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Zero Sugar', 'Coca-Cola Zero Sugar: 12pk $5.99, 24pk $8.49, or 20oz single $1.99. Same great taste, zero sugar. How many?')
      `, [cokeTreeId, wantCoke.id]);
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Diet Coke', 'Diet Coke: 12pk or 24pk at $5.99 / $8.49. We also have Caffeine-Free 12pk. Which one?')
      `, [cokeTreeId, wantCoke.id]);
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Cherry or Vanilla', 'Coke Cherry or Vanilla: 12pk $6.29 each. Which one, and how many?')
      `, [cokeTreeId, wantCoke.id]);

      // Level 2: under "Something sugar-free"
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Coke Zero', 'Coca-Cola Zero Sugar: 12pk $5.99, 24pk $8.49, or 20oz $1.99. How many?')
      `, [cokeTreeId, sugarFree.id]);
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Diet Coke', 'Diet Coke 12pk $5.99 or 24pk $8.49. Caffeine-free 12pk also available. Which do you prefer?')
      `, [cokeTreeId, sugarFree.id]);
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Sprite Zero', 'Sprite Zero Sugar 12pk $5.99. Lemon-lime, no sugar. How many?')
      `, [cokeTreeId, sugarFree.id]);

      // Level 2: under "Sprite or Fanta"
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Sprite', 'Sprite: 12pk $5.99 or 2L $2.29. Sprite Zero 12pk $5.99. Which one?')
      `, [cokeTreeId, spriteFanta.id]);
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Fanta', 'Fanta Orange: 12pk or 2L ($5.99 / $2.29). Fanta Grape 12pk $5.99. Which flavor?')
      `, [cokeTreeId, spriteFanta.id]);

      // Level 2: under "Water or juice"
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Minute Maid', 'Minute Maid Lemonade 12pk $5.49 or Orange Juice 59oz $4.99. Which one?')
      `, [cokeTreeId, waterJuice.id]);
      await pool.query(`
        INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
        VALUES ($1, $2, 'Water', 'Smartwater 6pk 1L $6.99 or Dasani 24pk 16.9oz $5.99. Which would you like?')
      `, [cokeTreeId, waterJuice.id]);

      console.log(`✅ Created 1 root + 6 branches + 11 sub-nodes for Coke Ordering Flow (18 nodes total)\n`);
    }

    // Summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Customer Types: ${customerTypes.length} (E-Commerce, SaaS, Healthcare, Education, Real Estate)`);
    console.log(`   • Websites: ${websites.length} (includes Coke Store)`);
    console.log(`   • Skins: ${skins.length} (includes Coke Store Theme)`);
    console.log(`   • A/B Variations: ${variations.length}`);
    console.log(`   • Dialog Trees: ${trees.length} (includes Coke Ordering Flow)`);
    console.log(`   • Products: Coke Store catalog seeded from seeds/example_products.json`);
    console.log(`   • Preprompts: ${preprompts.length} created`);
    console.log('\n✨ Your database is now ready for demo!');
    console.log('\n💡 Quick Start:');
    console.log('   • Test Coke Ordering: use tree for Coke Store (Coke Ordering Flow)');
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
