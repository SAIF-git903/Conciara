/**
 * Shopify integration (placeholder).
 * Add webhook handlers and OAuth flow here.
 */

import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => res.status(501).json({ integration: 'shopify', status: 'not_implemented' }));

export default router;
