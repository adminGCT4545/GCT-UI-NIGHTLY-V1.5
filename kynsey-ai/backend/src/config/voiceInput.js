/**
 * This module handles voice input processing capabilities
 * Note: The main voice processing is done client-side using the Web Speech API
 * This module provides backend support for handling speech recognition results
 */

import ollama from 'ollama';

/**
 * Process and clean transcribed text from speech-to-text
 * @param {string} transcription - Raw transcription from speech recognition
 * @returns {string} - Cleaned and formatted transcription
 */
export function processTranscription(transcription) {
    if (!transcription) {
        return '';
    }
    
    // Convert to string just in case
    const text = String(transcription);
    
    // Remove excessive spaces and normalize punctuation
    const cleaned = text
        .replace(/\s+/g, ' ')
        .trim()
        // Add period if missing at end and text is long enough
        .replace(/([a-zA-Z0-9])$/, '$1.');
    
    return cleaned;
}

/**
 * Enhance voice commands using AI for better understanding
 * @param {string} transcription - Raw transcription from speech recognition
 * @param {string} model - Ollama model ID to use
 * @returns {Promise<string>} - Enhanced command or query
 */
export async function enhanceVoiceCommand(transcription, model) {
    if (!transcription) {
        return '';
    }
    
    try {
        const systemPrompt = `You are an AI assistant specialized in improving voice transcriptions.
        Fix any spelling errors, add proper punctuation, and correct grammar in the following voice transcription.
        Only return the corrected text without any explanations or additional content.`;
        
        const response = await ollama.chat({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: transcription }
            ],
            options: {
                temperature: 0.3 // Lower temperature for more accurate corrections
            }
        });
        
        return response.message.content.trim();
    } catch (error) {
        console.error('Voice command enhancement error:', error);
        // Return original if enhancement fails
        return transcription;
    }
}

/**
 * Detect special voice commands like "search for X" or "write an email about Y"
 * @param {string} transcription - Processed transcription
 * @returns {Object|null} - Command object if detected, null otherwise
 */
export function detectVoiceCommand(transcription) {
    if (!transcription) {
        return null;
    }
    
    const text = transcription.toLowerCase();
    
    // Detect search commands
    if (text.match(/^(search|find|look up|google|search for|find info on)/i)) {
        const query = text.replace(/^(search|find|look up|google|search for|find info on)(\s+for)?\s+/i, '').trim();
        if (query) {
            return {
                type: 'search',
                query
            };
        }
    }
    
    // Detect email drafting commands
    if (text.match(/^(write|draft|compose|create|send)(\s+an|\s+a)?\s+email/i)) {
        const match = text.match(/^(write|draft|compose|create|send)(\s+an|\s+a)?\s+email\s+(about|on|regarding|to)?\s+(.+)/i);
        if (match && match[4]) {
            return {
                type: 'email',
                content: match[4].trim()
            };
        }
    }
    
    // No special command detected
    return null;
}

export default {
    processTranscription,
    enhanceVoiceCommand,
    detectVoiceCommand
};