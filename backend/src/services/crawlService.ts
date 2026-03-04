/**
 * Website crawl service for onboarding Link step.
 * Fetches a URL, extracts title, description, logo, and builds training-ready content.
 */

import * as cheerio from 'cheerio';
import { prisma } from '../db/prisma.js';

const FETCH_TIMEOUT_MS = 15000;
const MAX_BODY_LENGTH = 50000;

export interface CrawlResult {
  title: string | null;
  description: string | null;
  logoUrl: string | null;
  /** Training-ready text: structured for AI context/embedding (title, about, content). */
  trainingContent: string;
  /** Raw extracted metadata for storage. */
  metadata: Record<string, unknown>;
}

function resolveUrl(base: string, path: string): string {
  if (!path || path.startsWith('data:')) return path;
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

/**
 * Crawl a URL and extract title, description, logo, and main content for AI training.
 */
export async function crawlWebsite(url: string): Promise<CrawlResult> {
  const normalized = url.startsWith('http') ? url : `https://${url.replace(/^\/*/, '')}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(normalized, {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; ConversaTreeCrawler/1.0; +https://conversatree.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const baseUrl = response.url || normalized;
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer for main content
  $('script, style, nav, footer, [role="navigation"], [role="banner"]').remove();

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    null;

  const description =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    null;

  let logoUrl: string | null =
    $('meta[property="og:image"]').attr('content')?.trim() ||
    $('link[rel="apple-touch-icon"]').attr('href')?.trim() ||
    $('link[rel="icon"][type="image/png"]').attr('href')?.trim() ||
    $('link[rel="icon"]').attr('href')?.trim() ||
    null;
  if (logoUrl) logoUrl = resolveUrl(baseUrl, logoUrl);

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_BODY_LENGTH);
  const about = description || (bodyText.slice(0, 500) || null);

  // Training-friendly format: clear sections for context or chunking
  const sections: string[] = [];
  if (title) sections.push(`Title: ${title}`);
  if (about) sections.push(`About: ${about}`);
  if (bodyText) sections.push(`Content:\n${bodyText}`);
  const trainingContent = sections.length ? sections.join('\n\n') : normalized;

  const metadata: Record<string, unknown> = {
    url: normalized,
    title: title ?? undefined,
    description: description ?? undefined,
    logoUrl: logoUrl ?? undefined,
    ogTitle: $('meta[property="og:title"]').attr('content') ?? undefined,
    ogDescription: $('meta[property="og:description"]').attr('content') ?? undefined,
    ogImage: $('meta[property="og:image"]').attr('content') ?? undefined,
  };

  return {
    title: title || null,
    description: description || null,
    logoUrl: logoUrl || null,
    trainingContent,
    metadata,
  };
}

export interface StoredCrawl {
  id: number;
  workspaceId: number;
  url: string;
  title: string | null;
  description: string | null;
  logoUrl: string | null;
  useCase: string;
  trainingContent: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Crawl a URL and store the result for the workspace (for onboarding; agent linked when agent is created).
 */
export async function crawlAndStore(
  workspaceId: number,
  url: string,
  useCase: string = 'general'
): Promise<StoredCrawl> {
  const result = await crawlWebsite(url);
  const crawl = await prisma.websiteCrawl.create({
    data: {
      workspaceId,
      url: result.metadata.url as string,
      title: result.title,
      description: result.description,
      logoUrl: result.logoUrl,
      useCase: useCase.trim() || 'general',
      trainingContent: result.trainingContent,
      metadata: result.metadata as object,
    },
  });
  return {
    id: crawl.id,
    workspaceId: crawl.workspaceId,
    url: crawl.url,
    title: crawl.title,
    description: crawl.description,
    logoUrl: crawl.logoUrl,
    useCase: crawl.useCase,
    trainingContent: crawl.trainingContent,
    metadata: (crawl.metadata as Record<string, unknown>) || {},
    createdAt: crawl.createdAt,
  };
}

/**
 * Get the latest crawl for a workspace (for onboarding Configure step prefill).
 */
export async function getLatestCrawlForWorkspace(workspaceId: number): Promise<StoredCrawl | null> {
  const crawl = await prisma.websiteCrawl.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  if (!crawl) return null;
  return {
    id: crawl.id,
    workspaceId: crawl.workspaceId,
    url: crawl.url,
    title: crawl.title,
    description: crawl.description,
    logoUrl: crawl.logoUrl,
    useCase: crawl.useCase,
    trainingContent: crawl.trainingContent,
    metadata: (crawl.metadata as Record<string, unknown>) || {},
    createdAt: crawl.createdAt,
  };
}

/**
 * Link the latest unlinked crawl for a workspace to an agent (call after creating the agent).
 */
export async function linkLatestCrawlToAgent(
  workspaceId: number,
  agentId: number
): Promise<void> {
  const latest = await prisma.websiteCrawl.findFirst({
    where: { workspaceId, agentId: null },
    orderBy: { createdAt: 'desc' },
  });
  if (latest) {
    await prisma.websiteCrawl.update({
      where: { id: latest.id },
      data: { agentId },
    });
  }
}
