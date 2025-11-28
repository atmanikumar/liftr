/**
 * API Client - Centralized API call handler
 * Handles errors, loading states, and provides consistent interface
 */

/**
 * Base API call function
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiCall(url, options = {}) {
  try {
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

    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * GET request
 * @param {string} url - API endpoint
 * @returns {Promise<Object>} Response data
 */
export async function get(url) {
  return apiCall(url, {
    method: 'GET',
  });
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

