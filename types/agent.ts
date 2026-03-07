
/**
 * types/agent.ts - Core types for the Multi-Agent System
 */

export type AgentRole = 'planner' | 'executor' | 'critic' | 'orchestrator';

export type AgentStatus = 'idle' | 'planning' | 'executing' | 'critiquing' | 'waiting' | 'failed' | 'completed';

export type ModelType = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

export interface AgentMessage {
    id: string;
    role: AgentRole | 'user' | 'system';
    content: string;
    timestamp: number;
    metadata?: any;
}

export interface Task {
    id: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    subtasks?: Task[];
    dependencies?: string[]; // IDs of tasks that must complete first
    assignedTo?: AgentRole;
    result?: any;
    error?: string;
}

export interface AgentState {
    id: string;
    role: AgentRole;
    status: AgentStatus;
    currentTask?: Task;
    memory?: any; // Reference to agent-specific memory
}

export interface ThinkingStep {
    step: string;
    reasoning: string;
    timestamp: number;
}

export interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    artifacts?: string[]; // Paths to screenshots, logs, etc.
    metrics?: {
        duration: number;
        tokensUsed: number;
        cost: number;
    };
}
