/**
 * BytePlus API Type Definitions
 *
 * TypeScript strict mode type definitions for BytePlus image and video generation APIs.
 * Covers SEEDDREAM, SEEDDREAM4, and SEEDDANCE models.
 *
 * @module types/byteplus
 */

/**
 * BytePlus API client configuration
 */
export interface BytePlusConfig {
  /** BytePlus API key */
  apiKey: string;

  /** API endpoint URL */
  endpoint: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Maximum retry attempts for failed requests (default: 3) */
  retryAttempts?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Supported image generation models
 */
export type ImageGenerationModel =
  | 'seedream-4-0-250828'
  | 'seedream-3-5'
  | 'seedream-3-0'
  | 'Bytedance-SeedEdit-3.0-i2i';

/**
 * Supported text generation models (T2T: Text-to-Text)
 */
export type TextGenerationModel =
  | 'DeepSeek-R1-250528'
  | 'Skylark-pro-250415';

/**
 * Prompt generation type
 */
export type PromptType = 't2i' | 'i2i' | 'i2v' | 'general';

/**
 * Image size options
 */
export type ImageSize = '1K' | '2K' | '4K';

/**
 * Response format options
 */
export type ResponseFormat = 'url' | 'base64';

/**
 * Sequential image generation mode
 */
export type SequentialGenerationMode = 'auto' | 'manual';

/**
 * Sequential image generation options
 */
export interface SequentialGenerationOptions {
  /** Maximum number of images to generate */
  max_images: number;
}

/**
 * Image generation request parameters (Real BytePlus API v3)
 */
export interface ImageGenerationRequest {
  /** Model name (e.g., 'seedream-4-0-250828') */
  model: ImageGenerationModel;

  /** Text prompt describing the desired image */
  prompt: string;

  /** Input images URLs (optional, for image-to-image generation) */
  image?: string[];

  /** Sequential image generation mode */
  sequential_image_generation?: SequentialGenerationMode;

  /** Sequential generation options */
  sequential_image_generation_options?: SequentialGenerationOptions;

  /** Response format (default: 'url') */
  response_format?: ResponseFormat;

  /** Image size (default: '1K') */
  size?: ImageSize;

  /** Enable streaming response (default: false) */
  stream?: boolean;

  /** Add watermark to generated images (default: true) */
  watermark?: boolean;

  /** Random seed for reproducible generation */
  seed?: number;
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Image generation metadata
 */
export interface ImageMetadata {
  /** Model used for generation */
  model: string;

  /** Original prompt */
  prompt: string;

  /** Generation time in milliseconds */
  generationTime: number;

  /** Image dimensions */
  dimensions: ImageDimensions;

  /** Seed used for generation */
  seed?: number;
}

/**
 * Single generated image data
 */
export interface GeneratedImageData {
  /** URL to the generated image */
  url: string;

  /** Base64 encoded image (if response_format is 'base64') */
  b64_json?: string;

  /** Revised prompt (if applicable) */
  revised_prompt?: string;
}

/**
 * Image generation response (Real BytePlus API v3)
 */
export interface ImageGenerationResponse {
  /** Generated images array */
  data: GeneratedImageData[];

  /** Seed used for generation */
  seed?: number;

  /** Generation metadata */
  metadata?: ImageMetadata;

  /** Request ID */
  id?: string;

  /** Creation timestamp */
  created?: number;
}

/**
 * Supported video generation models
 */
export type VideoGenerationModel = 'Bytedance-Seedance-1.0-pro';

/**
 * Video resolution options
 */
export type VideoResolution = '480P' | '720P' | '1080P';

/**
 * Video aspect ratio options
 */
export type VideoRatio = 'Auto' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

/**
 * Video generation request parameters (i2v: image-to-video)
 */
export interface VideoGenerationRequest {
  /** Model name */
  model: VideoGenerationModel;

  /** Path or URL to source image (required for i2v) */
  image: string;

  /** Text prompt to describe video motion/scene (optional) */
  prompt?: string;

  /** Video resolution (default: '1080P') */
  resolution?: VideoResolution;

  /** Video aspect ratio (default: 'Auto') */
  ratio?: VideoRatio;

  /** Video duration in seconds: 5 or 10 (default: 5) */
  duration?: 5 | 10;

  /** Quantity of videos to generate (1-4, default: 1) */
  quantity?: number;

  /** Fixed lens mode - disables dynamic camera movement */
  fixed_lens?: boolean;

  /** Add watermark to video (default: true) */
  watermark?: boolean;

  /** Random seed for reproducible generation (-1 for random) */
  seed?: number;
}

/**
 * Legacy video generation request (deprecated)
 * @deprecated Use VideoGenerationRequest instead
 */
export interface LegacyVideoGenerationRequest {
  /** Path or URL to source image */
  sourceImage: string;

  /** Dance style to apply */
  danceStyle: 'hip-hop' | 'ballet' | 'contemporary' | 'jazz' | 'freestyle';

  /** Video duration in seconds (1-30, default: 10) */
  duration?: number;

  /** Optional music file path or URL */
  music?: string;

  /** Random seed for reproducible generation */
  seed?: number;

  /** Video quality ('low' | 'medium' | 'high', default: 'high') */
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Video generation metadata
 */
export interface VideoMetadata {
  /** Model used for generation */
  model: string;

  /** Dance style applied */
  danceStyle: string;

  /** Generation time in milliseconds */
  generationTime: number;

  /** Video duration in seconds */
  duration: number;

  /** Video dimensions */
  dimensions: ImageDimensions;

  /** Frame rate */
  fps: number;

  /** Seed used for generation */
  seed: number;
}

/**
 * Single generated video data
 */
export interface GeneratedVideoData {
  /** URL to the generated video */
  url: string;

  /** Video thumbnail URL */
  thumbnail_url?: string;

  /** Video duration in seconds */
  duration?: number;
}

/**
 * Video generation response (i2v: image-to-video)
 */
export interface VideoGenerationResponse {
  /** Generated videos array */
  data: GeneratedVideoData[];

  /** Seed used for generation */
  seed?: number;

  /** Generation metadata */
  metadata?: VideoMetadata;

  /** Request ID */
  id?: string;

  /** Creation timestamp */
  created?: number;
}

/**
 * Legacy video generation response (deprecated)
 * @deprecated Use VideoGenerationResponse instead
 */
export interface LegacyVideoGenerationResponse {
  /** URL to the generated video */
  videoUrl: string;

  /** Seed used for generation */
  seed: number;

  /** Generation metadata */
  metadata: VideoMetadata;

  /** URL to thumbnail image */
  thumbnailUrl: string;
}

/**
 * API error response
 */
export interface APIErrorResponse {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** Request ID for debugging */
  requestId?: string;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum requests per window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Batch generation request
 */
export interface BatchGenerationRequest {
  /** Array of prompts to generate */
  prompts: string[];

  /** Shared parameters for all generations */
  sharedParams?: Partial<ImageGenerationRequest>;

  /** Maximum concurrent requests (default: 10) */
  maxConcurrency?: number;
}

/**
 * Batch generation result
 */
export interface BatchGenerationResult {
  /** Successfully generated images */
  successful: ImageGenerationResponse[];

  /** Failed generations with error details */
  failed: Array<{
    prompt: string;
    error: string;
  }>;

  /** Total time in milliseconds */
  totalTime: number;

  /** Success rate (0.0-1.0) */
  successRate: number;
}

/**
 * Quality check result
 */
export interface QualityCheckResult {
  /** Quality score (0-100) */
  score: number;

  /** Pass/fail status (>= 80 is pass) */
  passed: boolean;

  /** Detailed quality metrics */
  metrics: {
    promptAdherence: number;
    resolution: number;
    noiseLevel: number;
    composition: number;
  };

  /** Issues found during quality check */
  issues: string[];
}

/**
 * Text generation request parameters (T2T: Text-to-Text)
 */
export interface TextGenerationRequest {
  /** Model name */
  model: TextGenerationModel;

  /** Input messages for chat-based models */
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;

  /** Maximum tokens to generate (default: 2048) */
  max_tokens?: number;

  /** Temperature for randomness (0.0-2.0, default: 0.7) */
  temperature?: number;

  /** Top-p sampling (0.0-1.0, default: 1.0) */
  top_p?: number;

  /** Enable streaming response (default: false) */
  stream?: boolean;
}

/**
 * Text generation response
 */
export interface TextGenerationResponse {
  /** Generated text content */
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;

  /** Usage statistics */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };

  /** Request ID */
  id?: string;

  /** Model used */
  model: string;

  /** Creation timestamp */
  created?: number;
}

/**
 * Prompt optimization request
 */
export interface PromptOptimizationRequest {
  /** Type of prompt to generate */
  type: PromptType;

  /** User's original intent/description */
  userInput: string;

  /** Additional context (optional) */
  context?: string;

  /** Style preferences (optional) */
  style?: string;

  /** Model to use for optimization (default: 'DeepSeek-R1-250528') */
  model?: TextGenerationModel;
}

/**
 * Prompt optimization response
 */
export interface PromptOptimizationResponse {
  /** Optimized prompt */
  optimizedPrompt: string;

  /** Explanation of changes */
  explanation?: string;

  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Tokens used */
  tokensUsed: number;
}
