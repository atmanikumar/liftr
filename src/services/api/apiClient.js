/**
 * API Client - Centralized API call handler with caching
 * Handles errors, loading states, caching, and provides consistent interface
 */

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds default

/**
 * Get cached data if available and not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.duration) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

/**
 * Set cache data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} duration - Cache duration in ms
 */
function setCache(key, data, duration = CACHE_DURATION) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    duration,
  });
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Clear specific cache entry
 * @param {string} key - Cache key
 */
export function clearCacheKey(key) {
  cache.delete(key);
}

/**
 * Base API call function with caching support
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {boolean} useCache - Whether to use cache for GET requests
 * @param {number} cacheDuration - Cache duration in ms
 * @returns {Promise<Object>} Response data
 */
async function apiCall(url, options = {}, useCache = true, cacheDuration = CACHE_DURATION) {
  try {
    // Check cache for GET requests
    if (options.method === 'GET' && useCache) {
      const cached = getCached(url);
      if (cached) {
        return cached;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    // Cache GET requests
    if (options.method === 'GET' && useCache) {
      setCache(url, data, cacheDuration);
    }

    // Clear related caches for mutations
    if (['POST', 'PUT', 'DELETE'].includes(options.method)) {
      // Clear cache entries that might be affected
      const urlBase = url.split('?')[0];
      for (const [key] of cache.entries()) {
        if (key.startsWith(urlBase) || key.includes(urlBase.split('/').pop())) {
          cache.delete(key);
        }
      }
    }

    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * GET request with optional caching
 * @param {string} url - API endpoint
 * @param {boolean} useCache - Whether to use cache (default: true)
 * @param {number} cacheDuration - Cache duration in ms (default: 30000)
 * @returns {Promise<Object>} Response data
 */
export async function get(url, useCache = true, cacheDuration = CACHE_DURATION) {
  return apiCall(url, {
    method: 'GET',
  }, useCache, cacheDuration);
}

/**
 * POST request
 * @param {string} url - API endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
export async function post(url, body) {
  return apiCall(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 * @param {string} url - API endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
export async function put(url, body) {
  return apiCall(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 * @param {string} url - API endpoint
 * @returns {Promise<Object>} Response data
 */
export async function del(url) {
  return apiCall(url, {
    method: 'DELETE',
  });
}

/**
 * Upload file (multipart/form-data)
 * @param {string} url - API endpoint
 * @param {FormData} formData - Form data with file
 * @returns {Promise<Object>} Response data
 */
export async function upload(url, formData) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

