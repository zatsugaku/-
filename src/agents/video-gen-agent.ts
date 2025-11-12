/**
 * VideoGenAgent
 *
 * Autonomous video generation agent for image-to-video conversion.
 * Uses BytePlus SEEDDANCE model for high-quality video generation.
 *
 * @module agents/video-gen-agent
 */

import { BaseAgent, type AgentResult } from './base-agent.js';
import { BytePlusClient } from '../api/byteplus-client.js';
import type { VideoGenerationRequest } from '../types/byteplus.js';

export interface VideoGenRequest {
  imageUrl: string;
  prompt?: string;
  duration?: 5 | 10;
  resolution?: '720P' | '1080P' | '4K';
  ratio?: 'Auto' | '16:9' | '9:16' | '1:1';
  fixedLens?: boolean;
  watermark?: boolean;
  seed?: number;
}

export class VideoGenAgent extends BaseAgent {
  private client: BytePlusClient;

  constructor(apiKey: string, endpoint: string) {
    super({
      name: 'VideoGenAgent',
      description: 'Autonomous video generation from images',
      capabilities: [
        'image-to-video',
        'dynamic-camera',
        'fixed-lens',
        'cinematic-effects',
      ],
      priority: 'medium',
    });

    this.client = new BytePlusClient({
      apiKey,
      endpoint,
      debug: false,
    });
  }

  /**
   * Execute video generation
   */
  async execute(input: VideoGenRequest): Promise<AgentResult> {
    const startTime = Date.now();
    let retries = 0;

    try {
      this.log(`Starting video generation from: ${input.imageUrl}`);

      // Prepare request
      const request: VideoGenerationRequest = {
        model: 'Bytedance-Seedance-1.0-pro',
        image: input.imageUrl,
        prompt: input.prompt,
        duration: input.duration || 5,
        resolution: input.resolution || '1080P',
        ratio: input.ratio || 'Auto',
        quantity: 1,
        fixed_lens: input.fixedLens ?? false,
        watermark: input.watermark ?? true,
      };

      if (input.seed !== undefined) {
        request.seed = input.seed;
      }

      // Generate video
      const result = await this.executeWithRetry(async () => {
        retries++;
        return await this.client.generateVideo(request);
      });

      const duration = Date.now() - startTime;

      this.log(`Video generated successfully in ${duration}ms`);
      this.log(`Video URL: ${result.data[0].url}`);

      return {
        success: true,
        data: {
          videoUrl: result.data[0].url,
          thumbnailUrl: result.data[0].thumbnail_url,
          sourceImage: input.imageUrl,
          duration: input.duration || 5,
        },
        metadata: {
          duration,
          retries,
        },
      };
    } catch (error: any) {
      this.log(`Video generation failed: ${error.message}`, 'error');

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
}
