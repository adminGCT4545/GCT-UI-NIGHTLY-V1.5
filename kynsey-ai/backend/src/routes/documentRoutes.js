/**
 * Document Processing API Routes
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import { processDocument, summarizeDocument, SUPPORTED_DOCUMENT_TYPES } from '../config/documentParser.js';

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up file upload storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9\-_.]/g, '_'));
    }
});

// File filter to ensure only supported document types
const fileFilter = (req, file, cb) => {
    // Check if mime type is supported
    const isSupportedMimeType = Object.keys(SUPPORTED_DOCUMENT_TYPES).includes(file.mimetype);
    
    // Check if file extension is supported
    const extensionMatch = Object.values(SUPPORTED_DOCUMENT_TYPES).some(type => 
        file.originalname.toLowerCase().endsWith(type.extension)
    );
    
    if (isSupportedMimeType || extensionMatch) {
        cb(null, true); // Accept file
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// Initialize uploads directory
const initializeUploads = async () => {
    try {
        await fs.mkdir(path.join(__dirname, '../../uploads'), { recursive: true });
    } catch (err) {
        console.error('Error creating uploads directory:', err);
    }
};

initializeUploads();

const router = express.Router();

/**
 * @route   POST /api/document/upload
 * @desc    Upload and process a document
 * @access  Public
 */
router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No document provided' });
        }
        
        // Process the uploaded document
        const documentInfo = await processDocument(req.file);
        const activeModel = req.app.get('activeModel') || 'llama3.2:3b-instruct-fp16';
        
        // Generate a summary of the document
        const summary = await summarizeDocument(documentInfo.extractedText, activeModel);
        
        res.json({
            fileName: documentInfo.fileName,
            fileType: documentInfo.fileType,
            fileSize: documentInfo.formattedSize,
            summary: summary
        });
    } catch (error) {
        console.error('Document upload route error:', error);
        res.status(500).json({ error: error.message || 'Failed to process document' });
    }
});

/**
 * @route   GET /api/document/types
 * @desc    Get supported document types
 * @access  Public
 */
router.get('/types', (req, res) => {
    // Format the supported types for client consumption
    const types = Object.entries(SUPPORTED_DOCUMENT_TYPES).map(([mimeType, info]) => ({
        mimeType,
        name: info.name,
        extension: info.extension
    }));
    
    res.json({ types });
});

export default router;