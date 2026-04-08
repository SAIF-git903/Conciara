import type { ActionTypeMeta } from './types'

export const ACTION_TYPE_META: ActionTypeMeta[] = [
  {
    type: 'custom_action',
    title: 'Custom Action',
    description: 'Connect to any external API or trigger a workflow',
    comingSoon: false,
  },
  {
    type: 'custom_buttons',
    title: 'Custom Buttons',
    description: 'Show clickable CTA buttons in the chat window',
    comingSoon: false,
  },
  {
    type: 'web_search',
    title: 'Web Search',
    description: 'Let your bot search the web for real-time answers',
    comingSoon: true,
  },
  {
    type: 'collect_leads',
    title: 'Collect Leads',
    description: 'Capture name, email, and phone during conversation',
    comingSoon: true,
  },
  {
    type: 'escalate_human',
    title: 'Escalate to Human',
    description: 'Hand off to your support team when needed',
    comingSoon: true,
  },
  {
    type: 'slack',
    title: 'Slack',
    description: 'Send notifications to Slack channels or DMs',
    comingSoon: true,
  },
  {
    type: 'calendly',
    title: 'Calendly',
    description: 'Let users book meetings directly in chat',
    comingSoon: true,
  },
  {
    type: 'stripe',
    title: 'Stripe',
    description: 'Handle billing, invoices, and subscriptions',
    comingSoon: true,
  },
  {
    type: 'shopify',
    title: 'Shopify',
    description: 'Browse products, check orders, manage cart',
    comingSoon: true,
  },
  {
    type: 'salesforce',
    title: 'Salesforce',
    description: 'Create tickets and connect to live agents',
    comingSoon: true,
  },
]
