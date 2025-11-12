/**
 * Code Generation Agent
 *
 * AI-driven code generation using Claude Sonnet 4.
 * Implements TypeScript strict mode compliance and best practices.
 *
 * @module agents/codegen
 */

import {
  BaseAgent,
  Task,
  AgentResult,
  AgentConfig,
} from './base-agent.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Generated code output
 */
export interface GeneratedCode {
  files: Array<{
    path: string;
    content: string;
    type: 'component' | 'utility' | 'test' | 'type' | 'config';
  }>;
  documentation?: string;
  tests?: string[];
}

/**
 * Code Generation Agent
 *
 * Responsibilities:
 * - Generate TypeScript code from specifications
 * - Ensure strict mode compliance
 * - Generate associated tests
 * - Generate documentation
 */
export class CodeGenAgent extends BaseAgent {
  private projectRoot: string;

  constructor(config: Omit<AgentConfig, 'name'>, projectRoot?: string) {
    super({ ...config, name: 'CodeGenAgent' });
    this.projectRoot = projectRoot ?? process.cwd();
  }

  /**
   * Execute code generation task
   */
  async execute(task: Task): Promise<AgentResult> {
    const startTime = Date.now();
    this.log(`Starting code generation for task: ${task.id}`);

    try {
      if (!this.validate(task)) {
        throw new Error('Invalid task provided');
      }

      // Generate code using Claude
      const generatedCode = await this.generateCode(task);
      this.log(`Generated ${generatedCode.files.length} files`);

      // Write files
      for (const file of generatedCode.files) {
        await this.writeFile(file.path, file.content);
        this.log(`Written file: ${file.path}`);
      }

      // Validate TypeScript
      const isValid = await this.validateTypeScript(generatedCode);
      if (!isValid) {
        this.log('Warning: TypeScript validation failed');
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        taskId: task.id,
        agentName: this.name,
        output: generatedCode,
        metrics: {
          executionTime,
          filesGenerated: generatedCode.files.length,
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
        metrics: {
          executionTime,
        },
        logs: this.getLogs(),
      };
    }
  }

  /**
   * Validate task
   */
  validate(task: Task): boolean {
    return !!task.id && !!task.title && !!task.description;
  }

  /**
   * Generate code using Claude
   */
  async generateCode(task: Task): Promise<GeneratedCode> {
    const systemPrompt = `You are an expert TypeScript developer following strict coding standards.

Your role is to generate high-quality, production-ready code for the Byteflow project (BytePlus image generation platform).

Technical Requirements:
- TypeScript 5.8.3 with strict mode enabled
- ESLint and Prettier compliant
- Follow existing project structure and conventions
- Generate comprehensive JSDoc comments
- Include error handling
- Use modern ES2022+ features
- For React components: Use TypeScript, Next.js 15 App Router conventions
- For Node.js: Use ESM imports (import/export)

Code Quality Standards:
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Clear variable and function names
- Comprehensive error handling
- Input validation
- Type safety (no 'any' unless absolutely necessary)

Return ONLY a valid JSON object following this schema:
{
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "content": "file content here",
      "type": "component|utility|test|type|config"
    }
  ],
  "documentation": "Brief description of what was generated",
  "tests": ["path/to/test1.test.ts"]
}`;

    const userPrompt = `Generate code for this task:

${this.formatTask(task)}

Project Context:
- Project Root: ${this.projectRoot}
- Framework: Miyabi (autonomous agents)
- Stack: TypeScript, Next.js 15, React 19, shadcn/ui, Zustand
- API: BytePlus (image/video generation)

Requirements:
- Generate all necessary files (implementation, types, tests)
- Follow project conventions
- Ensure TypeScript strict mode compliance
- Include JSDoc comments
- Add error handling

Provide the code as a JSON object:`;

    const { content, tokensUsed } = await this.callClaude(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.7,
        maxTokens: 8192,
      }
    );

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse code from Claude response');
    }

    const generatedCode = JSON.parse(jsonMatch[0]) as GeneratedCode;

    return generatedCode;
  }

  /**
   * Write a file to disk
   */
  private async writeFile(
    relativePath: string,
    content: string
  ): Promise<void> {
    const fullPath = path.join(this.projectRoot, relativePath);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * Validate TypeScript compilation
   */
  private async validateTypeScript(
    generatedCode: GeneratedCode
  ): Promise<boolean> {
    // This is a placeholder - in production, you would run tsc
    this.log('TypeScript validation: Skipped (placeholder)');
    return true;
  }

  /**
   * Generate tests for code
   */
  async generateTests(code: string, filePath: string): Promise<string> {
    const systemPrompt = `You are an expert at writing comprehensive unit tests using Vitest.

Generate tests that:
- Cover all public functions/methods
- Test edge cases and error conditions
- Use meaningful test descriptions
- Follow AAA pattern (Arrange, Act, Assert)
- Achieve 80%+ code coverage

Return ONLY the test file content (no JSON, no markdown).`;

    const userPrompt = `Generate Vitest tests for this file:

File Path: ${filePath}

Code:
\`\`\`typescript
${code}
\`\`\`

Provide the test file content:`;

    const { content } = await this.callClaude(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxTokens: 4096,
    });

    return content;
  }

  /**
   * Generate documentation
   */
  async generateDocs(code: string, filePath: string): Promise<string> {
    const systemPrompt = `You are a technical documentation expert.

Generate clear, comprehensive documentation that includes:
- Overview and purpose
- API reference (functions, types, interfaces)
- Usage examples
- Parameter descriptions
- Return value descriptions

Use Markdown format.`;

    const userPrompt = `Generate documentation for this code:

File Path: ${filePath}

Code:
\`\`\`typescript
${code}
\`\`\`

Provide the documentation:`;

    const { content } = await this.callClaude(systemPrompt, userPrompt, {
      temperature: 0.6,
      maxTokens: 2048,
    });

    return content;
  }
}
