/**
 * URL validation utilities
 */

/**
 * Validate if a URL is a valid image URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Check if URL looks like an image
    const pathname = urlObj.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];
    
    // Check file extension
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // Check query parameters for image indicators
    const hasImageQuery = urlObj.search.includes('format=') || 
                         urlObj.search.includes('type=image') ||
                         urlObj.search.includes('.jpg') ||
                         urlObj.search.includes('.png') ||
                         urlObj.search.includes('.webp');

    // Accept if has image extension or image-related query params
    return hasImageExtension || hasImageQuery;
  } catch (error) {
    return false;
  }
}

/**
 * Validate multiple URLs
 * @param {string[]} urls - Array of URLs to validate
 * @returns {Object} Validation results
 */
export function validateImageUrls(urls) {
  if (!Array.isArray(urls)) {
    return {
      valid: [],
      invalid: [],
      errors: ['Input must be an array of URLs']
    };
  }

  const valid = [];
  const invalid = [];
  const errors = [];

  urls.forEach((url, index) => {
    if (validateImageUrl(url)) {
      valid.push(url);
    } else {
      invalid.push(url);
      errors.push(`Invalid URL at index ${index}: ${url}`);
    }
  });

  return {
    valid,
    invalid,
    errors
  };
}

/**
 * Sanitize URL by removing potentially harmful characters
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    // Create URL object to normalize the URL
    const urlObj = new URL(url.trim());
    
    // Reconstruct URL to remove any malicious components
    return urlObj.toString();
  } catch (error) {
    return '';
  }
}

/**
 * Check if URL is accessible (basic connectivity test)
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} Whether URL is accessible
 */
export async function isUrlAccessible(url, timeout = 5000) {
  if (!validateImageUrl(url)) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MCP-Image-Downloader/1.0)'
      }
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Extract filename from URL
 * @param {string} url - URL to extract filename from
 * @returns {string} Extracted filename or default
 */
export function extractFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    
    // Return filename if it has an extension, otherwise return default
    if (filename && filename.includes('.')) {
      return filename;
    }
    
    return 'image';
  } catch (error) {
    return 'image';
  }
}

/**
 * Validate download options
 * @param {Object} options - Download options to validate
 * @returns {Object} Validation result
 */
export function validateDownloadOptions(options = {}) {
  const errors = [];
  const warnings = [];

  // Validate savePath
  if (options.savePath && typeof options.savePath !== 'string') {
    errors.push('savePath must be a string');
  }

  // Validate filename
  if (options.filename && typeof options.filename !== 'string') {
    errors.push('filename must be a string');
  }

  // Validate format
  if (options.format) {
    const validFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff'];
    if (!validFormats.includes(options.format.toLowerCase())) {
      errors.push(`format must be one of: ${validFormats.join(', ')}`);
    }
  }

  // Validate dimensions
  if (options.maxWidth && (!Number.isInteger(options.maxWidth) || options.maxWidth <= 0)) {
    errors.push('maxWidth must be a positive integer');
  }

  if (options.maxHeight && (!Number.isInteger(options.maxHeight) || options.maxHeight <= 0)) {
    errors.push('maxHeight must be a positive integer');
  }

  // Validate concurrency
  if (options.concurrency) {
    if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 10) {
      errors.push('concurrency must be an integer between 1 and 10');
    }
  }

  // Warnings for large dimensions
  if (options.maxWidth && options.maxWidth > 4000) {
    warnings.push('maxWidth is very large, this may consume significant memory');
  }

  if (options.maxHeight && options.maxHeight > 4000) {
    warnings.push('maxHeight is very large, this may consume significant memory');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}