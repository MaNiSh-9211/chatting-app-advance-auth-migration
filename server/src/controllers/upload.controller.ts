import { Request, Response } from 'express';
import { getUploadedFileUrl } from '../middleware/upload.middleware';
import path from 'path';

// Upload image
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }

        const fileUrl = getUploadedFileUrl(req.file.filename);

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
        });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
};

// Serve uploaded files
export const serveUploadedFile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { filename } = req.params;
        const filePath = path.join(process.cwd(), 'server', 'uploads', filename);
        
        res.sendFile(filePath, (err) => {
            if (err) {
                res.status(404).json({ success: false, message: 'File not found' });
            }
        });
    } catch (error) {
        console.error('Serve file error:', error);
        res.status(500).json({ success: false, message: 'Failed to serve file' });
    }
};

