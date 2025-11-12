/**
 * Review Agent
 *
 * Code quality analysis and security scanning.
 * Quality score target: 80+/100
 *
 * @module agents/review
 */

import { BaseAgent, Task, AgentResult, AgentConfig } from './base-agent.js';

export interface CodeAnalysis {
  qualityScore: number; // 0-100
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: 'security' | 'performance' | 'maintainability' | 'style';
    message: string;
    file?: string;
    line?: number;
  }>;
  suggestions: string[];
  metrics: {
    linesOfCode: number;
    complexity: number;
    maintainabilityIndex: number;
  };
}

export class ReviewAgent extends BaseAgent {
  constructor(config: Omit<AgentConfig, 'name'>) {
    super({ ...config, name: 'ReviewAgent' });
  }

  async execute(task: Task): Promise<AgentResult> {
    const startTime = Date.now();
    this.log(`Starting code review for task: ${task.id}`);

    try {
      if (!this.validate(task)) {
        throw new Error('Invalid task provided');
      }

      const analysis = await this.analyzeCode(task);
      this.log(`Quality score: ${analysis.qualityScore}/100`);
      this.log(`Found ${analysis.issues.length} issues`);

      const passed = analysis.qualityScore >= 80;
      const executionTime = Date.now() - startTime;

      return {
        success: passed,
        taskId: task.id,
        agentName: this.name,
        output: analysis,
        metrics: {
          executionTime,
          qualityScore: analysis.qualityScore,
          issuesFound: analysis.issues.length,
        },
        logs: this.getLogs(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.log(`Error: ${errorMessage}`);

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

  private async analyzeCode(task: Task): Promise<CodeAnalysis> {
    const systemPrompt = `You are a code review expert specializing in TypeScript, React, and security analysis.

Analyze code for:
1. Security vulnerabilities (SQL injection, XSS, auth issues, etc.)
2. Performance issues (unnecessary re-renders, memory leaks, etc.)
3. Maintainability (code smells, complexity, naming)
4. Style and best practices

Scoring:
- Start with 100 points
- Deduct points: Critical (-20), High (-10), Medium (-5), Low (-2)
- Minimum score: 0

Return ONLY valid JSON:
{
  "qualityScore": 85,
  "issues": [{"severity": "high", "category": "security", "message": "API key exposed in client code", "file": "api.ts", "line": 42}],
  "suggestions": ["Use environment variables", "Add input validation"],
  "metrics": {"linesOfCode": 150, "complexity": 7, "maintainabilityIndex": 82}
}`;

    const userPrompt = `Review this task:

${this.formatTask(task)}

Perform comprehensive code quality analysis and provide the JSON report:`;

    const { content, tokensUsed } = await this.callClaude(
      systemPrompt,
      userPrompt,
      { temperature: 0.5, maxTokens: 4096 }
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse analysis from Claude response');
    }

    return JSON.parse(jsonMatch[0]) as CodeAnalysis;
  }
}
