/**
 * Email API Routes
 */

import express from 'express';
import { generateEmailDraft, getEmailStyles } from '../config/emailHandler.js';

const router = express.Router();

/**
 * @route   POST /api/email/draft
 * @desc    Generate an email draft based on parameters
 * @access  Public
 */
router.post('/draft', async (req, res) => {
    try {
        const { to, subject, content, style } = req.body;
        const activeModel = req.app.get('activeModel') || 'llama3.2:3b-instruct-fp16'; // Get from app context
        
        if (!content) {
            return res.status(400).json({ 
                error: 'Email content description is required'
            });
        }
        
        const emailDraft = await generateEmailDraft({ to, subject, content, style }, activeModel);
        
        res.json(emailDraft);
    } catch (error) {
        console.error('Email draft route error:', error);
        res.status(500).json({ 
            error: 'Failed to generate email draft', 
            to: req.body.to || '[Recipient]',
            subject: req.body.subject || '[Subject]',
            body: 'Error generating email. Please try again later.'
        });
    }
});

/**
 * @route   GET /api/email/styles
 * @desc    Get available email styles
 * @access  Public
 */
router.get('/styles', (req, res) => {
    const styles = getEmailStyles();
    res.json({ styles });
});

export default router;