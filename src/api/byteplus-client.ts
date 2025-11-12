/**
 * BytePlus API Client
 *
 * Production-grade TypeScript client for BytePlus image and video generation APIs.
 * Implements rate limiting, retry logic, and error handling.
 *
 * @module api/byteplus-client
 */

import type {
  BytePlusConfig,
  ImageGenerationModel,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
  RateLimiterConfig,
  BatchGenerationRequest,
  BatchGenerationResult,
  APIErrorResponse,
} from '../types/byteplus.js';

/**
 * Custom error class for BytePlus API errors
 */
export class BytePlusAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'BytePlusAPIError';
  }
}

/**
 * Rate limiter implementation using token bucket algorithm
 */
class RateLimiter {
  private tokens: number[] = [];

  constructor(private config: RateLimiterConfig) {}

  /**
   * Acquire a token to proceed with request
   * Waits if rate limit is exceeded
   */
  async acquire(): Promise<void> {
    const now = Date.now();
    this.tokens = this.tokens.filter((t) => now - t < this.config.windowMs);

    if (this.tokens.length >= this.config.maxRequests) {
      const oldestToken = this.tokens[0];
      const waitTime = this.config.windowMs - (now - oldestToken);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.tokens.push(now);
  }

  /**
   * Get current usage statistics
   */
  getStats(): { used: number; available: number; resetIn: number } {
    const now = Date.now();
    this.tokens = this.tokens.filter((t) => now - t < this.config.windowMs);

    const oldestToken = this.tokens[0];
    const resetIn = oldestToken
      ? Math.max(0, this.config.windowMs - (now - oldestToken))
      : 0;

    return {
      used: this.tokens.length,
      available: this.config.maxRequests - this.tokens.length,
      resetIn,
    };
  }
}

/**
 * BytePlus API Client
 *
 * Main client for interacting with BytePlus image and video generation APIs.
 *
 * @example
 * ```typescript
 * const client = new BytePlusClient({
 *   apiKey: process.env.BYTEPLUS_API_KEY!,
 *   endpoint: process.env.BYTEPLUS_ENDPOINT!
 * });
 *
 * const result = await client.generateImage('seeddream4', {
 *   prompt: 'A beautiful sunset over mountains',
 *   width: 1024,
 *   height: 1024
 * });
 * ```
 */
export class BytePlusClient {
  private config: Required<BytePlusConfig>;
  private rateLimiter: RateLimiter;

  constructor(config: BytePlusConfig) {
    this.config = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      debug: config.debug ?? false,
    };

    this.rateLimiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 1000,
    });

    this.validateConfig();
  }

  /**
   * Validate client configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('BytePlus API key is required');
    }

    if (!this.config.endpoint) {
      throw new Error('BytePlus API endpoint is required');
    }

    if (this.config.timeout < 1000 || this.config.timeout > 300000) {
      throw new Error('Timeout must be between 1000ms and 300000ms');
    }

    if (this.config.retryAttempts < 0 || this.config.retryAttempts > 10) {
      throw new Error('Retry attempts must be between 0 and 10');
    }
  }

  /**
   * Log debug information
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[BytePlusClient] ${message}`, data ?? '');
    }
  }

  /**
   * Exponential backoff calculation
   */
  private calculateBackoff(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    path: string,
    method: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.endpoint}${path}`;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.acquire();

        this.log(`Making ${method} request to ${url}`, {
          attempt: attempt + 1,
          body,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Byteflow/1.0',
            'x-is-encrypted': 'true',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = (await response.json()) as APIErrorResponse;
          throw new BytePlusAPIError(
            errorData.message || `API request failed: ${response.statusText}`,
            response.status,
            errorData.code,
            errorData.requestId
          );
        }

        const data = (await response.json()) as T;
        this.log('Request successful', data);
        return data;
      } catch (error) {
        const isLastAttempt = attempt === this.config.retryAttempts;

        if (error instanceof BytePlusAPIError) {
          // Retry on rate limit or server errors
          if (
            (error.statusCode === 429 || error.statusCode >= 500) &&
            !isLastAttempt
          ) {
            const backoff = this.calculateBackoff(attempt);
            this.log(`Retrying after ${backoff}ms`, { error: error.message });
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
        }

        if (isLastAttempt) {
          throw error;
        }

        // Retry on network errors
        const backoff = this.calculateBackoff(attempt);
        this.log(`Retrying after ${backoff}ms`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Validate image generation request
   */
  private validateImageRequest(request: ImageGenerationRequest): void {
    if (!request.model) {
      throw new Error('Model is required');
    }

    // Image-to-image models require input image
    if (
      request.model === 'Bytedance-SeedEdit-3.0-i2i' &&
      (!request.image || request.image.length === 0)
    ) {
      throw new Error('Image input is required for i2i models');
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    if (request.prompt.length > 2000) {
      throw new Error('Prompt must be less than 2000 characters');
    }

    if (
      request.sequential_image_generation_options?.max_images &&
      (request.sequential_image_generation_options.max_images < 1 ||
        request.sequential_image_generation_options.max_images > 10)
    ) {
      throw new Error('max_images must be between 1 and 10');
    }
  }

  /**
   * Generate image using BytePlus API v3
   *
   * @param request - Image generation parameters including model
   * @returns Generated image response with URLs and metadata
   *
   * @example Text-to-Image (t2i)
   * ```typescript
   * const result = await client.generateImage({
   *   model: 'seedream-4-0-250828',
   *   prompt: 'A sunset over mountains, photorealistic',
   *   size: '2K',
   *   response_format: 'url',
   *   watermark: true
   * });
   *
   * console.log(`Image URL: ${result.data[0].url}`);
   * ```
   *
   * @example Image-to-Image (i2i)
   * ```typescript
   * const result = await client.generateImage({
   *   model: 'Bytedance-SeedEdit-3.0-i2i',
   *   prompt: 'Add a rainbow in the sky',
   *   image: ['https://example.com/source.jpg'],
   *   size: '2K',
   *   response_format: 'url'
   * });
   *
   * console.log(`Edited image: ${result.data[0].url}`);
   * ```
   */
  async generateImage(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    this.validateImageRequest(request);

    const startTime = Date.now();

    // BytePlus API v3 uses a single endpoint for all models
    // Build request body without undefined fields
    const requestBody: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
      response_format: request.response_format ?? 'url',
      size: request.size ?? '1K',
      stream: request.stream ?? false,
      watermark: request.watermark ?? true,
    };

    // Add optional fields only if defined
    if (request.image) requestBody.image = request.image;
    if (request.sequential_image_generation)
      requestBody.sequential_image_generation = request.sequential_image_generation;
    if (request.sequential_image_generation_options)
      requestBody.sequential_image_generation_options =
        request.sequential_image_generation_options;
    if (request.seed !== undefined) requestBody.seed = request.seed;

    const response = await this.makeRequest<ImageGenerationResponse>(
      '/images/generations',
      'POST',
      requestBody
    );

    const generationTime = Date.now() - startTime;

    return {
      ...response,
      metadata: {
        model: request.model,
        prompt: request.prompt,
        generationTime,
        dimensions: { width: 1024, height: 1024 }, // Size mapping needed
        seed: request.seed,
      },
    };
  }

  /**
   * Generate video from image using i2v model (image-to-video)
   *
   * @param request - Video generation parameters
   * @returns Generated video response with URLs and metadata
   *
   * @example
   * ```typescript
   * const result = await client.generateVideo({
   *   model: 'Bytedance-Seedance-1.0-pro',
   *   image: 'https://example.com/source.jpg',
   *   prompt: 'Dynamic camera movement, cinematic style',
   *   resolution: '1080P',
   *   ratio: '16:9',
   *   duration: 5,
   *   quantity: 1,
   *   fixed_lens: false,
   *   watermark: true,
   *   seed: 42
   * });
   *
   * console.log(`Video URL: ${result.data[0].url}`);
   * ```
   */
  async generateVideo(
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResponse> {
    if (!request.model) {
      throw new Error('Model is required');
    }

    if (!request.image) {
      throw new Error('Source image is required for i2v generation');
    }

    if (request.duration && request.duration !== 5 && request.duration !== 10) {
      throw new Error('Duration must be 5 or 10 seconds');
    }

    if (request.quantity && (request.quantity < 1 || request.quantity > 4)) {
      throw new Error('Quantity must be between 1 and 4');
    }

    const startTime = Date.now();

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: request.model,
      image: request.image,
      resolution: request.resolution ?? '1080P',
      ratio: request.ratio ?? 'Auto',
      duration: request.duration ?? 5,
      quantity: request.quantity ?? 1,
      watermark: request.watermark ?? true,
    };

    if (request.prompt) requestBody.prompt = request.prompt;
    if (request.fixed_lens !== undefined) requestBody.fixed_lens = request.fixed_lens;
    if (request.seed !== undefined) requestBody.seed = request.seed;

    const response = await this.makeRequest<VideoGenerationResponse>(
      '/videos/generations',
      'POST',
      requestBody
    );

    const generationTime = Date.now() - startTime;

    return {
      ...response,
      metadata: {
        model: request.model,
        danceStyle: 'i2v',
        generationTime,
        duration: request.duration ?? 5,
        dimensions: { width: 1920, height: 1080 },
        fps: 30,
        seed: request.seed ?? -1,
      },
    };
  }

  /**
   * Generate dance video using legacy SEEDDANCE model
   * @deprecated Use generateVideo() with Bytedance-Seedance-1.0-pro instead
   *
   * @param request - Legacy video generation parameters
   * @returns Generated video response
   */
  async generateDanceVideo(
    request: import('../types/byteplus.js').LegacyVideoGenerationRequest
  ): Promise<import('../types/byteplus.js').LegacyVideoGenerationResponse> {
    if (!request.sourceImage) {
      throw new Error('Source image is required');
    }

    if (request.duration && (request.duration < 1 || request.duration > 30)) {
      throw new Error('Duration must be between 1 and 30 seconds');
    }

    const startTime = Date.now();

    const response = await this.makeRequest<any>(
      '/seeddance/generate',
      'POST',
      {
        source_image: request.sourceImage,
        dance_style: request.danceStyle,
        duration: request.duration ?? 10,
        music: request.music,
        seed: request.seed,
        quality: request.quality ?? 'high',
      }
    );

    const generationTime = Date.now() - startTime;

    return {
      videoUrl: response.videoUrl ?? response.data?.[0]?.url ?? '',
      seed: response.seed ?? request.seed ?? -1,
      thumbnailUrl: response.thumbnailUrl ?? response.data?.[0]?.thumbnail_url ?? '',
      metadata: {
        model: 'seeddance',
        danceStyle: request.danceStyle,
        generationTime,
        duration: request.duration ?? 10,
        dimensions: { width: 1080, height: 1920 },
        fps: 30,
        seed: response.seed ?? request.seed ?? -1,
      },
    };
  }

  /**
   * Batch generate multiple images in parallel
   *
   * @param request - Batch generation request
   * @returns Batch generation results with success/failure stats
   *
   * @example
   * ```typescript
   * const result = await client.batchGenerate({
   *   prompts: [
   *     'A sunset over mountains',
   *     'A city at night',
   *     'A forest in autumn'
   *   ],
   *   sharedParams: {
   *     model: 'seedream-4-0-250828',
   *     size: '2K',
   *     watermark: true
   *   },
   *   maxConcurrency: 3
   * });
   *
   * console.log(`Success rate: ${result.successRate * 100}%`);
   * ```
   */
  async batchGenerate(
    request: BatchGenerationRequest
  ): Promise<BatchGenerationResult> {
    const { prompts, sharedParams = {}, maxConcurrency = 10 } = request;

    if (prompts.length === 0) {
      throw new Error('At least one prompt is required');
    }

    // Ensure model is specified
    if (!sharedParams.model) {
      throw new Error('Model must be specified in sharedParams');
    }

    const startTime = Date.now();
    const successful: ImageGenerationResponse[] = [];
    const failed: Array<{ prompt: string; error: string }> = [];

    // Process in chunks to respect maxConcurrency
    for (let i = 0; i < prompts.length; i += maxConcurrency) {
      const chunk = prompts.slice(i, i + maxConcurrency);
      const promises = chunk.map(async (prompt) => {
        try {
          const result = await this.generateImage({
            ...sharedParams,
            model: sharedParams.model!,
            prompt,
          });
          successful.push(result);
        } catch (error) {
          failed.push({
            prompt,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(promises);
    }

    const totalTime = Date.now() - startTime;
    const successRate = successful.length / prompts.length;

    return {
      successful,
      failed,
      totalTime,
      successRate,
    };
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats(): { used: number; available: number; resetIn: number } {
    return this.rateLimiter.getStats();
  }

  /**
   * Check API health by attempting a minimal request
   * Note: BytePlus API v3 does not have a dedicated health endpoint
   *
   * @returns True if API is accessible
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Test with a minimal image generation request
      await this.generateImage({
        model: 'seedream-4-0-250828',
        prompt: 'test',
        size: '1K',
      });
      return true;
    } catch (error) {
      this.log('Health check failed', error);
      return false;
    }
  }
}
