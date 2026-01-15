import { pool } from './connection.js';
import { generateEmbedding } from '../services/embeddingService.js';

async function createTestTree() {
  try {
    console.log('🌳 Creating test dialog tree...\n');

    // Check if tree_id=1 already exists
    const existingTree = await pool.query(
      'SELECT * FROM dialog_trees WHERE id = 1'
    );

    if (existingTree.rows.length > 0) {
      console.log('✅ Tree with ID 1 already exists:', existingTree.rows[0].name);
      return;
    }

    // Create a simple test tree
    const treeResult = await pool.query(`
      INSERT INTO dialog_trees (name, description)
      VALUES ($1, $2)
      RETURNING *;
    `, ['Test Product Inquiry', 'Simple test tree for product inquiries']);

    const treeId = treeResult.rows[0].id;
    console.log(`✅ Created test tree with ID: ${treeId}`);

    // Create root node
    const rootEmbedding = await generateEmbedding('Hello! Welcome. What are you looking for today?');
    const hasVector = rootEmbedding !== null;
    
    const rootResult = await pool.query(
      hasVector && rootEmbedding
        ? `INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response, vector_embedding)
           VALUES ($1, NULL, NULL, $2, $3::vector)
           RETURNING *`
        : `INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
           VALUES ($1, NULL, NULL, $2)
           RETURNING *`,
      hasVector && rootEmbedding
        ? [treeId, 'Hello! Welcome. What are you looking for today?', `[${rootEmbedding.join(',')}]`]
        : [treeId, 'Hello! Welcome. What are you looking for today?']
    );

    const rootNodeId = rootResult.rows[0].id;
    console.log(`✅ Created root node with ID: ${rootNodeId}`);

    // Create a few child nodes
    const childNodes = [
      {
        user_input: 'I need a laptop',
        bot_response: 'Great! I can help you find the perfect laptop. What will you primarily use it for?'
      },
      {
        user_input: 'I need a smartphone',
        bot_response: 'Excellent! We have a wide selection of smartphones. What features are most important to you?'
      },
      {
        user_input: 'I need help with my order',
        bot_response: 'I can help you with your order. What order number are you looking for?'
      }
    ];

    for (const node of childNodes) {
      const embedding = await generateEmbedding(`${node.user_input} ${node.bot_response}`);
      const hasNodeVector = embedding !== null;
      
      await pool.query(
        hasNodeVector && embedding
          ? `INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response, vector_embedding)
             VALUES ($1, $2, $3, $4, $5::vector)`
          : `INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response)
             VALUES ($1, $2, $3, $4)`,
        hasNodeVector && embedding
          ? [treeId, rootNodeId, node.user_input, node.bot_response, `[${embedding.join(',')}]`]
          : [treeId, rootNodeId, node.user_input, node.bot_response]
      );
      console.log(`✅ Created child node: "${node.user_input}"`);
    }

    // If tree_id is not 1, update it to be 1 (for testing convenience)
    if (treeId !== 1) {
      // First, check if we can safely update
      const maxId = await pool.query('SELECT MAX(id) as max_id FROM dialog_trees');
      const maxTreeId = maxId.rows[0].max_id || 0;
      
      if (maxTreeId < 1) {
        // We can safely set this tree to ID 1
        await pool.query('ALTER SEQUENCE dialog_trees_id_seq RESTART WITH 1');
        await pool.query('UPDATE dialog_trees SET id = 1 WHERE id = $1', [treeId]);
        await pool.query('ALTER SEQUENCE dialog_trees_id_seq RESTART WITH ' + (maxTreeId + 1));
        console.log(`✅ Updated tree ID to 1 for testing`);
      } else {
        console.log(`ℹ️  Tree created with ID ${treeId}. Use this ID in your tests.`);
      }
    }

    console.log('\n✅ Test tree created successfully!');
    console.log(`\n📝 Use tree_id=${treeId} in your API calls`);
    
  } catch (error: any) {
    console.error('❌ Error creating test tree:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('createTestTree.ts')) {
  createTestTree()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

export { createTestTree };

