/**
 * AgentManager.ts - Simple Agent State Management
 */

export type AgentStatus = 'idle' | 'thinking' | 'typing' | 'acting' | 'completed' | 'error' | 'analyzing' | 'capturing' | 'executing';

export interface AgentMetadata {
    mode?: 'fast' | 'deep' | 'research' | 'extreme' | 'video';
    confidence?: 'high' | 'medium' | 'low';
    scope?: string;
}

export interface AgentState {
    status: AgentStatus;
    message: string;
    isRunning: boolean;
    streamingText?: string;
    metadata?: AgentMetadata;
}

// Legacy types for backward compatibility
export interface AgentInfo extends AgentState {
    tabId: string;
    logs?: AgentActionLog[];
}

export interface AgentActionLog {
    id: string;
    type: 'navigate' | 'click' | 'type' | 'scroll' | 'extract' | 'wait' | 'complete' | 'error' | 'thought';
    description: string;
    timestamp: number;
    status: 'pending' | 'running' | 'completed' | 'error' | 'failed' | 'waiting_confirmation';
    result?: string;
    title?: string;
    data?: any;
}

type Subscriber = (tabId: string, state: AgentState) => void;

class AgentManagerClass {
    private states: Map<string, AgentState> = new Map();
    private subscribers: Subscriber[] = [];

    private getDefault(): AgentState {
        return {
            status: 'idle',
            message: '',
            isRunning: false,
            streamingText: '',
            metadata: {}
        };
    }

    getState(tabId: string): AgentState {
        return this.states.get(tabId) || this.getDefault();
    }

    private logs: Map<string, AgentActionLog[]> = new Map();

    addLog(tabId: string, log: AgentActionLog) {
        const currentLogs = this.logs.get(tabId) || [];
        this.logs.set(tabId, [...currentLogs, log]);
        // Notify subscribers (optional, or just rely on state update if we included logs in state)
        // For now, let's keep logs separate or merge them into AgentInfo getAgentState
    }

    // Legacy method for compatibility
    getAgentState(tabId: string): AgentInfo {
        const state = this.getState(tabId);
        return { ...state, tabId, logs: this.logs.get(tabId) || [] };
    }

    setState(tabId: string, update: Partial<AgentState>) {
        const current = this.getState(tabId);
        const updated = { ...current, ...update };
        this.states.set(tabId, updated);
        this.notify(tabId, updated);
    }

    startProcessing(tabId: string) {
        this.setState(tabId, {
            status: 'thinking',
            message: 'Processing...',
            isRunning: true,
            streamingText: ''
        });
    }

    updateStreamingText(tabId: string, text: string) {
        this.setState(tabId, {
            status: 'typing',
            streamingText: text
        });
    }

    complete(tabId: string, message: string, metadata?: AgentMetadata) {
        this.setState(tabId, {
            status: 'completed',
            message,
            isRunning: false,
            streamingText: '',
            metadata: metadata || undefined
        });
    }

    setError(tabId: string, error: string) {
        this.setState(tabId, {
            status: 'error',
            message: error,
            isRunning: false
        });
    }

    subscribe(callback: Subscriber): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(s => s !== callback);
        };
    }

    private notify(tabId: string, state: AgentState) {
        this.subscribers.forEach(cb => cb(tabId, state));
    }

    // --- Orchestrator Integration ---

    async startTask(tabId: string, objective: string, webview: any) {
        console.log(`[AgentManager] Starting task on tab ${ tabId }: ${ objective }`);

        // 1. Set initial state
        this.setState(tabId, {
            status: 'thinking',
            message: 'Initializing agent...',
            isRunning: true,
            streamingText: ''
        });

        // 2. Import Orchestrator dynamically to avoid circular deps if any, 
        // or just use the imported singleton if available.
        // For now, we assume it's available.
        const { Orchestrator, AgentOrchestrator } = await import('./agent/Orchestrator');

        // 3. Subscribe to Orchestrator events
        const handleStatus = (status: any) => {
            // Map Orchestrator status to AgentState
            this.setState(tabId, { status: status });
        };

        const handleThought = (thought: string) => {
            this.addLog(tabId, {
                id: Date.now().toString(),
                type: 'thought',
                description: thought,
                timestamp: Date.now(),
                status: 'completed'
            });
            this.setState(tabId, { message: thought });
        };

        const handleTasks = (tasks: any[]) => {
            // Optional: Update task list in UI
        };

        Orchestrator.on(AgentOrchestrator.EVENT_STATUS_CHANGE, handleStatus);
        Orchestrator.on(AgentOrchestrator.EVENT_THOUGHT, handleThought);
        Orchestrator.on(AgentOrchestrator.EVENT_TASK_UPDATE, handleTasks);

        try {
            // 4. Start Goal
            await Orchestrator.startGoal(objective, webview);
            this.complete(tabId, "Task completed successfully.");
        } catch (e: any) {
            console.error('[AgentManager] Task failed:', e);
            this.setError(tabId, e.message);
        } finally {
            // Cleanup
            Orchestrator.off(AgentOrchestrator.EVENT_STATUS_CHANGE, handleStatus);
            Orchestrator.off(AgentOrchestrator.EVENT_THOUGHT, handleThought);
            Orchestrator.off(AgentOrchestrator.EVENT_TASK_UPDATE, handleTasks);
        }
    }

    stop(tabId: string) {
        // Find existing Orchestrator and stop it?
        // Currently Orchestrator is a singleton.
        // We warn if multiple tabs try to run agents at once, but for now we just stop the singleton.
        // If we want multi-tab agents, we need Orchestrator instances per tab.
        // For MVP, we assume one active agent.

        // We can't easily import Orchestrator here synchronously if we used dynamic import above.
        // But we can just set state and let the loop exit if it checks state.

        this.complete(tabId, 'Stopped by user');
    }
}

export const AgentManager = new AgentManagerClass();
