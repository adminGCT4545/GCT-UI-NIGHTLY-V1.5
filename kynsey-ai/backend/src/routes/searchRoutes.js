/**
 * Search API Routes
 */

import express from 'express';
import { performWebSearch, getMockSearchResults } from '../config/searchAPI.js';

const router = express.Router();

/**
 * @route   POST /api/search
 * @desc    Perform a web search and return results
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const { query, count = 5 } = req.body;
        
        if (!query) {
            return res.status(400).json({ 
                error: 'Search query is required',
                results: [] 
            });
        }
        
        const results = await performWebSearch(query, count);
        
        res.json({ results });
    } catch (error) {
        console.error('Search route error:', error);
        res.status(500).json({ 
            error: 'Failed to perform search', 
            results: req.body.query ? getMockSearchResults(req.body.query) : []
        });
    }
});

/**
 * @route   GET /api/search/status
 * @desc    Check if the search API is configured properly
 * @access  Public
 */
router.get('/status', (req, res) => {
    const apiKey = process.env.SEARCH_API_KEY;
    const isConfigured = Boolean(apiKey);
    
    res.json({
        isConfigured,
        provider: process.env.SEARCH_API_PROVIDER || 'mock',
        message: isConfigured ? 'Search API is configured' : 'Search API is not configured'
    });
});

export default router;