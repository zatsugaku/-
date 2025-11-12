/**
 * Issue Agent
 *
 * Issue analysis and label management.
 * Uses 識学理論 (Shikigaku Theory) 65-label system.
 *
 * @module agents/issue
 */

import { BaseAgent, Task, AgentResult, AgentConfig, Complexity, Priority } from './base-agent.js';

export interface IssueAnalysis {
  labels: string[];
  priority: Priority;
  complexity: Complexity;
  estimatedHours: number;
  assignedAgent: string;
  description: string;
}

export class IssueAgent extends BaseAgent {
  constructor(config: Omit<AgentConfig, 'name'>) {
    super({ ...config, name: 'IssueAgent' });
  }

  async execute(task: Task): Promise<AgentResult> {
    const startTime = Date.now();
    this.log(`Analyzing issue for task: ${task.id}`);

    try {
      if (!this.validate(task)) {
        throw new Error('Invalid task provided');
      }

      const analysis = await this.analyzeIssue(task);
      this.log(`Assigned labels: ${analysis.labels.join(', ')}`);
      this.log(`Priority: ${analysis.priority}, Complexity: ${analysis.complexity}`);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        taskId: task.id,
        agentName: this.name,
        output: analysis,
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

  private async analyzeIssue(task: Task): Promise<IssueAnalysis> {
    const systemPrompt = `You are an issue analysis expert using 識学理論 (Shikigaku Theory) principles.

Analyze issues and assign appropriate labels from these categories:
- type: bug, feature, refactor, docs, test, chore, security
- priority: P0-Critical, P1-High, P2-Medium, P3-Low
- state: pending, analyzing, implementing, reviewing, testing, deploying, done
- agent: codegen, review, deployment, test, coordinator, issue, pr
- complexity: small (<4h), medium (4-8h), large (1-3d), xlarge (>3d)
- phase: planning, design, implementation, testing, deployment
- impact: breaking, major, minor, patch
- category: frontend, backend, infra, dx, security
- effort: 1h, 4h, 1d, 3d, 1w, 2w

Return ONLY valid JSON:
{
  "labels": ["type:feature", "priority:P1-High", "agent:codegen", "complexity:medium"],
  "priority": "P1-High",
  "complexity": "medium",
  "estimatedHours": 6,
  "assignedAgent": "codegen",
  "description": "Enhanced description with technical details"
}`;

    const userPrompt = `Analyze this issue:

${this.formatTask(task)}

Provide comprehensive analysis as JSON:`;

    const { content } = await this.callClaude(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxTokens: 2048,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse analysis from Claude response');
    }

    return JSON.parse(jsonMatch[0]) as IssueAnalysis;
  }
}
