/**
 * WhatsApp Business API integration (placeholder).
 * Add webhook verification and message handlers here.
 */

import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => res.status(501).json({ integration: 'whatsapp', status: 'not_implemented' }));

export default router;
