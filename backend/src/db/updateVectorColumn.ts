import { pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateVectorColumn() {
  try {
    console.log('🔍 Checking current column type...');
    
    // Check current column type
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dialog_nodes' 
      AND column_name = 'vector_embedding';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('⚠️  vector_embedding column does not exist');
      return;
    }
    
    const currentType = columnCheck.rows[0].data_type;
    console.log(`Current type: ${currentType}`);
    
    if (currentType === 'USER-DEFINED' || currentType === 'vector') {
      console.log('✅ Column is already VECTOR type');
      return;
    }
    
    // Check if vector extension exists
    const vectorCheck = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
    `);
    
    if (!vectorCheck.rows[0]?.has_vector) {
      console.log('❌ pgvector extension not installed');
      return;
    }
    
    console.log('🔄 Converting vector_embedding column from TEXT to VECTOR(1536)...');
    
    // Drop and recreate the column
    await pool.query(`
      ALTER TABLE dialog_nodes 
      DROP COLUMN IF EXISTS vector_embedding;
    `);
    
    await pool.query(`
      ALTER TABLE dialog_nodes 
      ADD COLUMN vector_embedding vector(1536);
    `);
    
    console.log('✅ Column successfully converted to VECTOR(1536)');
    
  } catch (error: any) {
    console.error('❌ Error updating column:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

updateVectorColumn();

