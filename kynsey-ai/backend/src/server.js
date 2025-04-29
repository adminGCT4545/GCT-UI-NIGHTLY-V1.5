// server.js - Enhanced with new features
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ollama from 'ollama';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs/promises';

// Import core configuration
import { getSystemPrompt, getAvailableStyles, generateSuggestions } from './config/systemPrompt.js';
import { modelProfiles, getProfileByName, getModelIdByName, getDefaultProfile } from './config/profiles.js';
import { loadAppState, updateActiveProfile } from './config/appState.js';

// Import middleware
import { requireAdmin, logApiRequest } from './middleware/auth.js';

// Import route handlers
import searchRoutes from './routes/searchRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import voiceInputRoutes from './routes/voiceInputRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Set up directory paths for ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
// Configure CORS based on environment
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:1001')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(logApiRequest); // Log all API requests

// Basic Ollama client configuration
const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
console.log(`Connecting to Ollama at: ${ollamaHost}`);

// --- Configuration State ---
let activeProfileName = getDefaultProfile().name;
let activeModel = getDefaultProfile().modelId;
let activeStyle = 'normal';
let activeFileBase = null;
let availableFileBases = ['None'];

// Make active model available across routes
app.set('activeModel', activeModel);

// Load stored state on startup
loadAppState().then(state => {
    activeProfileName = state.activeProfileName;
    activeModel = getModelIdByName(activeProfileName);
    app.set('activeModel', activeModel); // Update app-wide setting
    console.log(`Initialized with profile: ${activeProfileName} (Model: ${activeModel})`);
}).catch(error => {
    console.error('Failed to load app state:', error);
});

// --- Register Routes ---
// Mount feature-specific routes
app.use('/api/search', searchRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/voice', voiceInputRoutes);

// --- Enhanced Chat Endpoint with Command Detection ---
// Message format validation middleware
const validateChatRequest = (req, res, next) => {
    const { message, history, erpContext } = req.body;

    // Validate message
    if (!message && !req.body.image) {
        return res.status(400).json({
            error: 'Invalid request',
            details: 'Message or image is required'
        });
    }

    // Validate history format
    if (history && !Array.isArray(history)) {
        return res.status(400).json({
            error: 'Invalid request',
            details: 'History must be an array'
        });
    }

    // Validate ERP context
    if (erpContext) {
        if (typeof erpContext !== 'object') {
            return res.status(400).json({
                error: 'Invalid request',
                details: 'ERP context must be an object'
            });
        }

        // Validate required ERP context fields
        const requiredFields = ['timestamp', 'source'];
        const missingFields = requiredFields.filter(field => !erpContext[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Invalid request',
                details: `Missing required ERP context fields: ${missingFields.join(', ')}`
            });
        }
    }

    next();
};

app.post('/api/chat', validateChatRequest, async (req, res) => {
    const { message, history = [], responseStyle = activeStyle, image = null, erpContext } = req.body;

    try {
        // Check for special commands - handled by the client but can also be handled here
        if (message && message.trim().startsWith('/')) {
            // Let the client handle the specialized UI for commands
            // We'll just pass through to the LLM for interpretation
        }

        const systemPrompt = getSystemPrompt(responseStyle);
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
        ];

        // Construct the user message, potentially including the image
        const userMessage = {
            role: 'user',
            content: message || "Analyze this image.",
        };
        
        if (image) {
            userMessage.images = [image];
        }
        
        messages.push(userMessage);

        console.log(`Sending request to Ollama model: ${activeModel}`);

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Start streaming response
        let fullResponse = '';
        const stream = await ollama.chat({
            model: activeModel,
            messages: messages,
            stream: true,
            options: {
                temperature: 0.7
            }
        });

        // Send each chunk as it arrives
        for await (const chunk of stream) {
            if (chunk.message?.content) {
                fullResponse += chunk.message.content;
                res.write(`data: ${JSON.stringify({ response: chunk.message.content, done: false })}\n\n`);
            }
        }

        // Generate context-aware suggestions based on conversation
        const suggestions = generateSuggestions(message, fullResponse);

        // Send final message with suggestions
        res.write(`data: ${JSON.stringify({ 
            response: fullResponse, 
            done: true,
            suggestions
        })}\n\n`);
        
        res.end();

    } catch (error) {
        console.error('Ollama API Error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
        res.end();
    }
});

// --- Model Profile API Endpoints ---

// Get available profiles and active profile
app.get('/api/models', async (req, res) => {
    try {
        const profiles = modelProfiles.map(p => ({
            name: p.name,
            description: p.description,
            isActive: p.name === activeProfileName
        }));

        // Check if active model is available in Ollama
        const modelAvailable = await ollama.show({ name: activeModel })
            .then(() => true)
            .catch(() => false);

        res.json({
            profiles,
            activeProfile: {
                name: activeProfileName,
                modelId: activeModel,
                isModelAvailable: modelAvailable
            }
        });
    } catch (error) {
        console.error(`Error in GET /api/models:`, error);
        res.status(500).json({
            error: `Failed to fetch model profiles: ${error.message}`,
            profiles: [],
            activeProfile: {
                name: activeProfileName,
                modelId: activeModel,
                isModelAvailable: false
            }
        });
    }
});

// Set active profile
app.post('/api/models/active', requireAdmin, async (req, res) => {
    const { profileName } = req.body;

    if (!profileName) {
        return res.status(400).json({ error: 'profileName is required' });
    }

    const profile = getProfileByName(profileName);
    if (!profile) {
        return res.status(400).json({ error: `Invalid profile name: ${profileName}` });
    }

    try {
        // Verify model exists in Ollama
        await ollama.show({ name: profile.modelId });

        // Update active profile
        await updateActiveProfile(profileName);
        activeProfileName = profileName;
        activeModel = profile.modelId;
        app.set('activeModel', activeModel); // Update app-wide setting

        res.json({
            message: `Active profile set to ${activeProfileName}`,
            profile: {
                name: activeProfileName,
                modelId: activeModel
            }
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: `Model ${profile.modelId} not found in Ollama. Please ensure it is installed.`
            });
        }
        res.status(500).json({
            error: `Failed to set active profile: ${error.message}`
        });
    }
});

// Styles API
app.get('/api/styles', (req, res) => {
    const availableStyles = getAvailableStyles();
    res.json({ availableStyles, activeStyle });
});

// Set active style
app.post('/api/styles/active', (req, res) => {
    const { styleName } = req.body;
    const availableStyles = getAvailableStyles();
    if (styleName && availableStyles.includes(styleName)) {
        activeStyle = styleName;
        console.log(`Active style set to: ${activeStyle}`);
        res.json({ message: `Active style set to ${activeStyle}.` });
    } else {
        res.status(400).json({ error: 'Invalid or missing styleName' });
    }
});

// File bases API
app.get('/api/filebases', async (req, res) => {
    res.json({ availableFileBases, activeFileBase });
});

// Set active file base
app.post('/api/filebases/active', (req, res) => {
    const { fileBaseName } = req.body;
    if (fileBaseName && availableFileBases.includes(fileBaseName)) {
         activeFileBase = fileBaseName === 'None' ? null : fileBaseName;
         console.log(`Active file base set to: ${activeFileBase}`);
         res.json({ message: `Active file base set to ${activeFileBase || 'None'}.` });
    } else {
         res.status(400).json({ error: 'Invalid or missing fileBaseName' });
    }
});

// Basic root endpoint
app.get('/', (req, res) => {
    res.send('KYNSEY AI Backend is running!');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Enhanced status endpoint
app.get('/api/status', async (req, res) => {
    try {
        // Check Ollama connectivity
        const ollamaHealth = await ollama.show({ name: activeModel })
            .then(() => true)
            .catch(() => false);

        res.json({
            status: 'operational',
            version: '2.0.0',
            features: {
                search: true,
                email: true,
                document: true,
                voice: true,
                smartSuggestions: true
            },
            system: {
                activeModel,
                activeStyle,
                ollamaConnected: ollamaHealth,
                nodeVersion: process.version,
                memory: process.memoryUsage()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// Export the app for testing purposes
export default app;

// Start server only if running the script directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(port, () => {
        console.log(`KYNSEY AI Backend listening at http://localhost:${port}`);
    });
}
