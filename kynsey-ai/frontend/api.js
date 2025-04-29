// KYNSEY AI Frontend API Client - Enhanced with all features

// API Configuration
const API_BASE = 'http://localhost:3002'; // Base URL for all API endpoints (matches backend port)
const ENDPOINTS = {
  CHAT: `${API_BASE}/api/chat`,
  MODELS: `${API_BASE}/api/models`,
  STYLES: `${API_BASE}/api/styles`,
  SEARCH: `${API_BASE}/api/search`,
  EMAIL: `${API_BASE}/api/email/draft`,
  DOCUMENT: `${API_BASE}/api/document/upload`,
  DOCUMENT_TYPES: `${API_BASE}/api/document/types`,
  VOICE: `${API_BASE}/api/voice/process`,
  STATUS: `${API_BASE}/api/status`
};

// Fetch chat response with streaming support
export async function fetchChatResponse(message, history = [], responseStyle = 'normal', image = null) {
    try {
        const response = await fetch(ENDPOINTS.CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                history,
                responseStyle,
                image
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get response from AI');
        }

        return response;
    } catch (error) {
        console.error('Error in fetchChatResponse:', error);
        throw error;
    }
}

// Get current model profiles and active profile
export async function getModelProfiles() {
    try {
        const response = await fetch(ENDPOINTS.MODELS);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching model profiles:', error);
        throw error;
    }
}

// Set active model profile (admin only)
export async function setActiveProfile(profileName, adminSecret) {
    try {
        const response = await fetch(`${ENDPOINTS.MODELS}/active`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-secret': adminSecret
            },
            body: JSON.stringify({ profileName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to set active profile');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error setting active profile:', error);
        throw error;
    }
}

// Get available response styles and active style
export async function getResponseStyles() {
    try {
        const response = await fetch(ENDPOINTS.STYLES);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching response styles:', error);
        throw { availableStyles: ['normal', 'concise', 'professional'], activeStyle: 'normal' };
    }
}

// Set active response style
export async function setResponseStyle(styleName) {
    try {
        const response = await fetch(`${ENDPOINTS.STYLES}/active`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ styleName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to set response style');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error setting response style:', error);
        throw error;
    }
}

// Perform web search
export async function performSearch(query) {
    try {
        const response = await fetch(ENDPOINTS.SEARCH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to perform search');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error performing search:', error);
        throw error;
    }
}

// Generate email draft
export async function generateEmailDraft(to, subject, content, style = 'professional') {
    try {
        const response = await fetch(ENDPOINTS.EMAIL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, subject, content, style })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate email draft');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error generating email draft:', error);
        throw error;
    }
}

// Upload and process document
export async function uploadDocument(file) {
    try {
        const formData = new FormData();
        formData.append('document', file);
        
        const response = await fetch(ENDPOINTS.DOCUMENT, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload document');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
}

// Get supported document types
export async function getDocumentTypes() {
    try {
        const response = await fetch(ENDPOINTS.DOCUMENT_TYPES);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching document types:', error);
        return { types: [] };
    }
}

// Process voice input
export async function processVoiceInput(transcription) {
    try {
        const response = await fetch(ENDPOINTS.VOICE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transcription })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to process voice input');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error processing voice input:', error);
        return { processed: transcription, command: null };
    }
}

// Check API status and supported features
export async function checkApiStatus() {
    try {
        const response = await fetch(ENDPOINTS.STATUS);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error checking API status:', error);
        return { 
            version: 'unknown',
            features: {
                search: false,
                email: false,
                document: false,
                voice: false,
                smartSuggestions: false
            }
        };
    }
}

// Utility function to validate response streams
export function isValidJSONResponse(chunk) {
    try {
        return JSON.parse(chunk);
    } catch (e) {
        console.warn('Invalid JSON chunk received:', chunk);
        return null;
    }
}

// Parse smart suggestions from the response
export function parseSuggestions(response) {
    if (response && response.suggestions && Array.isArray(response.suggestions)) {
        return response.suggestions;
    }
    
    // Default suggestions if none provided
    return [
        'Tell me more',
        'Explain in simpler terms',
        'Give me an example'
    ];
}

// Handle special command responses
export function isSpecialCommandResponse(response) {
    return response && (
        response.searchResults || 
        response.emailDraft || 
        response.documentSummary ||
        response.voiceProcessed
    );
}

export default {
    fetchChatResponse,
    getModelProfiles,
    setActiveProfile,
    getResponseStyles,
    setResponseStyle,
    performSearch,
    generateEmailDraft,
    uploadDocument,
    getDocumentTypes,
    processVoiceInput,
    checkApiStatus,
    isValidJSONResponse,
    parseSuggestions,
    isSpecialCommandResponse
};
