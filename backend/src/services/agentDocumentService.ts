/**
 * Agent documents: upload metadata, parse files, chunk, embed, and store for RAG.
 * Uses Prisma for all document and chunk CRUD. Embedding column is updated via $executeRaw (pgvector).
 */

import { prisma } from '../db/prisma.js';
import { generateEmbedding } from './embeddingService.js';
import {
  extractText,
  chunkText,
  estimateTokenCount,
  isSupportedMimeType,
} from './documentParserService.js';

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

  const { extractText } = await import('./documentParserService.js');
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
  content: string
): Promise<void> {
  const chunks = chunkText(content);
  if (chunks.length === 0) {
    await prisma.agentDocument.update({
      where: { id: documentId },
      data: { status: 'ready', chunkCount: 0, errorMessage: null, updatedAt: new Date() },
    });
    return;
  }

  const hasVector = await checkVectorExtension();

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    const tokenCount = estimateTokenCount(chunkContent);
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
        tokenCount,
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
  }

  await prisma.agentDocument.update({
    where: { id: documentId },
    data: { status: 'ready', chunkCount: chunks.length, errorMessage: null, updatedAt: new Date() },
  });
}

/**
 * Train all pending documents for an agent (chunk + embed from stored content). Returns count trained.
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

export async function listDocumentsByAgent(agentId: number): Promise<AgentDocument[]> {
  const list = await prisma.agentDocument.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
  });
  return list.map(mapDocument);
}

export async function getDocumentById(documentId: number): Promise<AgentDocument | null> {
  const doc = await prisma.agentDocument.findUnique({ where: { id: documentId } });
  return doc ? mapDocument(doc) : null;
}

export async function deleteDocument(documentId: number, agentId: number): Promise<boolean> {
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
