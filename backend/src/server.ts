import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
// Import connection early to validate DATABASE_URL
import './db/connection.js';
import dialogTreeRoutes from './routes/dialogTree.js';
import dialogNodeRoutes from './routes/dialogNode.js';
import prepromptRoutes from './routes/preprompt.js';
import customerTypeRoutes from './routes/customerType.js';
import websiteRoutes from './routes/website.js';
import skinRoutes from './routes/skin.js';
import abVariationRoutes from './routes/abVariation.js';
import chatRoutes from './routes/chat.js';
import widgetRoutes from './routes/widget.js';
import traceRoutes from './routes/trace.js';
import conversationRoutes from './routes/conversations.js';
import mediaRoutes from './routes/media.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import apiKeyRoutes from './routes/apiKeys.js';
import v2WorkspaceRoutes from './routes/v2Workspaces.js';
import { prisma } from './db/prisma.js';
import { SUPPORTED_LLM_MODELS } from './services/llmService.js';
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

// Media routes BEFORE express.json() so file uploads (multipart/form-data) are
// handled by multer only — express.json() must not parse multipart bodies.
app.use('/api/media', mediaRoutes);

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
app.use('/api/dialog-tree', dialogTreeRoutes);
app.use('/api/dialog-node', dialogNodeRoutes);
app.use('/api/preprompt', prepromptRoutes);
app.use('/api/customer-type', customerTypeRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/skin', skinRoutes);
app.use('/api/ab-variation', abVariationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/trace', traceRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/v2/workspaces', v2WorkspaceRoutes);

app.get('/api/v2/models', (_req, res) => {
  res.json({ models: SUPPORTED_LLM_MODELS.map((m) => ({ id: m.id, label: m.label })) });
});

/** Public: get widget (skin) config for v2 embed. Query: workspaceId, agentId. No auth. */
app.get('/api/v2/public/widget-config', async (req, res) => {
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
    const config = agent.widgetConfig as Record<string, unknown> | null;
    res.json({ config: config ?? null });
  } catch (error: any) {
    console.error('Public widget config error:', error);
    res.status(500).json({ error: 'Failed to load widget config' });
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

