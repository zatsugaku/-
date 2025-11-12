/**
 * BytePlus AI - Unified Client
 *
 * Integrated client for image, video, and text generation with prompt optimization.
 * Combines all BytePlus AI capabilities into a single, easy-to-use interface.
 *
 * @module api/byteplus-ai
 */

import { BytePlusClient } from './byteplus-client.js';
import { TextGenerationClient } from './text-generation-client.js';
import { PromptOptimizer } from '../services/prompt-optimizer.js';
import { PromptChain } from '../services/prompt-chain.js';
import type {
  BytePlusConfig,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
  TextGenerationModel,
} from '../types/byteplus.js';

/**
 * AI generation options with automatic prompt optimization
 */
export interface AIGenerationOptions {
  /** Enable automatic prompt optimization (default: false) */
  optimizePrompt?: boolean;

  /** Use prompt chain for multi-step optimization (default: false) */
  useChain?: boolean;

  /** Model for prompt optimization (default: 'DeepSeek-R1-250528') */
  optimizerModel?: TextGenerationModel;
}

/**
 * BytePlus AI - Unified Client
 *
 * All-in-one client with automatic prompt optimization.
 *
 * @example
 * ```typescript
 * const ai = new BytePlusAI({
 *   apiKey: process.env.BYTEPLUS_API_KEY!,
 *   endpoint: process.env.BYTEPLUS_ENDPOINT!,
 *   debug: true
 * });
 *
 * // Generate image with automatic prompt optimization
 * const result = await ai.generateImage(
 *   {
 *     model: 'seedream-4-0-250828',
 *     prompt: 'a beautiful sunset',
 *     size: '2K'
 *   },
 *   { optimizePrompt: true }
 * );
 * ```
 */
export class BytePlusAI {
  private imageClient: BytePlusClient;
  private textClient: TextGenerationClient;
  private optimizer: PromptOptimizer;
  private chain: PromptChain;

  constructor(config: BytePlusConfig) {
    this.imageClient = new BytePlusClient(config);
    this.textClient = new TextGenerationClient(config);
    this.optimizer = new PromptOptimizer(config);
    this.chain = new PromptChain(config);
  }

  /**
   * Generate image with optional prompt optimization
   *
   * @param request - Image generation request
   * @param options - AI generation options
   * @returns Generated image response
   *
   * @example
   * ```typescript
   * // Without optimization
   * const result1 = await ai.generateImage({
   *   model: 'seedream-4-0-250828',
   *   prompt: 'detailed prompt here',
   *   size: '2K'
   * });
   *
   * // With automatic optimization
   * const result2 = await ai.generateImage(
   *   {
   *     model: 'seedream-4-0-250828',
   *     prompt: 'a cat',
   *     size: '2K'
   *   },
   *   { optimizePrompt: true }
   * );
   *
   * // With prompt chain (best quality)
   * const result3 = await ai.generateImage(
   *   {
   *     model: 'seedream-4-0-250828',
   *     prompt: 'sunset landscape',
   *     size: '2K'
   *   },
   *   { useChain: true }
   * );
   * ```
   */
  async generateImage(
    request: ImageGenerationRequest,
    options?: AIGenerationOptions
  ): Promise<ImageGenerationResponse> {
    let finalRequest = { ...request };

    if (options?.optimizePrompt || options?.useChain) {
      const optimizedPrompt = options.useChain
        ? await this.chain.chainForImageGeneration(request.prompt)
        : await this.optimizer.optimizeForImage(request.prompt);

      finalRequest.prompt = optimizedPrompt;

      if (this.imageClient['config'].debug) {
        console.log('[BytePlusAI] Original prompt:', request.prompt);
        console.log('[BytePlusAI] Optimized prompt:', optimizedPrompt);
      }
    }

    return this.imageClient.generateImage(finalRequest);
  }

  /**
   * Edit image with optional prompt optimization
   *
   * @param request - Image generation request (i2i)
   * @param options - AI generation options
   * @returns Edited image response
   *
   * @example
   * ```typescript
   * const result = await ai.editImage(
   *   {
   *     model: 'Bytedance-SeedEdit-3.0-i2i',
   *     prompt: 'add rainbow',
   *     image: ['https://example.com/original.jpg'],
   *     size: '2K'
   *   },
   *   { optimizePrompt: true }
   * );
   * ```
   */
  async editImage(
    request: ImageGenerationRequest,
    options?: AIGenerationOptions
  ): Promise<ImageGenerationResponse> {
    let finalRequest = { ...request };

    if (options?.optimizePrompt || options?.useChain) {
      const optimizedPrompt = options.useChain
        ? await this.chain.chainForImageEdit(request.prompt)
        : await this.optimizer.optimizeForImageEdit(request.prompt);

      finalRequest.prompt = optimizedPrompt;

      if (this.imageClient['config'].debug) {
        console.log('[BytePlusAI] Original edit prompt:', request.prompt);
        console.log('[BytePlusAI] Optimized edit prompt:', optimizedPrompt);
      }
    }

    return this.imageClient.generateImage(finalRequest);
  }

  /**
   * Generate video with optional prompt optimization
   *
   * @param request - Video generation request
   * @param options - AI generation options
   * @returns Generated video response
   *
   * @example
   * ```typescript
   * const result = await ai.generateVideo(
   *   {
   *     model: 'Bytedance-Seedance-1.0-pro',
   *     image: 'https://example.com/source.jpg',
   *     prompt: 'dynamic camera movement',
   *     resolution: '1080P',
   *     duration: 5
   *   },
   *   { optimizePrompt: true }
   * );
   * ```
   */
  async generateVideo(
    request: VideoGenerationRequest,
    options?: AIGenerationOptions
  ): Promise<VideoGenerationResponse> {
    let finalRequest = { ...request };

    if (
      (options?.optimizePrompt || options?.useChain) &&
      request.prompt
    ) {
      const optimizedPrompt = options.useChain
        ? await this.chain.chainForVideoGeneration(request.prompt)
        : await this.optimizer.optimizeForVideo(request.prompt);

      finalRequest.prompt = optimizedPrompt;

      if (this.imageClient['config'].debug) {
        console.log('[BytePlusAI] Original video prompt:', request.prompt);
        console.log('[BytePlusAI] Optimized video prompt:', optimizedPrompt);
      }
    }

    return this.imageClient.generateVideo(finalRequest);
  }

  /**
   * Generate sequential images with story coherence
   *
   * @param storyline - Story description
   * @param imageCount - Number of images (2-10)
   * @param sharedParams - Shared image generation parameters
   * @returns Array of generated images
   *
   * @example
   * ```typescript
   * const images = await ai.generateStory(
   *   'A hero\'s journey from village to castle',
   *   3,
   *   {
   *     model: 'seedream-4-0-250828',
   *     size: '2K',
   *     watermark: false
   *   }
   * );
   * ```
   */
  async generateStory(
    storyline: string,
    imageCount: number,
    sharedParams: Partial<ImageGenerationRequest>
  ): Promise<ImageGenerationResponse[]> {
    // Generate optimized prompts for each scene
    const prompts = await this.chain.chainForSequentialImages(
      storyline,
      imageCount
    );

    // Generate images for each prompt
    const results: ImageGenerationResponse[] = [];

    for (const prompt of prompts) {
      const result = await this.imageClient.generateImage({
        ...sharedParams,
        model: sharedParams.model!,
        prompt,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Access to raw clients for advanced usage
   */
  get clients() {
    return {
      image: this.imageClient,
      text: this.textClient,
      optimizer: this.optimizer,
      chain: this.chain,
    };
  }

  /**
   * Quick prompt optimization without generation
   *
   * @param prompt - Original prompt
   * @param type - Prompt type
   * @returns Optimized prompt
   */
  async optimizePrompt(
    prompt: string,
    type: 't2i' | 'i2i' | 'i2v'
  ): Promise<string> {
    const result = await this.optimizer.optimizePrompt({
      type,
      userInput: prompt,
    });
    return result.optimizedPrompt;
  }

  /**
   * Health check for all services
   *
   * @returns Health status object
   */
  async checkHealth(): Promise<{
    image: boolean;
    text: boolean;
    overall: boolean;
  }> {
    const [imageHealth, textHealth] = await Promise.all([
      this.imageClient.checkHealth().catch(() => false),
      this.textClient
        .generateQuick('DeepSeek-R1-250528', 'test', 'You are a test bot.')
        .then(() => true)
        .catch(() => false),
    ]);

    return {
      image: imageHealth,
      text: textHealth,
      overall: imageHealth && textHealth,
    };
  }
}
