import {
  getProfileByDisplayName,
  getProfileByInternalName,
  getDefaultProfile,
  isValidProfile,
  getProfilesByTier,
  getAvailableTiers,
  isValidTier,
  getTierDisplayName,
  MODEL_TIERS
} from '../config/profiles';

describe('Model Profile Management', () => {
  describe('Profile Retrieval', () => {
    test('getProfileByDisplayName returns correct profile for valid name', () => {
      const profile = getProfileByDisplayName('Standard');
      expect(profile).toBeDefined();
      expect(profile.displayName).toBe('Standard');
      expect(profile.internalName).toBe('KYNSEY Mini');
      expect(profile.tier).toBe(MODEL_TIERS.STANDARD);
    });

    test('getProfileByDisplayName returns null for invalid name', () => {
      const profile = getProfileByDisplayName('NonexistentModel');
      expect(profile).toBeNull();
    });

    test('getProfileByInternalName returns correct profile', () => {
      const profile = getProfileByInternalName('KYNSEY Vision');
      expect(profile).toBeDefined();
      expect(profile.displayName).toBe('Pro');
      expect(profile.tier).toBe(MODEL_TIERS.PRO);
    });

    test('getProfileByInternalName returns null for invalid name', () => {
      const profile = getProfileByInternalName('NonexistentModel');
      expect(profile).toBeNull();
    });
  });

  describe('Default Profile', () => {
    test('getDefaultProfile returns Standard tier profile', () => {
      const defaultProfile = getDefaultProfile();
      expect(defaultProfile).toBeDefined();
      expect(defaultProfile.tier).toBe(MODEL_TIERS.STANDARD);
      expect(defaultProfile.displayName).toBe('Standard');
    });
  });

  describe('Profile Validation', () => {
    test('isValidProfile returns true for valid display names', () => {
      expect(isValidProfile('Standard')).toBe(true);
      expect(isValidProfile('Pro')).toBe(true);
      expect(isValidProfile('Code')).toBe(true);
    });

    test('isValidProfile returns false for invalid names', () => {
      expect(isValidProfile('NonexistentModel')).toBe(false);
      expect(isValidProfile('')).toBe(false);
    });
  });

  describe('Tier Management', () => {
    test('getProfilesByTier returns correct profiles', () => {
      const standardProfiles = getProfilesByTier(MODEL_TIERS.STANDARD);
      expect(standardProfiles).toHaveLength(1);
      expect(standardProfiles[0].displayName).toBe('Standard');

      const proProfiles = getProfilesByTier(MODEL_TIERS.PRO);
      expect(proProfiles).toHaveLength(1);
      expect(proProfiles[0].displayName).toBe('Pro');
    });

    test('getAvailableTiers returns all defined tiers', () => {
      const tiers = getAvailableTiers();
      expect(tiers).toContain(MODEL_TIERS.STANDARD);
      expect(tiers).toContain(MODEL_TIERS.PRO);
      expect(tiers).toContain(MODEL_TIERS.CODE);
      expect(tiers).toHaveLength(3);
    });

    test('isValidTier validates tier names correctly', () => {
      expect(isValidTier(MODEL_TIERS.STANDARD)).toBe(true);
      expect(isValidTier(MODEL_TIERS.PRO)).toBe(true);
      expect(isValidTier(MODEL_TIERS.CODE)).toBe(true);
      expect(isValidTier('invalid')).toBe(false);
    });

    test('getTierDisplayName returns correct display names', () => {
      expect(getTierDisplayName(MODEL_TIERS.STANDARD)).toBe('Standard');
      expect(getTierDisplayName(MODEL_TIERS.PRO)).toBe('Pro');
      expect(getTierDisplayName(MODEL_TIERS.CODE)).toBe('Code');
      expect(getTierDisplayName('invalid')).toBeNull();
    });
  });
});
