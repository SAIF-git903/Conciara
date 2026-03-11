/**
 * Migration: Rename CheckoutContext table to checkout_context (snake_case)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function up() {
  console.log('Renaming CheckoutContext table to checkout_context...');
  
  try {
    // Check if the old table exists
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'CheckoutContext';
    ` as any[];

    if (result.length > 0) {
      console.log('Found CheckoutContext table, renaming to checkout_context...');
      
      // Rename the table
      await prisma.$executeRaw`ALTER TABLE "CheckoutContext" RENAME TO "checkout_context";`;
      
      // Rename the columns to snake_case
      await prisma.$executeRaw`ALTER TABLE "checkout_context" RENAME COLUMN "userEmail" TO "user_email";`;
      await prisma.$executeRaw`ALTER TABLE "checkout_context" RENAME COLUMN "workspaceId" TO "workspace_id";`;
      await prisma.$executeRaw`ALTER TABLE "checkout_context" RENAME COLUMN "expiresAt" TO "expires_at";`;
      await prisma.$executeRaw`ALTER TABLE "checkout_context" RENAME COLUMN "createdAt" TO "created_at";`;
      await prisma.$executeRaw`ALTER TABLE "checkout_context" RENAME COLUMN "updatedAt" TO "updated_at";`;
      
      // Rename the indexes
      await prisma.$executeRaw`ALTER INDEX "CheckoutContext_userEmail_idx" RENAME TO "checkout_context_user_email_idx";`;
      await prisma.$executeRaw`ALTER INDEX "CheckoutContext_expiresAt_idx" RENAME TO "checkout_context_expires_at_idx";`;
      
      console.log('Successfully renamed CheckoutContext table to checkout_context');
    } else {
      console.log('CheckoutContext table not found, assuming checkout_context already exists or will be created');
    }
  } catch (error) {
    console.error('Error during table rename:', error);
    // Don't throw - this might be expected if table doesn't exist yet
  }
}

export async function down() {
  console.log('Renaming checkout_context table back to CheckoutContext...');
  
  try {
    // Check if the new table exists
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'checkout_context';
    ` as any[];

    if (result.length > 0) {
      // Rename back to original
      await prisma.$executeRaw`ALTER TABLE "checkout_context" RENAME TO "CheckoutContext";`;
      
      // Rename columns back
      await prisma.$executeRaw`ALTER TABLE "CheckoutContext" RENAME COLUMN "user_email" TO "userEmail";`;
      await prisma.$executeRaw`ALTER TABLE "CheckoutContext" RENAME COLUMN "workspace_id" TO "workspaceId";`;
      await prisma.$executeRaw`ALTER TABLE "CheckoutContext" RENAME COLUMN "expires_at" TO "expiresAt";`;
      await prisma.$executeRaw`ALTER TABLE "CheckoutContext" RENAME COLUMN "created_at" TO "createdAt";`;
      await prisma.$executeRaw`ALTER TABLE "CheckoutContext" RENAME COLUMN "updated_at" TO "updatedAt";`;
      
      // Rename indexes back
      await prisma.$executeRaw`ALTER INDEX "checkout_context_user_email_idx" RENAME TO "CheckoutContext_userEmail_idx";`;
      await prisma.$executeRaw`ALTER INDEX "checkout_context_expires_at_idx" RENAME TO "CheckoutContext_expiresAt_idx";`;
      
      console.log('Successfully renamed checkout_context table back to CheckoutContext');
    }
  } catch (error) {
    console.error('Error during table rename rollback:', error);
  }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}