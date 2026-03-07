
import { Orchestrator, AgentOrchestrator } from './agent/Orchestrator';

/**
 * AgentExecutor.ts - Integration point for the Multi-Agent System.
 * 
 * This file now delegates all execution logic to the Orchestrator.
 * It maintains backward compatibility with the rest of the application.
 */

export interface ActionStep {
    type: 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'extract';
    target?: string;
    value?: string;
    description: string;
}

export class AgentExecutor {

    /**
     * Executes a high-level plan or sequence of steps.
     * In the new architecture, this starts the Orchestrator with the goal.
     */
    static async execute(steps: ActionStep[]): Promise<string> {
        // Legacy support: If steps are passed directly, we wrap them or just run them.
        // For now, we assume the new UI calls `start` with a goal string.
        console.log('[AgentExecutor] Legacy execute called. Redirecting to general orchestrator if possible.');
        return 'Agent execution is now handled by the Orchestrator.';
    }

    /**
     * Starts the autonomous agent with a high-level goal.
     */
    static async start(query: string, webview: any, tabId: number): Promise<void> {
        console.log(`[AgentExecutor] Starting Agent for goal: "${ query }" on tab ${ tabId }`);

        // Connect UI listeners (if not already connected by the UI component)
        Orchestrator.on(AgentOrchestrator.EVENT_THOUGHT, (thought) => {
            console.log(`[Agent Thought] ${ thought }`);
            // TODO: Emit to frontend via IPC if needed here, 
            // though the UI should ideally subscribe directly or via a bridge.
        });

        // Start the orchestration
        await Orchestrator.startGoal(query, webview);
    }

    static stop(): void {
        console.log('[AgentExecutor] Stop called');
        // Orchestrator.stop(); // TODO: Implement stop in Orchestrator
    }
}

