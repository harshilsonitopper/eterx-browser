
import { AgentMessage, Task } from '../../types/agent';

/**
 * services/agent/Memory.ts
 * 
 * Manages the agent's memory hierarchy:
 * 1. Short-Term Memory (STM): Active session context, recent messages.
 * 2. Long-Term Memory (LTM): Persistent storage (localStorage for now, Vector DB later).
 * 3. Episodic Memory: History of past tasks and outcomes.
 */

export interface MemorySnapshot {
    stm: AgentMessage[];
    activeTask?: Task;
    variables: Record<string, any>;
}

export class AgentMemory {
    private stm: AgentMessage[] = [];
    private variables: Record<string, any> = {};
    private activeTask?: Task;
    private readonly STORAGE_KEY = 'eterx_agent_ltm';

    constructor() {
        this.loadLTM();
    }

    // --- Short Term Memory (STM) ---

    public addMessage(message: AgentMessage): void {
        this.stm.push(message);
        // Basic sliding window for STM to prevent explosion before we have proper sophisticated pruning
        if (this.stm.length > 50) {
            this.stm.shift();
        }
    }

    public getContext(): AgentMessage[] {
        return [...this.stm];
    }

    public clearSTM(): void {
        this.stm = [];
    }

    public setVariable(key: string, value: any): void {
        this.variables[key] = value;
    }

    public getVariable(key: string): any {
        return this.variables[key];
    }

    public setActiveTask(task: Task | undefined): void {
        this.activeTask = task;
    }

    public getActiveTask(): Task | undefined {
        return this.activeTask;
    }

    // --- Long Term Memory (LTM) ---

    private loadLTM(): void {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                // In a real system, we'd load complex user preferences or verified facts here
                // For now, we just ensure the slot exists
            }
        } catch (e) {
            console.warn('[AgentMemory] Failed to load LTM:', e);
        }
    }

    public saveEpisodic(task: Task, result: any): void {
        // Save the outcome of a task to LTM so we don't repeat mistakes or can recall success
        try {
            const episode = {
                taskId: task.id,
                description: task.description,
                result: result,
                timestamp: Date.now()
            };

            // Append to a list in localStorage (simplified Vector DB surrogate)
            const history = JSON.parse(localStorage.getItem(this.STORAGE_KEY + '_episodic') || '[]');
            history.push(episode);

            // Keep history manageable
            if (history.length > 100) history.shift();

            localStorage.setItem(this.STORAGE_KEY + '_episodic', JSON.stringify(history));
        } catch (e) {
            console.error('[AgentMemory] Failed to save episode:', e);
        }
    }

    public getRecentEpisodes(limit: number = 5): any[] {
        try {
            const history = JSON.parse(localStorage.getItem(this.STORAGE_KEY + '_episodic') || '[]');
            return history.slice(-limit).reverse();
        } catch (e) {
            return [];
        }
    }
}
