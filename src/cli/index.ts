#!/usr/bin/env node

/**
 * Byteflow CLI Tool
 *
 * Command-line interface for BytePlus image and video generation.
 *
 * @module cli
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { config } from 'dotenv';
import { BytePlusAI } from '../api/byteplus-ai.js';
import { BytePlusClient } from '../api/byteplus-client.js';
import type {
  ImageGenerationRequest,
  VideoGenerationRequest,
} from '../types/byteplus.js';

// Load environment variables
config();

const program = new Command();

program
  .name('byteflow')
  .description('BytePlus AI-powered image and video generation CLI')
  .version('1.0.0');

/**
 * Generate command - Create images from text prompts
 */
program
  .command('generate')
  .description('Generate images from text prompts')
  .argument('<prompt>', 'Text prompt for image generation')
  .option('-m, --model <model>', 'Model to use', 'seedream-4-0-250828')
  .option('-s, --size <size>', 'Image size', '2K')
  .option('-o, --optimize', 'Optimize prompt with T2T AI', false)
  .option('--no-watermark', 'Disable watermark', false)
  .option('--seed <number>', 'Random seed for reproducibility')
  .option('--output <path>', 'Output file path (saves image locally)')
  .action(async (prompt: string, options) => {
    const spinner = ora('Initializing Byteflow...').start();

    try {
      // Validate environment
      if (!process.env.BYTEPLUS_API_KEY || !process.env.BYTEPLUS_ENDPOINT) {
        spinner.fail(
          chalk.red('Missing environment variables: BYTEPLUS_API_KEY, BYTEPLUS_ENDPOINT')
        );
        console.log(chalk.yellow('\nPlease create a .env file with:'));
        console.log('BYTEPLUS_API_KEY=your_api_key');
        console.log('BYTEPLUS_ENDPOINT=https://api.byteplus.com/v1');
        process.exit(1);
      }

      const ai = new BytePlusAI({
        apiKey: process.env.BYTEPLUS_API_KEY,
        endpoint: process.env.BYTEPLUS_ENDPOINT,
        debug: false,
      });

      let finalPrompt = prompt;

      // Generate image with automatic optimization if requested
      const request: ImageGenerationRequest = {
        model: options.model,
        prompt,
        size: options.size,
        watermark: options.watermark !== false,
      };

      if (options.seed) {
        request.seed = parseInt(options.seed, 10);
      }

      const aiOptions = {
        optimizePrompt: options.optimize,
      };

      if (options.optimize) {
        spinner.text = 'Optimizing prompt and generating image...';
      } else {
        spinner.text = 'Generating image...';
      }

      const result = await ai.generateImage(request, aiOptions);

      spinner.succeed(chalk.green('Image generated successfully!'));

      // Display results
      console.log(chalk.bold('\n📸 Image Details:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('Model:'), chalk.white(options.model));
      console.log(chalk.cyan('Prompt:'), chalk.white(prompt));
      console.log(chalk.cyan('Size:'), chalk.white(options.size));
      console.log(chalk.cyan('Seed:'), chalk.white(result.seed ?? 'auto'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('URL:'), chalk.blue.underline(result.data[0].url));
      console.log();

      // Save to file if requested
      if (options.output) {
        const saveSpinner = ora('Downloading image...').start();
        try {
          const response = await fetch(result.data[0].url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, buffer);
          saveSpinner.succeed(chalk.green(`Image saved to ${options.output}`));
        } catch (error) {
          saveSpinner.fail(chalk.red('Failed to save image'));
          console.error(error);
        }
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Generation failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Story command - Generate multiple images for a story
 */
program
  .command('story')
  .description('Generate a story with multiple consistent images')
  .argument('<story>', 'Story description')
  .option('-i, --images <number>', 'Number of images to generate', '3')
  .option('-m, --model <model>', 'Model to use', 'seedream-4-0-250828')
  .option('-s, --size <size>', 'Image size', '2K')
  .option('--no-watermark', 'Disable watermark', false)
  .action(async (story: string, options) => {
    const spinner = ora('Initializing Byteflow...').start();

    try {
      if (!process.env.BYTEPLUS_API_KEY || !process.env.BYTEPLUS_ENDPOINT) {
        spinner.fail(
          chalk.red('Missing environment variables: BYTEPLUS_API_KEY, BYTEPLUS_ENDPOINT')
        );
        process.exit(1);
      }

      const ai = new BytePlusAI({
        apiKey: process.env.BYTEPLUS_API_KEY,
        endpoint: process.env.BYTEPLUS_ENDPOINT,
        debug: false,
      });

      const imageCount = parseInt(options.images, 10);
      spinner.text = `Generating ${imageCount} images for your story...`;

      const results = await ai.generateStory(story, imageCount, {
        model: options.model,
        size: options.size,
        watermark: options.watermark !== false,
      });

      spinner.succeed(chalk.green(`${imageCount} images generated successfully!`));

      // Display results
      console.log(chalk.bold('\n📖 Story Images:'));
      console.log(chalk.gray('─'.repeat(50)));

      results.forEach((result, index) => {
        console.log(chalk.cyan(`Scene ${index + 1}:`), chalk.blue.underline(result.data[0].url));
      });

      console.log(chalk.gray('─'.repeat(50)));
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red('Story generation failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Optimize command - Optimize prompt without generating
 */
program
  .command('optimize')
  .description('Optimize a prompt for image generation')
  .argument('<prompt>', 'Text prompt to optimize')
  .option('-t, --type <type>', 'Optimization type (t2i, i2i, i2v)', 't2i')
  .option('-s, --style <style>', 'Image style for t2i', 'photorealistic')
  .action(async (prompt: string, options) => {
    const spinner = ora('Optimizing prompt...').start();

    try {
      if (!process.env.BYTEPLUS_API_KEY || !process.env.BYTEPLUS_ENDPOINT) {
        spinner.fail(
          chalk.red('Missing environment variables: BYTEPLUS_API_KEY, BYTEPLUS_ENDPOINT')
        );
        process.exit(1);
      }

      const client = new BytePlusClient({
        apiKey: process.env.BYTEPLUS_API_KEY,
        endpoint: process.env.BYTEPLUS_ENDPOINT,
        debug: false,
      });

      // Use PromptOptimizer directly for optimize-only command
      const { PromptOptimizer } = await import('../services/prompt-optimizer.js');
      const optimizer = new PromptOptimizer({
        apiKey: process.env.BYTEPLUS_API_KEY,
        endpoint: process.env.BYTEPLUS_ENDPOINT,
      });

      let optimized: string;

      switch (options.type) {
        case 't2i':
          optimized = await optimizer.optimizeForImage(prompt, options.style);
          break;
        case 'i2i':
          optimized = await optimizer.optimizeForImageEdit(prompt);
          break;
        case 'i2v':
          optimized = await optimizer.optimizeForVideo(prompt);
          break;
        default:
          throw new Error(`Unknown optimization type: ${options.type}`);
      }

      spinner.succeed(chalk.green('Prompt optimized'));

      // Display results
      console.log(chalk.bold('\n✨ Optimized Prompt:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('Original:'), chalk.white(prompt));
      console.log(chalk.cyan('Optimized:'), chalk.white(optimized));
      console.log(chalk.gray('─'.repeat(50)));
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red('Optimization failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Video command - Generate video from image
 */
program
  .command('video')
  .description('Generate video from image')
  .argument('<image>', 'Source image URL or path')
  .argument('[prompt]', 'Video generation prompt (optional)')
  .option('-d, --duration <seconds>', 'Video duration (5 or 10 seconds)', '5')
  .option('-r, --resolution <res>', 'Video resolution', '1080P')
  .option('--ratio <ratio>', 'Video aspect ratio', '16:9')
  .option('--fixed-lens', 'Use fixed camera (no movement)', false)
  .option('--no-watermark', 'Disable watermark', false)
  .action(async (image: string, promptArg: string | undefined, options) => {
    const spinner = ora('Initializing Byteflow...').start();

    try {
      if (!process.env.BYTEPLUS_API_KEY || !process.env.BYTEPLUS_ENDPOINT) {
        spinner.fail(
          chalk.red('Missing environment variables: BYTEPLUS_API_KEY, BYTEPLUS_ENDPOINT')
        );
        process.exit(1);
      }

      const client = new BytePlusClient({
        apiKey: process.env.BYTEPLUS_API_KEY,
        endpoint: process.env.BYTEPLUS_ENDPOINT,
        debug: false,
      });

      spinner.text = 'Generating video...';

      const request: VideoGenerationRequest = {
        model: 'Bytedance-Seedance-1.0-pro',
        image,
        resolution: options.resolution as any,
        ratio: options.ratio as any,
        duration: parseInt(options.duration, 10) as any,
        watermark: options.watermark !== false,
        fixed_lens: options.fixedLens,
      };

      if (promptArg) {
        request.prompt = promptArg;
      }

      const result = await client.generateVideo(request);

      spinner.succeed(chalk.green('Video generated successfully!'));

      // Display results
      console.log(chalk.bold('\n🎥 Video Details:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('Duration:'), chalk.white(`${options.duration}s`));
      console.log(chalk.cyan('Resolution:'), chalk.white(options.resolution));
      console.log(chalk.cyan('Ratio:'), chalk.white(options.ratio));
      console.log(chalk.cyan('Fixed Lens:'), chalk.white(options.fixedLens ? 'Yes' : 'No'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.cyan('Video URL:'), chalk.blue.underline(result.data[0].url));
      if (result.data[0].thumbnail_url) {
        console.log(
          chalk.cyan('Thumbnail:'),
          chalk.blue.underline(result.data[0].thumbnail_url)
        );
      }
      console.log();
    } catch (error: any) {
      spinner.fail(chalk.red('Video generation failed'));
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
