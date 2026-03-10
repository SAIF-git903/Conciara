/**
 * Agent documents: upload metadata, parse files, chunk, embed, and store for RAG.
 * Uses Prisma for all document and chunk CRUD. Embedding column is updated via $executeRaw (pgvector).
 */

import { prisma } from '../../../db/prisma.js';
import { generateEmbedding } from '../../../shared/embedding.service.js';
import {
  extractText,
  chunkText,
  estimateTokenCount,
  isSupportedMimeType,
} from '../../../shared/documentParser.service.js';

let hasVectorExtension: boolean | null = null;

async function checkVectorExtension(): Promise<boolean> {
  if (hasVectorExtension !== null) return Boolean(hasVectorExtension);
  try {
    const result = await prisma.$queryRaw<[{ has_vector: boolean | null }]>`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector
    `;
    hasVectorExtension = result[0]?.has_vector ?? false;
    return Boolean(hasVectorExtension);
  } catch {
    hasVectorExtension = false;
    return false;
  }
}

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

/** File name used for the synthetic document that holds trained website crawl content. */
export const WEBSITE_CRAWL_DOCUMENT_NAME = 'Website crawl';

export interface AgentDocument {
  id: number;
  agentId: number;
  workspaceId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a document record and extract text only (status 'pending'). LLM is not aware until Train is run.
 */
export async function createAndProcessDocument(
  agentId: number,
  workspaceId: number,
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<AgentDocument> {
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Use PDF, DOCX, TXT, or MD.`);
  }

  const fileSize = buffer.length;
  const doc = await prisma.agentDocument.create({
    data: {
      agentId,
      workspaceId,
      fileName,
      fileSize: BigInt(fileSize),
      mimeType,
      status: 'pending',
    },
  });

  const text = await extractText(buffer, mimeType);
  if (!text?.trim()) {
    await prisma.agentDocument.update({
      where: { id: doc.id },
      data: { status: 'failed', errorMessage: 'No text could be extracted from the file', updatedAt: new Date() },
    });
    const updated = await prisma.agentDocument.findUniqueOrThrow({ where: { id: doc.id } });
    return mapDocument(updated);
  }

  await prisma.agentDocument.update({
    where: { id: doc.id },
    data: { content: text.trim(), updatedAt: new Date() },
  });

  const final = await prisma.agentDocument.findUniqueOrThrow({ where: { id: doc.id } });
  return mapDocument(final);
}

/**
 * Process one document from stored content: chunk, embed, store chunks. Used by Train.
 */
async function processDocumentFromContent(
  documentId: number,
  agentId: number,
  content: string,
  onProgress?: (trainedChunks: number, totalChunks: number, cumulativeSizeBytes: number) => void
): Promise<void> {
  const chunks = chunkText(content);
  const totalChunks = chunks.length;
  if (totalChunks === 0) {
    await prisma.agentDocument.update({
      where: { id: documentId },
      data: { status: 'ready', chunkCount: 0, errorMessage: null, updatedAt: new Date() },
    });
    return;
  }

  const hasVector = await checkVectorExtension();
  let cumulativeSizeBytes = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    cumulativeSizeBytes += Buffer.byteLength(chunkContent, 'utf8');
    const embedding = await generateEmbedding(chunkContent);
    const embeddingValue = embedding
      ? hasVector
        ? `[${embedding.join(',')}]`
        : JSON.stringify(embedding)
      : null;

    const chunk = await prisma.agentDocumentChunk.create({
      data: {
        documentId,
        agentId,
        chunkIndex: i,
        content: chunkContent,
        tokenCount: estimateTokenCount(chunkContent),
      },
    });

    if (embeddingValue) {
      if (hasVector) {
        await prisma.$executeRawUnsafe(
          'UPDATE agent_document_chunks SET embedding = $1::vector WHERE id = $2',
          embeddingValue,
          chunk.id
        );
      } else {
        await prisma.$executeRawUnsafe(
          'UPDATE agent_document_chunks SET embedding = $1 WHERE id = $2',
          embeddingValue,
          chunk.id
        );
      }
    }
    onProgress?.(i + 1, totalChunks, cumulativeSizeBytes);
  }

  await prisma.agentDocument.update({
    where: { id: documentId },
    data: { status: 'ready', chunkCount: chunks.length, errorMessage: null, updatedAt: new Date() },
  });
}

/**
 * Append new crawl content to an existing Website crawl document (incremental Retrain).
 */
export async function appendCrawlContentToAgentDocument(
  agentId: number,
  newContent: string,
  newLinkCount: number,
  onProgress?: (trainedChunks: number, totalChunks: number, cumulativeSizeBytes: number) => void
): Promise<{ chunkCountAdded: number }> {
  const content = newContent?.trim() || '';
  if (!content) return { chunkCountAdded: 0 };

  const doc = await prisma.agentDocument.findFirst({
    where: { agentId, fileName: WEBSITE_CRAWL_DOCUMENT_NAME, status: 'ready' },
    select: { id: true, content: true, chunkCount: true, fileSize: true, trainedLinkCount: true },
  });
  if (!doc) return { chunkCountAdded: 0 };

  const chunks = chunkText(content);
  if (chunks.length === 0) return { chunkCountAdded: 0 };

  const hasVector = await checkVectorExtension();
  const baseIndex = doc.chunkCount;
  const existingSize = Number(doc.fileSize);
  const newContentSize = Buffer.byteLength(content, 'utf8');
  let cumulativeSizeBytes = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    cumulativeSizeBytes += Buffer.byteLength(chunkContent, 'utf8');
    const embedding = await generateEmbedding(chunkContent);
    const embeddingValue = embedding
      ? hasVector
        ? `[${embedding.join(',')}]`
        : JSON.stringify(embedding)
      : null;

    const chunk = await prisma.agentDocumentChunk.create({
      data: {
        documentId: doc.id,
        agentId,
        chunkIndex: baseIndex + i,
        content: chunkContent,
        tokenCount: estimateTokenCount(chunkContent),
      },
    });

    if (embeddingValue) {
      if (hasVector) {
        await prisma.$executeRawUnsafe(
          'UPDATE agent_document_chunks SET embedding = $1::vector WHERE id = $2',
          embeddingValue,
          chunk.id
        );
      } else {
        await prisma.$executeRawUnsafe(
          'UPDATE agent_document_chunks SET embedding = $1 WHERE id = $2',
          embeddingValue,
          chunk.id
        );
      }
    }
    onProgress?.(i + 1, chunks.length, cumulativeSizeBytes);
  }

  const newTrainedLinkCount = (doc.trainedLinkCount ?? 0) + newLinkCount;
  await prisma.agentDocument.update({
    where: { id: doc.id },
    data: {
      content: (doc.content || '') + '\n\n---\n\n' + content,
      fileSize: BigInt(existingSize + newContentSize),
      chunkCount: baseIndex + chunks.length,
      trainedLinkCount: newTrainedLinkCount,
      updatedAt: new Date(),
    },
  });

  return { chunkCountAdded: chunks.length };
}

/**
 * Delete any existing "Website crawl" documents for this agent.
 */
export async function deleteWebsiteCrawlDocuments(agentId: number): Promise<number> {
  const result = await prisma.agentDocument.deleteMany({
    where: { agentId, fileName: WEBSITE_CRAWL_DOCUMENT_NAME },
  });
  return result.count;
}

/**
 * Train website crawl content for an agent: create a synthetic document, chunk and embed.
 */
export async function trainCrawlContentForAgent(
  agentId: number,
  workspaceId: number,
  crawlContent: string
): Promise<{ trained: number; chunkCount: number }> {
  const content = crawlContent?.trim() || '';
  if (!content) return { trained: 0, chunkCount: 0 };

  await deleteWebsiteCrawlDocuments(agentId);

  const doc = await prisma.agentDocument.create({
    data: {
      agentId,
      workspaceId,
      fileName: WEBSITE_CRAWL_DOCUMENT_NAME,
      fileSize: BigInt(Buffer.byteLength(content, 'utf8')),
      mimeType: 'text/plain',
      status: 'pending',
      content,
    },
  });

  try {
    await prisma.agentDocument.update({
      where: { id: doc.id },
      data: { status: 'processing', updatedAt: new Date() },
    });
    await processDocumentFromContent(doc.id, agentId, content, undefined);
  } catch (err: unknown) {
    const msg = (err as Error)?.message?.slice(0, 1000) || 'Training failed';
    await prisma.agentDocument.update({
      where: { id: doc.id },
      data: { status: 'failed', errorMessage: msg, updatedAt: new Date() },
    });
    throw err;
  }

  const updated = await prisma.agentDocument.findUnique({
    where: { id: doc.id },
    select: { chunkCount: true },
  });
  return { trained: 1, chunkCount: updated?.chunkCount ?? 0 };
}

/**
 * Same as trainCrawlContentForAgent but with progress callback.
 */
export async function trainCrawlContentForAgentWithProgress(
  agentId: number,
  workspaceId: number,
  crawlContent: string,
  onProgress: (trainedChunks: number, totalChunks: number, cumulativeSizeBytes: number) => void
): Promise<{ trained: number; chunkCount: number }> {
  const content = crawlContent?.trim() || '';
  if (!content) return { trained: 0, chunkCount: 0 };

  await deleteWebsiteCrawlDocuments(agentId);

  const doc = await prisma.agentDocument.create({
    data: {
      agentId,
      workspaceId,
      fileName: WEBSITE_CRAWL_DOCUMENT_NAME,
      fileSize: BigInt(Buffer.byteLength(content, 'utf8')),
      mimeType: 'text/plain',
      status: 'pending',
      content,
    },
  });

  try {
    await prisma.agentDocument.update({
      where: { id: doc.id },
      data: { status: 'processing', updatedAt: new Date() },
    });
    await processDocumentFromContent(doc.id, agentId, content, onProgress);
  } catch (err: unknown) {
    const msg = (err as Error)?.message?.slice(0, 1000) || 'Training failed';
    await prisma.agentDocument.update({
      where: { id: doc.id },
      data: { status: 'failed', errorMessage: msg, updatedAt: new Date() },
    });
    throw err;
  }

  const updated = await prisma.agentDocument.findUnique({
    where: { id: doc.id },
    select: { chunkCount: true },
  });
  return { trained: 1, chunkCount: updated?.chunkCount ?? 0 };
}

export async function getWebsiteCrawlTrainedStats(agentId: number): Promise<{
  trainedSizeBytes: number | null;
  lastTrainedAt: string | null;
  trainedLinkCount: number | null;
}> {
  const doc = await prisma.agentDocument.findFirst({
    where: { agentId, fileName: WEBSITE_CRAWL_DOCUMENT_NAME, status: 'ready' },
    select: { fileSize: true, updatedAt: true, trainedLinkCount: true },
  });
  if (!doc) return { trainedSizeBytes: null, lastTrainedAt: null, trainedLinkCount: null };
  return {
    trainedSizeBytes: Number(doc.fileSize),
    lastTrainedAt: doc.updatedAt.toISOString(),
    trainedLinkCount: doc.trainedLinkCount ?? null,
  };
}

export async function setWebsiteCrawlTrainedLinkCount(agentId: number, linkCount: number): Promise<void> {
  await prisma.agentDocument.updateMany({
    where: { agentId, fileName: WEBSITE_CRAWL_DOCUMENT_NAME },
    data: { trainedLinkCount: linkCount },
  });
}

/**
 * Train all pending documents for an agent.
 */
export async function trainPendingDocuments(agentId: number): Promise<number> {
  const pending = await prisma.agentDocument.findMany({
    where: { agentId, status: 'pending', content: { not: null } },
    select: { id: true, agentId: true, content: true },
  });

  let trained = 0;
  for (const doc of pending) {
    const content = doc.content;
    if (!content) continue;
    try {
      await prisma.agentDocument.update({
        where: { id: doc.id },
        data: { status: 'processing', errorMessage: null, updatedAt: new Date() },
      });
      await processDocumentFromContent(doc.id, doc.agentId, content);
      trained++;
    } catch (err: unknown) {
      const msg = (err as Error)?.message?.slice(0, 1000) || 'Training failed';
      await prisma.agentDocument.update({
        where: { id: doc.id },
        data: { status: 'failed', errorMessage: msg, updatedAt: new Date() },
      });
    }
  }
  return trained;
}

/**
 * List file-based documents for an agent (excludes synthetic "Website crawl").
 */
export async function listDocumentsByAgent(agentId: number): Promise<AgentDocument[]> {
  const list = await prisma.agentDocument.findMany({
    where: {
      agentId,
      fileName: { not: WEBSITE_CRAWL_DOCUMENT_NAME },
    },
    orderBy: { createdAt: 'desc' },
  });
  return list.map(mapDocument);
}

export async function getDocumentById(documentId: number): Promise<AgentDocument | null> {
  const doc = await prisma.agentDocument.findUnique({ where: { id: documentId } });
  return doc ? mapDocument(doc) : null;
}

export async function deleteDocument(documentId: number, agentId: number): Promise<boolean> {
  const doc = await prisma.agentDocument.findFirst({
    where: { id: documentId, agentId },
    select: { fileName: true },
  });
  if (!doc) return false;
  if (doc.fileName === WEBSITE_CRAWL_DOCUMENT_NAME) return false;
  const result = await prisma.agentDocument.deleteMany({
    where: { id: documentId, agentId },
  });
  return result.count > 0;
}

function mapDocument(
  r: {
    id: number;
    agentId: number;
    workspaceId: number;
    fileName: string;
    fileSize: bigint;
    mimeType: string;
    status: string;
    errorMessage: string | null;
    chunkCount: number;
    createdAt: Date;
    updatedAt: Date;
  }
): AgentDocument {
  return {
    id: r.id,
    agentId: r.agentId,
    workspaceId: r.workspaceId,
    fileName: r.fileName,
    fileSize: Number(r.fileSize),
    mimeType: r.mimeType,
    status: r.status as DocumentStatus,
    errorMessage: r.errorMessage,
    chunkCount: r.chunkCount,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
