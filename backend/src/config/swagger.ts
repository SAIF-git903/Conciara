import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ConversaTree API',
      version: '1.0.0',
      description: 'API documentation for ConversaTree - Dialog Tree Management System',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'https://conversatreeapi.geniusai.biz',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3009',
        description: 'Local server',
      },
    ],
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
        DialogTree: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            ab_variation_id: { type: 'integer', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        DialogNode: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            tree_id: { type: 'integer' },
            parent_id: { type: 'integer', nullable: true },
            user_input: { type: 'string', nullable: true },
            bot_response: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Skin: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            website_id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            theme_config: { type: 'object' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            tree_id: { type: 'integer' },
            user_message: { type: 'string' },
            session_id: { type: 'string', nullable: true },
            user_id: { type: 'integer', nullable: true },
            use_memory: { type: 'boolean', default: true },
          },
          required: ['tree_id', 'user_message'],
        },
        ChatResponse: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            session_id: { type: 'string' },
            node_id: { type: 'integer', nullable: true },
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
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Dialog Trees', description: 'Dialog tree management' },
      { name: 'Dialog Nodes', description: 'Dialog node management' },
      { name: 'Chat', description: 'Chat message processing' },
      { name: 'Widget', description: 'Widget configuration endpoints' },
      { name: 'Skins', description: 'Skin/theming management' },
      { name: 'Websites', description: 'Website management' },
      { name: 'Customer Types', description: 'Customer type management' },
      { name: 'A/B Variations', description: 'A/B testing variations' },
      { name: 'Preprompts', description: 'Preprompt management' },
      { name: 'Conversations', description: 'Conversation history' },
      { name: 'Media', description: 'Media upload endpoints' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Trace', description: 'Tracing and debugging' },
      { name: 'Health', description: 'Health check endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/server.ts'], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);
