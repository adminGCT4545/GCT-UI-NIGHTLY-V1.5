import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals'; // Import Jest globals + beforeAll
import request from 'supertest';
// Don't import app or ollama statically here
import { getAvailableStyles } from '../config/systemPrompt.js'; // Keep this if needed globally

// Mock ollama FIRST, ensuring it provides a default export
jest.unstable_mockModule('ollama', () => ({
    default: { // Add the default export wrapper
        list: jest.fn(),
        chat: jest.fn(),
    }
}));

// Declare variables to hold the dynamically imported modules
let app;
let ollama;

describe('Admin Panel API Endpoints', () => {

    beforeAll(async () => {
        // Dynamically import app (which imports original ollama, but should get mocked version)
        const serverModule = await import('../server.js');
        app = serverModule.default;
        // Dynamically import the mocked ollama module
        const ollamaModule = await import('ollama');
        ollama = ollamaModule.default; // Assign the mocked module to our variable
    });

    // Reset mocks before each test
    beforeEach(() => {
        // Ensure ollama and its methods are available before trying to reset
        if (ollama && ollama.list && typeof ollama.list.mockReset === 'function') {
             ollama.list.mockReset();
             // Provide a default mock response for list()
             ollama.list.mockResolvedValue({
                 models: [
                     { name: 'llama3:latest', model: 'llama3:latest', modified_at: '...', size: 123 },
                     { name: 'mistral:latest', model: 'mistral:latest', modified_at: '...', size: 456 },
                 ]
             });
        } else {
            console.error('Ollama mock or ollama.list.mockReset not available in beforeEach');
        }
        if (ollama && ollama.chat && typeof ollama.chat.mockClear === 'function') {
             ollama.chat.mockClear();
        } else {
             console.error('Ollama mock or ollama.chat.mockClear not available in beforeEach');
        }
    });

    // --- Model Endpoints ---

    describe('GET /api/models', () => {
        it('should return available models from ollama and the default active model', async () => {
            // Ensure app is loaded before making request
            if (!app) throw new Error("Test setup failed: app not loaded");
            const response = await request(app).get('/api/models');

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('availableModels');
            expect(response.body).toHaveProperty('activeModel');
            expect(ollama.list).toHaveBeenCalledTimes(1); // Ensure ollama.list was called
            expect(response.body.availableModels).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'llama3:latest' }),
                expect.objectContaining({ name: 'mistral:latest' }),
            ]));
            // Check if the default active model (from server.js) is returned
            expect(response.body.activeModel).toBe(process.env.DEFAULT_MODEL || 'llama3'); // Adjust if default changes
        });

        it('should handle errors when fetching models from ollama', async () => {
            // Simulate an error from ollama.list()
            // Ensure ollama and app are loaded
            if (!ollama || !app) throw new Error("Test setup failed: ollama or app not loaded");
            const errorMessage = 'Ollama connection failed';
            ollama.list.mockRejectedValue(new Error(errorMessage));

            const response = await request(app).get('/api/models');

            expect(response.statusCode).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain(errorMessage);
            // Should still return the current active model as a fallback
            expect(response.body).toHaveProperty('activeModel');
            expect(response.body.availableModels).toEqual(expect.arrayContaining([
                 expect.objectContaining({ name: process.env.DEFAULT_MODEL || 'llama3' })
            ]));
        });
    });

    describe('POST /api/models/active', () => {
        it('should set the active model', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const newModel = 'mistral:latest';
            const response = await request(app)
                .post('/api/models/active')
                .send({ modelName: newModel });

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain(`Active model set to ${newModel}`);

            // Verify the active model was updated by calling GET /api/models again
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const getResponse = await request(app).get('/api/models');
            expect(getResponse.body.activeModel).toBe(newModel);
        });

        it('should return 400 if modelName is missing', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const response = await request(app)
                .post('/api/models/active')
                .send({}); // Missing modelName

            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('modelName is required');
        });
    });

    // --- Style Endpoints ---

    describe('GET /api/styles', () => {
        it('should return available styles and the default active style', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const response = await request(app).get('/api/styles');
            const expectedStyles = getAvailableStyles();

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('availableStyles');
            expect(response.body).toHaveProperty('activeStyle');
            expect(response.body.availableStyles).toEqual(expectedStyles);
            expect(response.body.activeStyle).toBe('normal'); // Default active style
        });
    });

    describe('POST /api/styles/active', () => {
        it('should set the active style', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const availableStyles = getAvailableStyles();
            const newStyle = availableStyles.find(s => s !== 'normal') || availableStyles[0]; // Pick a valid style

            const response = await request(app)
                .post('/api/styles/active')
                .send({ styleName: newStyle });

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain(`Active style set to ${newStyle}`);

            // Verify the active style was updated
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const getResponse = await request(app).get('/api/styles');
            expect(getResponse.body.activeStyle).toBe(newStyle);
        });

        it('should return 400 if styleName is missing or invalid', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            // Test missing
            let response = await request(app)
                .post('/api/styles/active')
                .send({});
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Invalid or missing styleName');

            // Test invalid
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            response = await request(app)
                .post('/api/styles/active')
                .send({ styleName: 'invalid-style-name' });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Invalid or missing styleName');
        });
    });

     // --- File Base Endpoints (Placeholder Tests) ---

     describe('GET /api/filebases', () => {
        it('should return available file bases and the default active file base', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const response = await request(app).get('/api/filebases');

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('availableFileBases');
            expect(response.body).toHaveProperty('activeFileBase');
            expect(response.body.availableFileBases).toEqual(['None']); // Default placeholder
            expect(response.body.activeFileBase).toBeNull(); // Default active
        });
    });

    describe('POST /api/filebases/active', () => {
        // Note: These tests assume the placeholder logic where 'None' is the only valid option initially.
        // They would need adjustment if file base loading from a directory is implemented.
        it('should set the active file base to null when "None" is selected', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const response = await request(app)
                .post('/api/filebases/active')
                .send({ fileBaseName: 'None' });

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('Active file base set to None');

            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            const getResponse = await request(app).get('/api/filebases');
            expect(getResponse.body.activeFileBase).toBeNull();
        });

         it('should return 400 if fileBaseName is missing or invalid', async () => {
            // Ensure app is loaded
            if (!app) throw new Error("Test setup failed: app not loaded");
            // Test missing
            let response = await request(app)
                .post('/api/filebases/active')
                .send({});
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Invalid or missing fileBaseName');

            // Test invalid (assuming only 'None' is valid for now)
            response = await request(app)
                .post('/api/filebases/active')
                .send({ fileBaseName: 'some-other-file' });
            expect(response.statusCode).toBe(400);
             expect(response.body.error).toBe('Invalid or missing fileBaseName');
        });
    });

});