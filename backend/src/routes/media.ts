import express from 'express';
import multer from 'multer';
import { pool } from '../db/connection.js';
import { uploadToS3, deleteFromS3, isValidMediaType, getMediaType } from '../services/s3Service.js';

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

// Upload media for a dialog node
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

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error uploading media:', error);
    res.status(500).json({
      error: 'Failed to upload media',
      details: error.message,
    });
  }
});

// Get all media for a dialog node
router.get('/node/:nodeId', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.nodeId);

    const result = await pool.query(
      'SELECT * FROM node_media WHERE node_id = $1 ORDER BY created_at DESC',
      [nodeId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      error: 'Failed to fetch media',
      details: error.message,
    });
  }
});

// Delete media
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
