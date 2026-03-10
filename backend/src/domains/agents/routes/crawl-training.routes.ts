/**
 * Crawl stats and train-from-crawls. Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { canManageAgent } from '../agent.service.js';
import { prisma } from '../../../db/prisma.js';
import {
  getCrawlTrainingContentForAgent,
  getCrawlTrainingContentForAgentAfter,
  getCrawlStatsForAgent,
  hasCrawlsAfter,
  getLinkCountFromCrawlsAfter,
} from '../../websites/crawl.service.js';
import {
  trainCrawlContentForAgentWithProgress,
  appendCrawlContentToAgentDocument,
  getWebsiteCrawlTrainedStats,
  setWebsiteCrawlTrainedLinkCount,
} from '../../training/services/document.service.js';
import { getSocketIo, agentRoom } from '../../../socket/index.js';

const router = express.Router();

const crawlTrainingProgress = new Map<
  number,
  { trainedSizeBytesSoFar: number; trainedLinksSoFar: number; totalLinks: number }
>();

router.get('/:workspaceId/agents/:agentId/crawl-stats', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { linkCount, crawlSizeBytes } = await getCrawlStatsForAgent(agentId);
    const { trainedSizeBytes, lastTrainedAt, trainedLinkCount } = await getWebsiteCrawlTrainedStats(agentId);
    const progress = crawlTrainingProgress.get(agentId);

    const lastTrainedAtDate = lastTrainedAt ? new Date(lastTrainedAt) : null;
    const hasNewCrawlsSinceTrain = await hasCrawlsAfter(agentId, lastTrainedAtDate);
    const hasUnappliedChanges =
      linkCount > 0 &&
      (trainedLinkCount === null ||
        trainedLinkCount === undefined ||
        linkCount !== trainedLinkCount ||
        hasNewCrawlsSinceTrain);

    const linksNotFedCount = hasNewCrawlsSinceTrain
      ? await getLinkCountFromCrawlsAfter(agentId, lastTrainedAtDate)
      : Math.max(0, linkCount - (trainedLinkCount ?? 0));

    return res.json({
      linkCount,
      crawlSizeBytes,
      totalLimitBytes: null,
      trainedSizeBytes: trainedSizeBytes ?? null,
      lastTrainedAt: lastTrainedAt ?? null,
      trainedLinkCount: trainedLinkCount ?? null,
      hasUnappliedChanges,
      linksNotFedCount,
      trainingInProgress: !!progress,
      trainedSizeBytesSoFar: progress?.trainedSizeBytesSoFar ?? null,
      trainedLinksSoFar: progress?.trainedLinksSoFar ?? null,
      totalLinksProgress: progress?.totalLinks ?? null,
    });
  } catch (error: any) {
    console.error('Crawl stats error:', error);
    res.status(500).json({ error: 'Failed to get crawl stats', details: error?.message });
  }
});

router.post('/:workspaceId/agents/:agentId/train-from-crawls', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (crawlTrainingProgress.has(agentId)) {
      return res.status(409).json({ error: 'Training already in progress for this agent.' });
    }

    const { trainedSizeBytes: existingSize, lastTrainedAt, trainedLinkCount: baseTrainedLinkCount } =
      await getWebsiteCrawlTrainedStats(agentId);
    const lastTrainedAtDate = lastTrainedAt ? new Date(lastTrainedAt) : null;
    const { content: newContent, linkCount: newLinkCount } =
      lastTrainedAtDate != null
        ? await getCrawlTrainingContentForAgentAfter(agentId, lastTrainedAtDate)
        : { content: '', linkCount: 0 };

    const hasExistingDoc = lastTrainedAt != null;

    if (hasExistingDoc && newContent?.trim()) {
      const baseSize = existingSize ?? 0;
      const totalLinksAfter = (baseTrainedLinkCount ?? 0) + newLinkCount;
      crawlTrainingProgress.set(agentId, {
        trainedSizeBytesSoFar: baseSize,
        trainedLinksSoFar: baseTrainedLinkCount ?? 0,
        totalLinks: totalLinksAfter,
      });
      res.json({ started: true, message: 'Training started (feeding new links only). Poll crawl-stats for progress.' });

      setImmediate(async () => {
        try {
          await appendCrawlContentToAgentDocument(
            agentId,
            newContent,
            newLinkCount,
            (trainedChunks, totalChunks, cumulativeSizeBytes) => {
              const baseTrained = baseTrainedLinkCount ?? 0;
              const trainedLinksSoFar =
                totalChunks > 0
                  ? baseTrained + Math.min(newLinkCount, Math.round((trainedChunks / totalChunks) * newLinkCount))
                  : baseTrained;
              crawlTrainingProgress.set(agentId, {
                trainedSizeBytesSoFar: baseSize + cumulativeSizeBytes,
                trainedLinksSoFar,
                totalLinks: totalLinksAfter,
              });
              const io = getSocketIo();
              if (io) {
                io.to(agentRoom(agentId)).emit('crawl-training-progress', {
                  agentId,
                  trainedLinksSoFar: trainedLinksSoFar,
                  totalLinks: totalLinksAfter,
                  trainedSizeBytesSoFar: baseSize + cumulativeSizeBytes,
                });
              }
            }
          );
          await setWebsiteCrawlTrainedLinkCount(agentId, totalLinksAfter);
        } catch (err) {
          console.error('Train from crawls background error:', err);
          const io = getSocketIo();
          if (io) io.to(agentRoom(agentId)).emit('crawl-training-error', { agentId, message: (err as Error)?.message });
        } finally {
          const io = getSocketIo();
          if (io) io.to(agentRoom(agentId)).emit('crawl-training-complete', { agentId });
          crawlTrainingProgress.delete(agentId);
        }
      });
      return;
    }

    if (hasExistingDoc && !newContent?.trim()) {
      return res.json({ started: false, message: 'No new links to feed.' });
    }

    const crawlContent = await getCrawlTrainingContentForAgent(agentId);
    if (!crawlContent?.trim()) {
      return res.json({ started: false, message: 'No crawl content to train.' });
    }

    const { linkCount: totalLinks } = await getCrawlStatsForAgent(agentId);
    crawlTrainingProgress.set(agentId, {
      trainedSizeBytesSoFar: 0,
      trainedLinksSoFar: 0,
      totalLinks: Math.max(1, totalLinks),
    });
    res.json({ started: true, message: 'Training started. Poll crawl-stats for progress.' });

    setImmediate(async () => {
      try {
        await trainCrawlContentForAgentWithProgress(
          agentId,
          workspaceId,
          crawlContent,
          (trainedChunks, totalChunks, cumulativeSizeBytes) => {
            const cur = crawlTrainingProgress.get(agentId);
            const totalLinksForProgress = cur?.totalLinks ?? Math.max(1, totalLinks);
            const trainedLinksSoFar =
              totalChunks > 0
                ? Math.min(totalLinksForProgress, Math.round((trainedChunks / totalChunks) * totalLinksForProgress))
                : 0;
            crawlTrainingProgress.set(agentId, {
              trainedSizeBytesSoFar: cumulativeSizeBytes,
              trainedLinksSoFar,
              totalLinks: totalLinksForProgress,
            });
            const io = getSocketIo();
            if (io) {
              io.to(agentRoom(agentId)).emit('crawl-training-progress', {
                agentId,
                trainedLinksSoFar,
                totalLinks: totalLinksForProgress,
                trainedSizeBytesSoFar: cumulativeSizeBytes,
              });
            }
          }
        );
        const { linkCount: finalLinkCount } = await getCrawlStatsForAgent(agentId);
        await setWebsiteCrawlTrainedLinkCount(agentId, finalLinkCount);
      } catch (err) {
        console.error('Train from crawls background error:', err);
        const io = getSocketIo();
        if (io) io.to(agentRoom(agentId)).emit('crawl-training-error', { agentId, message: (err as Error)?.message });
      } finally {
        const io = getSocketIo();
        if (io) io.to(agentRoom(agentId)).emit('crawl-training-complete', { agentId });
        crawlTrainingProgress.delete(agentId);
      }
    });
  } catch (error: any) {
    console.error('Train from crawls error:', error);
    res.status(500).json({ error: 'Training failed', details: (error as Error)?.message });
  }
});

export default router;
