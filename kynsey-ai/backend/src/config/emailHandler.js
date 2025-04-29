/**
 * This module handles email drafting functionality
 */

import ollama from 'ollama';
import { getSystemPrompt } from './systemPrompt.js';

// Email styles
const EMAIL_STYLES = {
    professional: 'formal and business-appropriate',
    casual: 'friendly and conversational',
    concise: 'brief and to the point',
    persuasive: 'compelling and action-oriented'
};

/**
 * Generate an email draft based on user parameters
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.content - Content description or instructions
 * @param {string} params.style - Email style (professional, casual, concise, persuasive)
 * @param {string} model - Ollama model ID to use
 * @returns {Promise<Object>} - Email draft object
 */
export async function generateEmailDraft(params, model) {
    const { to = '', subject = '', content = '', style = 'professional' } = params;
    
    if (!content) {
        throw new Error('Email content description is required');
    }
    
    const emailStyle = EMAIL_STYLES[style] || EMAIL_STYLES.professional;
    
    const systemPrompt = `You are an AI assistant specialized in writing emails.
    Draft a ${emailStyle} email based on the user's description.
    Your response should be formatted as a complete email and ready to send.`;
    
    const userPrompt = `Draft an email with the following details:
    To: ${to || '[Recipient]'}
    Subject: ${subject || '[Please specify subject]'}
    Content description: ${content}
    
    Format your response as a complete email without explanations or additional comments.`;
    
    try {
        const response = await ollama.chat({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            options: {
                temperature: 0.7
            }
        });
        
        return parseEmailResponse(response.message.content, to, subject);
    } catch (error) {
        console.error('Email generation error:', error);
        throw new Error(`Failed to generate email: ${error.message}`);
    }
}

/**
 * Parse an email response from the AI
 * @param {string} response - Raw AI response
 * @param {string} defaultTo - Default recipient
 * @param {string} defaultSubject - Default subject
 * @returns {Object} - Parsed email object
 */
function parseEmailResponse(response, defaultTo, defaultSubject) {
    // Extract components from the email response
    let to = defaultTo || '[Recipient]';
    let subject = defaultSubject || '';
    let body = '';
    
    // Check if response contains "To:" field
    const toMatch = response.match(/^To:(.+?)(\r?\n|$)/im);
    if (toMatch) {
        to = toMatch[1].trim() || to;
    }
    
    // Check if response contains "Subject:" field
    const subjectMatch = response.match(/^Subject:(.+?)(\r?\n|$)/im);
    if (subjectMatch) {
        subject = subjectMatch[1].trim() || subject;
    }
    
    // Extract body - everything after Subject: line or entire text if no subject found
    if (response.match(/^Subject:/im)) {
        const parts = response.split(/^Subject:.+?(\r?\n|$)/im);
        if (parts.length > 1) {
            body = parts[1].trim();
        }
    } else if (response.match(/^To:/im)) {
        const parts = response.split(/^To:.+?(\r?\n|$)/im);
        if (parts.length > 1) {
            body = parts[1].trim();
        }
    } else {
        body = response.trim();
    }
    
    return {
        to,
        subject,
        body
    };
}

/**
 * Format email data into a formatted string for display
 * @param {Object} emailData - Email data object
 * @returns {string} - Formatted email string
 */
export function formatEmailText(emailData) {
    return `
To: ${emailData.to}
Subject: ${emailData.subject}

${emailData.body}
    `.trim();
}

/**
 * Get available email styles
 * @returns {Object} - Available email styles
 */
export function getEmailStyles() {
    return EMAIL_STYLES;
}

export default {
    generateEmailDraft,
    formatEmailText,
    getEmailStyles
};