/**
 * This module handles integration with external search APIs
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SEARCH_API_KEY = process.env.SEARCH_API_KEY || '';
const SEARCH_API_ENDPOINT = process.env.SEARCH_API_ENDPOINT || 'https://api.bing.microsoft.com/v7.0/search';

/**
 * Perform a web search using the configured search API
 * @param {string} query - The search query
 * @param {number} count - Number of results to return (default: 5)
 * @returns {Promise<Array>} - Array of search results
 */
export async function performWebSearch(query, count = 5) {
    if (!query) {
        throw new Error('Search query is required');
    }

    try {
        if (!SEARCH_API_KEY) {
            console.warn('Search API key not configured, returning mock results');
            return getMockSearchResults(query);
        }

        const searchResponse = await fetch(
            `${SEARCH_API_ENDPOINT}?q=${encodeURIComponent(query)}&count=${count}`,
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
        // Adjust this based on the actual API you're using
        if (searchData.webPages && searchData.webPages.value) {
            return searchData.webPages.value.map(result => ({
                title: result.name,
                url: result.url,
                snippet: result.snippet
            }));
        }
        
        return getMockSearchResults(query);
    } catch (error) {
        console.error('Search API Error:', error);
        return getMockSearchResults(query);
    }
}

/**
 * Generate mock search results for development/fallback
 * @param {string} query - The search query
 * @returns {Array} - Array of mock search results
 */
export function getMockSearchResults(query) {
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

export default {
    performWebSearch,
    getMockSearchResults
};