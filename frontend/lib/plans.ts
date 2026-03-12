/**
 * Static plan definitions — keep in sync with backend src/db/seedPlans.ts
 * Used by pricing page and PlansModal.
 */

export interface PlanItem {
  id: string
  name: string
  displayName: string
  priceMonthly: number
  priceYearly: number
  messageCredits: number
  maxAgents: number
  maxMembers: number
  maxTrainingBytes: number
  apiAccess: boolean
  /** Paddle price ID for monthly billing (for checkout). */
  paddlePriceIdMonthly: string | null
  /** Paddle price ID for yearly billing (for checkout). */
  paddlePriceIdYearly: string | null
}

export const PLANS: PlanItem[] = [
  {
    id: 'free',
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
    id: 'hobby',
    name: 'hobby',
    displayName: 'Hobby',
    priceMonthly: 32,
    priceYearly: 320,
    messageCredits: 500,
    maxAgents: 1,
    maxMembers: 2,
    maxTrainingBytes: 10 * 1024 * 1024, // 10 MB
    apiAccess: false,
    paddlePriceIdMonthly: 'pri_01kkezs6jqpvqctfmgkcs601d0',
    paddlePriceIdYearly: 'pri_01kkeztrt4ska95axpk22557me',
  },
  {
    id: 'standard',
    name: 'standard',
    displayName: 'Standard',
    priceMonthly: 120,
    priceYearly: 1200,
    messageCredits: 4000,
    maxAgents: 1,
    maxMembers: 3,
    maxTrainingBytes: 20 * 1024 * 1024, // 20 MB
    apiAccess: true,
    paddlePriceIdMonthly: 'pri_01kkezxh3wqeam077ypmj87amg',
    paddlePriceIdYearly: 'pri_01kkezyd3s84917n7nvmyd0pzf',
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    priceMonthly: 400,
    priceYearly: 4000,
    messageCredits: 15000,
    maxAgents: 1,
    maxMembers: 5,
    maxTrainingBytes: 40 * 1024 * 1024, // 40 MB
    apiAccess: true,
    paddlePriceIdMonthly: 'pri_01kkezzeb9ej5j4hey0qaght96',
    paddlePriceIdYearly: 'pri_01kkf0010pg1nyyjj1r0aym21t',
  },
]

export function formatPlanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${bytes / (1024 * 1024 * 1024)} GB`
  if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MB`
  if (bytes >= 1024) return `${bytes / 1024} KB`
  return `${bytes} B`
}
