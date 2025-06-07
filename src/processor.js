import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { PassThrough } from 'stream';

export class ImageProcessor {
  constructor() {
    this.supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff'];
  }

  /**
   * Process image stream with specified options
   * @param {Stream} inputStream - Input image stream
   * @param {string} outputPath - Output file path
   * @param {Object} options - Processing options
   * @returns {Promise<string>} Final output path
   */
  async processStream(inputStream, outputPath, options = {}) {
    const {
      format,
      compress = false,
      maxWidth,
      maxHeight,
      quality = 80,
    } = options;

    try {
      // Create Sharp transform stream
      const transformer = this.createTransformer({
        format,
        compress,
        maxWidth,
        maxHeight,
        quality,
      });

      // Determine final output path with correct extension
      const finalOutputPath = this.getFinalOutputPath(outputPath, format);

      // Ensure output directory exists
      await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });

      // Create output stream
      const outputStream = fs.createWriteStream ? 
        require('fs').createWriteStream(finalOutputPath) :
        await this.createWriteStreamAsync(finalOutputPath);

      // Process image through pipeline
      await pipeline(inputStream, transformer, outputStream);

      return finalOutputPath;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Process image file with specified options
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Object} options - Processing options
   * @returns {Promise<string>} Final output path
   */
  async processFile(inputPath, outputPath, options = {}) {
    const {
      format,
      compress = false,
      maxWidth,
      maxHeight,
      quality = 80,
    } = options;

    try {
      let processor = sharp(inputPath);

      // Apply resizing if specified
      if (maxWidth || maxHeight) {
        processor = processor.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply format conversion and compression
      if (format) {
        processor = this.applyFormat(processor, format, compress, quality);
      } else if (compress) {
        // Apply compression to original format
        const metadata = await sharp(inputPath).metadata();
        const originalFormat = metadata.format;
        processor = this.applyFormat(processor, originalFormat, compress, quality);
      }

      // Determine final output path
      const finalOutputPath = this.getFinalOutputPath(outputPath, format);

      // Ensure output directory exists
      await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });

      // Save processed image
      await processor.toFile(finalOutputPath);

      return finalOutputPath;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Create Sharp transformer stream
   * @param {Object} options - Processing options
   * @returns {Transform} Sharp transform stream
   */
  createTransformer(options = {}) {
    const {
      format,
      compress = false,
      maxWidth,
      maxHeight,
      quality = 80,
    } = options;

    let transformer = sharp();

    // Apply resizing if specified
    if (maxWidth || maxHeight) {
      transformer = transformer.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply format conversion and compression
    if (format) {
      transformer = this.applyFormat(transformer, format, compress, quality);
    } else if (compress) {
      // For compression without format change, we'll apply JPEG compression
      transformer = this.applyFormat(transformer, 'jpeg', compress, quality);
    }

    return transformer;
  }

  /**
   * Apply format-specific options to Sharp processor
   * @param {Sharp} processor - Sharp processor instance
   * @param {string} format - Target format
   * @param {boolean} compress - Whether to compress
   * @param {number} quality - Compression quality
   * @returns {Sharp} Configured Sharp processor
   */
  applyFormat(processor, format, compress = false, quality = 80) {
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return processor.jpeg({
          quality: compress ? quality : 95,
          progressive: true,
        });
      
      case 'png':
        return processor.png({
          compressionLevel: compress ? 9 : 6,
          progressive: true,
        });
      
      case 'webp':
        return processor.webp({
          quality: compress ? quality : 95,
          effort: compress ? 6 : 4,
        });
      
      case 'gif':
        return processor.gif();
      
      case 'tiff':
        return processor.tiff({
          compression: compress ? 'lzw' : 'none',
        });
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Get final output path with correct extension
   * @param {string} originalPath - Original output path
   * @param {string} format - Target format
   * @returns {string} Final output path
   */
  getFinalOutputPath(originalPath, format) {
    if (!format) {
      return originalPath;
    }

    const parsedPath = path.parse(originalPath);
    const extension = format === 'jpeg' ? 'jpg' : format;
    
    return path.join(
      parsedPath.dir,
      `${parsedPath.name}.${extension}`
    );
  }

  /**
   * Create write stream asynchronously (fallback for older Node.js versions)
   * @param {string} filePath - File path
   * @returns {Promise<WriteStream>} Write stream
   */
  async createWriteStreamAsync(filePath) {
    const { createWriteStream } = await import('fs');
    return createWriteStream(filePath);
  }

  /**
   * Get image metadata
   * @param {string|Buffer|Stream} input - Image input
   * @returns {Promise<Object>} Image metadata
   */
  async getMetadata(input) {
    try {
      return await sharp(input).metadata();
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Validate if format is supported
   * @param {string} format - Format to validate
   * @returns {boolean} Whether format is supported
   */
  isFormatSupported(format) {
    return this.supportedFormats.includes(format.toLowerCase());
  }
}