import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
// Import connection early to validate DATABASE_URL
import './db/connection.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import apiKeyRoutes from './routes/apiKeys.js';
import workspaceRoutes, { handlePublicAgentChatStream } from './routes/workspaces.js';
import slackEventsRouter from './routes/slackEvents.js';
import { prisma } from './db/prisma.js';
import { SUPPORTED_LLM_MODELS } from './services/llmService.js';
import { injectPresignedWidgetHeaderIcon } from './services/s3Service.js';
import { getBypassUsers, getUserById, updateLastLogin } from './services/userService.js';
import { getWorkspacesForUser } from './services/workspaceService.js';
import { generateJWT, generateRefreshToken } from './services/authService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow all localhost ports for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or iframe from same origin)
    if (!origin) return callback(null, true);
    
    // Allow all localhost ports for development
    if (origin.match(/^http:\/\/localhost:\d+$/) || 
        origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
      return callback(null, true);
    }
    
    // In production, you'd want to whitelist specific origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Slack Events API needs raw body for signature verification (must be before express.json())
app.use('/api/integrations/slack', express.raw({ type: 'application/json' }), slackEventsRouter);

app.use(express.json());

// Bypass login (no secret; remove later for production)
app.get('/api/auth/bypass-users', async (req, res) => {
  try {
    const users = await getBypassUsers();
    return res.json({ users });
  } catch (error: any) {
    console.error('Bypass users error:', error);
    return res.status(500).json({ error: 'Failed to load bypass users' });
  }
});
app.post('/api/auth/bypass', async (req, res) => {
  const userId = req.body?.userId;
  if (userId == null) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const user = await getUserById(Number(userId));
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ error: 'User is disabled' });
    await updateLastLogin(user.id);
    const workspaces = await getWorkspacesForUser(user.id);
    const token = generateJWT({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
    return res.json({
      token,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, workspaces },
    });
  } catch (error: any) {
    console.error('Bypass login error:', error);
    return res.status(500).json({ error: 'Bypass login failed' });
  }
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ConversaTree API Documentation',
}));

// Routes (JSON body)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/workspaces', workspaceRoutes);

app.get('/api/models', (_req, res) => {
  res.json({ models: SUPPORTED_LLM_MODELS.map((m) => ({ id: m.id, label: m.label })) });
});

/** Public: get widget config for embed. Query: workspaceId, agentId. No auth. */
app.get('/api/public/widget-config', async (req, res) => {
  try {
    const workspaceId = parseInt(String(req.query.workspaceId ?? ''), 10);
    const agentId = parseInt(String(req.query.agentId ?? ''), 10);
    if (!workspaceId || !agentId || isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'workspaceId and agentId are required' });
    }
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { widgetConfig: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    let config = agent.widgetConfig as Record<string, unknown> | null;
    config = await injectPresignedWidgetHeaderIcon(config);
    res.json({ config: config ?? null });
  } catch (error: any) {
    console.error('Public widget config error:', error);
    res.status(500).json({ error: 'Failed to load widget config' });
  }
});

/** Public embed: chat stream. No auth; requires agent.widgetConfig.allowPublicEmbed. */
app.post('/api/public/workspaces/:workspaceId/agents/:agentId/chat/stream', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    await handlePublicAgentChatStream(workspaceId, agentId, req.body, res);
  } catch (error: any) {
    console.error('Public chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Chat failed' });
    } else {
      res.end();
    }
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Dialog Tree API is running
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dialog Tree API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

