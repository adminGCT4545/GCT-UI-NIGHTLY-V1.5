const Ollama = require('ollama'); // Assuming 'ollama' package is installed
const path = require('path');
const fs = require('fs');

// --- Configuration ---
// Re-read config here or pass it down from server.js if preferred
// For simplicity, reading it again here.
const configPath = path.join(__dirname, '../../config/config.json');
let config;
try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
} catch (err) {
    console.error("Error reading or parsing config file in ai_service:", err);
    // Provide default fallback or re-throw error
    config = { 
        ollama: { 
            model: 'llama3', 
            whisperModel: 'whisper',
            availableModels: ['llama3', 'mistral', 'gemma'] 
        },
        security: {
            encryptionEnabled: false,
            encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key'
        }
    }; // Basic fallback with extended features
}

const ollama = new Ollama.Ollama(); // Defaults to http://127.0.0.1:11434

/**
 * Enhances a given text using the configured Ollama LLM.
 * @param {string} text The text to enhance (e.g., summarize, refine).
 * @param {string} [modelOverride] Optional model to use instead of default.
 * @returns {Promise<string>} The enhanced text.
 */
async function enhanceNote(text, modelOverride) {
    if (!text || typeof text !== 'string') {
        throw new Error("Invalid text provided for enhancement.");
    }
    
    const modelToUse = modelOverride || config.ollama.model;
    
    try {
        console.log(`Sending text to Ollama model [${modelToUse}] for enhancement...`);
        const response = await ollama.generate({
            model: modelToUse,
            prompt: `Summarize or refine the following note content:\n\n"${text}"\n\nEnhanced Content:`,
            stream: false, // Get the full response at once
        });
        console.log("Ollama enhancement response received.");
        return response.response.trim();
    } catch (error) {
        console.error(`Error calling Ollama model [${modelToUse}] for enhancement:`, error);
        throw new Error("Failed to enhance note using AI service.");
    }
}

/**
 * Advanced semantic search across note content.
 * @param {string} query The search query text
 * @param {object} options Search options including filters
 * @returns {Promise<Array>} Ranked search results
 */
async function semanticSearch(query, options = {}) {
    if (!query || typeof query !== 'string') {
        throw new Error("Invalid query provided for semantic search.");
    }
    
    try {
        console.log(`Performing semantic search with Ollama model [${config.ollama.model}]...`);
        // This would typically use embeddings from Ollama or another service
        // For demonstration, we're using a simpler "generate" approach
        const response = await ollama.generate({
            model: config.ollama.model,
            prompt: `You are a semantic search algorithm. For the query: "${query}", 
                    generate a JSON array of keywords and concepts that would be relevant 
                    for searching notes. Focus on semantic meaning, not just literal matches.
                    Format: ["keyword1", "concept1", "synonym1", ...]`,
            stream: false,
        });
        
        // Parse response to get semantic keywords
        // In a real implementation, this would use embeddings and vector search
        const semanticTermsMatch = response.response.match(/\[(.*)\]/s);
        let semanticTerms = [];
        
        if (semanticTermsMatch && semanticTermsMatch[1]) {
            try {
                // Try to parse as JSON if properly formatted
                semanticTerms = JSON.parse(`[${semanticTermsMatch[1]}]`);
            } catch (e) {
                // Fallback: split by commas and clean up
                semanticTerms = semanticTermsMatch[1]
                    .split(',')
                    .map(term => term.trim().replace(/"/g, ''))
                    .filter(Boolean);
            }
        }
        
        // If parsing failed, just use the original query
        if (!semanticTerms.length) {
            semanticTerms = [query];
        }
        
        console.log("Generated semantic search terms:", semanticTerms);
        
        // These terms would be used for searching in the database
        // Return format matches what the frontend expects
        return {
            semanticTerms,
            query,
            options
        };
    } catch (error) {
        console.error(`Error performing semantic search:`, error);
        throw new Error("Failed to perform semantic search using AI service.");
    }
}

/**
 * Get all available models from Ollama
 * @returns {Promise<Array>} List of available models
 */
async function getAvailableModels() {
    try {
        // This would normally call ollama.list() or similar API
        // For now, return the configured list
        return config.ollama.availableModels || ['llama3'];
    } catch (error) {
        console.error("Error fetching available models:", error);
        return ['llama3']; // Fallback to default
    }
}

/**
 * Transcribes audio data using the configured Ollama STT model (e.g., Whisper).
 * NOTE: This function assumes the Ollama server has the specified whisper model
 *       and the 'ollama' library/API supports transcription in this manner.
 *       The actual mechanism might require adjustments based on the library version
 *       and how Ollama exposes STT models. It might expect audio as a base64 string.
 *
 * @param {string} audioData Base64 encoded audio data or potentially a path (library dependent).
 * @returns {Promise<string>} The transcription text.
 */
async function transcribeAudio(audioData) {
     if (!audioData) {
        throw new Error("Invalid audio data provided for transcription.");
    }
    try {
        console.log(`Sending audio data to Ollama model [${config.ollama.whisperModel}] for transcription...`);
        // IMPORTANT: The 'ollama' library's method for handling audio/STT might differ.
        // This uses 'generate' as a placeholder, assuming it can handle multimodal input
        // or that the whisper model is served via a compatible endpoint.
        // You might need to use a different method like `ollama.stt` or pass data differently
        // (e.g., in an 'images' array for multimodal models if Whisper is treated as such).
        // Consult the 'ollama' JS library documentation for the correct usage.
        const response = await ollama.generate({
            model: config.ollama.whisperModel,
            // How audio data is passed is crucial and library-specific.
            // This is a guess; it might need `images: [audioData]` if treated like Llava,
            // or a dedicated parameter/method.
            prompt: "Transcribe the following audio:", // Prompt might be optional or required
            // Assuming audioData is base64 encoded string:
             images: [audioData], // Common pattern for multimodal models in Ollama JS library
            stream: false,
        });
        console.log("Ollama transcription response received.");
        // The actual response structure for transcription might differ.
        return response.response.trim();
    } catch (error) {
        console.error(`Error calling Ollama model [${config.ollama.whisperModel}] for transcription:`, error);
        throw new Error("Failed to transcribe audio using AI service.");
    }
}

/**
 * Simple encryption utility for local storage data security
 * @param {string} text Text to encrypt
 * @returns {string} Encrypted text
 */
function encryptText(text) {
    if (!config.security.encryptionEnabled) return text;
    
    // This is a very basic implementation for demo purposes
    // In production, use a proper encryption library
    try {
        // Simple XOR encryption with the key
        const key = config.security.encryptionKey;
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        // Return as base64
        return Buffer.from(result).toString('base64');
    } catch (error) {
        console.error("Encryption error:", error);
        return text; // Fallback to unencrypted on error
    }
}

/**
 * Decrypt encrypted text
 * @param {string} encryptedText Base64 encrypted text
 * @returns {string} Decrypted text
 */
function decryptText(encryptedText) {
    if (!config.security.encryptionEnabled) return encryptedText;
    
    try {
        // Decode from base64
        const textBuffer = Buffer.from(encryptedText, 'base64').toString();
        const key = config.security.encryptionKey;
        let result = '';
        for (let i = 0; i < textBuffer.length; i++) {
            result += String.fromCharCode(textBuffer.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch (error) {
        console.error("Decryption error:", error);
        return encryptedText; // Return as-is on error
    }
}

module.exports = {
    enhanceNote,
    transcribeAudio,
    semanticSearch,
    getAvailableModels,
    encryptText,
    decryptText,
    config // Export config if needed elsewhere
};