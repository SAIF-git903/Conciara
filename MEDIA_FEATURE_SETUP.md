# Media Feature Setup Guide

This document describes the media upload feature that allows you to attach images and videos to dialog nodes, which will be displayed in the chatbot when users interact with those nodes.

## Overview

The feature includes:
- **Backend**: AWS S3 integration for file storage, database schema for media references, API endpoints for upload/retrieval
- **Frontend**: UI for uploading media to dialog nodes, chat display of media files

## Backend Setup

### 1. Install Dependencies

Run the following command in the `backend` directory:

```bash
npm install
```

This will install:
- `@aws-sdk/client-s3` - AWS S3 SDK
- `@aws-sdk/s3-request-presigner` - For presigned URLs (if needed)
- `multer` - For handling file uploads

### 2. Configure AWS S3

Add the following environment variables to your `.env` file in the `backend` directory:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

**Important**: Make sure your S3 bucket has:
- Public read access configured (or use presigned URLs for private access)
- CORS configured to allow uploads from your frontend domain
- Appropriate bucket policies

### 3. Run Database Migration

The migration adds a new `node_media` table. Run:

```bash
npm run migrate
```

This creates the `node_media` table with the following structure:
- `id` - Primary key
- `node_id` - Foreign key to `dialog_nodes`
- `media_type` - 'image' or 'video'
- `s3_key` - S3 object key
- `s3_url` - Public URL to the file
- `file_name` - Original filename
- `content_type` - MIME type
- `file_size` - File size in bytes
- `created_at`, `updated_at` - Timestamps

### 4. API Endpoints

The following endpoints are available:

- **POST** `/api/media/node/:nodeId` - Upload media for a dialog node
  - Body: FormData with `file` field
  - Returns: MediaItem object

- **GET** `/api/media/node/:nodeId` - Get all media for a dialog node
  - Returns: Array of MediaItem objects

- **DELETE** `/api/media/:id` - Delete a media file
  - Deletes from both S3 and database

## Frontend Setup

### 1. Install Dependencies

No additional dependencies are required. The frontend uses existing libraries.

### 2. Usage

#### Uploading Media to Dialog Nodes

1. Navigate to the Dialog Tree Manager
2. Select a dialog node
3. Click "Upload Image/Video" button
4. Select a file (images: jpeg, jpg, png, gif, webp | videos: mp4, webm, ogg, quicktime)
5. The file will be uploaded to S3 and associated with the node

#### Viewing Media in Chat

When a user interacts with a dialog node that has associated media:
- Images are displayed inline in the chat bubble
- Videos are displayed with controls
- Media appears below the bot's text response

## File Size Limits

- Maximum file size: **50MB** (configured in `backend/src/routes/media.ts`)
- Supported image types: JPEG, JPG, PNG, GIF, WEBP
- Supported video types: MP4, WebM, OGG, QuickTime

## Security Considerations

1. **S3 Bucket Configuration**: 
   - Consider using presigned URLs instead of public-read ACL for better security
   - Update `s3Service.ts` to use presigned URLs if needed

2. **File Validation**:
   - Files are validated by MIME type on upload
   - Only image and video types are accepted

3. **CORS**:
   - Ensure your S3 bucket CORS policy allows uploads from your frontend domain

## Troubleshooting

### Upload Fails

1. Check AWS credentials are correct in `.env`
2. Verify S3 bucket name is correct
3. Ensure bucket has proper permissions
4. Check CORS configuration on S3 bucket

### Media Not Displaying in Chat

1. Verify the node has media associated (check database)
2. Check browser console for CORS errors
3. Verify S3 URLs are accessible (try opening in browser)
4. Check that media is being returned in chat API response

### Database Errors

1. Ensure migration has been run: `npm run migrate`
2. Check database connection
3. Verify `node_media` table exists

## Code Structure

### Backend Files

- `backend/src/services/s3Service.ts` - S3 upload/delete operations
- `backend/src/routes/media.ts` - Media API routes
- `backend/src/services/chatService.ts` - Updated to include media in responses
- `backend/src/db/migrate.ts` - Database migration for `node_media` table

### Frontend Files

- `frontend/lib/api.ts` - Media API functions
- `frontend/components/NodeEditor.tsx` - Media upload UI
- `frontend/components/SkinRenderer.tsx` - Chat message handling with media
- `frontend/components/DynamicComponents/DynamicMessages.tsx` - Media display in chat

## Testing

1. Upload an image to a dialog node
2. Send a message that triggers that node
3. Verify the image appears in the chat response
4. Test with videos as well
5. Test deleting media files

## Future Enhancements

Potential improvements:
- Image compression before upload
- Thumbnail generation for videos
- Media preview in node editor
- Drag-and-drop upload
- Multiple file upload at once
- Media gallery view for nodes
