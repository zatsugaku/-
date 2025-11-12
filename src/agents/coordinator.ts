/**
 * Coordinator Agent
 *
 * Orchestrates task execution using DAG-based decomposition.
 * Implements critical path identification and parallel execution.
 *
 * @module agents/coordinator
 */

import {
  BaseAgent,
  Task,
  TaskStatus,
  AgentResult,
  AgentConfig,
  Complexity,
  Priority,
} from './base-agent.js';

/**
 * DAG Node representing a task
 */
export interface DAGNode {
  task: Task;
  dependencies: string[];
  dependents: string[];
  level: number;
}

/**
 * DAG (Directed Acyclic Graph)
 */
export interface DAG {
  nodes: Map<string, DAGNode>;
  levels: DAGNode[][];
  criticalPath: string[];
}

/**
 * Agent assignment
 */
export interface AgentAssignment {
  taskId: string;
  agentType: string;
  priority: number;
}

/**
 * Coordinator Agent
 *
 * Responsibilities:
 * - Decompose complex tasks into subtasks
 * - Build DAG from task dependencies
 * - Identify critical path
 * - Assign tasks to appropriate agents
 * - Execute tasks in parallel when possible
 */
export class CoordinatorAgent extends BaseAgent {
  constructor(config: Omit<AgentConfig, 'name'>) {
    super({ ...config, name: 'CoordinatorAgent' });
  }

  /**
   * Execute coordination task
   */
  async execute(task: Task): Promise<AgentResult> {
    const startTime = Date.now();
    this.log(`Starting coordination for task: ${task.id}`);

    try {
      if (!this.validate(task)) {
        throw new Error('Invalid task provided');
      }

      // Decompose task into subtasks
      const subtasks = await this.decomposeTask(task);
      this.log(`Decomposed into ${subtasks.length} subtasks`);

      // Build DAG
      const dag = this.buildDAG(subtasks);
      this.log(`Built DAG with ${dag.levels.length} levels`);

      // Identify critical path
      const criticalPath = this.identifyCriticalPath(dag);
      const criticalPathStr = criticalPath?.length > 0 ? criticalPath.join(' → ') : 'none';
      this.log(`Critical path: ${criticalPathStr}`);

      // Assign agents
      const assignments = this.assignAgents(subtasks);
      this.log(`Assigned ${assignments.length} agents`);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        taskId: task.id,
        agentName: this.name,
        output: {
          subtasks,
          dag,
          criticalPath,
          assignments,
        },
        metrics: {
          executionTime,
          subtaskCount: subtasks.length,
          dagLevels: dag.levels.length,
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
   * Decompose a task into subtasks using Claude
   */
  async decomposeTask(task: Task): Promise<Task[]> {
    const systemPrompt = `You are a task decomposition expert following the Miyabi framework and Shikigaku Theory.

Your role is to break down complex tasks into smaller, manageable subtasks that can be executed by specialized agents.

Guidelines:
1. Create subtasks that are independently executable
2. Identify clear dependencies between subtasks
3. Estimate complexity (small, medium, large, xlarge)
4. Assign priority (P0-Critical, P1-High, P2-Medium, P3-Low)
5. Estimate hours for each subtask
6. Suggest appropriate agent type (codegen, test, review, deploy, issue, pr)

Return ONLY a valid JSON array of subtasks following this schema:
[
  {
    "id": "PARENT_ID-1",
    "title": "Subtask title",
    "description": "Detailed description",
    "priority": "P1-High",
    "complexity": "medium",
    "dependencies": [],
    "estimatedHours": 4,
    "suggestedAgent": "codegen",
    "labels": ["type:feature", "phase:implementation"]
  }
]`;

    const userPrompt = `Decompose this task into subtasks:

${this.formatTask(task)}

Additional Context:
- This is for a BytePlus image generation platform
- We have 7 agent types: coordinator, codegen, test, review, deploy, issue, pr
- Follow the Miyabi framework and Shikigaku Theory principles
- Ensure subtasks can be executed in parallel when possible

Provide the subtasks as a JSON array:`;

    const { content, tokensUsed } = await this.callClaude(
      systemPrompt,
      userPrompt,
      {
        temperature: 0.7,
        maxTokens: 4096,
      }
    );

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse subtasks from Claude response');
    }

    const subtasksData = JSON.parse(jsonMatch[0]) as Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      complexity: string;
      dependencies: string[];
      estimatedHours: number;
      suggestedAgent: string;
      labels: string[];
    }>;

    // Convert to Task objects
    const subtasks: Task[] = subtasksData.map((data) => ({
      id: data.id,
      title: data.title,
      description: data.description,
      status: TaskStatus.PENDING,
      priority: data.priority as Priority,
      complexity: data.complexity as Complexity,
      assignedAgent: data.suggestedAgent,
      dependencies: data.dependencies,
      estimatedHours: data.estimatedHours,
      labels: data.labels,
    }));

    return subtasks;
  }

  /**
   * Build DAG from tasks
   */
  buildDAG(tasks: Task[]): DAG {
    const nodes = new Map<string, DAGNode>();

    // Create nodes
    for (const task of tasks) {
      nodes.set(task.id, {
        task,
        dependencies: task.dependencies,
        dependents: [],
        level: 0,
      });
    }

    // Build dependency graph
    for (const [nodeId, node] of nodes) {
      for (const depId of node.dependencies) {
        const depNode = nodes.get(depId);
        if (depNode) {
          depNode.dependents.push(nodeId);
        }
      }
    }

    // Calculate levels (topological sort)
    const levels: DAGNode[][] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();

    const visit = (nodeId: string): number => {
      if (visited.has(nodeId)) {
        const node = nodes.get(nodeId)!;
        return node.level;
      }

      if (inProgress.has(nodeId)) {
        throw new Error(`Circular dependency detected at ${nodeId}`);
      }

      inProgress.add(nodeId);
      const node = nodes.get(nodeId)!;

      let maxDepLevel = -1;
      for (const depId of node.dependencies) {
        maxDepLevel = Math.max(maxDepLevel, visit(depId));
      }

      node.level = maxDepLevel + 1;
      visited.add(nodeId);
      inProgress.delete(nodeId);

      // Add to level array
      if (!levels[node.level]) {
        levels[node.level] = [];
      }
      levels[node.level].push(node);

      return node.level;
    };

    // Visit all nodes
    for (const nodeId of nodes.keys()) {
      visit(nodeId);
    }

    return {
      nodes,
      levels,
      criticalPath: [], // Will be filled by identifyCriticalPath
    };
  }

  /**
   * Identify critical path in DAG
   */
  identifyCriticalPath(dag: DAG): string[] {
    const { nodes } = dag;
    const duration = new Map<string, number>();
    const predecessor = new Map<string, string | null>();

    // Initialize
    for (const [nodeId, node] of nodes) {
      duration.set(nodeId, node.task.estimatedHours);
      predecessor.set(nodeId, null);
    }

    // Calculate earliest start times (forward pass)
    const earliestStart = new Map<string, number>();
    for (const [nodeId, node] of nodes) {
      let maxPredEnd = 0;
      for (const depId of node.dependencies) {
        const predStart = earliestStart.get(depId) ?? 0;
        const predDuration = duration.get(depId) ?? 0;
        maxPredEnd = Math.max(maxPredEnd, predStart + predDuration);
      }
      earliestStart.set(nodeId, maxPredEnd);
    }

    // Find endpoint (node with maximum earliest finish)
    let endpoint: string | null = null;
    let maxFinish = 0;
    for (const [nodeId] of nodes) {
      const start = earliestStart.get(nodeId) ?? 0;
      const dur = duration.get(nodeId) ?? 0;
      const finish = start + dur;
      if (finish > maxFinish) {
        maxFinish = finish;
        endpoint = nodeId;
      }
    }

    if (!endpoint) {
      return [];
    }

    // Backtrack from endpoint to find critical path
    const criticalPath: string[] = [];
    let current: string | null = endpoint;

    while (current) {
      criticalPath.unshift(current);
      const node = nodes.get(current)!;

      let criticalPred: string | null = null;
      let maxPredFinish = -1;

      for (const depId of node.dependencies) {
        const predStart = earliestStart.get(depId) ?? 0;
        const predDur = duration.get(depId) ?? 0;
        const predFinish = predStart + predDur;

        if (predFinish > maxPredFinish) {
          maxPredFinish = predFinish;
          criticalPred = depId;
        }
      }

      current = criticalPred;
    }

    dag.criticalPath = criticalPath;
    return criticalPath;
  }

  /**
   * Assign tasks to appropriate agents
   */
  assignAgents(tasks: Task[]): AgentAssignment[] {
    const assignments: AgentAssignment[] = [];

    for (const task of tasks) {
      const agentType = this.determineAgentType(task);
      const priorityValue = this.getPriorityValue(task.priority);

      assignments.push({
        taskId: task.id,
        agentType,
        priority: priorityValue,
      });
    }

    // Sort by priority (higher priority first)
    assignments.sort((a, b) => b.priority - a.priority);

    return assignments;
  }

  /**
   * Determine appropriate agent type for a task
   */
  private determineAgentType(task: Task): string {
    // If agent already assigned, use it
    if (task.assignedAgent) {
      return task.assignedAgent;
    }

    // Determine by labels
    const labels = task.labels.map((l) => l.toLowerCase());

    if (labels.some((l) => l.includes('test'))) return 'test';
    if (labels.some((l) => l.includes('deploy'))) return 'deploy';
    if (labels.some((l) => l.includes('review'))) return 'review';
    if (labels.some((l) => l.includes('pr') || l.includes('pull')))
      return 'pr';
    if (labels.some((l) => l.includes('issue'))) return 'issue';

    // Default to codegen
    return 'codegen';
  }

  /**
   * Convert priority to numeric value
   */
  private getPriorityValue(priority: Priority): number {
    switch (priority) {
      case Priority.P0_CRITICAL:
        return 4;
      case Priority.P1_HIGH:
        return 3;
      case Priority.P2_MEDIUM:
        return 2;
      case Priority.P3_LOW:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Execute tasks in parallel with max concurrency
   */
  async executeParallel(
    tasks: Task[],
    agents: Map<string, BaseAgent>,
    maxConcurrency: number = 4
  ): Promise<AgentResult[]> {
    this.log(
      `Executing ${tasks.length} tasks with max concurrency: ${maxConcurrency}`
    );

    const results: AgentResult[] = [];
    const queue = [...tasks];
    const inProgress = new Set<string>();
    const completed = new Set<string>();

    const executeTask = async (task: Task): Promise<AgentResult> => {
      const agentType = task.assignedAgent ?? 'codegen';
      const agent = agents.get(agentType);

      if (!agent) {
        throw new Error(`Agent not found: ${agentType}`);
      }

      inProgress.add(task.id);
      this.log(`Executing task: ${task.id} with ${agentType}`);

      try {
        const result = await agent.execute(task);
        completed.add(task.id);
        inProgress.delete(task.id);
        this.log(
          `Task ${task.id} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`
        );
        return result;
      } catch (error) {
        inProgress.delete(task.id);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.log(`Task ${task.id} failed: ${errorMessage}`);
        throw error;
      }
    };

    // Execute tasks respecting dependencies and max concurrency
    while (queue.length > 0 || inProgress.size > 0) {
      // Find tasks that can be executed now
      const readyTasks = queue.filter((task) => {
        // Check if all dependencies are completed
        return task.dependencies.every((depId) => completed.has(depId));
      });

      // Execute up to maxConcurrency tasks
      const tasksToExecute = readyTasks.slice(
        0,
        maxConcurrency - inProgress.size
      );

      if (tasksToExecute.length === 0 && inProgress.size === 0) {
        // No tasks ready and none in progress - check for circular deps
        if (queue.length > 0) {
          throw new Error('Circular dependency or blocked tasks detected');
        }
        break;
      }

      // Remove from queue and execute
      for (const task of tasksToExecute) {
        const index = queue.indexOf(task);
        if (index > -1) {
          queue.splice(index, 1);
        }

        executeTask(task)
          .then((result) => results.push(result))
          .catch((error) => {
            results.push({
              success: false,
              taskId: task.id,
              agentName: task.assignedAgent ?? 'unknown',
              error:
                error instanceof Error ? error.message : String(error),
              metrics: { executionTime: 0 },
              logs: [],
            });
          });
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}
