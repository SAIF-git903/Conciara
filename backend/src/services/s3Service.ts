import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

// Initialize S3 client with forcePathStyle for better compatibility
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  // Enable automatic region detection from redirects
  forcePathStyle: false,
});

export interface UploadResult {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  file: Express.Multer.File,
  nodeId: number,
  folder: string = 'dialog-nodes'
): Promise<UploadResult> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  // Generate a unique key for the file
  const timestamp = Date.now();
  const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder}/${nodeId}/${timestamp}_${sanitizedFileName}`;

  // Determine content type
  const contentType = file.mimetype || 'application/octet-stream';

  // Upload to S3
  // Note: ACL is removed - bucket policies should handle public access
  // If ACLs are blocked on your bucket, ensure bucket policy allows public read access
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
    // Removed ACL: 'public-read' - use bucket policy instead for public access
  });

  let actualRegion = AWS_REGION;
  
  try {
    await s3Client.send(command);
  } catch (error: any) {
    // Handle PermanentRedirect error - extract correct region from error
    if (error.name === 'PermanentRedirect' && error.$metadata?.httpStatusCode === 301) {
      // Extract region from endpoint (e.g., "bucket.s3.eu-north-1.amazonaws.com" -> "eu-north-1")
      const endpoint = error.Endpoint || '';
      const regionMatch = endpoint.match(/\.s3\.([^.]+)\.amazonaws\.com/);
      if (regionMatch && regionMatch[1]) {
        actualRegion = regionMatch[1];
        console.warn(`[S3Service] Region mismatch detected. Using region: ${actualRegion}`);
        
        // Retry with correct region
        const correctedClient = new S3Client({
          region: actualRegion,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          },
        });
        
        await correctedClient.send(command);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  // Construct public URL using the actual region used
  // Format: https://bucket-name.s3.region.amazonaws.com/key
  const url = `https://${BUCKET_NAME}.s3.${actualRegion}.amazonaws.com/${key}`;

  return {
    key,
    url,
    contentType,
    size: file.size,
  };
}

/**
 * Upload a widget header/avatar image to S3.
 * Key: widget-header/{workspaceId}/{agentId}/{timestamp}_{filename}
 */
export async function uploadWidgetHeaderToS3(
  file: Express.Multer.File,
  workspaceId: number,
  agentId: number
): Promise<UploadResult> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  const timestamp = Date.now();
  const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `widget-header/${workspaceId}/${agentId}/${timestamp}_${sanitizedFileName}`;
  const contentType = file.mimetype || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
  });

  let actualRegion = AWS_REGION;
  try {
    await s3Client.send(command);
  } catch (error: any) {
    if (error.name === 'PermanentRedirect' && error.$metadata?.httpStatusCode === 301) {
      const endpoint = error.Endpoint || '';
      const regionMatch = endpoint.match(/\.s3\.([^.]+)\.amazonaws\.com/);
      if (regionMatch && regionMatch[1]) {
        actualRegion = regionMatch[1];
        const correctedClient = new S3Client({
          region: actualRegion,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          },
        });
        await correctedClient.send(command);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  const url = `https://${BUCKET_NAME}.s3.${actualRegion}.amazonaws.com/${key}`;
  return { key, url, contentType, size: file.size };
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (error: any) {
    // Handle PermanentRedirect error - extract correct region from error
    if (error.name === 'PermanentRedirect' && error.$metadata?.httpStatusCode === 301) {
      const endpoint = error.Endpoint || '';
      const regionMatch = endpoint.match(/\.s3\.([^.]+)\.amazonaws\.com/);
      if (regionMatch && regionMatch[1]) {
        const correctRegion = regionMatch[1];
        console.warn(`[S3Service] Region mismatch detected. Using region: ${correctRegion}`);
        
        // Retry with correct region
        const correctedClient = new S3Client({
          region: correctRegion,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          },
        });
        
        await correctedClient.send(command);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}

/**
 * Get a presigned URL for private file access (if needed)
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Validate file type
 */
export function isValidMediaType(mimetype: string): boolean {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  
  return validImageTypes.includes(mimetype) || validVideoTypes.includes(mimetype);
}

/**
 * Get media type category
 */
export function getMediaType(mimetype: string): 'image' | 'video' {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(mimetype) ? 'image' : 'video';
}

const WIDGET_HEADER_PRESIGN_EXPIRES = 7 * 24 * 3600; // 7 days

/**
 * If config has components.header.avatarIconKey (S3 key), set components.header.avatarIcon
 * to a presigned URL. Returns a shallow copy with the injection; does not mutate input.
 */
export async function injectPresignedWidgetHeaderIcon(
  config: Record<string, unknown> | null,
  expiresIn: number = WIDGET_HEADER_PRESIGN_EXPIRES
): Promise<Record<string, unknown> | null> {
  if (!config || typeof config !== 'object') return config;
  const components = config.components as Record<string, unknown> | undefined;
  const header = components?.header as Record<string, unknown> | undefined;
  const key = header?.avatarIconKey;
  if (typeof key !== 'string' || !key) return config;

  try {
    const presignedUrl = await getPresignedUrl(key, expiresIn);
    const out = { ...config };
    const outComponents = { ...(out.components as Record<string, unknown>) };
    const outHeader = { ...(outComponents.header as Record<string, unknown>) };
    outHeader.avatarIcon = presignedUrl;
    outComponents.header = outHeader;
    out.components = outComponents;
    return out;
  } catch {
    return config;
  }
}
