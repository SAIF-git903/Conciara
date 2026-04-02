import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Conciara API',
      version: '1.0.0',
      description: 'API documentation for Conciara - Dialog Tree Management System',
      contact: {
        name: 'API Support',
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for programmatic access',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'string',
              description: 'Detailed error information',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'member'] },
            isActive: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            websites: {
              type: 'array',
              items: { $ref: '#/components/schemas/Website' },
            },
          },
        },
        Website: {
          type: 'object',
          properties: {
            websiteId: { type: 'integer' },
            websiteName: { type: 'string' },
            domain: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
          required: ['email', 'password'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and session management' },
      { name: 'Users', description: 'User management (admin)' },
      { name: 'API Keys', description: 'Global API key management' },
      { name: 'Health', description: 'Health and public config' },
      { name: 'Public', description: 'Public endpoints (no auth)' },
      { name: 'Workspaces', description: 'Workspace CRUD and settings' },
      { name: 'Members', description: 'Workspace members and invites' },
      { name: 'Workspace API Keys', description: 'Workspace-scoped API keys' },
      { name: 'Billing', description: 'Subscription and billing' },
      { name: 'Credits', description: 'Message credits' },
      { name: 'Limits', description: 'Plan limits' },
      { name: 'Usage', description: 'Usage analytics' },
      { name: 'Crawls', description: 'Website crawls' },
      { name: 'Agents', description: 'Agent CRUD' },
      { name: 'Chat', description: 'Agent chat (authenticated)' },
      { name: 'Chat Logs', description: 'Chat history and analytics' },
      { name: 'Documents', description: 'Agent document training' },
      { name: 'QA', description: 'Q&A pairs for agents' },
      { name: 'Actions', description: 'Agent custom actions' },
      { name: 'Integrations', description: 'Agent integrations (e.g. Slack)' },
      { name: 'Widget', description: 'Agent widget config' },
      { name: 'Crawl Training', description: 'Train from crawls' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/domains/**/routes/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
