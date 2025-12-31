import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dialogTreeRoutes from './routes/dialogTree.js';
import dialogNodeRoutes from './routes/dialogNode.js';
import prepromptRoutes from './routes/preprompt.js';
import customerTypeRoutes from './routes/customerType.js';
import websiteRoutes from './routes/website.js';
import skinRoutes from './routes/skin.js';
import abVariationRoutes from './routes/abVariation.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/dialog-tree', dialogTreeRoutes);
app.use('/api/dialog-node', dialogNodeRoutes);
app.use('/api/preprompt', prepromptRoutes);
app.use('/api/customer-type', customerTypeRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/skin', skinRoutes);
app.use('/api/ab-variation', abVariationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dialog Tree API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

