/**
 * BytePlus Text Generation API Client (T2T)
 *
 * Client for text generation models (DeepSeek-R1, Skylark-pro)
 * Used for prompt optimization and text generation tasks.
 *
 * @module api/text-generation-client
 */

import type {
  BytePlusConfig,
  TextGenerationRequest,
  TextGenerationResponse,
  APIErrorResponse,
} from '../types/byteplus.js';

/**
 * Text Generation API Client
 *
 * Provides access to BytePlus text generation models for prompt optimization.
 *
 * @example
 * ```typescript
 * const client = new TextGenerationClient({
 *   apiKey: process.env.BYTEPLUS_API_KEY!,
 *   endpoint: 'https://ark.ap-southeast.bytepluses.com/api/v3'
 * });
 *
 * const result = await client.generateText({
 *   model: 'DeepSeek-R1-250528',
 *   messages: [
 *     { role: 'user', content: 'Optimize this prompt: a cat' }
 *   ]
 * });
 * ```
 */
export class TextGenerationClient {
  private config: Required<BytePlusConfig>;

  constructor(config: BytePlusConfig) {
    this.config = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      timeout: config.timeout ?? 60000, // Longer timeout for text generation
      retryAttempts: config.retryAttempts ?? 3,
      debug: config.debug ?? false,
    };

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
  }

  /**
   * Log debug information
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[TextGenerationClient] ${message}`, data ?? '');
    }
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
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = (await response.json()) as APIErrorResponse;
          throw new Error(
            errorData.message || `API request failed: ${response.statusText}`
          );
        }

        const data = (await response.json()) as T;
        this.log('Request successful', data);
        return data;
      } catch (error) {
        const isLastAttempt = attempt === this.config.retryAttempts;

        if (isLastAttempt) {
          throw error;
        }

        // Retry with exponential backoff
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        this.log(`Retrying after ${backoff}ms`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Generate text using specified model
   *
   * @param request - Text generation parameters
   * @returns Generated text response
   *
   * @example
   * ```typescript
   * const result = await client.generateText({
   *   model: 'DeepSeek-R1-250528',
   *   messages: [
   *     {
   *       role: 'system',
   *       content: 'You are a prompt optimization expert.'
   *     },
   *     {
   *       role: 'user',
   *       content: 'Optimize this image generation prompt: a cat'
   *     }
   *   ],
   *   max_tokens: 2048,
   *   temperature: 0.7
   * });
   *
   * console.log(result.choices[0].message.content);
   * ```
   */
  async generateText(
    request: TextGenerationRequest
  ): Promise<TextGenerationResponse> {
    if (!request.model) {
      throw new Error('Model is required');
    }

    if (!request.messages || request.messages.length === 0) {
      throw new Error('At least one message is required');
    }

    const startTime = Date.now();

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens ?? 2048,
      temperature: request.temperature ?? 0.7,
      top_p: request.top_p ?? 1.0,
      stream: request.stream ?? false,
    };

    const response = await this.makeRequest<TextGenerationResponse>(
      '/chat/completions',
      'POST',
      requestBody
    );

    const generationTime = Date.now() - startTime;
    this.log(`Text generation completed in ${generationTime}ms`, {
      tokens: response.usage.total_tokens,
    });

    return response;
  }

  /**
   * Quick text generation helper
   *
   * @param model - Model to use
   * @param prompt - User prompt
   * @param systemPrompt - Optional system prompt
   * @returns Generated text content
   */
  async generateQuick(
    model: TextGenerationRequest['model'],
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const messages: TextGenerationRequest['messages'] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.generateText({
      model,
      messages,
    });

    return response.choices[0]?.message.content ?? '';
  }
}
