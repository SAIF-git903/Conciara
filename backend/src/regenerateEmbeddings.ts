import { pool } from './db/connection.js';
import { generateEmbedding } from './services/embeddingService.js';

// Check if vector extension is available
async function checkVectorExtension(): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
    `);
    return result.rows[0]?.has_vector || false;
  } catch (error) {
    return false;
  }
}

async function regenerateEmbeddings() {
  try {
    console.log('🔄 Starting embedding regeneration...');
    
    // Get all nodes with null embeddings
    const result = await pool.query(`
      SELECT id, user_input, bot_response 
      FROM dialog_nodes 
      WHERE vector_embedding IS NULL 
        AND (user_input IS NOT NULL OR bot_response IS NOT NULL)
      ORDER BY id
    `);
    
    console.log(`📊 Found ${result.rows.length} nodes without embeddings`);
    
    if (result.rows.length === 0) {
      console.log('✅ All nodes already have embeddings!');
      return;
    }
    
    const hasVector = await checkVectorExtension();
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of result.rows) {
      try {
        const textToEmbed = `${row.user_input || ''} ${row.bot_response || ''}`.trim();
        
        if (!textToEmbed) {
          console.log(`⚠️  Skipping node ${row.id}: no text to embed`);
          continue;
        }

        console.log('textToEmbed', textToEmbed)

        
        console.log(`🔄 Processing node ${row.id}: "${textToEmbed.substring(0, 50)}..."`);
        
        const embedding = await generateEmbedding(textToEmbed);
        
        if (!embedding) {
          console.error(`❌ Failed to generate embedding for node ${row.id}`);
          errorCount++;
          continue;
        }
        
        // Format embedding based on vector extension availability
        let embeddingValue: string;
        if (hasVector) {
          embeddingValue = `[${embedding.join(',')}]`;
          await pool.query(`UPDATE dialog_nodes SET vector_embedding = $1::vector, updated_at = NOW() WHERE id = $2`, [embeddingValue, row.id]);
        } else {
          embeddingValue = JSON.stringify(embedding);
        }
        
        // Update the node with the embedding
        const updateQuery = hasVector
          ? `UPDATE dialog_nodes 
             SET vector_embedding = $1::vector, updated_at = NOW() 
             WHERE id = $2`
          : `UPDATE dialog_nodes 
             SET vector_embedding = $1, updated_at = NOW() 
             WHERE id = $2`;
        
        await pool.query(updateQuery, [embeddingValue, row.id]);
        
        console.log(`✅ Updated node ${row.id} with embedding`);
        successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`❌ Error processing node ${row.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully updated: ${successCount} nodes`);
    console.log(`❌ Errors: ${errorCount} nodes`);
    console.log(`📝 Total processed: ${result.rows.length} nodes`);
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
regenerateEmbeddings()
  .then(() => {
    console.log('✅ Embedding regeneration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Embedding regeneration failed:', error);
    process.exit(1);
  });

export { regenerateEmbeddings };

