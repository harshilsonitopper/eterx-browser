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
// ─────────────────────────────────────────────
// TOOL REGISTRY CLASS
// ─────────────────────────────────────────────
export class ToolRegistry {
    tools = new Map();
    categoryOrder = [
        'fast', 'navigation', 'interaction', 'form', 'scrolling',
        'extraction', 'tab_management', 'human_emulation',
        'captcha', 'advanced', 'media', 'network', 'skill',
        'parallel', 'context', 'control', 'shadow'
    ];
    /**
     * Register a new tool
     */
    register(tool) {
        this.tools.set(tool.name, {
            ...tool,
            enabled: tool.enabled !== false,
            priority: tool.priority || 50,
        });
    }
    /**
     * Register multiple tools at once
     */
    registerAll(tools) {
        tools.forEach(t => this.register(t));
    }
    /**
     * Get a tool by name
     */
    get(name) {
        return this.tools.get(name);
    }
    /**
     * Execute a tool by name
     */
    async execute(name, args, ctx) {
        const tool = this.tools.get(name);
        if (!tool) {
            return { error: `Unknown tool: ${name}` };
        }
        if (!tool.enabled) {
            return { error: `Tool '${name}' is currently disabled.` };
        }
        try {
            return await tool.handler(args, ctx);
        }
        catch (e) {
            return { error: `Tool '${name}' failed: ${e.message}` };
        }
    }
    /**
     * Enable/disable a tool
     */
    setEnabled(name, enabled) {
        const tool = this.tools.get(name);
        if (tool)
            tool.enabled = enabled;
    }
    /**
     * Enable/disable all tools in a category
     */
    setCategoryEnabled(category, enabled) {
        for (const tool of this.tools.values()) {
            if (tool.category === category) {
                tool.enabled = enabled;
            }
        }
    }
    /**
     * Get all enabled tools
     */
    getEnabled() {
        return Array.from(this.tools.values())
            .filter(t => t.enabled)
            .sort((a, b) => (b.priority || 50) - (a.priority || 50));
    }
    /**
     * Get tools by category
     */
    getByCategory(category) {
        return Array.from(this.tools.values())
            .filter(t => t.category === category && t.enabled);
    }
    /**
     * Check if a tool is a terminal tool (ends the loop)
     */
    isTerminal(name) {
        return this.tools.get(name)?.isTerminal === true;
    }
    /**
     * Check if a tool is a fast action (no screenshot needed after)
     */
    isFastAction(name) {
        return this.tools.get(name)?.isFastAction === true;
    }
    /**
     * Get all tool names
     */
    getAllNames() {
        return Array.from(this.tools.keys());
    }
    /**
     * Get stats about registered tools
     */
    getStats() {
        const all = Array.from(this.tools.values());
        const byCategory = {};
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
    toGeminiFunctionDeclarations() {
        const enabled = this.getEnabled();
        return enabled.map(tool => {
            const properties = {};
            for (const [key, param] of Object.entries(tool.parameters)) {
                const prop = {
                    type: param.type,
                    description: param.description,
                };
                if (param.enum)
                    prop.enum = param.enum;
                if (param.items)
                    prop.items = param.items;
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
    generateToolSummary() {
        const lines = ['## Available Tools\n'];
        for (const category of this.categoryOrder) {
            const tools = this.getByCategory(category);
            if (tools.length === 0)
                continue;
            const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            lines.push(`### ${categoryLabel}`);
            for (const tool of tools) {
                const params = Object.keys(tool.parameters).join(', ');
                lines.push(`- **${tool.name}**(${params}): ${tool.description}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
}
