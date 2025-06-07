#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ImageDownloader } from './downloader.js';
import { validateImageUrl } from './utils/validator.js';

class ImageDownloaderServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-image-downloader',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    // Load default configuration from environment variables
    this.defaultConfig = {
      savePath: process.env.DEFAULT_SAVE_PATH || './downloads',
      format: process.env.DEFAULT_FORMAT || 'original',
      compress: process.env.DEFAULT_COMPRESS === 'true' || false,
      maxWidth: process.env.DEFAULT_MAX_WIDTH ? parseInt(process.env.DEFAULT_MAX_WIDTH) : undefined,
      maxHeight: process.env.DEFAULT_MAX_HEIGHT ? parseInt(process.env.DEFAULT_MAX_HEIGHT) : undefined,
      concurrency: process.env.DEFAULT_CONCURRENCY ? parseInt(process.env.DEFAULT_CONCURRENCY) : 3,
      filename: process.env.DEFAULT_FILENAME || undefined,
      proxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || undefined,
    };

    // Initialize downloader with proxy configuration
    this.downloader = new ImageDownloader({
      proxy: this.defaultConfig.proxy,
    });
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'download_image',
            description: 'Download a single image from URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'Image URL to download',
                },
                savePath: {
                  type: 'string',
                  description: 'Directory to save the image (optional)',
                  default: this.defaultConfig.savePath,
                },
                filename: {
                  type: 'string',
                  description: 'Custom filename (optional)',
                  default: this.defaultConfig.filename,
                },
                format: {
                  type: 'string',
                  description: 'Output format (jpeg, png, webp)',
                  enum: ['jpeg', 'png', 'webp'],
                  default: this.defaultConfig.format,
                },
                compress: {
                  type: 'boolean',
                  description: 'Whether to compress the image',
                  default: this.defaultConfig.compress,
                },
                maxWidth: {
                  type: 'number',
                  description: 'Maximum width in pixels',
                  default: this.defaultConfig.maxWidth,
                },
                maxHeight: {
                  type: 'number',
                  description: 'Maximum height in pixels',
                  default: this.defaultConfig.maxHeight,
                },
                proxy: {
                  type: 'string',
                  description: 'Proxy URL (e.g., http://proxy:8080 or http://user:pass@proxy:8080)',
                  default: this.defaultConfig.proxy,
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'download_images_batch',
            description: 'Download multiple images from URLs',
            inputSchema: {
              type: 'object',
              properties: {
                urls: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Array of image URLs to download',
                },
                savePath: {
                  type: 'string',
                  description: 'Directory to save the images (optional)',
                  default: this.defaultConfig.savePath,
                },
                format: {
                  type: 'string',
                  description: 'Output format (jpeg, png, webp)',
                  enum: ['jpeg', 'png', 'webp'],
                  default: this.defaultConfig.format,
                },
                compress: {
                  type: 'boolean',
                  description: 'Whether to compress the images',
                  default: this.defaultConfig.compress,
                },
                maxWidth: {
                  type: 'number',
                  description: 'Maximum width in pixels',
                  default: this.defaultConfig.maxWidth,
                },
                maxHeight: {
                  type: 'number',
                  description: 'Maximum height in pixels',
                  default: this.defaultConfig.maxHeight,
                },
                concurrency: {
                  type: 'number',
                  description: 'Number of concurrent downloads',
                  default: this.defaultConfig.concurrency,
                  minimum: 1,
                  maximum: 10,
                },
                proxy: {
                  type: 'string',
                  description: 'Proxy URL (e.g., http://proxy:8080 or http://user:pass@proxy:8080)',
                  default: this.defaultConfig.proxy,
                },
              },
              required: ['urls'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'download_image':
            return await this.handleDownloadImage(args);
          case 'download_images_batch':
            return await this.handleDownloadImagesBatch(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async handleDownloadImage(args) {
    const { 
      url, 
      savePath = this.defaultConfig.savePath, 
      filename = this.defaultConfig.filename, 
      format = this.defaultConfig.format, 
      compress = this.defaultConfig.compress, 
      maxWidth = this.defaultConfig.maxWidth, 
      maxHeight = this.defaultConfig.maxHeight,
      proxy = this.defaultConfig.proxy
    } = args;

    // Validate URL
    if (!validateImageUrl(url)) {
      throw new Error(`Invalid image URL: ${url}`);
    }

    // Use custom downloader if proxy is specified and different from default
    const downloader = (proxy && proxy !== this.defaultConfig.proxy) 
      ? new ImageDownloader({ proxy })
      : this.downloader;

    const progressUpdates = [];
    const options = {
      savePath,
      filename,
      format: format === 'original' ? null : format,
      compress,
      maxWidth,
      maxHeight,
      onProgress: (progress) => {
        progressUpdates.push({
          timestamp: new Date().toISOString(),
          ...progress,
        });
        // Report progress to stderr for real-time monitoring
        console.error(`Download progress: ${progress.percentage}% (${progress.downloadedBytes}/${progress.totalBytes} bytes)`);
      },
    };

    const result = await downloader.downloadSingle(url, options);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Image downloaded successfully',
            result: {
              ...result,
              progressHistory: progressUpdates,
            },
          }, null, 2),
        },
      ],
    };
  }

  async handleDownloadImagesBatch(args) {
    const { 
      urls, 
      savePath = this.defaultConfig.savePath, 
      format = this.defaultConfig.format, 
      compress = this.defaultConfig.compress, 
      maxWidth = this.defaultConfig.maxWidth, 
      maxHeight = this.defaultConfig.maxHeight, 
      concurrency = this.defaultConfig.concurrency,
      proxy = this.defaultConfig.proxy
    } = args;

    // Validate URLs
    const invalidUrls = urls.filter(url => !validateImageUrl(url));
    if (invalidUrls.length > 0) {
      throw new Error(`Invalid URLs found: ${invalidUrls.join(', ')}`);
    }

    // Use custom downloader if proxy is specified and different from default
    const downloader = (proxy && proxy !== this.defaultConfig.proxy) 
      ? new ImageDownloader({ proxy })
      : this.downloader;

    const batchProgressUpdates = [];
    const options = {
      savePath,
      format: format === 'original' ? null : format,
      compress,
      maxWidth,
      maxHeight,
      concurrency,
      onBatchProgress: (batchProgress) => {
        batchProgressUpdates.push({
          timestamp: new Date().toISOString(),
          ...batchProgress,
        });
        // Report batch progress to stderr for real-time monitoring
        console.error(`Batch progress: ${batchProgress.completed}/${batchProgress.total} completed (${batchProgress.overallPercentage}%)`);
        if (batchProgress.currentProgress) {
          console.error(`Current download: ${batchProgress.currentProgress.filename} - ${batchProgress.currentProgress.percentage}%`);
        }
      },
    };

    const results = await downloader.downloadBatch(urls, options);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Batch download completed',
            results,
            summary: {
              total: results.length,
              successful: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length,
            },
            batchProgressHistory: batchProgressUpdates,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Image Downloader Server running on stdio');
  }
}

// Start the server
const server = new ImageDownloaderServer();
server.run().catch(console.error);