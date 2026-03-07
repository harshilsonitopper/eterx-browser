import { GeminiRouter } from './Router';
import { AgentPerception } from './Perception';
import { AgentStealth } from './Stealth';
import { Task, ExecutionResult } from '../../types/agent';

/**
 * services/agent/Executor.ts
 * 
 * The Executor Agent translates high-level task descriptions into atomic browser actions.
 * It primarily uses Gemini 2.5 Flash for speed and cost-efficiency.
 */
export class ExecutorAgent {

    /**
     * Executes a single task using the browser interface.
     */
    static async executeTask(task: Task, webview: any): Promise<ExecutionResult> {
        console.log(`[Executor] Starting task: ${ task.description }`);

        try {
            if (!webview) {
                return {
                    success: false,
                    error: "Webview not available",
                    metrics: { duration: 0, tokensUsed: 0, cost: 0 }
                };
            }

            // 1. Perception Phase: Understand the Page
            // Inject AxTree script to get semantic DOM
            const axTreeScript = AgentPerception.getAxTreeScript();
            // In a real app: const axTree = await webview.executeJavaScript(axTreeScript);
            // For now, we simulate a context string
            const axTreeContext = "Page Title: Google\nInput: Search Box\nButton: Search";

            // 2. Synthesize Action (Flash)
            const actionScript = await this.synthesizeAction(task.description, axTreeContext);

            // 3. Stealth: Apply Evasion
            const stealthScript = AgentStealth.getStealthInjectionScript();
            // await webview.executeJavaScript(stealthScript);

            // 4. Execute Action
            console.log(`[Executor] Executing script: ${ actionScript }`);
            // await webview.executeJavaScript(actionScript);

            // Simulate execution time
            await new Promise(resolve => setTimeout(resolve, AgentStealth.getThinkingDelay('low')));

            return {
                success: true,
                output: `Executed: ${ actionScript }`,
                metrics: { duration: 100, tokensUsed: 50, cost: 0 }
            };

        } catch (e: any) {
            return {
                success: false,
                error: e.message,
                metrics: { duration: 0, tokensUsed: 0, cost: 0 }
            };
        }
    }

    /**
     * Uses Gemini Flash to generate the specific JavaScript/CDP command
     */
    private static async synthesizeAction(description: string, context: string): Promise<string> {
        const prompt = `
        You are an Executor Agent controlling a browser via JavaScript.
        
        TASK: "${ description }"
        PAGE CONTEXT (AxTree):
        ${ context }
        
        Generate the specific JavaScript code to perform this action.
        Assume standard DOM API availability.
        
        Return ONLY the JavaScript code string. No markdown.
        `;

        try {
            const script = await GeminiRouter.execute('gemini-2.5-flash', prompt, "You are a JS code generator.");
            return script.replace(/```javascript|```/g, '').trim();
        } catch (e) {
            console.error('[Executor] Action synthesis failed:', e);
            return "// Action failed to generate";
        }
    }
}
