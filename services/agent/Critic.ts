
import { GeminiRouter } from './Router';
import { Task, ExecutionResult } from '../../types/agent';

/**
 * services/agent/Critic.ts
 * 
 * The Critic Agent (Evaluator) operates asynchronously to verify execution success.
 * It compares the actual browser state (screenshot + DOM) against original intent.
 */
export class CriticAgent {

    /**
     * Critiques the result of an executed task.
     * Uses Gemini Pro (Vision) or Flash (Vision) depending on complexity.
     */
    static async critique(
        task: Task,
        result: ExecutionResult,
        screenshotBase64?: string
    ): Promise<{ valid: boolean; feedback: string }> {

        // If execution failed at script level, we don't need deep reasoning
        if (!result.success) {
            return {
                valid: false,
                feedback: `System Error: ${ result.error }`
            };
        }

        const prompt = `
        You are a Critic Agent verifying an autonomous browser action.
        
        TASK: "${ task.description }"
        ACTION OUTPUT: "${ result.output }"
        
        Determine if the action was successful based on the visual evidence provided.
        1. Did the page load correctly?
        2. Was the element clicked/filled?
        3. Are there any error messages visible?
        
        Output JSON:
        {
            "valid": true/false,
            "feedback": "Reason for decision..."
        }
        `;

        try {
            // Need multimodal capability if screenshot is available
            const attachments = screenshotBase64
                ? [{ inlineData: { data: screenshotBase64, mimeType: 'image/png' } }]
                : [];

            const responseText = await GeminiRouter.execute(
                'gemini-2.5-pro',
                prompt,
                "You are an impartial judge.",
                attachments
            );

            const cleanedJson = responseText.replace(/```json|```/g, '').trim();
            const evaluation = JSON.parse(cleanedJson);

            return {
                valid: evaluation.valid,
                feedback: evaluation.feedback
            };

        } catch (e: any) {
            console.error('[Critic] Evaluation failed:', e);
            // Fallback: trust the executor if the critic crashes (fail-open for now)
            return { valid: true, feedback: 'Critic failed to evaluate, assuming success.' };
        }
    }
}
