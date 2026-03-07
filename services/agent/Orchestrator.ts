// Custom Event Emitter for browser compatibility
export class EventEmitter {
    private listeners: Record<string, Function[]> = {};
    on(event: string, fn: Function) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }
    off(event: string, fn: Function) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== fn);
        }
    }
    emit(event: string, ...args: any[]) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(fn => fn(...args));
        }
    }
}
import { PlannerAgent } from './Planner';
import { ExecutorAgent } from './Executor';
import { CriticAgent } from './Critic';
import { AgentMemory } from './Memory';
import { Task, AgentStatus } from '../../types/agent';

/**
 * services/agent/Orchestrator.ts
 * 
 * The central brain that coordinates the Multi-Agent System.
 * - Manages the Task Queue (DAG)
 * - Assigns checks to Critic
 * - Handles Agent Handoffs
 * - Emits state updates to UI
 */
export class AgentOrchestrator extends EventEmitter {
    private memory: AgentMemory;
    private taskQueue: Task[] = [];
    private status: AgentStatus = 'idle';

    // UI Event Constants
    public static EVENT_STATUS_CHANGE = 'status-change';
    public static EVENT_TASK_UPDATE = 'task-update';
    public static EVENT_THOUGHT = 'thought';

    constructor() {
        super();
        this.memory = new AgentMemory();
    }

    /**
     * Main Entry Point: User gives an objective.
     */
    async startGoal(objective: string, webview: any): Promise<void> {
        this.setStatus('planning');
        this.emit(AgentOrchestrator.EVENT_THOUGHT, "Decomposing objective into subtasks...");

        // 1. Plan
        const tasks = await PlannerAgent.createPlan(objective);
        this.taskQueue = tasks;

        this.emit(AgentOrchestrator.EVENT_TASK_UPDATE, this.taskQueue);
        this.setStatus('executing');

        // 2. Execute Loop
        for (const task of this.taskQueue) {
            if (task.status === 'completed' || task.status === 'failed') continue;

            // Check dependencies
            if (!this.checkDependencies(task)) {
                console.warn(`[Orchestrator] Skipping task ${ task.id } due to unmet dependencies.`);
                continue;
            }

            // Task Active
            task.status = 'in-progress';
            this.memory.setActiveTask(task);
            this.emit(AgentOrchestrator.EVENT_TASK_UPDATE, this.taskQueue);
            this.emit(AgentOrchestrator.EVENT_THOUGHT, `Executing: ${ task.description }`);

            // Execute
            const result = await ExecutorAgent.executeTask(task, webview);

            // Validate (Critic)
            this.setStatus('critiquing');
            const critique = await CriticAgent.critique(task, result); // Add screenshot later

            if (result.success && critique.valid) {
                task.status = 'completed';
                task.result = result.output;
                this.memory.saveEpisodic(task, result);
                this.emit(AgentOrchestrator.EVENT_THOUGHT, `Success: ${ task.description }`);
            } else {
                task.status = 'failed';
                task.error = result.error || critique.feedback;
                this.emit(AgentOrchestrator.EVENT_THOUGHT, `Failed: ${ task.error }. Replanning...`);

                // Trigger PALADIN / Replanning logic here 
                // (Simplified for now)
                const newPlan = await PlannerAgent.replan(objective, task, task.error || 'Unknown error');
                // Merge new plan? For now, just stop.
                this.setStatus('failed');
                return;
            }

            this.setStatus('executing');
            this.emit(AgentOrchestrator.EVENT_TASK_UPDATE, this.taskQueue);
        }

        this.setStatus('completed');
        this.emit(AgentOrchestrator.EVENT_THOUGHT, "All tasks completed successfully.");
    }

    private setStatus(s: AgentStatus) {
        this.status = s;
        this.emit(AgentOrchestrator.EVENT_STATUS_CHANGE, s);
    }

    private checkDependencies(task: Task): boolean {
        if (!task.dependencies || task.dependencies.length === 0) return true;

        for (const depId of task.dependencies) {
            const depTask = this.taskQueue.find(t => t.id === depId);
            if (!depTask || depTask.status !== 'completed') return false;
        }
        return true;
    }

    public getQueue(): Task[] {
        return this.taskQueue;
    }

    public getStatus(): AgentStatus {
        return this.status;
    }
}

// Singleton Instance
export const Orchestrator = new AgentOrchestrator();
