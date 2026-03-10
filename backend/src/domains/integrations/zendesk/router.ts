/**
 * Zendesk integration (placeholder).
 * Add webhooks and API handlers here.
 */

import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => res.status(501).json({ integration: 'zendesk', status: 'not_implemented' }));

export default router;
