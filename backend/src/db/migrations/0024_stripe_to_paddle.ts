/**
 * Migration 0024: Replace Stripe plan fields with Paddle.
 * - plans: paddle_price_id_monthly, paddle_price_id_yearly (drop stripe_*)
 * - workspace_subscriptions: paddle_customer_id, paddle_subscription_id (drop stripe_*)
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS paddle_price_id_monthly VARCHAR(255),
      ADD COLUMN IF NOT EXISTS paddle_price_id_yearly VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE plans
      DROP COLUMN IF EXISTS stripe_price_id_monthly,
      DROP COLUMN IF EXISTS stripe_price_id_yearly;
  `);

  await pool.query(`
    ALTER TABLE workspace_subscriptions
      ADD COLUMN IF NOT EXISTS paddle_customer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS paddle_subscription_id VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE workspace_subscriptions
      DROP COLUMN IF EXISTS stripe_customer_id,
      DROP COLUMN IF EXISTS stripe_subscription_id;
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS stripe_price_id_monthly VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_price_id_yearly VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE plans
      DROP COLUMN IF EXISTS paddle_price_id_monthly,
      DROP COLUMN IF EXISTS paddle_price_id_yearly;
  `);

  await pool.query(`
    ALTER TABLE workspace_subscriptions
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE workspace_subscriptions
      DROP COLUMN IF EXISTS paddle_customer_id,
      DROP COLUMN IF EXISTS paddle_subscription_id;
  `);
}
