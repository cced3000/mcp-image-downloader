import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export class FileManager {
  constructor() {
    this.defaultDownloadPath = './downloads';
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path
   * @returns {boolean} Whether file exists
   */
  fileExists(filePath) {
    return existsSync(filePath);
  }

  /**
   * Get file stats
   * @param {string} filePath - File path
   * @returns {Promise<Object>} File stats
   */
  async getFileStats(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      throw new Error(`Failed to get file stats for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Generate unique filename to avoid conflicts
   * @param {string} dirPath - Directory path
   * @param {string} baseName - Base filename
   * @param {string} extension - File extension
   * @returns {Promise<string>} Unique filename
   */
  async generateUniqueFilename(dirPath, baseName, extension) {
    let counter = 0;
    let filename = `${baseName}.${extension}`;
    let fullPath = path.join(dirPath, filename);

    while (this.fileExists(fullPath)) {
      counter++;
      filename = `${baseName}_${counter}.${extension}`;
      fullPath = path.join(dirPath, filename);
    }

    return filename;
  }

  /**
   * Clean filename by removing invalid characters
   * @param {string} filename - Original filename
   * @returns {string} Cleaned filename
   */
  cleanFilename(filename) {
    // Remove or replace invalid characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Get available disk space
   * @param {string} dirPath - Directory path
   * @returns {Promise<Object>} Disk space info
   */
  async getDiskSpace(dirPath) {
    try {
      const stats = await fs.statfs ? fs.statfs(dirPath) : null;
      if (stats) {
        return {
          free: stats.bavail * stats.bsize,
          total: stats.blocks * stats.bsize,
          used: (stats.blocks - stats.bavail) * stats.bsize
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete file
   * @param {string} filePath - File path
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Move file to new location
   * @param {string} sourcePath - Source file path
   * @param {string} targetPath - Target file path
   * @returns {Promise<void>}
   */
  async moveFile(sourcePath, targetPath) {
    try {
      await this.ensureDirectory(path.dirname(targetPath));
      await fs.rename(sourcePath, targetPath);
    } catch (error) {
      throw new Error(`Failed to move file from ${sourcePath} to ${targetPath}: ${error.message}`);
    }
  }

  /**
   * Copy file to new location
   * @param {string} sourcePath - Source file path
   * @param {string} targetPath - Target file path
   * @returns {Promise<void>}
   */
  async copyFile(sourcePath, targetPath) {
    try {
      await this.ensureDirectory(path.dirname(targetPath));
      await fs.copyFile(sourcePath, targetPath);
    } catch (error) {
      throw new Error(`Failed to copy file from ${sourcePath} to ${targetPath}: ${error.message}`);
    }
  }

  /**
   * Get directory contents
   * @param {string} dirPath - Directory path
   * @returns {Promise<string[]>} Array of filenames
   */
  async getDirectoryContents(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Clean up old files in directory
   * @param {string} dirPath - Directory path
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<number>} Number of files deleted
   */
  async cleanupOldFiles(dirPath, maxAge = 24 * 60 * 60 * 1000) { // Default: 24 hours
    try {
      const files = await this.getDirectoryContents(dirPath);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await this.getFileStats(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup old files in ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Validate path is safe (prevent directory traversal)
   * @param {string} filePath - File path to validate
   * @param {string} basePath - Base path to restrict to
   * @returns {boolean} Whether path is safe
   */
  isPathSafe(filePath, basePath = process.cwd()) {
    try {
      const resolvedPath = path.resolve(filePath);
      const resolvedBase = path.resolve(basePath);
      
      return resolvedPath.startsWith(resolvedBase);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} File extension (without dot)
   */
  getFileExtension(filename) {
    return path.extname(filename).slice(1).toLowerCase();
  }

  /**
   * Get filename without extension
   * @param {string} filename - Filename
   * @returns {string} Filename without extension
   */
  getBaseName(filename) {
    return path.parse(filename).name;
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}