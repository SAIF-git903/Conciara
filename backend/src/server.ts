import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Media routes BEFORE express.json() so file uploads (multipart/form-data) are
// handled by multer only — express.json() must not parse multipart bodies.
app.use('/api/media', mediaRoutes);

app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dialog Tree API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

