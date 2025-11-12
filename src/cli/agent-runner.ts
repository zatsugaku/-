#!/usr/bin/env node
/**
 * Autonomous Agent CLI Runner
 *
 * Executes Miyabi framework agents on GitHub Issues with parallel execution support.
 *
 * @module cli/agent-runner
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CoordinatorAgent } from '../agents/coordinator.js';
import type { Task, AgentConfig } from '../agents/base-agent.js';

interface RunnerOptions {
  issue?: string;
  issues?: string;
  concurrency?: string;
  dryRun?: boolean;
  logLevel?: string;
}

/**
 * Fetch issue details from GitHub
 */
async function fetchIssue(issueNumber: number): Promise<Task> {
  // Placeholder - would use GitHub API
  // For now, create a simple task that the CoordinatorAgent can process
  return {
    id: `issue-${issueNumber}`,
    title: `Issue #${issueNumber}`,
    description: `Autonomous processing of GitHub Issue #${issueNumber}`,
    status: 'pending' as const,
    priority: 'P1-High' as const,
    complexity: 'medium' as const,
    assignedAgent: 'coordinator',
    dependencies: [],
    estimatedHours: 2.0,
    labels: ['type:feature', 'agent:coordinator'],
    metadata: {
      issueNumber,
      repository: process.env.GITHUB_REPO || 'test_miyabi',
    },
  };
}

/**
 * Execute agent on a single issue
 */
async function executeIssue(
  issueNumber: number,
  config: AgentConfig,
  dryRun: boolean
): Promise<void> {
  const spinner = ora(`Processing Issue #${issueNumber}`).start();

  try {
    const task = await fetchIssue(issueNumber);

    if (dryRun) {
      spinner.info(chalk.yellow(`[DRY RUN] Would process Issue #${issueNumber}`));
      return;
    }

    const agent = new CoordinatorAgent(config);
    const result = await agent.execute(task);

    if (result.success) {
      spinner.succeed(chalk.green(`✅ Issue #${issueNumber} completed`));
      console.log(chalk.gray(`   Duration: ${result.metrics.executionTime}ms`));
    } else {
      spinner.fail(chalk.red(`❌ Issue #${issueNumber} failed`));
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`));
      }
    }
  } catch (error) {
    spinner.fail(chalk.red(`❌ Issue #${issueNumber} error`));
    console.error(chalk.red(`   ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Execute multiple issues in parallel
 */
async function executeParallel(
  issueNumbers: number[],
  concurrency: number,
  config: AgentConfig,
  dryRun: boolean
): Promise<void> {
  console.log(chalk.bold.cyan('\n🤖 Autonomous Agent - Parallel Executor\n'));
  console.log(chalk.gray(`Issues: ${issueNumbers.join(', ')}`));
  console.log(chalk.gray(`Concurrency: ${concurrency}`));
  console.log(chalk.gray(`Dry Run: ${dryRun ? 'Yes' : 'No'}\n`));

  const results: Promise<void>[] = [];

  for (let i = 0; i < issueNumbers.length; i += concurrency) {
    const batch = issueNumbers.slice(i, i + concurrency);
    const batchPromises = batch.map(num => executeIssue(num, config, dryRun));

    await Promise.allSettled(batchPromises);
  }

  console.log(chalk.bold.green('\n✅ All issues processed\n'));
}

/**
 * Main CLI program
 */
const program = new Command();

program
  .name('byteflow-agents')
  .description('Execute Miyabi framework agents on GitHub Issues')
  .version('1.0.0');

program
  .option('--issue <number>', 'Single issue number to process')
  .option('--issues <numbers>', 'Comma-separated issue numbers to process in parallel')
  .option('--concurrency <number>', 'Maximum parallel executions', '2')
  .option('--dry-run', 'Simulate execution without making changes', false)
  .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .action(async (options: RunnerOptions) => {
    try {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY || 'mock-key-for-dry-run';
      if (!process.env.ANTHROPIC_API_KEY && !options.dryRun) {
        console.error(chalk.red('❌ Error: ANTHROPIC_API_KEY environment variable is required'));
        console.error(chalk.yellow('   Tip: Use --dry-run flag to test without API key'));
        process.exit(1);
      }

      const config: AgentConfig = {
        name: 'CLI Runner',
        anthropicApiKey,
        debug: options.logLevel === 'debug',
      };

      if (options.issue) {
        const issueNumber = parseInt(options.issue, 10);
        await executeIssue(issueNumber, config, options.dryRun || false);
      } else if (options.issues) {
        const issueNumbers = options.issues
          .split(',')
          .map(n => parseInt(n.trim(), 10))
          .filter(n => !isNaN(n));

        const concurrency = parseInt(options.concurrency || '2', 10);
        await executeParallel(issueNumbers, concurrency, config, options.dryRun || false);
      } else {
        console.error(chalk.red('❌ Error: Must specify --issue or --issues'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Fatal error:'), error);
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse();
