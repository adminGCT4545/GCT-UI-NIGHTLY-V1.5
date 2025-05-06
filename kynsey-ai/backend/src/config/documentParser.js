/**
 * This module handles document parsing and processing
 */

import fs from 'fs/promises';
import path from 'path';
import ollama from 'ollama';

// Supported document types and their MIME types
export const SUPPORTED_DOCUMENT_TYPES = {
    'application/pdf': {
        name: 'PDF',
        extension: '.pdf'
    },
    'application/msword': {
        name: 'Word Document',
        extension: '.doc'
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        name: 'Word Document',
        extension: '.docx'
    },
    'text/plain': {
        name: 'Text File',
        extension: '.txt'
    },
    'text/csv': {
        name: 'CSV File',
        extension: '.csv'
    },
    'application/vnd.ms-excel': {
        name: 'Excel Spreadsheet',
        extension: '.xls'
    },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        name: 'Excel Spreadsheet',
        extension: '.xlsx'
    }
};

/**
 * Check if a file type is supported
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean} - Whether the file type is supported
 */
export function isDocumentTypeSupported(mimeType) {
    return Object.keys(SUPPORTED_DOCUMENT_TYPES).includes(mimeType);
}

/**
 * Process an uploaded document and extract its contents
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Document info and extracted text
 */
export async function processDocument(file) {
    if (!file) {
        throw new Error('No file provided');
    }
    
    const { path: filePath, originalname, mimetype, size } = file;
    
    // Basic validation
    if (!isDocumentTypeSupported(mimetype) && 
        !Object.values(SUPPORTED_DOCUMENT_TYPES).some(type => 
            originalname.toLowerCase().endsWith(type.extension))) {
        throw new Error(`Unsupported document type: ${mimetype}`);
    }
    
    try {
        // For now, just handle simple text files directly
        // For other formats, we'd use specialized libraries like pdf-parse, docx, etc.
        let documentText = '';
        
        if (mimetype === 'text/plain' || mimetype === 'text/csv') {
            // Direct text reading
            documentText = await fs.readFile(filePath, 'utf8');
        } else {
            // Placeholder for other document types
            // In a production app, you'd use specialized libraries for each file type
            documentText = `This ${mimetype} document requires specialized processing.
            Document name: ${originalname}
            Size: ${formatFileSize(size)}`;
        }
        
        return {
            fileName: originalname,
            fileType: mimetype,
            fileSize: size,
            formattedSize: formatFileSize(size),
            extractedText: documentText.substring(0, 5000) // Limit text size
        };
    } catch (error) {
        console.error('Error processing document:', error);
        throw new Error(`Failed to process document: ${error.message}`);
    }
}

/**
 * Generate a summary of document content using AI
 * @param {string} documentText - Extracted document text
 * @param {string} model - Ollama model ID to use
 * @returns {Promise<string>} - Document summary
 */
export async function summarizeDocument(documentText, model) {
    if (!documentText) {
        return 'No text content to summarize.';
    }
    
    const systemPrompt = `You are an AI assistant specialized in document analysis.
    Extract key information from the following document content and provide a concise summary.
    Include important points, main themes, and any notable data or figures.`;
    
    try {
        // Ensure document text isn't too large
        const limitedText = documentText.substring(0, 10000); // Limit to prevent token issues
        
        const response = await ollama.chat({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: limitedText }
            ],
            options: {
                temperature: 0.5 // Lower temperature for more factual summary
            }
        });
        
        return response.message.content;
    } catch (error) {
        console.error('Document summarization error:', error);
        return `Error generating document summary: ${error.message}`;
    }
}

/**
 * Format file size in a human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., "2.5 MB")
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    processDocument,
    summarizeDocument,
    isDocumentTypeSupported,
    SUPPORTED_DOCUMENT_TYPES
};