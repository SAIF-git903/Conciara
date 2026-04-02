/**
 * Website crawl service for onboarding Link step.
 * Fetches URLs, extracts title, description, logo, products, support/nav links,
 * and builds training-ready content. Supports multi-page crawl with options.
 */

import * as cheerio from 'cheerio';
import { prisma } from '../../db/prisma.js';

const FETCH_TIMEOUT_MS = 15000;
const MAX_BODY_LENGTH = 50000;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_CONCURRENCY = 3;

export interface CrawlResult {
  title: string | null;
  description: string | null;
  logoUrl: string | null;
  /** Training-ready text: structured for AI context/embedding (title, about, content). */
  trainingContent: string;
  /** Raw extracted metadata for storage. */
  metadata: Record<string, unknown>;
  products: Array<{ name: string; price?: string; description?: string; url: string }>;
  supportLinks: Array<{ title: string; url: string; summary: string }>;
  navLinks: Array<{ label: string; url: string }>;
  pagesCrawled: number;
  /** List of crawled page URLs (and optional titles) for UI. */
  crawledPages: Array<{ url: string; title?: string }>;
}

/** Optional config for crawlWebsite (multi-page, concurrency, priority). */
export interface CrawlOptions {
  /** Max pages to crawl (default 50). Use 1 for single-page only. */
  maxPages?: number;
  /** Concurrent fetches (default 3). */
  concurrency?: number;
  /** URL patterns (regex strings) to prioritize; earlier matches are crawled first. */
  priorityPatterns?: string[];
}

function resolveUrl(base: string, path: string): string {
  if (!path || path.startsWith('data:')) return path;
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** Return true if href is same-origin and is a reasonable page (no file extensions). */
function isSameOriginPage(baseOrigin: string, href: string): boolean {
  try {
    const u = new URL(href);
    if (u.origin !== baseOrigin) return false;
    const path = u.pathname.toLowerCase();
    const skip = /\.(pdf|zip|jpg|jpeg|png|gif|webp|svg|ico|css|js|woff2?|xml)(\?|$)/i;
    return !skip.test(path) && !href.startsWith('mailto:') && !href.startsWith('tel:');
  } catch {
    return false;
  }
}

/** Sort URLs: those matching earlier priorityPatterns first. */
function sortByPriority(urls: string[], priorityPatterns: string[]): string[] {
  if (!priorityPatterns.length) return urls;
  const copy = [...urls];
  copy.sort((a, b) => {
    for (let i = 0; i < priorityPatterns.length; i++) {
      const re = new RegExp(priorityPatterns[i], 'i');
      const aMatch = re.test(a);
      const bMatch = re.test(b);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return 0;
  });
  return copy;
}

interface PageData {
  url: string;
  title: string | null;
  trainingContent: string;
  products: CrawlResult['products'];
  supportLinks: CrawlResult['supportLinks'];
  navLinks: CrawlResult['navLinks'];
}

/** Fetch one URL and parse; throws on fetch error. */
async function fetchAndParsePage(
  url: string,
  baseOrigin: string
): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; ConciaraCrawler/1.0; +https://conciara.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  clearTimeout(timeout);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return { html, finalUrl: response.url || url };
}

/** Normalize phone to digits only; return empty if too short. Used for wa.me links. */
function phoneToWaMeDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.startsWith('0') ? digits.slice(1) : digits;
}

/** Find WhatsApp numbers in text (near keywords) and return wa.me URLs. */
function extractWhatsAppLinksFromText(text: string): string[] {
  const phoneLike = /[\+]?[\d\s\-\.\(\)]{10,20}/g;
  const links: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = /.{0,60}(whatsapp|whats\s*app|\bwa\b|chat\s+with\s+us|contact\s+us\s+on).{0,60}/gi;
  while ((m = re.exec(text)) !== null) {
    const window = m[0];
    const numbers = window.match(phoneLike) || [];
    for (const num of numbers) {
      const digits = phoneToWaMeDigits(num);
      if (digits.length >= 10) {
        const waUrl = `https://wa.me/${digits}`;
        if (!seen.has(waUrl)) {
          seen.add(waUrl);
          links.push(waUrl);
        }
      }
    }
  }
  return links;
}

/** Extract wa.me / api.whatsapp.com links from HTML. */
function extractExistingWhatsAppLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  $('a[href*="wa.me"], a[href*="api.whatsapp.com"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const u = new URL(href);
      let waNum = '';
      if (u.hostname.includes('wa.me') && u.pathname) {
        waNum = u.pathname.replace(/\//g, '').replace(/\D/g, '');
      } else if (u.hostname.includes('whatsapp.com')) {
        const phone = u.searchParams.get('phone') || u.pathname.split('/').pop() || '';
        waNum = phoneToWaMeDigits(phone);
      }
      if (waNum.length >= 10) {
        const waUrl = `https://wa.me/${waNum}`;
        if (!seen.has(waUrl)) {
          seen.add(waUrl);
          links.push(waUrl);
        }
      }
    } catch {
      // skip
    }
  });
  return links;
}

/** Extract products, support links, nav links and main content from one page HTML. */
function extractFromHtml(
  html: string,
  baseUrl: string,
  baseOrigin: string
): PageData {
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    null;

  $('script, style').remove();

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_BODY_LENGTH);
  const about =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    bodyText.slice(0, 500) ||
    null;
  const sections: string[] = [];
  if (title) sections.push(`Title: ${title}`);
  if (about) sections.push(`About: ${about}`);
  if (bodyText) sections.push(`Content:\n${bodyText}`);
  const trainingContent = sections.length ? sections.join('\n\n') : baseUrl;

  const products: CrawlResult['products'] = [];
  const seenProductUrls = new Set<string>();
  $(
    '.product, [data-product], .woocommerce .product, .product-item, [class*="product"] a[href*="/product"], .product-card'
  ).each((_, el) => {
    const $el = $(el);
    const link = $el.find('a[href]').first().attr('href') || $el.attr('href');
    const url = link ? resolveUrl(baseUrl, link) : baseUrl;
    if (seenProductUrls.has(url)) return;
    seenProductUrls.add(url);
    const name =
      $el.find('.product-title, .product-name, .title, h2, h3').first().text().trim() ||
      $el.text().trim().slice(0, 120) ||
      'Product';
    const price =
      $el.find('.price, .amount, [class*="price"]').first().text().trim() || undefined;
    const desc =
      $el.find('.description, .excerpt, .summary').first().text().trim().slice(0, 300) ||
      undefined;
    products.push({ name, price, description: desc, url });
  });
  if (products.length === 0) {
    $(`a[href*="/product/"], a[href*="/products/"]`).each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = resolveUrl(baseUrl, href);
      if (!isSameOriginPage(baseOrigin, url) || seenProductUrls.has(url)) return;
      seenProductUrls.add(url);
      const name = $(el).text().trim() || url.split('/').filter(Boolean).pop() || 'Product';
      products.push({ name, url });
    });
  }

  const supportLinks: CrawlResult['supportLinks'] = [];
  const supportSelectors =
    'a[href*="support"], a[href*="help"], a[href*="faq"], a[href*="contact"], a:contains("Support"), a:contains("Help"), a:contains("FAQ"), a:contains("Contact")';
  $(supportSelectors).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href) return;
    const url = resolveUrl(baseUrl, href);
    if (!isSameOriginPage(baseOrigin, url)) return;
    const title = $el.text().trim().slice(0, 100) || 'Support';
    supportLinks.push({ title, url, summary: '' });
  });
  const existingWa = extractExistingWhatsAppLinks($, baseUrl);
  for (const waUrl of existingWa) {
    supportLinks.push({ title: 'WhatsApp Support', url: waUrl, summary: '' });
  }
  const waFromText = extractWhatsAppLinksFromText(bodyText);
  for (const waUrl of waFromText) {
    supportLinks.push({ title: 'WhatsApp Support', url: waUrl, summary: '' });
  }
  const seenSupport = new Set<string>();
  const uniqueSupport = supportLinks.filter((s) => {
    if (seenSupport.has(s.url)) return false;
    seenSupport.add(s.url);
    return true;
  });

  const navLinks: CrawlResult['navLinks'] = [];
  const seenNav = new Set<string>();
  $('nav a[href], [role="navigation"] a[href], header a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href) return;
    const url = resolveUrl(baseUrl, href);
    if (!isSameOriginPage(baseOrigin, url) || seenNav.has(url)) return;
    seenNav.add(url);
    const label = $el.text().trim().slice(0, 80) || url;
    navLinks.push({ label, url });
  });

  return {
    url: baseUrl,
    title,
    trainingContent,
    products,
    supportLinks: uniqueSupport,
    navLinks,
  };
}

/** Crawl a single page and return CrawlResult (used as building block). */
async function crawlSinglePage(url: string): Promise<{
  data: PageData;
  finalUrl: string;
  html: string;
}> {
  const normalized = url.startsWith('http') ? url : `https://${url.replace(/^\/*/, '')}`;
  const origin = getOrigin(normalized);
  const { html, finalUrl } = await fetchAndParsePage(normalized, origin);
  const data = extractFromHtml(html, finalUrl, origin);
  return { data, finalUrl, html };
}

/** Extract same-origin page links from HTML. */
function extractLinks(html: string, baseUrl: string, baseOrigin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const resolved = resolveUrl(baseUrl, href);
    if (!isSameOriginPage(baseOrigin, resolved)) return;
    try {
      const u = new URL(resolved);
      u.hash = '';
      u.search = '';
      const clean = u.href;
      if (!seen.has(clean)) {
        seen.add(clean);
        links.push(clean);
      }
    } catch {
      // skip
    }
  });
  return links;
}

/**
 * Crawl a URL and optionally follow same-origin links. Extracts title, description,
 * logo, products, support/nav links, and builds training content.
 */
export async function crawlWebsite(
  url: string,
  options: CrawlOptions = {}
): Promise<CrawlResult> {
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES);
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const priorityPatterns = options.priorityPatterns ?? [];

  const normalized = url.startsWith('http') ? url : `https://${url.replace(/^\/*/, '')}`;
  const baseOrigin = getOrigin(normalized);

  const crawledPages: Array<{ url: string; title?: string }> = [];
  const allTrainingParts: string[] = [];
  const allProducts: CrawlResult['products'] = [];
  const productUrls = new Set<string>();
  const allSupportLinks: CrawlResult['supportLinks'] = [];
  const supportUrls = new Set<string>();
  const allNavLinks: CrawlResult['navLinks'] = [];
  const navUrls = new Set<string>();

  let title: string | null = null;
  let description: string | null = null;
  let logoUrl: string | null = null;
  const metadata: Record<string, unknown> = {
    url: normalized,
  };

  let pagesQueued = 0;
  let pagesCrawledCount = 0;
  let pagesFailed = 0;

  let seedData: PageData;
  let seedFinalUrl: string;
  let seedHtml = '';
  try {
    const result = await crawlSinglePage(normalized);
    seedData = result.data;
    seedFinalUrl = result.finalUrl;
    seedHtml = result.html;
    title = seedData.title;
    description =
      seedData.title || seedData.trainingContent.slice(0, 500) || null;
    allTrainingParts.push(seedData.trainingContent);
    crawledPages.push({ url: seedFinalUrl, title: seedData.title ?? undefined });
    pagesCrawledCount = 1;
    for (const p of seedData.products) {
      if (!productUrls.has(p.url)) {
        productUrls.add(p.url);
        allProducts.push(p);
      }
    }
    for (const s of seedData.supportLinks) {
      if (!supportUrls.has(s.url)) {
        supportUrls.add(s.url);
        allSupportLinks.push(s);
      }
    }
    for (const n of seedData.navLinks) {
      if (!navUrls.has(n.url)) {
        navUrls.add(n.url);
        allNavLinks.push(n);
      }
    }
    const $0 = cheerio.load(seedHtml);
    logoUrl =
      $0('meta[property="og:image"]').attr('content')?.trim() ||
      $0('link[rel="apple-touch-icon"]').attr('href')?.trim() ||
      $0('link[rel="icon"][type="image/png"]').attr('href')?.trim() ||
      $0('link[rel="icon"]').attr('href')?.trim() ||
      null;
    if (logoUrl) logoUrl = resolveUrl(seedFinalUrl, logoUrl);
  } catch (err) {
    console.error('[Crawl] Seed page failed:', normalized, (err as Error)?.message || err);
    pagesFailed = 1;
    const trainingContent = `Title: ${normalized}\n\nAbout: (failed to fetch)\n\nContent:\n`;
    return {
      title: null,
      description: null,
      logoUrl: null,
      trainingContent,
      metadata: { ...metadata, error: (err as Error)?.message },
      products: [],
      supportLinks: [],
      navLinks: [],
      pagesCrawled: 0,
      crawledPages: [],
    };
  }

  if (maxPages <= 1) {
    const trainingContent = allTrainingParts.join('\n\n---\n\n');
    metadata.title = title ?? undefined;
    metadata.description = description ?? undefined;
    metadata.logoUrl = logoUrl ?? undefined;
    console.log('[Crawl] Single page: 1 crawled, 0 failed');
    return {
      title,
      description,
      logoUrl,
      trainingContent,
      metadata,
      products: allProducts,
      supportLinks: allSupportLinks,
      navLinks: allNavLinks,
      pagesCrawled: pagesCrawledCount,
      crawledPages,
    };
  }

  let toCrawl = extractLinks(seedHtml, seedFinalUrl, baseOrigin).filter(
    (u) => u !== seedFinalUrl && !crawledPages.some((p) => p.url === u)
  );
  toCrawl = sortByPriority(toCrawl, priorityPatterns).slice(0, maxPages - 1);
  pagesQueued = toCrawl.length;
  console.log('[Crawl] Pages queued:', pagesQueued);

  const queue = [...toCrawl];
  const inFlight: Promise<void>[] = [];

  async function processOne(pageUrl: string): Promise<void> {
    try {
      const result = await crawlSinglePage(pageUrl);
      const d = result.data;
      crawledPages.push({ url: result.finalUrl, title: d.title ?? undefined });
      allTrainingParts.push(d.trainingContent);
      pagesCrawledCount++;
      for (const p of d.products) {
        if (!productUrls.has(p.url)) {
          productUrls.add(p.url);
          allProducts.push(p);
        }
      }
      for (const s of d.supportLinks) {
        if (!supportUrls.has(s.url)) {
          supportUrls.add(s.url);
          allSupportLinks.push(s);
        }
      }
      for (const n of d.navLinks) {
        if (!navUrls.has(n.url)) {
          navUrls.add(n.url);
          allNavLinks.push(n);
        }
      }
    } catch (err) {
      pagesFailed++;
      console.warn('[Crawl] Page failed:', pageUrl, (err as Error)?.message || err);
    }
  }

  while (queue.length > 0 || inFlight.length > 0) {
    while (inFlight.length < concurrency && queue.length > 0) {
      const pageUrl = queue.shift()!;
      const p = processOne(pageUrl).then(() => {
        const i = inFlight.indexOf(p);
        if (i !== -1) inFlight.splice(i, 1);
      });
      inFlight.push(p);
    }
    if (inFlight.length > 0) await Promise.race(inFlight);
  }

  console.log(
    '[Crawl] Pages queued:',
    pagesQueued,
    'crawled:',
    pagesCrawledCount,
    'failed:',
    pagesFailed
  );

  let trainingContent = allTrainingParts.join('\n\n---\n\n');
  const whatsAppLink = allSupportLinks.find((s) => s.url.startsWith('https://wa.me/'));
  if (whatsAppLink) {
    trainingContent += `\n\nWhatsApp Support Link: ${whatsAppLink.url} (use this as a clickable link when user asks about WhatsApp or contacting support).`;
  }
  metadata.title = title ?? undefined;
  metadata.description = description ?? undefined;
  metadata.logoUrl = logoUrl ?? undefined;
  metadata.ogTitle = undefined;
  metadata.ogDescription = undefined;
  metadata.ogImage = undefined;

  return {
    title,
    description,
    logoUrl,
    trainingContent,
    metadata,
    products: allProducts,
    supportLinks: allSupportLinks,
    navLinks: allNavLinks,
    pagesCrawled: pagesCrawledCount,
    crawledPages,
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
  pagesCrawled: number;
  crawledPages: Array<{ url: string; title?: string }>;
  products: Array<{ name: string; price?: string; description?: string; url: string }>;
  supportLinks: Array<{ title: string; url: string; summary: string }>;
  navLinks: Array<{ label: string; url: string }>;
}

/**
 * Crawl a URL and store the result for the workspace. Optionally link to an agent (Data Sources).
 */
export async function crawlAndStore(
  workspaceId: number,
  url: string,
  useCase: string = 'general',
  agentId?: number | null
): Promise<StoredCrawl> {
  const result = await crawlWebsite(url, {
    maxPages: DEFAULT_MAX_PAGES,
    concurrency: DEFAULT_CONCURRENCY,
  });
  const createData = {
    workspaceId,
    agentId: agentId ?? undefined,
    url: (result.metadata.url as string) || url,
    title: result.title,
    description: result.description,
    logoUrl: result.logoUrl,
    useCase: useCase.trim() || 'general',
    trainingContent: result.trainingContent,
    metadata: result.metadata as object,
    pagesCrawled: result.pagesCrawled,
    crawledPages: result.crawledPages as object[],
    products: result.products as object[],
    supportLinks: result.supportLinks as object[],
    navLinks: result.navLinks as object[],
  };
  const crawl = await prisma.websiteCrawl.create({
    data: createData as Parameters<typeof prisma.websiteCrawl.create>[0]['data'],
  });
  return mapDbCrawlToStoredCrawl(crawl);
}

function mapDbCrawlToStoredCrawl(c: {
  id: number;
  workspaceId: number;
  url: string;
  title: string | null;
  description: string | null;
  logoUrl: string | null;
  useCase: string;
  trainingContent: string;
  metadata: unknown;
  createdAt: Date;
  pagesCrawled?: number;
  crawledPages?: unknown;
  products?: unknown;
  supportLinks?: unknown;
  navLinks?: unknown;
}): StoredCrawl {
  return {
    id: c.id,
    workspaceId: c.workspaceId,
    url: c.url,
    title: c.title,
    description: c.description,
    logoUrl: c.logoUrl,
    useCase: c.useCase,
    trainingContent: c.trainingContent,
    metadata: (c.metadata as Record<string, unknown>) || {},
    createdAt: c.createdAt,
    pagesCrawled: typeof c.pagesCrawled === 'number' ? c.pagesCrawled : 1,
    crawledPages: Array.isArray(c.crawledPages)
      ? (c.crawledPages as Array<{ url: string; title?: string }>)
      : [],
    products: Array.isArray(c.products)
      ? (c.products as StoredCrawl['products'])
      : [],
    supportLinks: Array.isArray(c.supportLinks)
      ? (c.supportLinks as StoredCrawl['supportLinks'])
      : [],
    navLinks: Array.isArray(c.navLinks) ? (c.navLinks as StoredCrawl['navLinks']) : [],
  };
}

/**
 * List crawls for a workspace. If agentId is provided, return only crawls linked to that agent.
 */
export async function listCrawlsByWorkspace(
  workspaceId: number,
  agentId?: number | null
): Promise<StoredCrawl[]> {
  const where: { workspaceId: number; agentId?: number } = { workspaceId };
  if (agentId != null) {
    where.agentId = agentId;
  }
  const crawls = await prisma.websiteCrawl.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return crawls.map(mapDbCrawlToStoredCrawl);
}

/**
 * Delete a crawl by id; verifies workspace ownership.
 */
export async function deleteCrawl(
  crawlId: number,
  workspaceId: number
): Promise<{ deleted: boolean; agentId: number | null }> {
  const crawl = await prisma.websiteCrawl.findFirst({
    where: { id: crawlId, workspaceId },
    select: { agentId: true },
  });
  const agentId = crawl?.agentId ?? null;
  const result = await prisma.websiteCrawl.deleteMany({
    where: { id: crawlId, workspaceId },
  });
  return { deleted: result.count > 0, agentId };
}

/**
 * Assign a crawl to an agent.
 */
export async function assignCrawlToAgent(
  crawlId: number,
  workspaceId: number,
  agentId: number
): Promise<boolean> {
  const result = await prisma.websiteCrawl.updateMany({
    where: { id: crawlId, workspaceId },
    data: { agentId },
  });
  return result.count > 0;
}

/**
 * Returns true if the agent has at least one crawl created after the given date.
 */
export async function hasCrawlsAfter(agentId: number, since: Date | null): Promise<boolean> {
  if (since == null) {
    const count = await prisma.websiteCrawl.count({ where: { agentId } });
    return count > 0;
  }
  const count = await prisma.websiteCrawl.count({
    where: { agentId, createdAt: { gt: since } },
  });
  return count > 0;
}

/**
 * Number of links (pages_crawled) from crawls created after the given date.
 */
export async function getLinkCountFromCrawlsAfter(agentId: number, since: Date | null): Promise<number> {
  if (since == null) {
    const rows = await prisma.$queryRaw<{ pages_crawled: number }[]>`
      SELECT COALESCE(pages_crawled, 1) AS pages_crawled FROM website_crawls WHERE agent_id = ${agentId}
    `;
    return rows.reduce((sum, r) => sum + (Number(r.pages_crawled) || 1), 0);
  }
  const rows = await prisma.$queryRaw<{ pages_crawled: number }[]>`
    SELECT COALESCE(pages_crawled, 1) AS pages_crawled
    FROM website_crawls
    WHERE agent_id = ${agentId} AND created_at > ${since}
  `;
  return rows.reduce((sum, r) => sum + (Number(r.pages_crawled) || 1), 0);
}

/**
 * Get crawl stats for an agent (link count and total content size in bytes).
 */
export async function getCrawlStatsForAgent(agentId: number): Promise<{
  linkCount: number;
  crawlSizeBytes: number;
}> {
  const rows = await prisma.$queryRaw<{ pages_crawled: number; training_content: string }[]>`
    SELECT COALESCE(pages_crawled, 1) AS pages_crawled, training_content
    FROM website_crawls
    WHERE agent_id = ${agentId}
  `;
  let linkCount = 0;
  let crawlSizeBytes = 0;
  for (const row of rows) {
    linkCount += Number(row.pages_crawled) || 1;
    crawlSizeBytes += Buffer.byteLength(row.training_content || '', 'utf8');
  }
  return { linkCount, crawlSizeBytes };
}

/**
 * Get all crawl training content for an agent (for chat context / RAG training).
 */
export async function getCrawlTrainingContentForAgent(agentId: number): Promise<string> {
  const crawls = await prisma.websiteCrawl.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    select: { trainingContent: true, url: true, title: true },
  });
  if (crawls.length === 0) return '';
  const parts = crawls.map((c) => {
    const header = c.title ? `[${c.title}] (${c.url})` : c.url;
    return `${header}\n\n${c.trainingContent}`;
  });
  return parts.join('\n\n---\n\n');
}

/**
 * Get crawl training content only from crawls created after the given date (for incremental Retrain).
 */
export async function getCrawlTrainingContentForAgentAfter(
  agentId: number,
  after: Date
): Promise<{ content: string; linkCount: number }> {
  const rows = await prisma.$queryRaw<
    { training_content: string; url: string; title: string | null; pages_crawled: number }[]
  >`
    SELECT training_content, url, title, COALESCE(pages_crawled, 1) AS pages_crawled
    FROM website_crawls
    WHERE agent_id = ${agentId} AND created_at > ${after}
    ORDER BY created_at ASC
  `;
  if (rows.length === 0) return { content: '', linkCount: 0 };
  const parts = rows.map((r) => {
    const header = r.title ? `[${r.title}] (${r.url})` : r.url;
    return `${header}\n\n${r.training_content}`;
  });
  const linkCount = rows.reduce((sum, r) => sum + Number(r.pages_crawled || 1), 0);
  return { content: parts.join('\n\n---\n\n'), linkCount };
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
  return mapDbCrawlToStoredCrawl(crawl);
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
