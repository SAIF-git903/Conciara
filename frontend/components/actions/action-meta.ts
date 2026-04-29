import type { ActionTypeMeta } from './types'

export const ACTION_TYPE_META: ActionTypeMeta[] = [
  {
    type: 'custom_action',
    title: 'Custom Action',
    description: 'Connect your chatbot to any external API',
    example: 'e.g. Check order status, look up a customer, submit a form',
    comingSoon: false,
  },
  {
    type: 'custom_buttons',
    title: 'Quick Reply Buttons',
    description: 'Show clickable buttons in the chat window',
    example: 'e.g. View Pricing, Book a Demo, Contact Support',
    comingSoon: false,
  },
  {
    type: 'web_search',
    title: 'Web Search',
    description: 'Let your chatbot search the web for real-time answers',
    example: 'e.g. Latest news, current weather, live stock prices',
    comingSoon: true,
  },
  {
    type: 'collect_leads',
    title: 'Collect Leads',
    description: 'Capture contact details during the conversation',
    example: 'e.g. Name, email address, phone number',
    comingSoon: true,
  },
  {
    type: 'escalate_human',
    title: 'Escalate to Human',
    description: 'Hand the conversation off to your support team',
    example: 'e.g. When the issue is too complex, when the user asks for a human',
    comingSoon: true,
  },
  {
    type: 'slack',
    title: 'Slack',
    description: 'Send a message to a Slack channel or user',
    example: 'e.g. Alert the sales team, notify on-call engineers',
    comingSoon: true,
  },
  {
    type: 'calendly',
    title: 'Calendly',
    description: 'Let users book meetings directly in chat',
    example: 'e.g. Schedule a demo, book a support call',
    comingSoon: true,
  },
  {
    type: 'stripe',
    title: 'Stripe',
    description: 'Handle billing, invoices, and subscriptions',
    example: 'e.g. Check subscription status, update payment method',
    comingSoon: true,
  },
  {
    type: 'shopify',
    title: 'Shopify',
    description: 'Browse products, check orders, manage your store',
    example: 'e.g. Where is my order, check product availability',
    comingSoon: true,
  },
  {
    type: 'salesforce',
    title: 'Salesforce',
    description: 'Create tickets and connect to live agents',
    example: 'e.g. Open a support case, log a new lead',
    comingSoon: true,
  },
]
