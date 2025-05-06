/**
 * Voice Input API Routes
 */

import express from 'express';
import { 
    processTranscription, 
    enhanceVoiceCommand, 
    detectVoiceCommand 
} from '../config/voiceInput.js';

const router = express.Router();

/**
 * @route   POST /api/voice/process
 * @desc    Process and enhance voice transcription
 * @access  Public
 */
router.post('/process', async (req, res) => {
    try {
        const { transcription } = req.body;
        
        if (!transcription) {
            return res.status(400).json({ 
                error: 'No transcription provided',
                processed: ''
            });
        }
        
        // Get active model from app settings
        const activeModel = req.app.get('activeModel') || 'llama3.2:3b-instruct-fp16';
        
        // Clean up the transcription
        const processed = processTranscription(transcription);
        
        // Enhance the transcription with AI (if it's long enough to be worth enhancing)
        let enhanced = processed;
        if (processed.length > 10) {
            enhanced = await enhanceVoiceCommand(processed, activeModel);
        }
        
        // Detect if this is a special command
        const commandInfo = detectVoiceCommand(enhanced);
        
        res.json({
            original: transcription,
            processed: enhanced,
            command: commandInfo
        });
    } catch (error) {
        console.error('Voice processing route error:', error);
        
        // Fall back to basic processing without AI enhancement
        const basicProcessed = processTranscription(req.body.transcription || '');
        
        res.status(500).json({ 
            error: 'Error processing voice input',
            processed: basicProcessed || req.body.transcription || '',
            command: null
        });
    }
});

export default router;