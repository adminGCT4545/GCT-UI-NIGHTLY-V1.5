// server.js - Enhanced with web search and voice input capabilities

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ollama from 'ollama';
import { getSystemPrompt, getAvailableStyles } from './config/systemPrompt.js';
import fs from 'fs/promises';
import path from 'path';
import { modelProfiles, getProfileByName, getModelIdByName, getDefaultProfile } from './config/profiles.js';
import { loadAppState, updateActiveProfile } from './config/appState.js';
import { requireAdmin, logApiRequest } from './middleware/auth.js';

// New imports for enhanced features
import fetch from 'node-fetch'; // Add to package.json
import multer from 'multer'; // Add to package.json
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Set up directory paths for ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up file upload storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit 
});

// Ensure uploads directory exists
try {
  await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
} catch (err) {
  console.error('Error creating uploads directory:', err);
}

// Middleware
app.use(cors({
  origin: ['http://localhost:9000', 'http://localhost:3000'], // Allow our frontend servers
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Basic Ollama client configuration
const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
console.log(`Connecting to Ollama at: ${ollamaHost}`);

// --- Configuration State ---
let activeProfileName = getDefaultProfile().name;
let activeModel = getDefaultProfile().modelId;
let activeStyle = 'normal';
let activeFileBase = null;
let availableFileBases = ['None'];

// Load stored state on startup
loadAppState().then(state => {
    activeProfileName = state.activeProfileName;
    activeModel = getModelIdByName(activeProfileName);
    console.log(`Initialized with profile: ${activeProfileName} (Model: ${activeModel})`);
}).catch(error => {
    console.error('Failed to load app state:', error);
});

// --- New Enhanced API Endpoints ---

// Web Search Endpoint
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        // Use your preferred search API - this example uses a placeholder
        // You'll need to register for a search API like Bing, Google, or a similar service
        const SEARCH_API_KEY = process.env.SEARCH_API_KEY;
        
        if (!SEARCH_API_KEY) {
            return res.status(500).json({ 
                error: 'Search API key not configured', 
                results: getMockSearchResults(query) // Return mock results for demonstration
            });
        }
        
        // Example with Bing Search API
        const searchResponse = await fetch(
            `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': SEARCH_API_KEY
                }
            }
        );
        
        if (!searchResponse.ok) {
            throw new Error(`Search API returned ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        // Transform the data to a standard format
        const results = searchData.webPages.value.map(result => ({
            title: result.name,
            url: result.url,
            snippet: result.snippet
        }));
        
        res.json({ results });
    } catch (error) {
        console.error('Search API Error:', error);
        res.status(500).json({ 
            error: 'Failed to perform search', 
            results: getMockSearchResults(req.body.query) // Fallback to mock results
        });
    }
});

// Helper function for mock search results (development only)
function getMockSearchResults(query) {
    return [
        {
            title: `Result 1 for: ${query}`,
            url: 'https://example.com/result1',
            snippet: `This is a sample search result for "${query}". In a production environment, this would be replaced with actual search results.`
        },
        {
            title: `Result 2 for: ${query}`,
            url: 'https://example.com/result2',
            snippet: `Another sample result related to "${query}". Integrate with a real search API for production use.`
        },
        {
            title: `Result 3 for: ${query}`,
            url: 'https://example.com/result3',
            snippet: `Third sample result for "${query}". The actual implementation would use Bing, Google, or another search provider.`
        }
    ];
}

// Document Processing Endpoint
app.post('/api/document', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No document file uploaded' });
        }
        
        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileType = req.file.mimetype;
        
        // Example processing logic based on file type
        let documentText = '';
        
        if (fileType === 'text/plain') {
            // For text files, simply read the content
            documentText = await fs.readFile(filePath, 'utf8');
        } else if (fileType === 'text/csv') {
            // For CSV, convert to plain text for demonstration
            // In a real app, you'd use a CSV parser library
            documentText = await fs.readFile(filePath, 'utf8');
            documentText = `CSV file content:\n${documentText}`;
        } else if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('excel')) {
            // For more complex formats, you'd need specialized libraries
            // This is a placeholder for demonstration
            documentText = `${fileType} file uploaded: ${fileName}. In a production app, we would extract the text content using appropriate libraries.`;
        } else {
            documentText = `File uploaded: ${fileName}. This file type (${fileType}) requires specialized processing.`;
        }
        
        // Generate a summary using Ollama
        const systemPrompt = `You are an AI assistant specialized in document analysis. 
        Extract key information from the following document content and provide a brief summary.`;
        
        const ollResponse = await ollama.chat({
            model: activeModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: documentText.slice(0, 4000) } // Limit text size
            ]
        });
        
        res.json({
            fileName,
            fileType,
            summary: ollResponse.message.content,
            fileSize: req.file.size
        });
        
    } catch (error) {
        console.error('Document processing error:', error);
        res.status(500).json({ error: 'Failed to process document: ' + error.message });
    }
});

// Email Draft Generation Endpoint
app.post('/api/email/draft', async (req, res) => {
    try {
        const { to, subject, content, style } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Email content description is required' });
        }
        
        const systemPrompt = `You are an AI assistant specialized in writing emails.
        Draft a professional email based on the user's description.
        Style: ${style || 'professional'}`;
        
        const userPrompt = `Draft an email with the following details:
        To: ${to || '[Recipient]'}
        Subject: ${subject || '[Subject]'}
        Content description: ${content}`;
        
        const ollResponse = await ollama.chat({
            model: activeModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        });
        
        // Parse the email components from the response
        // This is a simple implementation - would need more robust parsing in production
        const emailResponse = ollResponse.message.content;
        
        // Extract subject if possible
        let extractedSubject = subject || '';
        const subjectMatch = emailResponse.match(/Subject:(.+?)(\n|$)/i);
        if (subjectMatch) {
            extractedSubject = subjectMatch[1].trim();
        }
        
        // Extract email body
        let body = emailResponse;
        if (emailResponse.includes('Subject:')) {
            body = emailResponse.split(/Subject:.+?\n/i)[1] || emailResponse;
        }
        if (body.includes('To:')) {
            body = body.split(/To:.+?\n/i)[1] || body;
        }
        
        res.json({
            to: to || '[Recipient]',
            subject: extractedSubject,
            body: body.trim()
        });
        
    } catch (error) {
        console.error('Email draft generation error:', error);
        res.status(500).json({ error: 'Failed to generate email draft: ' + error.message });
    }
});

// Enhanced Chat Endpoint with Command Detection
app.post('/api/chat', async (req, res) => {
    const { message, history = [], responseStyle = activeStyle, image = null } = req.body;

    if (!message && !image) {
        return res.status(400).json({ error: 'No message or image provided' });
    }

    try {
        // Check for special commands
        if (message && message.trim().startsWith('/search ')) {
            return handleSearchCommand(message, history, responseStyle, res);
        } else if (message && message.trim().startsWith('/email ')) {
            return handleEmailCommand(message, history, responseStyle, res);
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

        // Generate suggestions based on response and context
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

// Handle search command
async function handleSearchCommand(message, history, responseStyle, res) {
    const query = message.substring('/search '.length).trim();
    
    if (!query) {
        res.write(`data: ${JSON.stringify({ 
            response: "Please provide a search query after the /search command.", 
            done: true 
        })}\n\n`);
        res.end();
        return;
    }
    
    try {
        // Start SSE response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Initial message
        res.write(`data: ${JSON.stringify({ 
            response: `Searching for: "${query}"...`, 
            done: false 
        })}\n\n`);
        
        // Get search results (either from real API or mock)
        let searchResults;
        try {
            // Try to use the search API endpoint
            const searchResponse = await fetch(`http://localhost:${port}/api/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            
            if (!searchResponse.ok) {
                throw new Error('Search API request failed');
            }
            
            const searchData = await searchResponse.json();
            searchResults = searchData.results || getMockSearchResults(query);
        } catch (error) {
            console.error('Error fetching search results:', error);
            searchResults = getMockSearchResults(query);
        }
        
        // Use Ollama to summarize and respond to the search results
        const systemPrompt = `You are a helpful AI assistant. You have been asked to search for information about "${query}".
        I will provide you with search results. Please analyze these results and provide a helpful response.
        Base your response only on the information in the search results.`;
        
        // Format search results for the AI
        const searchResultsText = searchResults.map((result, index) => 
            `Result ${index + 1}:\nTitle: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`
        ).join('\n\n');
        
        const userPrompt = `Here are the search results for "${query}":\n\n${searchResultsText}\n\nPlease provide a helpful response based on these search results.`;
        
        // Get response from Ollama
        const ollResponse = await ollama.chat({
            model: activeModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            options: {
                temperature: 0.7
            }
        });
        
        // Format the response with search results
        const aiSummary = ollResponse.message.content;
        
        // Generate suitable suggestions
        const suggestions = [
            `Tell me more about ${query}`,
            `How does ${query} work?`,
            `Compare ${query} with alternatives`
        ];
        
        // Send final response with both AI summary and search results
        const finalResponse = {
            response: aiSummary,
            searchResults: searchResults,
            done: true,
            suggestions
        };
        
        res.write(`data: ${JSON.stringify(finalResponse)}\n\n`);
        res.end();
        
    } catch (error) {
        console.error('Search command error:', error);
        res.write(`data: ${JSON.stringify({ 
            error: 'Error processing search: ' + error.message, 
            done: true 
        })}\n\n`);
        res.end();
    }
}

// Handle email command
async function handleEmailCommand(message, history, responseStyle, res) {
    try {
        // Parse email parameters - this is a simple implementation
        const emailParams = message.substring('/email '.length).trim();
        
        let to = '';
        let subject = '';
        let content = emailParams;
        
        // Extract to: parameter
        const toMatch = emailParams.match(/to:([^,;]+)(,|;|$)/i);
        if (toMatch) {
            to = toMatch[1].trim();
            content = content.replace(toMatch[0], '').trim();
        }
        
        // Extract subject: parameter
        const subjectMatch = content.match(/subject:([^,;]+)(,|;|$)/i);
        if (subjectMatch) {
            subject = subjectMatch[1].trim();
            content = content.replace(subjectMatch[0], '').trim();
        }
        
        // Start SSE response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Initial message
        res.write(`data: ${JSON.stringify({ 
            response: `Drafting an email${to ? ' to ' + to : ''}${subject ? ' with subject: ' + subject : ''}...`, 
            done: false 
        })}\n\n`);
        
        // Generate email draft
        try {
            const emailResponse = await fetch(`http://localhost:${port}/api/email/draft`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    to, 
                    subject, 
                    content,
                    style: responseStyle
                })
            });
            
            if (!emailResponse.ok) {
                throw new Error('Email draft API request failed');
            }
            
            const emailData = await emailResponse.json();
            
            // Format the email for display
            const emailDisplay = `
To: ${emailData.to}
Subject: ${emailData.subject}

${emailData.body}
            `;
            
            // Generate suitable suggestions
            const suggestions = [
                'Make this email more formal',
                'Make this email more casual',
                'Add more details to this email'
            ];
            
            // Send final response with email draft
            const finalResponse = {
                response: 'Here is your email draft:',
                emailDraft: {
                    to: emailData.to,
                    subject: emailData.subject,
                    body: emailData.body
                },
                done: true,
                suggestions
            };
            
            res.write(`data: ${JSON.stringify(finalResponse)}\n\n`);
            res.end();
            
        } catch (error) {
            // If there's an error with the email API, generate a simpler response
            console.error('Email API error:', error);
            
            const systemPrompt = `You are an AI assistant specialized in writing emails.
            Draft a professional email based on the user's request.`;
            
            const userPrompt = `Draft an email with the following details:
            To: ${to || '[Recipient]'}
            Subject: ${subject || '[Subject]'}
            Content: ${content}`;
            
            const ollResponse = await ollama.chat({
                model: activeModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            });
            
            // Send the fallback response
            const suggestions = [
                'Make this email more formal',
                'Make this email more casual',
                'Add more details to this email'
            ];
            
            res.write(`data: ${JSON.stringify({ 
                response: ollResponse.message.content, 
                done: true,
                suggestions
            })}\n\n`);
            res.end();
        }
        
    } catch (error) {
        console.error('Email command error:', error);
        res.write(`data: ${JSON.stringify({ 
            error: 'Error drafting email: ' + error.message, 
            done: true 
        })}\n\n`);
        res.end();
    }
}

// Helper function to generate context-aware suggestions
function generateSuggestions(userMessage, aiResponse) {
    // Default suggestions
    let suggestions = [
        'Tell me more about this',
        'Explain in simpler terms',
        'Give me an example'
    ];
    
    // Customize based on user input
    if (userMessage?.toLowerCase().includes('search') || userMessage?.toLowerCase().includes('find')) {
        suggestions = [
            'Search the web for more info',
            'Find latest news on this topic',
            'Compare with alternatives'
        ];
    } else if (userMessage?.toLowerCase().includes('email') || userMessage?.toLowerCase().includes('write')) {
        suggestions = [
            'Draft an email about this',
            'Make it more formal',
            'Make it more concise'
        ];
    } else if (userMessage?.toLowerCase().includes('explain') || userMessage?.toLowerCase().includes('how')) {
        suggestions = [
            'Explain with an example',
            'Show me code for this',
            'Why is this important?'
        ];
    } else if (userMessage?.toLowerCase().includes('code') || userMessage?.toLowerCase().includes('program')) {
        suggestions = [
            'Explain this code',
            'Optimize this code',
            'Add comments to the code'
        ];
    }
    
    // Look at AI response to generate more relevant suggestions
    if (aiResponse?.toLowerCase().includes('search') || aiResponse?.toLowerCase().includes('recent')) {
        suggestions.push('Search for latest information');
    }
    if (aiResponse?.toLowerCase().includes('upload') || aiResponse?.toLowerCase().includes('document')) {
        suggestions.push('How to upload a document?');
    }
    if (aiResponse?.toLowerCase().includes('example') || aiResponse?.toLowerCase().includes('instance')) {
        suggestions.push('Show me more examples');
    }
    
    // Ensure no duplicates and limit to 4 suggestions
    return [...new Set(suggestions)].slice(0, 4);
}

// --- Keep existing API endpoints ---

// Model Profiles API
app.get('/api/models', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received GET /api/models request`);
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

// Start server if not being imported for testing
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(port, () => {
        console.log(`KYNSEY AI Backend listening at http://localhost:${port}`);
    });
}

export default app;
