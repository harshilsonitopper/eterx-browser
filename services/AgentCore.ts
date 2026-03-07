import { SearchService } from './SearchService';

export interface AgentAction {
    id: string;
    name: string;
    args: any;
}

export class AgentCoreService {
    private static instance: AgentCoreService;
    private memory: Record<string, any> = {};

    private constructor() {
        this.setupListeners();
    }

    public static getInstance(): AgentCoreService {
        if (!AgentCoreService.instance) {
            AgentCoreService.instance = new AgentCoreService();
        }
        return AgentCoreService.instance;
    }

    private setupListeners() {
        // Listen for actions from Main Process (Gemini)
        if (window.electron && window.electron.onGeminiPerformAction) {
            window.electron.onGeminiPerformAction((action) => {
                this.handleAction(action);
            });
        }
    }

    private async handleAction(action: AgentAction) {
        console.log(`[AgentCore] 🤖 Handling Action: ${action.name}`, action.args);

        try {
            let result: any = "Done";

            switch (action.name) {
                case 'webSearch':
                    result = await this.performWebSearch(action.args.query);
                    break;
                case 'openTab':
                    this.emitUIEvent('agent:open-tab', action.args);
                    result = `Opened tab: ${action.args.url}`;
                    break;
                case 'scrollPage':
                    this.emitUIEvent('agent:scroll', action.args);
                    result = `Scrolled ${action.args.direction}`;
                    break;
                case 'readPageDOM':
                    // This requires a callback from UI
                    result = await this.requestPageContent();
                    break;
                default:
                    result = `Unknown tool: ${action.name}`;
            }

            // Send result back to Gemini (Main Process)
            this.sendResponse(action.id, action.name, result);

        } catch (error: any) {
            console.error('[AgentCore] Action failed:', error);
            this.sendResponse(action.id, action.name, `Error: ${error.message}`);
        }
    }

    private async performWebSearch(query: string): Promise<string> {
        // Use existing SearchService
        const { results, abstract } = await SearchService.searchWeb(query);
        const topResults = results.slice(0, 3).map(r => `- [${r.title}](${r.link}): ${r.snippet}`).join('\n');
        return `Search Results for "${query}":\n${abstract}\n\nTop Links:\n${topResults}`;
    }

    // Helper to request data from UI (async)
    private requestPageContent(): Promise<string> {
        return new Promise((resolve) => {
            const handler = (e: CustomEvent) => {
                window.removeEventListener('agent:page-content-response', handler as EventListener);
                resolve(e.detail.content || 'No content found');
            };
            window.addEventListener('agent:page-content-response', handler as EventListener);

            this.emitUIEvent('agent:read-dom', {});

            // Timeout
            setTimeout(() => {
                window.removeEventListener('agent:page-content-response', handler as EventListener);
                resolve('Error: Timeout reading page content');
            }, 5000);
        });
    }

    private emitUIEvent(name: string, detail: any) {
        window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    private sendResponse(id: string, name: string, result: any) {
        if (window.electron && window.electron.sendGeminiToolResponse) {
            window.electron.sendGeminiToolResponse(id, name, result);
        }
    }
}

export const AgentCore = AgentCoreService.getInstance();
