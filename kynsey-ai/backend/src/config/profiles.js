/**
 * Model Profile Configuration
 * Defines available model profiles and utility functions for profile management
 */

export const modelProfiles = [
    {
        name: 'KYNSEY Mini',
        modelId: 'llama3.2:3b-instruct-fp16',
        description: 'Lightweight model optimized for quick responses and basic tasks'
    },
    {
        name: 'KYNSEY Vision',
        modelId: 'gemma3:27b-it-q4_K_M',
        description: 'Advanced model with image understanding capabilities'
    },
    {
        name: 'KYNSEY Innovex',
        modelId: 'cogito:32b-v1-preview-qwen-q4_K_M',
        description: 'High-performance model for complex reasoning and innovation'
    }
];

/**
 * Get a profile by its name
 * @param {string} name - The name of the profile to find
 * @returns {Object|null} The profile object if found, null otherwise
 */
export function getProfileByName(name) {
    return modelProfiles.find(p => p.name === name);
}

/**
 * Get a model ID by profile name
 * @param {string} name - The name of the profile
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
export function getDefaultProfile() {
    return modelProfiles[0]; // KYNSEY Mini is our default
}

/**
 * Validate if a profile exists
 * @param {string} name - The name of the profile to validate
 * @returns {boolean} True if the profile exists, false otherwise
 */
export function isValidProfile(name) {
    return modelProfiles.some(p => p.name === name);
}

/**
 * Get all available profile names
 * @returns {string[]} Array of profile names
 */
export function getAvailableProfileNames() {
    return modelProfiles.map(p => p.name);
}
