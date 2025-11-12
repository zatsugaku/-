/**
 * Base Agent Interface
 *
 * Foundation for all Miyabi autonomous agents.
 * Implements Shikigaku Theory principles:
 * 1. Responsibility Clarity
 * 2. Authority Delegation
 * 3. Hierarchy Design
 * 4. Result Evaluation
 * 5. Ambiguity Elimination
 *
 * @module agents/base-agent
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
}

/**
 * Task complexity levels
 */
export enum Complexity {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge',
}

/**
 * Task priority levels
 */
export enum Priority {
  P0_CRITICAL = 'P0-Critical',
  P1_HIGH = 'P1-High',
  P2_MEDIUM = 'P2-Medium',
  P3_LOW = 'P3-Low',
}

/**
 * Task interface
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  complexity: Complexity;
  assignedAgent?: string;
  dependencies: string[];
  estimatedHours: number;
  actualHours?: number;
  labels: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  success: boolean;
  taskId: string;
  agentName: string;
  output?: unknown;
  error?: string;
  metrics?: {
    executionTime: number;
    tokensUsed?: number;
    qualityScore?: number;
    [key: string]: unknown;
  };
  logs: string[];
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  anthropicApiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  debug?: boolean;
}

/**
 * Base Agent Abstract Class
 *
 * All Miyabi agents extend this base class.
 */
export abstract class BaseAgent {
  protected name: string;
  protected anthropic: Anthropic;
  protected config: AgentConfig;
  protected logs: string[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.name = config.name;
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  /**
   * Execute a task (must be implemented by subclass)
   */
  abstract execute(task: Task): Promise<AgentResult>;

  /**
   * Validate task input
   */
  abstract validate(task: Task): boolean;

  /**
   * Log a message
   */
  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.name}] ${message}`;
    this.logs.push(logMessage);

    if (this.config.debug) {
      console.log(logMessage);
    }
  }

  /**
   * Get agent logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Call Claude API
   */
  protected async callClaude(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ content: string; tokensUsed: number }> {
    const model = options?.model ?? this.config.model ?? 'claude-sonnet-4-20250514';
    const temperature = options?.temperature ?? this.config.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 4096;

    this.log(`Calling Claude API (model: ${model})`);

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    const tokensUsed =
      response.usage.input_tokens + response.usage.output_tokens;

    this.log(`Claude response received (${tokensUsed} tokens)`);

    return { content, tokensUsed };
  }

  /**
   * Retry logic for failed operations
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        this.log(
          `Attempt ${attempt}/${maxRetries} failed: ${error instanceof Error ? error.message : String(error)}`
        );

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Format task for Claude
   */
  protected formatTask(task: Task): string {
    return `
Task ID: ${task.id}
Title: ${task.title}
Description: ${task.description}
Priority: ${task.priority}
Complexity: ${task.complexity}
Estimated Hours: ${task.estimatedHours}
Dependencies: ${task.dependencies.join(', ') || 'None'}
Labels: ${task.labels.join(', ')}
`;
  }
}
