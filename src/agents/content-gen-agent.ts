/**
 * ContentGenAgent
 *
 * Autonomous content generation agent for prompts and stories.
 * Uses T2T models (DeepSeek-R1, Skylark-pro) for high-quality text generation.
 *
 * @module agents/content-gen-agent
 */

import { BaseAgent, type AgentResult } from './base-agent.js';
import { PromptOptimizer } from '../services/prompt-optimizer.js';
import { PromptChain } from '../services/prompt-chain.js';

export interface ContentGenRequest {
  input: string;
  type: 't2i' | 'i2i' | 'i2v' | 'story' | 'chain';
  style?: string;
  chainSteps?: number;
}

export class ContentGenAgent extends BaseAgent {
  private optimizer: PromptOptimizer;
  private chain: PromptChain;

  constructor(apiKey: string, endpoint: string) {
    super({
      name: 'ContentGenAgent',
      description: 'Autonomous content and prompt generation',
      capabilities: [
        'prompt-optimization',
        'prompt-chaining',
        'story-generation',
        'style-transfer',
      ],
      priority: 'medium',
    });

    this.optimizer = new PromptOptimizer({
      apiKey,
      endpoint,
    });

    this.chain = new PromptChain({
      apiKey,
      endpoint,
    });
  }

  /**
   * Execute content generation
   */
  async execute(input: ContentGenRequest): Promise<AgentResult> {
    const startTime = Date.now();
    let retries = 0;

    try {
      this.log(`Starting content generation: type=${input.type}`);

      let result: string;

      switch (input.type) {
        case 't2i':
          result = await this.executeWithRetry(async () => {
            retries++;
            return await this.optimizer.optimizeForImage(
              input.input,
              input.style || 'photorealistic'
            );
          });
          break;

        case 'i2i':
          result = await this.executeWithRetry(async () => {
            retries++;
            return await this.optimizer.optimizeForImageEdit(input.input);
          });
          break;

        case 'i2v':
          result = await this.executeWithRetry(async () => {
            retries++;
            return await this.optimizer.optimizeForVideo(input.input);
          });
          break;

        case 'chain':
          result = await this.executeWithRetry(async () => {
            retries++;
            const chainResult = await this.chain.execute(input.input, [
              {
                name: 'Concept Expansion',
                systemPrompt: 'Expand the concept with rich details',
                temperature: 0.8,
              },
              {
                name: 'Technical Details',
                systemPrompt: 'Add technical photography/art details',
                temperature: 0.6,
              },
              {
                name: 'Final Polish',
                systemPrompt: 'Polish for maximum quality',
                temperature: 0.5,
              },
            ]);
            return chainResult.finalPrompt;
          });
          break;

        case 'story':
          result = await this.executeWithRetry(async () => {
            retries++;
            // Generate story structure
            return await this.optimizer.optimizeForImage(
              `Create a story prompt for: ${input.input}`,
              'narrative'
            );
          });
          break;

        default:
          throw new Error(`Unknown content type: ${input.type}`);
      }

      const duration = Date.now() - startTime;

      this.log(`Content generated successfully in ${duration}ms`);
      this.log(`Output length: ${result.length} characters`);

      return {
        success: true,
        data: {
          content: result,
          type: input.type,
          input: input.input,
        },
        metadata: {
          duration,
          retries,
        },
      };
    } catch (error: any) {
      this.log(`Content generation failed: ${error.message}`, 'error');

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
