import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import './db/connection.js';
import apiKeyRoutes from './domains/auth/routes/api-keys.routes.js';
import authRoutes from './domains/auth/routes/auth.routes.js';
import integrationsRouter from './domains/integrations/index.js';
import userRoutes from './domains/users/routes/users.routes.js';
import workspaceRoutes from './domains/workspace/routes/index.js';
import publicRoutes from './routes/public.routes.js';
import { setupSocketHandlers } from './socket/connectionHandler.js';
import { setSocketIo } from './socket/index.js';

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
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// Paddle hosted checkout success redirect: Paddle sends user to backend URL with ?price_id=&workspace_id=&transaction_id=...
// Redirect to frontend billing page so user sees success state instead of "Cannot GET /"
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
app.get('/', (req, res) => {
  const workspaceId = req.query.workspace_id ?? req.query.workspaceId;
  if (workspaceId != null && String(workspaceId).trim() !== '') {
    const id = String(workspaceId).trim();
    return res.redirect(302, `${FRONTEND_URL}/dashboard/${id}/settings/billing?checkout_success=1`);
  }
  res.status(404).json({ error: 'Not found' });
});

// Integrations (webhooks, OAuth callbacks) need raw body for signature verification (must be before express.json())
app.use('/api/integrations', express.raw({ type: 'application/json' }), integrationsRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api', publicRoutes);

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: true, credentials: true },
  path: '/socket.io',
});
setSocketIo(io);
setupSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

