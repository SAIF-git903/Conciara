import express from 'express';
import multer from 'multer';
import { pool } from '../db/connection.js';
import { uploadToS3, deleteFromS3, isValidMediaType, getMediaType, getPresignedUrl } from '../services/s3Service.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (isValidMediaType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  },
});

/**
 * @swagger
 * /api/media/node/{nodeId}:
 *   post:
 *     summary: Upload media for a dialog node
 *     description: Upload an image or video file for a dialog node. Maximum file size is 50MB.
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog node ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file (max 50MB)
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 node_id:
 *                   type: integer
 *                 media_type:
 *                   type: string
 *                   enum: [image, video]
 *                 s3_key:
 *                   type: string
 *                 s3_url:
 *                   type: string
 *                 presigned_url:
 *                   type: string
 *                 file_name:
 *                   type: string
 *                 content_type:
 *                   type: string
 *                 file_size:
 *                   type: integer
 *       400:
 *         description: No file provided or invalid file type
 *       404:
 *         description: Dialog node not found
 *       500:
 *         description: Server error
 */
router.post('/node/:nodeId', upload.single('file'), async (req, res) => {
  try {
    const nodeId = parseInt(req.params.nodeId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Verify node exists
    const nodeResult = await pool.query('SELECT id FROM dialog_nodes WHERE id = $1', [nodeId]);
    if (nodeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dialog node not found' });
    }

    // Upload to S3
    const uploadResult = await uploadToS3(file, nodeId);

    // Save media reference to database
    const result = await pool.query(
      `INSERT INTO node_media (node_id, media_type, s3_key, s3_url, file_name, content_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        nodeId,
        getMediaType(file.mimetype),
        uploadResult.key,
        uploadResult.url,
        file.originalname,
        uploadResult.contentType,
        uploadResult.size,
      ]
    );
    // Attach presigned URL to the created record so frontend can use it immediately
    const created = result.rows[0];
    try {
      const expiresIn = process.env.PRESIGN_EXPIRES ? parseInt(process.env.PRESIGN_EXPIRES, 10) : 3600;
      if (created.s3_key) {
        const presigned = await getPresignedUrl(created.s3_key, expiresIn);
        created.presigned_url = presigned;
      }
    } catch (err: any) {
      console.warn('[media] failed to presign new upload:', err?.message || err);
      created.presigned_url = created.s3_url;
    }

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error uploading media:', error);
    res.status(500).json({
      error: 'Failed to upload media',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/media/node/{nodeId}:
 *   get:
 *     summary: Get all media for a dialog node
 *     description: Retrieve all media files associated with a dialog node
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog node ID
 *     responses:
 *       200:
 *         description: List of media files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   node_id:
 *                     type: integer
 *                   media_type:
 *                     type: string
 *                   s3_key:
 *                     type: string
 *                   s3_url:
 *                     type: string
 *                   presigned_url:
 *                     type: string
 *                   file_name:
 *                     type: string
 *                   content_type:
 *                     type: string
 *                   file_size:
 *                     type: integer
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
router.get('/node/:nodeId', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.nodeId);

    const result = await pool.query(
      'SELECT * FROM node_media WHERE node_id = $1 ORDER BY created_at DESC',
      [nodeId]
    );
    // Attach a presigned URL for each media item (falls back to stored s3_url on error)
    const expiresIn = process.env.PRESIGN_EXPIRES ? parseInt(process.env.PRESIGN_EXPIRES, 10) : 3600;

    const rowsWithUrls = await Promise.all(
      result.rows.map(async (row: any) => {
        if (!row.s3_key) return row;
        try {
          const presigned = await getPresignedUrl(row.s3_key, expiresIn);
          return { ...row, presigned_url: presigned };
        } catch (err: any) {
          console.warn(`[media] failed to presign ${row.s3_key}:`, err?.message || err);
          return { ...row, presigned_url: row.s3_url };
        }
      })
    );

    res.json(rowsWithUrls);
  } catch (error: any) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      error: 'Failed to fetch media',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/media/presign:
 *   get:
 *     summary: Get presigned URL for media
 *     description: Get a presigned URL for accessing a stored media object (for private buckets)
 *     tags: [Media]
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 object key
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: integer
 *           default: 3600
 *         description: URL expiration time in seconds
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 expiresIn:
 *                   type: integer
 *       400:
 *         description: Missing key parameter
 *       500:
 *         description: Server error
 */
router.get('/presign', async (req, res) => {
  try {
    const { key, expiresIn } = req.query;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'missing key (query param)' });
    }

    const expires = expiresIn ? parseInt(String(expiresIn), 10) : 3600;
    const url = await getPresignedUrl(key, expires);

    res.json({ url, expiresIn: expires });
  } catch (error: any) {
    console.error('Error creating presigned url:', error);
    res.status(500).json({ error: 'Failed to create presigned url', details: error.message });
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Delete media
 *     description: Delete a media file by ID (removes from both S3 and database)
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Media deleted successfully
 *       404:
 *         description: Media not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Get media record
    const mediaResult = await pool.query('SELECT * FROM node_media WHERE id = $1', [id]);
    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const media = mediaResult.rows[0];

    // Delete from S3
    try {
      await deleteFromS3(media.s3_key);
    } catch (s3Error: any) {
      console.warn('Error deleting from S3 (continuing with DB deletion):', s3Error.message);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await pool.query('DELETE FROM node_media WHERE id = $1', [id]);

    res.json({ message: 'Media deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      error: 'Failed to delete media',
      details: error.message,
    });
  }
});

export default router;
