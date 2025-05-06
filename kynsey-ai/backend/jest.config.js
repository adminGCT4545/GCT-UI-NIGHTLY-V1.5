/** @type {import('jest').Config} */
const config = {
  // Indicates that the environment is Node.js
  testEnvironment: 'node',
  // extensionsToTreatAsEsm: ['.js'], // Removed: Redundant due to "type": "module" in package.json
  // Add necessary transform configuration if needed (e.g., for Babel)
  // By default, Jest might try to use Babel if installed.
  // If you don't have specific Babel needs beyond basic ESM,
  // you might not need a transform block initially.
  // transform: {}, // Keep empty or configure Babel if needed

  // If using Babel, you might need to prevent transformation of node_modules
  // transformIgnorePatterns: ['/node_modules/'],

  // Module Name Mapper can be useful for aliases or mocking non-JS files
  // moduleNameMapper: {},

  // Setup files to run before each test file (e.g., for global setup)
  // setupFilesAfterEnv: [],

  // Verbose output
  verbose: true,
};

export default config;