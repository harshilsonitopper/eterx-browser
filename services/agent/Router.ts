
import { GeminiService } from '../GeminiService';
import { ModelType } from '../../types/agent';

/**
 * services/agent/Router.ts
 * 
 * Dynamically routes tasks to the most appropriate Gemini model based on complexity and cost.
 * - Flash-Lite: Simple classification, high-speed routing
 * - Flash: Routine execution, DOM parsing, coding
 * - Pro: Deep planning, orchestration, complex reasoning
 */
export class GeminiRouter {

    /**
     * Determines the best model for a given task description.
     * Starts with a default heuristic, but can use Flash-Lite to decide if ambiguous.
     */
    static async routeTask(taskDescription: string, contextLength: number = 0): Promise<ModelType> {
        // 1. Simple Heuristics (Zero Latency)
        const lowerDesc = taskDescription.toLowerCase();

        // Planning & Complex Reasoning -> PRO
        if (
            lowerDesc.includes('plan') ||
            lowerDesc.includes('strategy') ||
            lowerDesc.includes('analyze') ||
            lowerDesc.includes('reason') ||
            lowerDesc.includes('orchestrate') ||
            contextLength > 100000 // Huge context requires Pro's 2M window stability
        ) {
            return 'gemini-2.5-pro';
        }

        // Routine Execution -> FLASH
        if (
            lowerDesc.includes('click') ||
            lowerDesc.includes('type') ||
            lowerDesc.includes('scroll') ||
            lowerDesc.includes('extract') ||
            lowerDesc.includes('scrape') ||
            lowerDesc.includes('navigate')
        ) {
            return 'gemini-2.5-flash';
        }

        // Simple Classification / Routing -> FLASH-LITE
        if (
            lowerDesc.includes('classify') ||
            lowerDesc.includes('select') ||
            lowerDesc.includes('categorize') ||
            lowerDesc.includes('route')
        ) {
            return 'gemini-2.5-flash-lite';
        }

        // Default to Flash for balance
        return 'gemini-2.5-flash';
    }

    /**
     * Executes a prompt using the specific routed model.
     * Wraps the generic GeminiService but potentially adjusts headers/config.
     */
    static async execute(
        model: ModelType,
        prompt: string,
        systemPrompt?: string,
        attachments: any[] = []
    ): Promise<string> {
        // Map our internal types to GeminiService expectations
        // Note: GeminiService presently handles its own fallback logic.
        // We act as a high-level selector.

        let forceFast = false;
        if (model === 'gemini-2.5-flash' || model === 'gemini-2.5-flash-lite') {
            forceFast = true;
        }

        // Ideally GeminiService should accept a strict `model` param.
        // For now, we rely on its internal intelligent routing but hint via `forceFast`.
        // TODO: Refactor GeminiService to accept explicit model overrides if needed.

        try {
            const result = await GeminiService.generateContent(
                prompt,
                systemPrompt,
                forceFast,
                attachments
            );
            return result.text;
        } catch (error) {
            console.error(`[GeminiRouter] Execution failed on ${ model }:`, error);
            throw error;
        }
    }
}
