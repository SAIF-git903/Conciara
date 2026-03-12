/**
 * Seed plans (Free, Hobby, Standard, Pro, Enterprise).
 * Run after migration 0023: npm run seed-plans
 * Uses .env: DATABASE_URL or DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME.
 */

import 'dotenv/config';
import './connection.js'; // sets DATABASE_URL from DB_* if not set
import { prisma } from './prisma.js';

const PLANS = [
  {
    name: 'free',
    displayName: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    messageCredits: 50,
    maxAgents: 1,
    maxMembers: 1,
    maxTrainingBytes: 400 * 1024, // 400 KB
    apiAccess: false,
    paddlePriceIdMonthly: null,
    paddlePriceIdYearly: null,
  },
  {
    name: 'hobby',
    displayName: 'Hobby',
    priceMonthly: 32,
    priceYearly: 320, // ~2 months free
    messageCredits: 500,
    maxAgents: 1,
    maxMembers: 2,
    maxTrainingBytes: 10 * 1024 * 1024, // 10 MB
    apiAccess: false,
    paddlePriceIdMonthly: 'pri_01kkezs6jqpvqctfmgkcs601d0', // $32/month
    paddlePriceIdYearly: 'pri_01kkeztrt4ska95axpk22557me', // $320/year
  },
  {
    name: 'standard',
    displayName: 'Standard',
    priceMonthly: 120,
    priceYearly: 1200,
    messageCredits: 4000,
    maxAgents: 1,
    maxMembers: 3,
    maxTrainingBytes: 20 * 1024 * 1024, // 20 MB
    apiAccess: true,
    paddlePriceIdMonthly: 'pri_01kkezxh3wqeam077ypmj87amg', // $120/month
    paddlePriceIdYearly: 'pri_01kkezyd3s84917n7nvmyd0pzf', // $1,200/year
  },
  {
    name: 'pro',
    displayName: 'Pro',
    priceMonthly: 400,
    priceYearly: 4000,
    messageCredits: 15000,
    maxAgents: 1,
    maxMembers: 5,
    maxTrainingBytes: 40 * 1024 * 1024, // 40 MB
    apiAccess: true,
    paddlePriceIdMonthly: 'pri_01kkezzeb9ej5j4hey0qaght96', // $400/month
    paddlePriceIdYearly: 'pri_01kkf0010pg1nyyjj1r0aym21t', // $4,000/year
  },
];

async function main() {
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { name: p.name },
      create: {
        id: `plan_${p.name}`,
        name: p.name,
        displayName: p.displayName,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        messageCredits: p.messageCredits,
        maxAgents: p.maxAgents,
        maxMembers: p.maxMembers,
        maxTrainingBytes: p.maxTrainingBytes,
        apiAccess: p.apiAccess,
        paddlePriceIdMonthly: p.paddlePriceIdMonthly ?? undefined,
        paddlePriceIdYearly: p.paddlePriceIdYearly ?? undefined,
      },
      update: {
        displayName: p.displayName,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        messageCredits: p.messageCredits,
        maxAgents: p.maxAgents,
        maxMembers: p.maxMembers,
        maxTrainingBytes: p.maxTrainingBytes,
        apiAccess: p.apiAccess,
        paddlePriceIdMonthly: p.paddlePriceIdMonthly ?? undefined,
        paddlePriceIdYearly: p.paddlePriceIdYearly ?? undefined,
      },
    });
    console.log(`Upserted plan: ${p.name}`);
  }
  console.log('Plans seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
