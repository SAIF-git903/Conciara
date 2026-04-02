export type DocSection = {
  id: string
  title: string
  points?: string[]
  paragraphs?: string[]
  steps?: string[]
  imagePlaceholder?: string
  milestones?: Array<{ title: string; description: string }>
}

export type DocTopic = {
  slug: string
  title: string
  category: string
  description: string
  route: string
  access: string
  updatedAt: string
  sections: DocSection[]
}

export const DOC_TOPICS: DocTopic[] = [
  {
    slug: 'welcome',
    title: 'Welcome to Conciara',
    category: 'Start Here',
    description: 'Platform overview and first-run orientation.',
    route: '/',
    access: 'Public',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        points: [
          'Conciara is an AI Agent Builder for support, sales, onboarding, and knowledge automation.',
          'The product combines onboarding, data ingestion, customization, chat testing, analytics, and deployment.',
          'Most teams start with website crawl + Q&A, then iterate through Playground and analytics.',
        ],
      },
      {
        id: 'navigation',
        title: 'Primary navigation',
        points: [
          'Public flows: landing, pricing, signup/signin, password reset.',
          'Authenticated flows: workspace management, agent lifecycle, integrations, settings.',
          'Embed runtime is hosted through /embed/chat and controlled by widget settings.',
        ],
      },
    ],
  },
  {
    slug: 'build-first-agent',
    title: 'First Agent Setup',
    category: 'Start Here',
    description: 'Complete, step-by-step walkthrough to build your first production-ready agent.',
    route: '/onboarding/* and /dashboard/[workspaceId]/new-agent/*',
    access: 'Authenticated',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'overview-roadmap',
        title: 'Overview',
        paragraphs: [
          'Here is what you will complete in this guide.',
        ],
        milestones: [
          {
            title: 'Create and train your agent',
            description: 'Create a workspace, crawl your website, and load the first knowledge sources for reliable responses.',
          },
          {
            title: 'Test and refine quality',
            description: 'Use Playground and data updates to improve accuracy, tone, and fallback behavior.',
          },
          {
            title: 'Deploy to your website',
            description: 'Configure widget settings, copy embed snippet, and verify production behavior end-to-end.',
          },
        ],
      },
      {
        id: 'before-you-start',
        title: 'Before you start',
        paragraphs: [
          'This guide is designed for first-time users who want to launch a useful AI agent quickly and correctly.',
          'You will go from zero setup to a deployed chatbot using the onboarding flow and dashboard tools.',
          'Before starting, keep your website URL ready and decide the main use-case for your agent: support, sales, docs, or general assistant.',
        ],
        imagePlaceholder: 'Image Placeholder: Before-you-start checklist screen (replace with onboarding intro screenshot).',
      },
      {
        id: 'full-build-flow',
        title: 'Build your first agent (step-by-step)',
        paragraphs: [
          'Follow these steps in order. Each step builds on the previous one, so avoid skipping ahead on your first setup.',
        ],
        steps: [
          'Create your workspace. Add a clear workspace name so your team can identify it easily.',
          'Open onboarding link step and enter your primary website URL. Select the use-case that best matches your agent goal.',
          'Run website crawl and wait for completion. Review crawl results for title, logo, and extracted content.',
          'Choose whether to train now or skip temporarily. For first launch, training now is strongly recommended.',
          'Configure chatbot identity: set bot name and icon. Keep name user-friendly and brand-consistent.',
          'Set personality and behavior instructions. Define tone, boundaries, and response style clearly.',
          'Finish onboarding and open Playground. Test common customer questions and edge cases.',
          'Update data sources with files and Q&A pairs for missing or sensitive answers.',
          'Open chatbot settings and customize widget theme, header, and input behavior.',
          'Copy embed snippet and add it to your site. Verify widget opens, responds, and closes correctly.',
          'Review analytics/chat logs after launch and improve prompts + data continuously.',
        ],
        imagePlaceholder: 'Image Placeholder: End-to-end onboarding flow timeline (replace with multi-step journey screenshot).',
      },
      {
        id: 'step-1-create-train',
        title: 'Step 1: Create and train your agent',
        paragraphs: [
          'Start by creating your workspace, then connect your primary website URL to crawl initial knowledge.',
          'After crawl completes, set your bot name/icon and personality so the agent is ready for meaningful responses.',
        ],
        points: [
          'Create workspace and confirm dashboard access.',
          'Run website crawl and review extracted content quality.',
          'Set bot identity (name/icon) and personality guidelines.',
          'Retrain after adding initial data sources.',
        ],
        imagePlaceholder: 'Image Placeholder: Combined workspace + crawl + configure flow (replace with guided setup screenshots).',
      },
      {
        id: 'step-2-test-optimize',
        title: 'Step 2: Test and optimize',
        paragraphs: [
          'Use Playground as your quality gate before going live.',
          'Test realistic customer prompts and improve weak areas by updating instructions, files, and Q&A.',
        ],
        points: [
          'Run top intents and edge cases in Playground.',
          'Fix low-quality answers with data updates and prompt adjustments.',
          'Validate fallback behavior and tone consistency.',
        ],
        imagePlaceholder: 'Image Placeholder: Playground testing and optimization loop (replace with testing screenshots).',
      },
      {
        id: 'step-3-deploy',
        title: 'Step 3: Deploy to your website',
        paragraphs: [
          'Finalize widget appearance and behavior in chatbot settings, then deploy using the embed snippet.',
          'After launch, monitor analytics and chat logs to continuously improve outcomes.',
        ],
        points: [
          'Configure widget theme/header/input options.',
          'Add embed snippet to your website and validate runtime behavior.',
          'Track activity/analytics and iterate weekly.',
        ],
        imagePlaceholder: 'Image Placeholder: Widget settings + embed deployment + post-launch analytics (replace with deployment screenshots).',
      },
      {
        id: 'quality-check',
        title: 'Quality checks before going live',
        paragraphs: [
          'A successful launch depends on answer quality, not just deployment status. Run this checklist before publishing widely.',
        ],
        points: [
          'Test top 20 real user intents in Playground.',
          'Verify fallback behavior for unknown or unclear queries.',
          'Check tone consistency for greeting, support answers, and escalations.',
          'Confirm business-critical answers (pricing, policy, support contacts) are accurate.',
          'Ensure embed is enabled only when you are ready for public traffic.',
        ],
        imagePlaceholder: 'Image Placeholder: Pre-launch QA checklist panel (replace with internal QA screenshot).',
      },
      {
        id: 'post-launch-optimization',
        title: 'After launch: optimize for better outcomes',
        paragraphs: [
          'Your first version should be treated as a baseline. The best-performing agents are improved weekly using real conversation data.',
          'Use Activity and Analytics to spot weak responses, then update Q&A pairs, sources, and personality instructions.',
        ],
        points: [
          'Monitor unresolved or repetitive questions.',
          'Add missing Q&A entries and retrain.',
          'Adjust personality instructions when responses are too long, too formal, or off-brand.',
          'Review usage and limits before expected traffic increases.',
        ],
        imagePlaceholder: 'Image Placeholder: Analytics + chat logs optimization loop (replace with monitoring screenshot).',
      },
    ],
  },
  {
    slug: 'best-practices',
    title: 'Operational Best Practices',
    category: 'Start Here',
    description: 'Operational standards for quality and reliability.',
    route: 'Cross-app',
    access: 'Team guidance',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'data',
        title: 'Data quality',
        points: [
          'Keep crawl sources focused and high-signal.',
          'Use Q&A pairs for deterministic high-risk answers.',
          'Retrain after policy, pricing, or product updates.',
        ],
      },
      {
        id: 'ops',
        title: 'Operations',
        points: [
          'Monitor chat logs and analytics weekly.',
          'Treat plan-limit warnings as release blockers for scale launches.',
          'Audit integrations and API keys on a fixed cadence.',
        ],
      },
    ],
  },
  {
    slug: 'playground',
    title: 'Playground',
    category: 'Agent Operations',
    description: 'Interactive evaluation console for each agent.',
    route: '/dashboard/[workspaceId]/playground/[agentId]',
    access: 'Authenticated + workspace access',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'purpose',
        title: 'Purpose',
        points: [
          'Run realistic prompts against your current agent configuration.',
          'Validate tone, factuality, and intent handling before deployment.',
          'Use iterative prompt and data updates with immediate retesting.',
        ],
      },
      {
        id: 'qa',
        title: 'QA checks',
        points: [
          'Test top 20 user intents and edge prompts.',
          'Verify multilingual behavior when enabled.',
          'Confirm fallback behavior for unknown questions.',
        ],
      },
    ],
  },
  {
    slug: 'data-sources',
    title: 'Knowledge Sources',
    category: 'Agent Operations',
    description: 'Website, file, and Q&A training source management.',
    route: '/dashboard/[workspaceId]/data-sources/*/[agentId]',
    access: 'Authenticated + workspace access',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'website',
        title: 'Website crawl',
        points: [
          'Crawl extracts text, metadata, support links, and content chunks for agent context.',
          'Multi-page crawl support improves breadth but should be scoped for relevance.',
          'Track crawl failures and retry with URL cleanup when needed.',
        ],
      },
      {
        id: 'files-qa',
        title: 'Files and Q&A',
        points: [
          'Upload files for domain-specific references.',
          'Use Q&A for strict answer templates such as legal, pricing, and policy.',
          'Run retrain after adding or editing any source.',
        ],
      },
    ],
  },
  {
    slug: 'deploy',
    title: 'Deployment Guide',
    category: 'Agent Operations',
    description: 'Production widget and API deployment paths.',
    route: '/dashboard/[workspaceId]/settings/chatbot/[agentId] + /embed/chat',
    access: 'Authenticated to configure, public to consume embed',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'widget',
        title: 'Widget deployment',
        points: [
          'Copy embed snippet from chatbot settings and place before closing body tag.',
          'Use allowPublicEmbed toggle based on your security model.',
          'Validate open/close postMessage flow after embed installation.',
        ],
      },
      {
        id: 'api',
        title: 'API deployment',
        points: [
          'Use public or authenticated chat endpoints depending on access requirements.',
          'Prefer API keys for server-to-server automation with workspace scope.',
          'Enforce retries and error handling in production consumers.',
        ],
      },
    ],
  },
  {
    slug: 'settings',
    title: 'Configuration',
    category: 'Agent Operations',
    description: 'Workspace and agent settings matrix.',
    route: '/dashboard/[workspaceId]/settings/*',
    access: 'Authenticated + permissioned',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'workspace-settings',
        title: 'Workspace settings',
        points: [
          'General settings manage workspace metadata and defaults.',
          'Billing/plans/settings-api-keys govern finance and access automation.',
          'Usage view provides planning data for scaling decisions.',
        ],
      },
      {
        id: 'agent-settings',
        title: 'Agent settings',
        points: [
          'General agent settings define identity and baseline behavior.',
          'Chatbot settings configure UI, embed behavior, and public access.',
          'Apply final checks before changing production widget config.',
        ],
      },
    ],
  },
  {
    slug: 'email-settings',
    title: 'Email Flows',
    category: 'Agent Operations',
    description: 'Transactional email behavior and account recovery.',
    route: '/forgot-password, /reset-password and backend email services',
    access: 'Public and authenticated as applicable',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'flows',
        title: 'Supported flows',
        points: [
          'Password reset request and reset completion emails.',
          'Workspace invitation emails for member onboarding.',
          'SMTP fallback behavior logs when mail service is not configured.',
        ],
      },
      {
        id: 'ops',
        title: 'Operational requirements',
        points: [
          'Set SMTP credentials and MAIL_FROM in environment variables.',
          'Use branded sender and tested reset links in all environments.',
          'Monitor email send failures and bounce events externally.',
        ],
      },
    ],
  },
  {
    slug: 'actions',
    title: 'Workflow Actions',
    category: 'Agent Operations',
    description: 'Custom actions for external automation.',
    route: '/dashboard/[workspaceId]/actions/[agentId]',
    access: 'Authenticated + feature permission',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'capabilities',
        title: 'Capabilities',
        points: [
          'Define action name, description, and execution target.',
          'Connect workflows like lead capture, ticketing, and CRM updates.',
          'Apply permission and plan constraints to action usage.',
        ],
      },
      {
        id: 'hardening',
        title: 'Production hardening',
        points: [
          'Validate action endpoint auth and timeout handling.',
          'Audit action payload schema before release.',
          'Log action outcomes for support and debugging.',
        ],
      },
    ],
  },
  {
    slug: 'contacts',
    title: 'Contact Capture',
    category: 'Agent Operations',
    description: 'Lead/contact collection patterns for agent interactions.',
    route: 'Actions + integrations + custom workflows',
    access: 'Feature dependent',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'collection',
        title: 'Collection model',
        points: [
          'Capture contact details through structured action prompts.',
          'Map captured data to CRM or support systems through actions.',
          'Use confirmation responses to avoid malformed lead records.',
        ],
      },
      {
        id: 'compliance',
        title: 'Compliance',
        points: [
          'Capture consent language where required by jurisdiction.',
          'Store only required fields for operational use.',
          'Define retention and deletion workflows outside the chat runtime.',
        ],
      },
    ],
  },
  {
    slug: 'activity',
    title: 'Activity',
    category: 'Observability',
    description: 'Session and chat log visibility for debugging and QA.',
    route: '/dashboard/[workspaceId]/activity/chat-logs/[agentId]',
    access: 'Authenticated + workspace access',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'visibility',
        title: 'Operational visibility',
        points: [
          'Inspect user-agent interactions and response behavior.',
          'Use logs for support triage and prompt improvements.',
          'Correlate spikes with deploy events and retrain operations.',
        ],
      },
      {
        id: 'alerts',
        title: 'Alert strategy',
        points: [
          'Track abrupt drop in successful response quality.',
          'Watch for frequent fallback responses on known intents.',
          'Review logs after every major personality/data update.',
        ],
      },
    ],
  },
  {
    slug: 'analytics',
    title: 'Analytics',
    category: 'Observability',
    description: 'Performance and usage analytics for agents.',
    route: '/dashboard/[workspaceId]/analytics/chats/[agentId]',
    access: 'Authenticated + workspace access',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'metrics',
        title: 'Core metrics',
        points: [
          'Total conversations and message counts.',
          'Trend percentage compared to previous period.',
          'Daily volume charts for operational planning.',
        ],
      },
      {
        id: 'decisions',
        title: 'Decision support',
        points: [
          'Identify high-volume agents for optimization.',
          'Detect regressions after prompt or data changes.',
          'Inform plan upgrades and staffing decisions.',
        ],
      },
    ],
  },
  {
    slug: 'workspace-manage',
    title: 'Workspace Administration',
    category: 'Workspace Operations',
    description: 'Workspace lifecycle operations and ownership.',
    route: '/dashboard/[workspaceId], /dashboard/[workspaceId]/members, /dashboard/[workspaceId]/settings/general',
    access: 'Authenticated + permissioned',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'ownership',
        title: 'Ownership model',
        points: [
          'Workspace boundary isolates users, agents, keys, and billing.',
          'Member access should align with least-privilege roles.',
          'Operational ownership should be explicit for every workspace.',
        ],
      },
      {
        id: 'maintenance',
        title: 'Maintenance',
        points: [
          'Review member list and API keys regularly.',
          'Keep workspace naming and metadata consistent with org standards.',
          'Track inactive workspaces and archive strategy externally.',
        ],
      },
    ],
  },
  {
    slug: 'workspace-usage',
    title: 'Usage',
    category: 'Workspace Operations',
    description: 'Usage and plan limit visibility.',
    route: '/dashboard/[workspaceId]/usage',
    access: 'Authenticated + workspace access',
    updatedAt: 'April 2, 2026',
    sections: [
      {
        id: 'limits',
        title: 'Limit tracking',
        points: [
          'Monitor credits, message usage, and feature thresholds.',
          'Use plan-aware UI warnings to avoid runtime blocking.',
          'Coordinate upgrades before high-traffic launches.',
        ],
      },
      {
        id: 'governance',
        title: 'Governance',
        points: [
          'Map usage reports to internal cost accountability.',
          'Document expected growth and monthly budgets.',
          'Use analytics + usage trends for quarterly planning.',
        ],
      },
    ],
  },
]

export const DOC_TOPIC_BY_SLUG = DOC_TOPICS.reduce<Record<string, DocTopic>>((acc, topic) => {
  acc[topic.slug] = topic
  return acc
}, {})

export const DOC_CATEGORIES = Array.from(new Set(DOC_TOPICS.map((topic) => topic.category)))
