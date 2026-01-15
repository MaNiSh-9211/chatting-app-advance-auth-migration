import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { uploadImage, serveUploadedFile } from '../controllers/upload.controller';

const router = express.Router();

// Upload route (requires authentication)
router.post('/', authenticate, upload.single('image'), uploadImage);

// Serve uploaded files (public)
router.get('/:filename', serveUploadedFile);

export default router;

