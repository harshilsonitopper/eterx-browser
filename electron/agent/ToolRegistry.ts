/**
 * ToolRegistry.ts — Dynamic Tool Registration System
 * 
 * A flexible, extensible registry for all agent tools.
 * - Register tools with name, description, parameters, and async handler
 * - Categorize tools for organization
 * - Enable/disable tools at runtime
 * - Auto-convert to Gemini function declarations format
 * - Support for compound tools (skills) that chain multiple tools
 */

import { WebContents, BrowserWindow } from 'electron';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ParamType = 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY';

export interface ToolParameter {
    type: ParamType;
    description: string;
    required?: boolean;
    enum?: string[];
    items?: { type: ParamType; properties?: Record<string, { type: ParamType; description: string }> };
    properties?: Record<string, ToolParameter>;
}

export interface ToolContext {
    /** The active webContents for browser interaction */
    webContents: WebContents | null;
    /** The main BrowserWindow */
    window: BrowserWindow | null;
    /** Active web contents ID */
    activeWebContentsId: number | null;
    /** Screen dimensions for coordinate mapping */
    screenWidth: number;
    screenHeight: number;
    /** Logging function */
    log: (message: string, type?: 'info' | 'error' | 'action') => void;
    /** Send IPC to renderer */
    sendToRenderer: (channel: string, ...args: any[]) => void;
    /** Get all registered tools (for skills that need to call other tools) */
    executeTool: (name: string, args: any) => Promise<any>;
    /** Human-like delay helper */
    humanDelay: (min?: number, max?: number) => Promise<void>;
    /** Memory access */
    memory: {
        get: (key: string) => any;
        set: (key: string, value: any) => void;
    };
}

export interface ToolDefinition {
    name: string;
    description: string;
    category: ToolCategory;
    parameters: Record<string, ToolParameter>;
    requiredParams: string[];
    handler: (args: any, ctx: ToolContext) => Promise<any>;
    /** If true, this tool is a "fast action" — no screenshot needed after execution */
    isFastAction?: boolean;
    /** If true, this tool terminates the agent loop */
    isTerminal?: boolean;
    /** If true, this tool is currently enabled */
    enabled: boolean;
    /** Priority for tool ordering in prompts (higher = more prominent) */
    priority?: number;
    /** Example usage for the model */
    examples?: string[];
    /** Estimated execution time in ms */
    estimatedMs?: number;
}

export type ToolCategory =
    | 'navigation'
    | 'interaction'
    | 'scrolling'
    | 'extraction'
    | 'tab_management'
    | 'advanced'
    | 'control'
    | 'human_emulation'
    | 'captcha'
    | 'form'
    | 'media'
    | 'network'
    | 'skill'
    | 'shadow'
    | 'fast'
    | 'parallel'
    | 'context';

// ─────────────────────────────────────────────
// TOOL REGISTRY CLASS
// ─────────────────────────────────────────────

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();
    private categoryOrder: ToolCategory[] = [
        'fast', 'navigation', 'interaction', 'form', 'scrolling',
        'extraction', 'tab_management', 'human_emulation',
        'captcha', 'advanced', 'media', 'network', 'skill',
        'parallel', 'context', 'control', 'shadow'
    ];

    /**
     * Register a new tool
     */
    register(tool: Omit<ToolDefinition, 'enabled'> & { enabled?: boolean }): void {
        this.tools.set(tool.name, {
            ...tool,
            enabled: tool.enabled !== false,
            priority: tool.priority || 50,
        });
    }

    /**
     * Register multiple tools at once
     */
    registerAll(tools: (Omit<ToolDefinition, 'enabled'> & { enabled?: boolean })[]): void {
        tools.forEach(t => this.register(t));
    }

    /**
     * Get a tool by name
     */
    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    /**
     * Execute a tool by name
     */
    async execute(name: string, args: any, ctx: ToolContext): Promise<any> {
        const tool = this.tools.get(name);
        if (!tool) {
            return { error: `Unknown tool: ${ name }` };
        }
        if (!tool.enabled) {
            return { error: `Tool '${ name }' is currently disabled.` };
        }
        try {
            return await tool.handler(args, ctx);
        } catch (e: any) {
            return { error: `Tool '${ name }' failed: ${ e.message }` };
        }
    }

    /**
     * Enable/disable a tool
     */
    setEnabled(name: string, enabled: boolean): void {
        const tool = this.tools.get(name);
        if (tool) tool.enabled = enabled;
    }

    /**
     * Enable/disable all tools in a category
     */
    setCategoryEnabled(category: ToolCategory, enabled: boolean): void {
        for (const tool of this.tools.values()) {
            if (tool.category === category) {
                tool.enabled = enabled;
            }
        }
    }

    /**
     * Get all enabled tools
     */
    getEnabled(): ToolDefinition[] {
        return Array.from(this.tools.values())
            .filter(t => t.enabled)
            .sort((a, b) => (b.priority || 50) - (a.priority || 50));
    }

    /**
     * Get tools by category
     */
    getByCategory(category: ToolCategory): ToolDefinition[] {
        return Array.from(this.tools.values())
            .filter(t => t.category === category && t.enabled);
    }

    /**
     * Check if a tool is a terminal tool (ends the loop)
     */
    isTerminal(name: string): boolean {
        return this.tools.get(name)?.isTerminal === true;
    }

    /**
     * Check if a tool is a fast action (no screenshot needed after)
     */
    isFastAction(name: string): boolean {
        return this.tools.get(name)?.isFastAction === true;
    }

    /**
     * Get all tool names
     */
    getAllNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * Get stats about registered tools
     */
    getStats(): { total: number; enabled: number; byCategory: Record<string, number> } {
        const all = Array.from(this.tools.values());
        const byCategory: Record<string, number> = {};
        for (const t of all) {
            byCategory[t.category] = (byCategory[t.category] || 0) + 1;
        }
        return {
            total: all.length,
            enabled: all.filter(t => t.enabled).length,
            byCategory
        };
    }

    /**
     * Convert all enabled tools to Gemini function declarations format
     */
    toGeminiFunctionDeclarations(): any[] {
        const enabled = this.getEnabled();
        return enabled.map(tool => {
            const properties: Record<string, any> = {};
            for (const [key, param] of Object.entries(tool.parameters)) {
                const prop: any = {
                    type: param.type,
                    description: param.description,
                };
                if (param.enum) prop.enum = param.enum;
                if (param.items) prop.items = param.items;
                if (param.properties) {
                    prop.properties = {};
                    for (const [k, v] of Object.entries(param.properties)) {
                        prop.properties[k] = { type: v.type, description: v.description };
                    }
                }
                properties[key] = prop;
            }

            return {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'OBJECT',
                    properties,
                    required: tool.requiredParams,
                }
            };
        });
    }

    /**
     * Generate a human-readable summary of available tools (for system prompts)
     */
    generateToolSummary(): string {
        const lines: string[] = ['## Available Tools\n'];

        for (const category of this.categoryOrder) {
            const tools = this.getByCategory(category);
            if (tools.length === 0) continue;

            const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            lines.push(`### ${ categoryLabel }`);
            for (const tool of tools) {
                const params = Object.keys(tool.parameters).join(', ');
                lines.push(`- **${ tool.name }**(${ params }): ${ tool.description }`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }
}
