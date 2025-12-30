import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dialogTreeRoutes from './routes/dialogTree.js';
import dialogNodeRoutes from './routes/dialogNode.js';
import prepromptRoutes from './routes/preprompt.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/dialog-tree', dialogTreeRoutes);
app.use('/api/dialog-node', dialogNodeRoutes);
app.use('/api/preprompt', prepromptRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Dialog Tree API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

