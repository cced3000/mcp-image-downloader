/**
 * Progress tracking utilities for download operations
 */

export class ProgressTracker {
  constructor() {
    this.progressHistory = [];
    this.startTime = null;
    this.lastUpdateTime = null;
  }

  /**
   * Start tracking progress
   */
  start() {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.progressHistory = [];
  }

  /**
   * Update progress and calculate additional metrics
   * @param {Object} progress - Progress data
   * @returns {Object} Enhanced progress data
   */
  updateProgress(progress) {
    const now = Date.now();
    const timeDiff = now - this.lastUpdateTime;
    const totalTime = now - this.startTime;

    const enhancedProgress = {
      ...progress,
      timestamp: new Date().toISOString(),
      elapsedTime: totalTime,
      estimatedTimeRemaining: this.calculateETA(progress.percentage, totalTime),
      averageSpeed: this.calculateAverageSpeed(progress.downloadedBytes, totalTime),
    };

    this.progressHistory.push(enhancedProgress);
    this.lastUpdateTime = now;

    return enhancedProgress;
  }

  /**
   * Calculate estimated time of arrival
   * @param {number} percentage - Current progress percentage
   * @param {number} elapsedTime - Time elapsed in milliseconds
   * @returns {number} Estimated time remaining in milliseconds
   */
  calculateETA(percentage, elapsedTime) {
    if (percentage <= 0) return null;
    const totalEstimatedTime = (elapsedTime / percentage) * 100;
    return Math.max(0, totalEstimatedTime - elapsedTime);
  }

  /**
   * Calculate average download speed
   * @param {number} downloadedBytes - Bytes downloaded
   * @param {number} elapsedTime - Time elapsed in milliseconds
   * @returns {number} Average speed in bytes per second
   */
  calculateAverageSpeed(downloadedBytes, elapsedTime) {
    if (elapsedTime <= 0) return 0;
    return (downloadedBytes / elapsedTime) * 1000; // Convert to bytes per second
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format time duration to human readable format
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted string
   */
  static formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) return 'Unknown';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format speed to human readable format
   * @param {number} bytesPerSecond - Speed in bytes per second
   * @returns {string} Formatted string
   */
  static formatSpeed(bytesPerSecond) {
    return ProgressTracker.formatBytes(bytesPerSecond) + '/s';
  }

  /**
   * Get progress summary
   * @returns {Object} Progress summary
   */
  getSummary() {
    if (this.progressHistory.length === 0) {
      return {
        totalTime: 0,
        averageSpeed: 0,
        peakSpeed: 0,
        progressUpdates: 0,
      };
    }

    const lastProgress = this.progressHistory[this.progressHistory.length - 1];
    const speeds = this.progressHistory
      .filter(p => p.speed > 0)
      .map(p => p.speed);

    return {
      totalTime: lastProgress.elapsedTime,
      averageSpeed: lastProgress.averageSpeed,
      peakSpeed: speeds.length > 0 ? Math.max(...speeds) : 0,
      progressUpdates: this.progressHistory.length,
      finalPercentage: lastProgress.percentage,
    };
  }

  /**
   * Reset the tracker
   */
  reset() {
    this.progressHistory = [];
    this.startTime = null;
    this.lastUpdateTime = null;
  }
}

/**
 * Batch progress tracker for managing multiple downloads
 */
export class BatchProgressTracker {
  constructor(totalItems) {
    this.totalItems = totalItems;
    this.completedItems = 0;
    this.activeTrackers = new Map();
    this.completedTrackers = [];
    this.startTime = Date.now();
  }

  /**
   * Create a tracker for an individual item
   * @param {string|number} itemId - Unique identifier for the item
   * @returns {ProgressTracker} Progress tracker instance
   */
  createItemTracker(itemId) {
    const tracker = new ProgressTracker();
    this.activeTrackers.set(itemId, tracker);
    tracker.start();
    return tracker;
  }

  /**
   * Mark an item as completed
   * @param {string|number} itemId - Item identifier
   */
  completeItem(itemId) {
    const tracker = this.activeTrackers.get(itemId);
    if (tracker) {
      this.completedTrackers.push({
        itemId,
        summary: tracker.getSummary(),
      });
      this.activeTrackers.delete(itemId);
      this.completedItems++;
    }
  }

  /**
   * Get overall batch progress
   * @returns {Object} Batch progress data
   */
  getBatchProgress() {
    const now = Date.now();
    const elapsedTime = now - this.startTime;
    const overallPercentage = (this.completedItems / this.totalItems) * 100;
    
    const activeDownloads = Array.from(this.activeTrackers.entries()).map(([itemId, tracker]) => {
      const lastProgress = tracker.progressHistory[tracker.progressHistory.length - 1];
      return {
        itemId,
        ...lastProgress,
      };
    });

    return {
      completed: this.completedItems,
      total: this.totalItems,
      overallPercentage: Math.round(overallPercentage),
      elapsedTime,
      estimatedTimeRemaining: this.calculateBatchETA(overallPercentage, elapsedTime),
      activeDownloads,
      activeCount: this.activeTrackers.size,
    };
  }

  /**
   * Calculate estimated time for batch completion
   * @param {number} percentage - Overall progress percentage
   * @param {number} elapsedTime - Time elapsed in milliseconds
   * @returns {number} Estimated time remaining in milliseconds
   */
  calculateBatchETA(percentage, elapsedTime) {
    if (percentage <= 0) return null;
    const totalEstimatedTime = (elapsedTime / percentage) * 100;
    return Math.max(0, totalEstimatedTime - elapsedTime);
  }

  /**
   * Get batch summary
   * @returns {Object} Batch summary
   */
  getSummary() {
    const batchProgress = this.getBatchProgress();
    const completedSummaries = this.completedTrackers.map(ct => ct.summary);
    
    const totalBytes = completedSummaries.reduce((sum, s) => sum + (s.finalBytes || 0), 0);
    const averageSpeed = completedSummaries.length > 0 
      ? completedSummaries.reduce((sum, s) => sum + s.averageSpeed, 0) / completedSummaries.length
      : 0;

    return {
      ...batchProgress,
      totalBytes,
      averageSpeed,
      completedItems: this.completedTrackers,
    };
  }
}