/**
 * BytePlus API Endpoint Configuration
 *
 * Centralized endpoint configuration for all BytePlus services.
 * Provides type-safe endpoint management and environment-based configuration.
 *
 * @module config/endpoints
 */

/**
 * BytePlus API base URL
 */
export const BYTEPLUS_BASE_URL = 'https://ark.ap-southeast.bytepluses.com';

/**
 * BytePlus API version
 */
export const API_VERSION = 'v3';

/**
 * BytePlus API Endpoints
 */
export const ENDPOINTS = {
  /**
   * Image Generation API
   * Supports: SEEDDREAM, SEEDDREAM4
   */
  IMAGE_GENERATION: `/api/${API_VERSION}/images/generations`,

  /**
   * Image Editing API
   * Supports: SEEDEDIT
   */
  IMAGE_EDITING: `/api/${API_VERSION}/images/edits`,

  /**
   * Video Generation API
   * Supports: SEEDANCE
   */
  VIDEO_GENERATION: `/api/${API_VERSION}/videos/generations`,

  /**
   * Text Generation API (Chat Completions)
   * Supports: DeepSeek-R1, Skylark-pro
   */
  TEXT_GENERATION: `/api/${API_VERSION}/chat/completions`,

  /**
   * Text-to-Text (T2T) Optimization API
   * Prompt enhancement and optimization
   */
  TEXT_OPTIMIZATION: `/api/${API_VERSION}/text/optimize`,
} as const;

/**
 * Endpoint type definition
 */
export type EndpointKey = keyof typeof ENDPOINTS;

/**
 * Get full endpoint URL
 *
 * @param endpoint - Endpoint key
 * @param baseUrl - Optional base URL override
 * @returns Full endpoint URL
 *
 * @example
 * ```typescript
 * const url = getEndpointUrl('IMAGE_GENERATION');
 * // Returns: "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations"
 * ```
 */
export function getEndpointUrl(
  endpoint: EndpointKey,
  baseUrl: string = BYTEPLUS_BASE_URL
): string {
  return `${baseUrl}${ENDPOINTS[endpoint]}`;
}

/**
 * Endpoint configuration from environment variables
 */
export interface EndpointConfig {
  baseUrl: string;
  imageGeneration: string;
  imageEditing: string;
  videoGeneration: string;
  textGeneration: string;
  textOptimization: string;
}

/**
 * Load endpoint configuration from environment
 *
 * @returns Endpoint configuration object
 *
 * @example
 * ```typescript
 * const config = loadEndpointConfig();
 * console.log(config.imageGeneration);
 * ```
 */
export function loadEndpointConfig(): EndpointConfig {
  const baseUrl = process.env.BYTEPLUS_BASE_URL || BYTEPLUS_BASE_URL;

  return {
    baseUrl,
    imageGeneration:
      process.env.BYTEPLUS_IMAGE_ENDPOINT || getEndpointUrl('IMAGE_GENERATION', baseUrl),
    imageEditing: process.env.BYTEPLUS_EDIT_ENDPOINT || getEndpointUrl('IMAGE_EDITING', baseUrl),
    videoGeneration:
      process.env.BYTEPLUS_VIDEO_ENDPOINT || getEndpointUrl('VIDEO_GENERATION', baseUrl),
    textGeneration:
      process.env.BYTEPLUS_TEXT_ENDPOINT || getEndpointUrl('TEXT_GENERATION', baseUrl),
    textOptimization:
      process.env.BYTEPLUS_OPTIMIZE_ENDPOINT || getEndpointUrl('TEXT_OPTIMIZATION', baseUrl),
  };
}

/**
 * Validate endpoint URL format
 *
 * @param url - URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidEndpointUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Default endpoint configuration
 */
export const DEFAULT_ENDPOINTS: EndpointConfig = {
  baseUrl: BYTEPLUS_BASE_URL,
  imageGeneration: getEndpointUrl('IMAGE_GENERATION'),
  imageEditing: getEndpointUrl('IMAGE_EDITING'),
  videoGeneration: getEndpointUrl('VIDEO_GENERATION'),
  textGeneration: getEndpointUrl('TEXT_GENERATION'),
  textOptimization: getEndpointUrl('TEXT_OPTIMIZATION'),
};
