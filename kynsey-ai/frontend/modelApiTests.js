// Model API Integration Tests

import api from './api.js';

let adminSecret = 'test-admin-secret';

describe('Model API Integration Tests', () => {
  describe('Model Tier Management', () => {
    test('getModelTiers returns all available tiers', async () => {
      const response = await api.getModelTiers();
      
      expect(response).toBeDefined();
      expect(response.tiers).toBeInstanceOf(Array);
      expect(response.tiers).toContain('standard');
      expect(response.tiers).toContain('pro');
      expect(response.tiers).toContain('code');
    });

    test('getModelProfiles returns formatted profile data', async () => {
      const response = await api.getModelProfiles();
      
      expect(response).toBeDefined();
      expect(response.profiles).toBeInstanceOf(Array);
      
      const standardProfile = response.profiles.find(p => p.tier === 'standard');
      expect(standardProfile).toBeDefined();
      expect(standardProfile.displayName).toBe('Standard');
      expect(standardProfile.description).toBeDefined();
    });

    test('setActiveTier requires admin authentication', async () => {
      // Test without admin secret
      try {
        await api.setActiveTier('pro');
        fail('Should have thrown error without admin secret');
      } catch (error) {
        expect(error.message).toContain('unauthorized');
      }

      // Test with admin secret
      try {
        const response = await api.setActiveTier('pro', adminSecret);
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.activeProfile.tier).toBe('pro');
      } catch (error) {
        fail('Should not throw with valid admin secret: ' + error.message);
      }
    });

    test('setActiveProfile requires admin authentication', async () => {
      // Test without admin secret
      try {
        await api.setActiveProfile('Pro');
        fail('Should have thrown error without admin secret');
      } catch (error) {
        expect(error.message).toContain('unauthorized');
      }

      // Test with admin secret
      try {
        const response = await api.setActiveProfile('Pro', adminSecret);
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.activeProfile.displayName).toBe('Pro');
      } catch (error) {
        fail('Should not throw with valid admin secret: ' + error.message);
      }
    });
  });

  describe('Error Handling', () => {
    test('handles invalid tier selection', async () => {
      try {
        await api.setActiveTier('invalid-tier', adminSecret);
        fail('Should have thrown error for invalid tier');
      } catch (error) {
        expect(error.message).toContain('invalid tier');
      }
    });

    test('handles network errors gracefully', async () => {
      // Simulate network error by temporarily modifying API_BASE
      const originalBase = api.API_BASE;
      api.API_BASE = 'http://invalid-url';

      try {
        await api.getModelTiers();
        fail('Should have thrown network error');
      } catch (error) {
        expect(error.message).toBeDefined();
      }

      api.API_BASE = originalBase;
    });

    test('handles server errors gracefully', async () => {
      // Test with invalid admin secret to trigger server error
      try {
        await api.setActiveTier('pro', 'invalid-secret');
        fail('Should have thrown authentication error');
      } catch (error) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('State Persistence', () => {
    test('active tier persists after setting', async () => {
      // Set tier to pro
      await api.setActiveTier('pro', adminSecret);
      
      // Get current profiles to verify persistence
      const response = await api.getModelProfiles();
      expect(response.activeProfile.tier).toBe('pro');
    });

    test('active profile persists after setting', async () => {
      // Set profile to Pro
      await api.setActiveProfile('Pro', adminSecret);
      
      // Get current profiles to verify persistence
      const response = await api.getModelProfiles();
      expect(response.activeProfile.displayName).toBe('Pro');
    });
  });
});
