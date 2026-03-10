/**
 * Integrations domain: third-party webhooks, OAuth callbacks, and event handlers.
 * Mirrors the UI "integrations" / "connected apps" module.
 * Mount path: /api/integrations/<name> (e.g. /api/integrations/slack).
 */

import express from 'express';
import slackRouter from './slack/router.js';

const router = express.Router();

router.use('/slack', slackRouter);

// Future: router.use('/whatsapp', whatsappRouter);
// Future: router.use('/shopify', shopifyRouter);
// Future: router.use('/zendesk', zendeskRouter);

export default router;
export { default as slackRouter } from './slack/router.js';
