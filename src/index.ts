/**
 * Byteflow - BytePlus Image Generation Platform
 *
 * Entry point for the Byteflow application.
 * Demonstrates basic usage of BytePlus API client.
 *
 * @module index
 */

import 'dotenv/config';
import { BytePlusClient } from './api/byteplus-client.js';

export const VERSION = '0.1.0';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  console.log('🌸 Byteflow - BytePlus Image Generation Platform\n');

  // Validate environment variables
  if (!process.env.BYTEPLUS_API_KEY) {
    console.error(
      '❌ Error: BYTEPLUS_API_KEY environment variable is required'
    );
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  if (!process.env.BYTEPLUS_ENDPOINT) {
    console.error(
      '❌ Error: BYTEPLUS_ENDPOINT environment variable is required'
    );
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  // Initialize BytePlus client
  const client = new BytePlusClient({
    apiKey: process.env.BYTEPLUS_API_KEY,
    endpoint: process.env.BYTEPLUS_ENDPOINT,
    debug: process.env.NODE_ENV === 'development',
  });

  console.log('✅ BytePlus client initialized');
  console.log(`   Endpoint: ${process.env.BYTEPLUS_ENDPOINT}\n`);

  // Skip health check (costs API credits)
  console.log('⏭️  Skipping health check (proceeding to generation)\n');

  // Example 1: Generate a single image
  console.log('📸 Example 1: Generating a single image...');
  try {
    const result = await client.generateImage({
      model: 'seedream-4-0-250828',
      prompt:
        'A beautiful sunset over mountains, photorealistic style, golden hour lighting',
      size: '2K',
      response_format: 'url',
      watermark: true,
      seed: 42,
    });

    console.log('✅ Image generated successfully');
    console.log(`   URL: ${result.data[0]?.url}`);
    console.log(`   Seed: ${result.seed ?? 'N/A'}`);
    console.log(`   Generation time: ${result.metadata?.generationTime ?? 'N/A'}ms\n`);
  } catch (error) {
    console.error('❌ Failed to generate image:', error);
  }

  // Example 2: Batch generate multiple images
  console.log('📸 Example 2: Batch generating 3 images...');
  try {
    const batchResult = await client.batchGenerate({
      prompts: [
        'A futuristic city at night, neon lights, cyberpunk style',
        'A serene forest in autumn, golden leaves, peaceful atmosphere',
        'An underwater coral reef, colorful fish, crystal clear water',
      ],
      sharedParams: {
        model: 'seedream-4-0-250828',
        size: '2K',
        watermark: true,
      },
      maxConcurrency: 3,
    });

    console.log('✅ Batch generation complete');
    console.log(`   Successful: ${batchResult.successful.length}`);
    console.log(`   Failed: ${batchResult.failed.length}`);
    console.log(
      `   Success rate: ${(batchResult.successRate * 100).toFixed(1)}%`
    );
    console.log(`   Total time: ${batchResult.totalTime}ms\n`);

    if (batchResult.failed.length > 0) {
      console.log('⚠️  Failed generations:');
      batchResult.failed.forEach((f) => {
        console.log(`   - "${f.prompt}": ${f.error}`);
      });
      console.log();
    }
  } catch (error) {
    console.error('❌ Batch generation failed:', error);
  }

  // Example 3: Check rate limiter stats
  console.log('📊 Rate limiter statistics:');
  const stats = client.getRateLimiterStats();
  console.log(`   Used: ${stats.used}`);
  console.log(`   Available: ${stats.available}`);
  console.log(`   Reset in: ${stats.resetIn}ms\n`);

  console.log('🎉 All examples completed successfully!');
  console.log('\n🌸 Byteflow - Beauty in AI-Powered Visual Creation');
}

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
