/**
 * PR Agent
 *
 * Pull Request automation with Conventional Commits.
 *
 * @module agents/pr
 */

import { BaseAgent, Task, AgentResult, AgentConfig } from './base-agent.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PRInfo {
  title: string;
  body: string;
  branch: string;
  baseBranch: string;
  commits: string[];
  changedFiles: string[];
}

export class PRAgent extends BaseAgent {
  constructor(config: Omit<AgentConfig, 'name'>) {
    super({ ...config, name: 'PRAgent' });
  }

  async execute(task: Task): Promise<AgentResult> {
    const startTime = Date.now();
    this.log(`Creating PR for task: ${task.id}`);

    try {
      if (!this.validate(task)) {
        throw new Error('Invalid task provided');
      }

      const prInfo = await this.createPR(task);
      this.log(`PR created: ${prInfo.title}`);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        taskId: task.id,
        agentName: this.name,
        output: prInfo,
        metrics: { executionTime },
        logs: this.getLogs(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        taskId: task.id,
        agentName: this.name,
        error: errorMessage,
        metrics: { executionTime },
        logs: this.getLogs(),
      };
    }
  }

  validate(task: Task): boolean {
    return !!task.id && !!task.title;
  }

  private async createPR(task: Task): Promise<PRInfo> {
    const systemPrompt = `You are a PR description expert following Conventional Commits specification.

Generate:
- PR title (Conventional Commits format: type(scope): description)
- PR body with: Summary, Changes, Testing, Breaking Changes
- Commit messages if needed

Return ONLY valid JSON:
{
  "title": "feat(ui): add image generation page",
  "body": "## Summary\\n...\\n## Changes\\n...\\n## Testing\\n...",
  "branch": "feature/image-generation",
  "baseBranch": "main",
  "commits": ["feat: add component", "test: add tests"],
  "changedFiles": ["src/page.tsx", "tests/page.test.ts"]
}`;

    const userPrompt = `Generate PR for this task:

${this.formatTask(task)}

Provide PR information as JSON:`;

    const { content } = await this.callClaude(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxTokens: 2048,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse PR info from Claude response');
    }

    return JSON.parse(jsonMatch[0]) as PRInfo;
  }
}
