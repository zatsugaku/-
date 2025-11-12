/**
 * ImageGenAgent
 *
 * Autonomous image generation agent with automatic prompt optimization.
 * Integrates with BytePlus API for high-quality image generation.
 *
 * @module agents/image-gen-agent
 */

import { BaseAgent, type AgentResult } from './base-agent.js';
import { BytePlusAI } from '../api/byteplus-ai.js';
import type { ImageGenerationRequest } from '../types/byteplus.js';

export interface ImageGenRequest {
  prompt: string;
  model?: string;
  size?: '1K' | '2K' | '4K';
  optimizePrompt?: boolean;
  watermark?: boolean;
  seed?: number;
}

export class ImageGenAgent extends BaseAgent {
  private ai: BytePlusAI;

  constructor(apiKey: string, endpoint: string) {
    super({
      name: 'ImageGenAgent',
      description: 'Autonomous image generation with prompt optimization',
      capabilities: [
        'text-to-image',
        'prompt-optimization',
        'batch-generation',
        'quality-validation',
      ],
      priority: 'high',
    });

    this.ai = new BytePlusAI({
      apiKey,
      endpoint,
      debug: false,
    });
  }

  /**
   * Execute image generation
   */
  async execute(input: ImageGenRequest): Promise<AgentResult> {
    const startTime = Date.now();
    let retries = 0;

    try {
      this.log(`Starting image generation: "${input.prompt}"`);

      // Prepare request
      const request: ImageGenerationRequest = {
        model: input.model || 'seedream-4-0-250828',
        prompt: input.prompt,
        size: input.size || '2K',
        watermark: input.watermark ?? true,
      };

      if (input.seed !== undefined) {
        request.seed = input.seed;
      }

      // Generate image with optional optimization
      const result = await this.executeWithRetry(async () => {
        retries++;
        return await this.ai.generateImage(request, {
          optimizePrompt: input.optimizePrompt ?? false,
        });
      });

      const duration = Date.now() - startTime;

      this.log(`Image generated successfully in ${duration}ms`);
      this.log(`Image URL: ${result.data[0].url}`);

      return {
        success: true,
        data: {
          imageUrl: result.data[0].url,
          prompt: input.prompt,
          model: request.model,
          seed: result.seed,
        },
        metadata: {
          duration,
          retries,
        },
      };
    } catch (error: any) {
      this.log(`Image generation failed: ${error.message}`, 'error');

      return {
        success: false,
        error: error.message,
        metadata: {
          duration: Date.now() - startTime,
          retries,
        },
      };
    }
  }

  /**
   * Batch generate multiple images
   */
  async batchGenerate(
    prompts: string[],
    options?: Partial<ImageGenRequest>
  ): Promise<AgentResult[]> {
    this.log(`Starting batch generation: ${prompts.length} images`);

    const results = await Promise.all(
      prompts.map(prompt =>
        this.execute({
          ...options,
          prompt,
        })
      )
    );

    const successCount = results.filter(r => r.success).length;
    this.log(`Batch generation complete: ${successCount}/${prompts.length} successful`);

    return results;
  }
}
