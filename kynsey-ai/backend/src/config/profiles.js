/**
 * Model Profile Configuration
 * Defines available model profiles and utility functions for profile management
 */

// Model tier configuration
export const MODEL_TIERS = {
    STANDARD: 'standard',
    PRO: 'pro',
    CODE: 'code'
};

// Enhanced model profiles with tier support
export const modelProfiles = [
    {
        displayName: 'Standard',
        internalName: 'KYNSEY Mini',
        modelId: 'llama3.2:3b-instruct-fp16',
        description: 'Fast and efficient for everyday tasks',
        tier: MODEL_TIERS.STANDARD
    },
    {
        displayName: 'Pro',
        internalName: 'KYNSEY Vision',
        modelId: 'gemma3:27b-it-q4_K_M',
        description: 'Advanced model with comprehensive capabilities',
        tier: MODEL_TIERS.PRO
    },
    {
        displayName: 'Code',
        internalName: 'KYNSEY Innovex',
        modelId: 'cogito:32b-v1-preview-qwen-q4_K_M',
        description: 'Specialized for software development and technical tasks',
        tier: MODEL_TIERS.CODE
    }
];

/**
 * Get a profile by its name
 * @param {string} name - The name of the profile to find
 * @returns {Object|null} The profile object if found, null otherwise
 */
/**
 * Get a profile by its display name
 * @param {string} displayName - The display name of the profile to find
 * @returns {Object|null} The profile object if found, null otherwise
 */
export function getProfileByDisplayName(displayName) {
    return modelProfiles.find(p => p.displayName === displayName) || null;
}

/**
 * Get a profile by its internal name
 * @param {string} internalName - The internal name of the profile to find
 * @returns {Object|null} The profile object if found, null otherwise
 */
export function getProfileByInternalName(internalName) {
    return modelProfiles.find(p => p.internalName === internalName) || null;
}

/**
 * Legacy support - Get profile by name (checks both display and internal names)
 * @param {string} name - The name to search for
 * @returns {Object|null} The profile object if found, null otherwise
 */
export function getProfileByName(name) {
    return modelProfiles.find(p => p.displayName === name || p.internalName === name) || null;
}

/**
 * Get a model ID by profile name
 * @param {string} name - The name of the profile
 * @returns {string|null} The model ID if found, null otherwise
 */
/**
 * Get a model ID by profile display name
 * @param {string} displayName - The display name of the profile
 * @returns {string|null} The model ID if found, null otherwise
 */
export function getModelIdByDisplayName(displayName) {
    const profile = getProfileByDisplayName(displayName);
    return profile ? profile.modelId : null;
}

/**
 * Legacy support - Get model ID by name
 * @param {string} name - The name to search for
 * @returns {string|null} The model ID if found, null otherwise
 */
export function getModelIdByName(name) {
    const profile = getProfileByName(name);
    return profile ? profile.modelId : null;
}

/**
 * Get the default profile
 * @returns {Object} The default profile object
 */
/**
 * Get the default profile (Standard tier)
 * @returns {Object} The default profile object
 */
export function getDefaultProfile() {
    return modelProfiles.find(p => p.tier === MODEL_TIERS.STANDARD) || modelProfiles[0];
}

/**
 * Validate if a profile exists
 * @param {string} name - The name of the profile to validate
 * @returns {boolean} True if the profile exists, false otherwise
 */
/**
 * Validate if a profile exists by display name
 * @param {string} displayName - The display name to validate
 * @returns {boolean} True if the profile exists, false otherwise
 */
export function isValidProfile(displayName) {
    return modelProfiles.some(p => p.displayName === displayName);
}

/**
 * Get profiles by tier
 * @param {string} tier - The tier to filter by
 * @returns {Array} Array of profiles matching the tier
 */
export function getProfilesByTier(tier) {
    return modelProfiles.filter(p => p.tier === tier);
}

/**
 * Get all available tiers
 * @returns {Array<string>} Array of unique tier names
 */
export function getAvailableTiers() {
    return Object.values(MODEL_TIERS);
}

/**
 * Check if a tier is valid
 * @param {string} tier - The tier to validate
 * @returns {boolean} True if the tier is valid, false otherwise
 */
export function isValidTier(tier) {
    return Object.values(MODEL_TIERS).includes(tier);
}

/**
 * Get all available profile names
 * @returns {string[]} Array of profile names
 */
/**
 * Get all available profile display names
 * @returns {string[]} Array of profile display names
 */
export function getAvailableProfileNames() {
    return modelProfiles.map(p => p.displayName);
}

/**
 * Get display name for a tier
 * @param {string} tier - The tier to get display name for
 * @returns {string|null} The display name if found, null otherwise
 */
export function getTierDisplayName(tier) {
    const profile = modelProfiles.find(p => p.tier === tier);
    return profile ? profile.displayName : null;
}
