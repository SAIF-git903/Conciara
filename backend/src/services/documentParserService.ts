/**
 * Extract plain text from uploaded files for RAG ingestion.
 * Supports PDF, DOCX, TXT, MD. Uses optional deps for PDF/DOCX.
 */

const UTF8_MIMES = ['text/plain', 'text/markdown', 'application/json'];
const PDF_MIMES = ['application/pdf'];
const DOCX_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

/** Approximate: 1 token ~ 4 chars for English. */
const CHARS_PER_TOKEN = 4;
const MAX_CHUNK_TOKENS = 500;
const OVERLAP_TOKENS = 50;
const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

export function getSupportedMimeTypes(): string[] {
  return [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
}

export function isSupportedMimeType(mime: string): boolean {
  const supported = getSupportedMimeTypes();
  return supported.includes(mime?.toLowerCase());
}

/**
 * Extract text from buffer by mime type.
 */
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  const mime = (mimeType || '').toLowerCase().split(';')[0].trim();

  if (UTF8_MIMES.some((m) => mime === m)) {
    return buffer.toString('utf-8');
  }

  if (PDF_MIMES.includes(mime)) {
    return extractPdfText(buffer);
  }

  if (DOCX_MIMES.includes(mime)) {
    return extractDocxText(buffer);
  }

  // Fallback: try utf-8
  return buffer.toString('utf-8');
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse').catch(() => null);
    if (!pdfParse?.default) {
      throw new Error('pdf-parse not installed. Run: npm install pdf-parse');
    }
    const data = await pdfParse.default(buffer);
    return (data?.text || '').trim();
  } catch (err: any) {
    throw new Error(`PDF extraction failed: ${err?.message || 'Unknown error'}`);
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth').catch(() => null);
    if (!mammoth?.extractRawText) {
      throw new Error('mammoth not installed. Run: npm install mammoth');
    }
    const result = await mammoth.extractRawText({ buffer });
    return (result?.value || '').trim();
  } catch (err: any) {
    throw new Error(`DOCX extraction failed: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Split text into overlapping chunks suitable for embedding and RAG.
 * Tries to break on paragraph then sentence boundaries to avoid mid-sentence cuts.
 */
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  const paragraphs = normalized.split(/\n\s*\n/);

  let currentChunk = '';
  let currentLength = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentLength + trimmed.length + 2 <= MAX_CHUNK_CHARS) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      currentLength = currentChunk.length;
      continue;
    }

    // Paragraph would exceed; flush current and maybe split paragraph by sentences
    if (currentChunk) {
      chunks.push(currentChunk);
      const overlapStart = Math.max(0, currentChunk.length - OVERLAP_CHARS);
      const lastPart = currentChunk.slice(overlapStart);
      const sentenceBreak = lastPart.search(/\s+[^.!?]*[.!?]\s*$/);
      currentChunk = sentenceBreak >= 0 ? lastPart.slice(sentenceBreak + 1).trim() : '';
      currentLength = currentChunk.length;
    }

    if (trimmed.length <= MAX_CHUNK_CHARS) {
      currentChunk = (currentChunk ? currentChunk + '\n\n' : '') + trimmed;
      currentLength = currentChunk.length;
    } else {
      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      for (const sent of sentences) {
        if (currentLength + sent.length + 1 <= MAX_CHUNK_CHARS) {
          currentChunk += (currentChunk ? ' ' : '') + sent;
          currentLength = currentChunk.length;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = '';
            currentLength = 0;
          }
          if (sent.length > MAX_CHUNK_CHARS) {
            for (let i = 0; i < sent.length; i += MAX_CHUNK_CHARS - OVERLAP_CHARS) {
              chunks.push(sent.slice(i, i + MAX_CHUNK_CHARS));
            }
          } else {
            currentChunk = sent;
            currentLength = sent.length;
          }
        }
      }
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter((c) => c.length > 0);
}

export function estimateTokenCount(text: string): number {
  return Math.ceil((text?.length || 0) / CHARS_PER_TOKEN);
}
