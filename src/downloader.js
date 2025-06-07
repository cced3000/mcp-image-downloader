import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { ImageProcessor } from './processor.js';
import { FileManager } from './utils/fileManager.js';
import { ProgressTracker, BatchProgressTracker } from './utils/progressTracker.js';

export class ImageDownloader {
  constructor(options = {}) {
    this.processor = new ImageProcessor();
    this.fileManager = new FileManager();
    this.proxyConfig = options.proxy || null;
  }

  /**
   * Create axios config with proxy support
   * @param {Object} baseConfig - Base axios configuration
   * @returns {Object} Enhanced axios configuration
   */
  createAxiosConfig(baseConfig = {}) {
    const config = { ...baseConfig };
    
    if (this.proxyConfig) {
      if (typeof this.proxyConfig === 'string') {
        // Simple proxy URL format: http://proxy:port
        const proxyUrl = new URL(this.proxyConfig);
        config.proxy = {
          protocol: proxyUrl.protocol.slice(0, -1), // Remove trailing ':'
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port) || (proxyUrl.protocol === 'https:' ? 443 : 80),
        };
        
        // Add auth if present in URL
        if (proxyUrl.username && proxyUrl.password) {
          config.proxy.auth = {
            username: proxyUrl.username,
            password: proxyUrl.password,
          };
        }
      } else if (typeof this.proxyConfig === 'object') {
        // Detailed proxy configuration object
        config.proxy = { ...this.proxyConfig };
      }
    }
    
    return config;
  }

  /**
   * Download a single image
   * @param {string} url - Image URL
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result
   */
  async downloadSingle(url, options = {}) {
    const {
      savePath = './downloads',
      filename,
      format,
      compress,
      maxWidth,
      maxHeight,
      onProgress,
    } = options;

    try {
      // Ensure save directory exists
      await this.fileManager.ensureDirectory(savePath);

      // Get image info and generate filename
      const imageInfo = await this.getImageInfo(url);
      const finalFilename = filename || this.generateFilename(url, imageInfo.contentType, format);
      const filePath = path.join(savePath, finalFilename);

      // Initialize progress tracker
      const progressTracker = new ProgressTracker();
      progressTracker.start();
      const totalBytes = imageInfo.contentLength || 0;

      // Download image with progress tracking
      const axiosConfig = this.createAxiosConfig({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCP-Image-Downloader/1.0)',
        },
        onDownloadProgress: (progressEvent) => {
          const basicProgress = {
            url,
            filename: finalFilename,
            downloadedBytes: progressEvent.loaded,
            totalBytes: progressEvent.total || totalBytes,
            percentage: progressEvent.total ? Math.round((progressEvent.loaded / progressEvent.total) * 100) : 0,
            speed: progressEvent.rate || 0,
          };
          
          const enhancedProgress = progressTracker.updateProgress(basicProgress);
          
          if (onProgress) {
            onProgress(enhancedProgress);
          }
        },
      });
      
      const response = await axios(axiosConfig);

      // Save original or process image
      let finalPath = filePath;
      if (format || compress || maxWidth || maxHeight) {
        // Process image
        const processOptions = {
          format,
          compress,
          maxWidth,
          maxHeight,
        };
        finalPath = await this.processor.processStream(
          response.data,
          filePath,
          processOptions
        );
      } else {
        // Save original
        const writeStream = createWriteStream(filePath);
        await pipeline(response.data, writeStream);
      }

      const stats = await fs.stat(finalPath);

      return {
        success: true,
        url,
        filePath: finalPath,
        filename: path.basename(finalPath),
        size: stats.size,
        contentType: imageInfo.contentType,
        downloadedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
        downloadedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Download multiple images with concurrency control
   * @param {string[]} urls - Array of image URLs
   * @param {Object} options - Download options
   * @returns {Promise<Object[]>} Array of download results
   */
  async downloadBatch(urls, options = {}) {
    const { concurrency = 3, onBatchProgress, ...downloadOptions } = options;
    const results = [];
    const semaphore = new Semaphore(concurrency);
    const batchTracker = new BatchProgressTracker(urls.length);

    const downloadPromises = urls.map(async (url, index) => {
      await semaphore.acquire();
      try {
        console.error(`Downloading ${index + 1}/${urls.length}: ${url}`);
        
        // Create individual progress tracker for this download
        const itemTracker = batchTracker.createItemTracker(index);
        
        // Create progress callback for individual download
        const onProgress = (progress) => {
          if (onBatchProgress) {
            const batchProgress = batchTracker.getBatchProgress();
            onBatchProgress({
              ...batchProgress,
              currentIndex: index,
              currentProgress: progress,
            });
          }
        };
        
        const result = await this.downloadSingle(url, {
          ...downloadOptions,
          onProgress,
        });
        
        // Mark item as completed
        batchTracker.completeItem(index);
        results[index] = result;
        
        // Report completion progress
        if (onBatchProgress) {
          const batchProgress = batchTracker.getBatchProgress();
          onBatchProgress({
            ...batchProgress,
            currentIndex: index,
            justCompleted: true,
          });
        }
        
        return result;
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(downloadPromises);
    return results;
  }

  /**
   * Get image information from URL
   * @param {string} url - Image URL
   * @returns {Promise<Object>} Image info
   */
  async getImageInfo(url) {
    try {
      const axiosConfig = this.createAxiosConfig({
        method: 'HEAD',
        url,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCP-Image-Downloader/1.0)',
        },
      });
      
      const response = await axios(axiosConfig);

      return {
        contentType: response.headers['content-type'] || 'image/jpeg',
        contentLength: parseInt(response.headers['content-length']) || 0,
      };
    } catch (error) {
      // Fallback to default values if HEAD request fails
      return {
        contentType: 'image/jpeg',
        contentLength: 0,
      };
    }
  }

  /**
   * Generate filename from URL and content type
   * @param {string} url - Image URL
   * @param {string} contentType - Content type
   * @param {string} format - Target format
   * @returns {string} Generated filename
   */
  generateFilename(url, contentType, format) {
    const urlPath = new URL(url).pathname;
    const baseName = path.basename(urlPath) || 'image';
    const nameWithoutExt = path.parse(baseName).name || 'image';
    
    // Determine extension
    let extension;
    if (format) {
      extension = format === 'jpeg' ? 'jpg' : format;
    } else {
      // Extract from content type or URL
      const typeMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      extension = typeMap[contentType] || path.extname(baseName).slice(1) || 'jpg';
    }

    // Add timestamp to avoid conflicts
    const timestamp = Date.now();
    return `${nameWithoutExt}_${timestamp}.${extension}`;
  }
}

/**
 * Simple semaphore implementation for concurrency control
 */
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      this.current++;
      const resolve = this.queue.shift();
      resolve();
    }
  }
}