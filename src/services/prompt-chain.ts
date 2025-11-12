/**
 * Prompt Chain Service
 *
 * Multi-step prompt generation and optimization pipeline.
 * Chains multiple AI operations together for complex prompt generation.
 *
 * @module services/prompt-chain
 */

import { TextGenerationClient } from '../api/text-generation-client.js';
import { PromptOptimizer } from './prompt-optimizer.js';
import type {
  BytePlusConfig,
  PromptType,
  TextGenerationModel,
} from '../types/byteplus.js';

/**
 * Prompt chain step definition
 */
export interface PromptChainStep {
  /** Step name/description */
  name: string;

  /** System prompt for this step */
  systemPrompt: string;

  /** Optional model override */
  model?: TextGenerationModel;

  /** Temperature for this step (default: 0.7) */
  temperature?: number;

  /** Max tokens for this step (default: 1024) */
  maxTokens?: number;
}

/**
 * Prompt chain result
 */
export interface PromptChainResult {
  /** Final optimized prompt */
  finalPrompt: string;

  /** Step-by-step results */
  steps: Array<{
    name: string;
    input: string;
    output: string;
    tokensUsed: number;
    duration: number;
  }>;

  /** Total tokens used across all steps */
  totalTokens: number;

  /** Total execution time in milliseconds */
  totalDuration: number;
}

/**
 * Prompt Chain Service
 *
 * Creates sophisticated prompts through multi-step refinement.
 *
 * @example
 * ```typescript
 * const chain = new PromptChain({
 *   apiKey: process.env.BYTEPLUS_API_KEY!,
 *   endpoint: process.env.BYTEPLUS_ENDPOINT!
 * });
 *
 * // Create a prompt chain for image generation
 * const result = await chain.execute(
 *   'a beautiful landscape',
 *   [
 *     {
 *       name: 'Brainstorm',
 *       systemPrompt: 'Generate creative ideas and details for this concept'
 *     },
 *     {
 *       name: 'Refine',
 *       systemPrompt: 'Refine into a high-quality image generation prompt'
 *     },
 *     {
 *       name: 'Polish',
 *       systemPrompt: 'Add technical and artistic details for maximum quality'
 *     }
 *   ]
 * );
 *
 * console.log(result.finalPrompt);
 * ```
 */
export class PromptChain {
  private textClient: TextGenerationClient;
  private optimizer: PromptOptimizer;
  private defaultModel: TextGenerationModel;

  constructor(config: BytePlusConfig, defaultModel?: TextGenerationModel) {
    this.textClient = new TextGenerationClient(config);
    this.optimizer = new PromptOptimizer(config, defaultModel);
    this.defaultModel = defaultModel ?? 'DeepSeek-R1-250528';
  }

  /**
   * Execute a prompt chain
   *
   * @param initialInput - Starting user input
   * @param steps - Array of chain steps to execute
   * @returns Chain execution result with final prompt
   */
  async execute(
    initialInput: string,
    steps: PromptChainStep[]
  ): Promise<PromptChainResult> {
    if (steps.length === 0) {
      throw new Error('At least one step is required');
    }

    const startTime = Date.now();
    const stepResults: PromptChainResult['steps'] = [];
    let currentInput = initialInput;
    let totalTokens = 0;

    // Execute each step sequentially
    for (const step of steps) {
      const stepStartTime = Date.now();

      const response = await this.textClient.generateText({
        model: step.model ?? this.defaultModel,
        messages: [
          { role: 'system', content: step.systemPrompt },
          { role: 'user', content: currentInput },
        ],
        temperature: step.temperature ?? 0.7,
        max_tokens: step.maxTokens ?? 1024,
      });

      const output = response.choices[0]?.message.content.trim() ?? '';
      const stepDuration = Date.now() - stepStartTime;

      stepResults.push({
        name: step.name,
        input: currentInput,
        output,
        tokensUsed: response.usage.total_tokens,
        duration: stepDuration,
      });

      totalTokens += response.usage.total_tokens;
      currentInput = output; // Use output as input for next step
    }

    const totalDuration = Date.now() - startTime;

    return {
      finalPrompt: currentInput,
      steps: stepResults,
      totalTokens,
      totalDuration,
    };
  }

  /**
   * Pre-built chain: Image Generation (t2i)
   *
   * 3-step chain optimized for text-to-image prompts
   */
  async chainForImageGeneration(userInput: string): Promise<string> {
    const result = await this.execute(userInput, [
      {
        name: 'Concept Expansion',
        systemPrompt: `Expand this concept with rich visual details, mood, and atmosphere.
Think about lighting, composition, colors, and artistic style.
Be creative but stay focused on visual elements.`,
        temperature: 0.8,
      },
      {
        name: 'Technical Refinement',
        systemPrompt: `Transform this into a professional image generation prompt.
Add technical terms (photorealistic, 4K, studio lighting, etc.).
Organize details clearly: subject, style, lighting, mood, quality.
Keep it concise but detailed (under 200 words).`,
        temperature: 0.6,
      },
      {
        name: 'Final Polish',
        systemPrompt: `Polish this prompt for maximum quality.
Remove redundancy, improve flow, ensure clarity.
Return ONLY the final optimized prompt, nothing else.`,
        temperature: 0.5,
      },
    ]);

    return result.finalPrompt;
  }

  /**
   * Pre-built chain: Image Editing (i2i)
   *
   * 2-step chain optimized for image-to-image editing prompts
   */
  async chainForImageEdit(
    userInput: string,
    imageContext?: string
  ): Promise<string> {
    const contextInfo = imageContext
      ? `\n\nOriginal image context: ${imageContext}`
      : '';

    const result = await this.execute(userInput, [
      {
        name: 'Edit Planning',
        systemPrompt: `Plan specific image edits based on user request.${contextInfo}
Focus on what should change: colors, objects, atmosphere, style.
Be specific and actionable.`,
        temperature: 0.7,
      },
      {
        name: 'Edit Instructions',
        systemPrompt: `Convert this into a clear image editing prompt.
Describe the desired changes precisely.
Keep it focused on transformations, not descriptions.
Return ONLY the editing prompt.`,
        temperature: 0.6,
      },
    ]);

    return result.finalPrompt;
  }

  /**
   * Pre-built chain: Video Generation (i2v)
   *
   * 2-step chain optimized for image-to-video prompts
   */
  async chainForVideoGeneration(
    userInput: string,
    imageContext?: string
  ): Promise<string> {
    const contextInfo = imageContext
      ? `\n\nSource image context: ${imageContext}`
      : '';

    const result = await this.execute(userInput, [
      {
        name: 'Motion Planning',
        systemPrompt: `Plan video motion and camera movement.${contextInfo}
Consider: camera angles, subject motion, timing, dynamics.
Think cinematically.`,
        temperature: 0.8,
      },
      {
        name: 'Video Prompt',
        systemPrompt: `Create a precise video generation prompt.
Describe camera movement, motion dynamics, atmosphere.
Focus on MOVEMENT and CINEMATOGRAPHY.
Keep it under 150 words.
Return ONLY the video prompt.`,
        temperature: 0.6,
      },
    ]);

    return result.finalPrompt;
  }

  /**
   * Pre-built chain: Sequential Image Story
   *
   * Generates prompts for sequential image generation (storytelling)
   */
  async chainForSequentialImages(
    storyline: string,
    imageCount: number
  ): Promise<string[]> {
    if (imageCount < 2 || imageCount > 10) {
      throw new Error('Image count must be between 2 and 10');
    }

    // Step 1: Break down storyline into scenes
    const sceneBreakdown = await this.textClient.generateQuick(
      this.defaultModel,
      `Break down this storyline into ${imageCount} distinct visual scenes:\n"${storyline}"\n\nProvide a brief description for each scene (numbered 1-${imageCount}).`,
      'You are a storyboard artist. Create visual scene descriptions.'
    );

    // Step 2: Generate optimized prompt for each scene
    const sceneLines = sceneBreakdown
      .split('\n')
      .filter((line) => /^\d+[.)]/.test(line.trim()));

    const prompts: string[] = [];

    for (const scene of sceneLines.slice(0, imageCount)) {
      const sceneContent = scene.replace(/^\d+[.)]/, '').trim();
      const optimized = await this.optimizer.optimizeForImage(sceneContent);
      prompts.push(optimized);
    }

    return prompts;
  }

  /**
   * Custom chain with prompt type optimization
   *
   * Combines chain execution with final optimization
   */
  async chainWithOptimization(
    userInput: string,
    steps: PromptChainStep[],
    promptType: PromptType
  ): Promise<PromptChainResult> {
    const chainResult = await this.execute(userInput, steps);

    // Apply final optimization based on type
    const optimized = await this.optimizer.optimizePrompt({
      type: promptType,
      userInput: chainResult.finalPrompt,
    });

    return {
      ...chainResult,
      finalPrompt: optimized.optimizedPrompt,
      totalTokens: chainResult.totalTokens + optimized.tokensUsed,
    };
  }
}
