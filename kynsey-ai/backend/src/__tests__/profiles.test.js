import request from 'supertest';
import app from '../server.js';
import { modelProfiles, getDefaultProfile } from '../config/profiles.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateFilePath = path.join(__dirname, '..', 'config', 'app_state.json');

describe('Model Profile System', () => {
    const ADMIN_SECRET = 'test_admin_secret';
    
    // Setup test environment
    beforeAll(async () => {
        process.env.ADMIN_SECRET = ADMIN_SECRET;
        // Clean up any existing state file
        try {
            await fs.unlink(stateFilePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error cleaning up state file:', error);
            }
        }
    });

    // Clean up after tests
    afterAll(async () => {
        try {
            await fs.unlink(stateFilePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error cleaning up state file:', error);
            }
        }
    });

    describe('GET /api/models', () => {
        it('should return available profiles and active profile', async () => {
            const response = await request(app)
                .get('/api/models')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('profiles');
            expect(response.body).toHaveProperty('activeProfile');
            expect(response.body.profiles).toBeInstanceOf(Array);
            expect(response.body.profiles.length).toBe(modelProfiles.length);
            
            // Verify default profile is active initially
            const defaultProfile = getDefaultProfile();
            expect(response.body.activeProfile.name).toBe(defaultProfile.name);
        });

        it('should include required profile properties', async () => {
            const response = await request(app)
                .get('/api/models')
                .expect(200);

            const firstProfile = response.body.profiles[0];
            expect(firstProfile).toHaveProperty('name');
            expect(firstProfile).toHaveProperty('description');
            expect(firstProfile).toHaveProperty('isActive');
        });
    });

    describe('POST /api/models/active', () => {
        it('should require admin authentication', async () => {
            const response = await request(app)
                .post('/api/models/active')
                .send({ profileName: modelProfiles[0].name })
                .expect(403);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Admin access required');
        });

        it('should set active profile with valid admin secret', async () => {
            const targetProfile = modelProfiles[1]; // Use second profile
            const response = await request(app)
                .post('/api/models/active')
                .set('x-admin-secret', ADMIN_SECRET)
                .send({ profileName: targetProfile.name })
                .expect(200);

            expect(response.body).toHaveProperty('message');
            expect(response.body.profile.name).toBe(targetProfile.name);
            expect(response.body.profile.modelId).toBe(targetProfile.modelId);
        });

        it('should reject invalid profile names', async () => {
            const response = await request(app)
                .post('/api/models/active')
                .set('x-admin-secret', ADMIN_SECRET)
                .send({ profileName: 'invalid_profile_name' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Invalid profile name');
        });

        it('should persist active profile across server restarts', async () => {
            // Set a profile
            const targetProfile = modelProfiles[2]; // Use third profile
            await request(app)
                .post('/api/models/active')
                .set('x-admin-secret', ADMIN_SECRET)
                .send({ profileName: targetProfile.name })
                .expect(200);

            // Verify it was saved
            const response = await request(app)
                .get('/api/models')
                .expect(200);

            expect(response.body.activeProfile.name).toBe(targetProfile.name);
            expect(response.body.activeProfile.modelId).toBe(targetProfile.modelId);

            // Verify the state file exists and contains correct data
            const stateFileContent = await fs.readFile(stateFilePath, 'utf-8');
            const savedState = JSON.parse(stateFileContent);
            expect(savedState.activeProfileName).toBe(targetProfile.name);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing profileName parameter', async () => {
            const response = await request(app)
                .post('/api/models/active')
                .set('x-admin-secret', ADMIN_SECRET)
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('profileName is required');
        });

        it('should handle missing admin secret configuration', async () => {
            // Temporarily remove admin secret
            const originalSecret = process.env.ADMIN_SECRET;
            delete process.env.ADMIN_SECRET;

            const response = await request(app)
                .post('/api/models/active')
                .set('x-admin-secret', 'any-secret')
                .send({ profileName: modelProfiles[0].name })
                .expect(500);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Admin authentication not properly configured');

            // Restore admin secret
            process.env.ADMIN_SECRET = originalSecret;
        });
    });
});
