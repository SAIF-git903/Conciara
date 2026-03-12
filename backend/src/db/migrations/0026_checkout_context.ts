/**
 * Migration: Add CheckoutContext table for tracking workspace context during Paddle hosted checkout
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function up() {
  console.log('Creating checkout_context table...');
  
  await prisma.$executeRaw`
    CREATE TABLE "checkout_context" (
      "id" SERIAL PRIMARY KEY,
      "user_email" TEXT NOT NULL UNIQUE,
      "workspace_id" INTEGER NOT NULL,
      "expires_at" TIMESTAMP(3) NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await prisma.$executeRaw`
    CREATE INDEX "checkout_context_user_email_idx" ON "checkout_context"("user_email");
  `;

  await prisma.$executeRaw`
    CREATE INDEX "checkout_context_expires_at_idx" ON "checkout_context"("expires_at");
  `;

  console.log('checkout_context table created successfully');
}

export async function down() {
  console.log('Dropping checkout_context table...');
  await prisma.$executeRaw`DROP TABLE IF EXISTS "checkout_context";`;
  console.log('checkout_context table dropped');
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