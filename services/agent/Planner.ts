
import { GeminiRouter } from './Router';
import { Task, ThinkingStep } from '../../types/agent';

/**
 * services/agent/Planner.ts
 * 
 * The Planner Agent is responsible for decomposing high-level user objectives
 * into a Directed Acyclic Graph (DAG) of executable subtasks.
 * 
 * It uses Gemini 2.5 Pro for deep reasoning and strategy formulation.
 */
export class PlannerAgent {

    /**
     * Decomposes a high-level objective into a list of executable steps.
     * Use Gemini 2.5 Pro to ensure logical coherence and dependency management.
     */
    static async createPlan(objective: string): Promise<Task[]> {
        const prompt = `
        You are an expert Planner Agent for an autonomous browser system.
        
        OBJECTIVE: "${ objective }"
        
        Your goal is to break this objective down into a logical sequence of subtasks.
        Each subtask must be specific, actionable, and suitable for an Executor Agent to perform on a web browser.
        
        Actions available to Executor:
        - navigate(url)
        - click(selector_description)
        - type(selector_description, text)
        - scroll(direction)
        - extract(selector_description)
        - wait(ms)
        - search_google(query)
        
        OUTPUT FORMAT:
        Return ONLY a raw JSON array of Task objects. Do not include markdown formatting.
        
        Example JSON Structure:
        [
            {
                "id": "1",
                "description": "Navigate to Google",
                "status": "pending",
                "assignedTo": "executor",
                "dependencies": []
            },
            {
                "id": "2",
                "description": "Search for 'Active volcanos'",
                "status": "pending",
                "assignedTo": "executor",
                "dependencies": ["1"]
            }
        ]
        `;

        try {
            // Force use of Pro for planning
            const responseText = await GeminiRouter.execute('gemini-2.5-pro', prompt, "You are a JSON generator.");

            // Clean up potentially malformed JSON
            const cleanedJson = responseText.replace(/```json|```/g, '').trim();
            const tasks: Task[] = JSON.parse(cleanedJson);

            // Validate structure (basic check)
            if (!Array.isArray(tasks)) throw new Error("Planner output is not an array");

            return tasks;
        } catch (error) {
            console.error('[PlannerAgent] Failed to create plan:', error);
            // Fallback: Return a single task wrapper if planning fails
            return [{
                id: 'fallback-1',
                description: objective,
                status: 'pending',
                assignedTo: 'executor'
            }];
        }
    }

    /**
     * Re-plans if a step fails or the environment changes unexpectedly.
     */
    static async replan(originalObjective: string, failedTask: Task, errorContext: string): Promise<Task[]> {
        const prompt = `
        The plan for objective "${ originalObjective }" failed at step: "${ failedTask.description }".
        Error: ${ errorContext }
        
        Please generate a NEW sequence of tasks to overcome this error and achieve the original objective.
        Return ONLY a raw JSON array of Task objects.
        `;

        try {
            const responseText = await GeminiRouter.execute('gemini-2.5-pro', prompt, "You are a recovery specialist.");
            const cleanedJson = responseText.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanedJson);
        } catch (e) {
            console.error('[PlannerAgent] Replanning failed:', e);
            return [];
        }
    }
}
