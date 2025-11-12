/**
 * Prompt Optimization Service
 *
 * Uses T2T models (DeepSeek-R1, Skylark-pro) to optimize prompts
 * for image generation (t2i), image editing (i2i), and video generation (i2v).
 *
 * @module services/prompt-optimizer
 */

import { TextGenerationClient } from '../api/text-generation-client.js';
import type {
  BytePlusConfig,
  PromptOptimizationRequest,
  PromptOptimizationResponse,
  PromptType,
  TextGenerationModel,
} from '../types/byteplus.js';

/**
 * System prompts for different prompt types
 */
const SYSTEM_PROMPTS: Record<PromptType, string> = {
  't2i': `You are an expert at optimizing prompts for text-to-image AI generation models.
Your task is to transform user inputs into high-quality, detailed prompts that produce stunning images.

Guidelines:
- Be specific about visual details (lighting, composition, style, mood)
- Include technical photography/art terms when relevant
- Specify image quality (4K, high detail, professional)
- Add stylistic directions (photorealistic, artistic, cinematic)
- Keep prompts concise but descriptive (under 200 words)
- Avoid abstract concepts; focus on visual elements

Return ONLY the optimized prompt, nothing else.`,

  'i2i': `You are an expert at creating prompts for image-to-image editing models.
Your task is to describe the desired changes/edits to an existing image clearly.

Guidelines:
- Focus on what should be ADDED, CHANGED, or ENHANCED
- Be specific about edits (color corrections, object additions, style transfers)
- Mention lighting and atmosphere changes if needed
- Keep instructions clear and actionable
- Avoid describing the original image; focus on the transformation
- Keep prompts concise (under 150 words)

Return ONLY the optimized editing prompt, nothing else.`,

  'i2v': `You are an expert at creating prompts for image-to-video generation models.
Your task is to describe motion, camera movement, and dynamic elements for video generation.

Guidelines:
- Describe camera movements (pan, zoom, dolly, static)
- Specify motion dynamics (smooth, dynamic, cinematic)
- Include timing cues if relevant (slow motion, speed ramp)
- Mention atmosphere and mood for the video
- Describe subject motion and scene dynamics
- Keep prompts focused on movement (under 150 words)

Return ONLY the optimized video prompt, nothing else.`,

  general: `You are a helpful AI assistant that improves and clarifies user prompts.
Make the prompt more specific, clear, and actionable while preserving the user's intent.

Return ONLY the improved prompt, nothing else.`,
};

/**
 * Prompt Optimization Service
 *
 * Leverages T2T models to generate optimized prompts for various use cases.
 *
 * @example
 * ```typescript
 * const optimizer = new PromptOptimizer({
 *   apiKey: process.env.BYTEPLUS_API_KEY!,
 *   endpoint: process.env.BYTEPLUS_ENDPOINT!
 * });
 *
 * const result = await optimizer.optimizePrompt({
 *   type: 't2i',
 *   userInput: 'a beautiful sunset',
 *   style: 'photorealistic'
 * });
 *
 * console.log(result.optimizedPrompt);
 * ```
 */
export class PromptOptimizer {
  private textClient: TextGenerationClient;
  private defaultModel: TextGenerationModel;

  constructor(config: BytePlusConfig, defaultModel?: TextGenerationModel) {
    this.textClient = new TextGenerationClient(config);
    this.defaultModel = defaultModel ?? 'DeepSeek-R1-250528';
  }

  /**
   * Optimize a prompt based on its type
   *
   * @param request - Optimization request
   * @returns Optimized prompt with metadata
   *
   * @example
   * ```typescript
   * // Optimize for text-to-image
   * const result = await optimizer.optimizePrompt({
   *   type: 't2i',
   *   userInput: 'a cat sitting on a windowsill',
   *   style: 'oil painting',
   *   context: 'for a book cover'
   * });
   *
   * // Use optimized prompt
   * const image = await byteplusClient.generateImage({
   *   model: 'seedream-4-0-250828',
   *   prompt: result.optimizedPrompt,
   *   size: '2K'
   * });
   * ```
   */
  async optimizePrompt(
    request: PromptOptimizationRequest
  ): Promise<PromptOptimizationResponse> {
    const model = request.model ?? this.defaultModel;
    const systemPrompt = SYSTEM_PROMPTS[request.type];

    // Build user prompt
    let userPrompt = `User input: "${request.userInput}"`;

    if (request.style) {
      userPrompt += `\nDesired style: ${request.style}`;
    }

    if (request.context) {
      userPrompt += `\nContext: ${request.context}`;
    }

    userPrompt += '\n\nOptimize this prompt:';

    // Generate optimized prompt
    const startTime = Date.now();
    const response = await this.textClient.generateText({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const generationTime = Date.now() - startTime;
    const optimizedPrompt = response.choices[0]?.message.content.trim() ?? '';

    // Calculate confidence based on response quality
    const confidence = this.calculateConfidence(optimizedPrompt, generationTime);

    return {
      optimizedPrompt,
      explanation: `Optimized for ${request.type} using ${model}`,
      confidence,
      tokensUsed: response.usage.total_tokens,
    };
  }

  /**
   * Batch optimize multiple prompts
   *
   * @param requests - Array of optimization requests
   * @returns Array of optimized prompts
   */
  async optimizeBatch(
    requests: PromptOptimizationRequest[]
  ): Promise<PromptOptimizationResponse[]> {
    const results = await Promise.all(
      requests.map((req) => this.optimizePrompt(req))
    );
    return results;
  }

  /**
   * Quick optimization helper for t2i prompts
   *
   * @param userInput - User's original input
   * @param style - Optional style preference
   * @returns Optimized prompt string
   */
  async optimizeForImage(
    userInput: string,
    style?: string
  ): Promise<string> {
    const result = await this.optimizePrompt({
      type: 't2i',
      userInput,
      style,
    });
    return result.optimizedPrompt;
  }

  /**
   * Quick optimization helper for i2i prompts
   *
   * @param userInput - Editing instructions
   * @param context - Optional context about the original image
   * @returns Optimized editing prompt
   */
  async optimizeForImageEdit(
    userInput: string,
    context?: string
  ): Promise<string> {
    const result = await this.optimizePrompt({
      type: 'i2i',
      userInput,
      context,
    });
    return result.optimizedPrompt;
  }

  /**
   * Quick optimization helper for i2v prompts
   *
   * @param userInput - Video motion description
   * @param context - Optional context about the source image
   * @returns Optimized video prompt
   */
  async optimizeForVideo(
    userInput: string,
    context?: string
  ): Promise<string> {
    const result = await this.optimizePrompt({
      type: 'i2v',
      userInput,
      context,
    });
    return result.optimizedPrompt;
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(
    prompt: string,
    generationTime: number
  ): number {
    let confidence = 0.5; // Base confidence

    // Length check (good prompts are typically 50-400 chars)
    if (prompt.length >= 50 && prompt.length <= 400) {
      confidence += 0.2;
    }

    // Contains descriptive words
    const descriptiveWords = [
      'detailed',
      'professional',
      'cinematic',
      'high quality',
      'lighting',
      'composition',
    ];
    const hasDescriptive = descriptiveWords.some((word) =>
      prompt.toLowerCase().includes(word)
    );
    if (hasDescriptive) {
      confidence += 0.15;
    }

    // Response time (faster is better, up to a point)
    if (generationTime < 5000) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }
}
