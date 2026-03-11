import express from 'express';
import { handlePaddleWebhook } from './webhook.js';

const router = express.Router();
router.post('/webhook', handlePaddleWebhook);
export default router;
