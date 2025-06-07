/**
 * Test script for progress tracking functionality
 */

import { ImageDownloader } from '../src/downloader.js';
import { ProgressTracker } from '../src/utils/progressTracker.js';

// Test URLs (using small images for testing)
const testUrls = [
  'https://picsum.photos/200/300',
  'https://picsum.photos/400/600',
  'https://picsum.photos/800/600',
];

async function testSingleDownloadProgress() {
  console.log('\n=== Testing Single Download Progress ===');
  
  const downloader = new ImageDownloader();
  const progressUpdates = [];
  
  const result = await downloader.downloadSingle(testUrls[0], {
    savePath: './downloads/test',
    onProgress: (progress) => {
      progressUpdates.push(progress);
      console.log(`Progress: ${progress.percentage}% - ${ProgressTracker.formatBytes(progress.downloadedBytes)}/${ProgressTracker.formatBytes(progress.totalBytes)} - ${ProgressTracker.formatSpeed(progress.speed)} - ETA: ${ProgressTracker.formatDuration(progress.estimatedTimeRemaining)}`);
    },
  });
  
  console.log('Download Result:', {
    success: result.success,
    filename: result.filename,
    size: ProgressTracker.formatBytes(result.size),
    progressUpdates: progressUpdates.length,
  });
}

async function testBatchDownloadProgress() {
  console.log('\n=== Testing Batch Download Progress ===');
  
  const downloader = new ImageDownloader();
  const batchProgressUpdates = [];
  
  const results = await downloader.downloadBatch(testUrls, {
    savePath: './downloads/test-batch',
    concurrency: 2,
    onBatchProgress: (batchProgress) => {
      batchProgressUpdates.push(batchProgress);
      console.log(`Batch Progress: ${batchProgress.completed}/${batchProgress.total} (${batchProgress.overallPercentage}%) - Active: ${batchProgress.activeCount} - ETA: ${ProgressTracker.formatDuration(batchProgress.estimatedTimeRemaining)}`);
      
      if (batchProgress.currentProgress) {
        console.log(`  Current: ${batchProgress.currentProgress.filename} - ${batchProgress.currentProgress.percentage}%`);
      }
    },
  });
  
  console.log('Batch Results:', {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    batchProgressUpdates: batchProgressUpdates.length,
  });
}

async function testProgressTracker() {
  console.log('\n=== Testing Progress Tracker Utilities ===');
  
  const tracker = new ProgressTracker();
  tracker.start();
  
  // Simulate progress updates
  const testProgress = [
    { downloadedBytes: 1024, totalBytes: 10240, percentage: 10, speed: 1024 },
    { downloadedBytes: 5120, totalBytes: 10240, percentage: 50, speed: 2048 },
    { downloadedBytes: 10240, totalBytes: 10240, percentage: 100, speed: 1536 },
  ];
  
  for (const progress of testProgress) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate time passing
    const enhanced = tracker.updateProgress(progress);
    console.log(`Enhanced Progress:`, {
      percentage: enhanced.percentage,
      speed: ProgressTracker.formatSpeed(enhanced.speed),
      avgSpeed: ProgressTracker.formatSpeed(enhanced.averageSpeed),
      eta: ProgressTracker.formatDuration(enhanced.estimatedTimeRemaining),
      elapsed: ProgressTracker.formatDuration(enhanced.elapsedTime),
    });
  }
  
  const summary = tracker.getSummary();
  console.log('Tracker Summary:', {
    totalTime: ProgressTracker.formatDuration(summary.totalTime),
    averageSpeed: ProgressTracker.formatSpeed(summary.averageSpeed),
    peakSpeed: ProgressTracker.formatSpeed(summary.peakSpeed),
    progressUpdates: summary.progressUpdates,
  });
}

async function runTests() {
  try {
    await testProgressTracker();
    await testSingleDownloadProgress();
    await testBatchDownloadProgress();
    console.log('\n✅ All progress tracking tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testSingleDownloadProgress, testBatchDownloadProgress, testProgressTracker };