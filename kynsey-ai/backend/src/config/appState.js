/**
 * Application State Management
 * Handles loading and saving of application state, including active profile configuration
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDefaultProfile, isValidProfile } from './profiles.js';

// Get the directory name in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateFilePath = path.join(__dirname, 'app_state.json');

/**
 * @typedef {Object} AppState
 * @property {string} activeProfileName - Name of the currently active profile
 */

/**
 * Load the application state from disk
 * @returns {Promise<AppState>} The loaded application state
 */
export async function loadAppState() {
    try {
        const data = await fs.readFile(stateFilePath, 'utf-8');
        const state = JSON.parse(data);

        // Validate the loaded state
        if (state.activeProfileName && isValidProfile(state.activeProfileName)) {
            console.log(`Loaded active profile: ${state.activeProfileName}`);
            return state;
        } else {
            console.log('Invalid or missing active profile in state file, using default.');
            const defaultState = { activeProfileName: getDefaultProfile().name };
            await saveAppState(defaultState);
            return defaultState;
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('State file not found, creating with default profile.');
            const defaultState = { activeProfileName: getDefaultProfile().name };
            await saveAppState(defaultState);
            return defaultState;
        }
        console.error('Error loading app state:', error);
        return { activeProfileName: getDefaultProfile().name };
    }
}

/**
 * Save the application state to disk
 * @param {AppState} state - The state to save
 * @returns {Promise<void>}
 */
export async function saveAppState(state) {
    try {
        // Ensure state directory exists
        await fs.mkdir(path.dirname(stateFilePath), { recursive: true });
        
        // Save state with pretty formatting for readability
        await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2));
        console.log(`Saved active profile: ${state.activeProfileName}`);
    } catch (error) {
        console.error('Error saving app state:', error);
        throw error; // Re-throw to let caller handle the error
    }
}

/**
 * Update the active profile
 * @param {string} profileName - Name of the profile to set as active
 * @returns {Promise<void>}
 * @throws {Error} If the profile name is invalid
 */
export async function updateActiveProfile(profileName) {
    if (!isValidProfile(profileName)) {
        throw new Error(`Invalid profile name: ${profileName}`);
    }
    await saveAppState({ activeProfileName: profileName });
}
