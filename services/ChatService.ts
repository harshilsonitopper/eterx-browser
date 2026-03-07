/**
 * ChatService.ts - Chat with Memory & User Understanding
 * 
 * Features:
 * - Conversation memory (remembers chat history)
 * - User intent understanding via Gemini
 * - Intelligent tool orchestration
 * - Rich media support (images, related questions)
 */

import { LLMService } from './LLMService';
import { AgentManager } from './AgentManager';
import { SidebarAgentToolkit as AgentToolkit } from './AgentToolkit';
import { ImageSearchResult } from './SearchService';

// Conversation memory per tab
interface ConversationMemory {
    messages: { role: 'user' | 'assistant'; content: string; timestamp: Date }[];
    userPreferences: Record<string, string>;
}

const memoryStore: Map<string, ConversationMemory> = new Map();

class ChatServiceClass {
    /**
     * Get or create memory for a tab
     */
    private getMemory(tabId: string): ConversationMemory {
        if (!memoryStore.has(tabId)) {
            memoryStore.set(tabId, { messages: [], userPreferences: {} });
        }
        return memoryStore.get(tabId)!;
    }

    /**
     * Add message to memory
     */
    private addToMemory(tabId: string, role: 'user' | 'assistant', content: string) {
        const memory = this.getMemory(tabId);
        memory.messages.push({ role, content, timestamp: new Date() });

        // Keep last 20 messages to avoid token limits
        if (memory.messages.length > 20) {
            memory.messages = memory.messages.slice(-20);
        }
    }

    /**
     * Get conversation context for better understanding
     */
    private getConversationContext(tabId: string): string {
        const memory = this.getMemory(tabId);
        if (memory.messages.length === 0) return '';

        const recent = memory.messages.slice(-6); // Last 6 messages
        return recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}`).join('\n');
    }

    /**
     * Process message with memory and understanding
     */
    async processMessage(
        tabId: string,
        message: string,
        context: { url?: string; onCaptureScreen?: () => Promise<string> },
        onTextUpdate?: (text: string) => void,
        onThinking?: (step: string) => void
    ): Promise<{
        text: string;
        sources?: { title: string; url: string; favicon?: string; snippet?: string }[];
        images?: ImageSearchResult[];
        videos?: { videoId: string; title: string; channel: string; thumbnail: string }[];
        relatedQuestions?: string[];
        thinkingSteps?: string[];
        videoId?: string;
    }> {
        try {
            AgentManager.startProcessing(tabId);

            // Add user message to memory
            this.addToMemory(tabId, 'user', message);

            // Get conversation context
            const conversationContext = this.getConversationContext(tabId);

            // Enhance query with context if it's a follow-up
            let enhancedQuery = message;
            if (conversationContext && this.isFollowUp(message)) {
                enhancedQuery = `[Previous conversation:\n${conversationContext}]\n\nCurrent question: ${message}`;
            }

            // Use AgentToolkit with enhanced query
            const result = await AgentToolkit.runAgent({
                query: enhancedQuery,
                url: context.url,
                captureScreen: context.onCaptureScreen,
                previousMessages: this.getMemory(tabId).messages, // Pass memory
                onThinking: (step) => {
                    AgentManager.setState(tabId, { status: 'thinking', message: step });
                    onThinking?.(step);
                },
                onStatusUpdate: (meta) => {
                    // Real-time update for Mode Badge
                    const current = AgentManager.getState(tabId);
                    AgentManager.setState(tabId, {
                        metadata: { ...(current.metadata || {}), ...meta }
                    });
                }
            });

            // Stream response
            if (onTextUpdate) {
                const chars = result.response.split('');
                let partial = '';
                for (const char of chars) {
                    partial += char;
                    onTextUpdate(partial);
                    if (char === '\n') await new Promise(r => setTimeout(r, 2));
                }
            }

            // Add assistant response to memory
            this.addToMemory(tabId, 'assistant', result.response);

            AgentManager.complete(tabId, result.response, {
                mode: result.activeMode,
                confidence: result.confidence
            });

            return {
                text: result.response,
                sources: result.sources,
                images: result.images,
                videos: result.videos,
                relatedQuestions: result.relatedQuestions,
                thinkingSteps: result.thinkingSteps,
                videoId: result.videoId
            };

        } catch (error: any) {
            console.error('[Chat] Error:', error);
            AgentManager.setError(tabId, error.message);
            return { text: `Error: ${error.message}` };
        }
    }

    /**
     * Detect if message is a follow-up to previous conversation
     */
    private isFollowUp(message: string): boolean {
        const followUpIndicators = /^(and|also|what about|how about|tell me more|explain|why|can you|it|this|that|the same|another|more|continue)/i;
        return followUpIndicators.test(message.trim());
    }

    /**
     * Clear memory for a tab
     */
    clearMemory(tabId: string) {
        memoryStore.delete(tabId);
    }

    /**
     * Get all memory (for debugging)
     */
    getFullMemory(tabId: string) {
        return this.getMemory(tabId);
    }

    saveHistory() {
        if (typeof window === 'undefined') return;
        try {
            const data = Array.from(memoryStore.entries());
            localStorage.setItem('eterx_chat_history', JSON.stringify(data));
        } catch (e) {
            console.error('[Chat] Save failed:', e);
        }
    }

    loadHistory() {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem('eterx_chat_history');
            if (raw) {
                const data = JSON.parse(raw);
                memoryStore.clear();
                data.forEach(([k, v]: [string, any]) => memoryStore.set(k, v));
            }
        } catch (e) {
            console.error('[Chat] Load failed:', e);
        }
    }

    getChatList(): { id: string; title: string; date: string }[] {
        return Array.from(memoryStore.entries())
            .map(([id, mem]) => {
                const firstUserMsg = mem.messages.find(m => m.role === 'user');
                const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) : 'New Chat';
                const lastDate = mem.messages[mem.messages.length - 1]?.timestamp || new Date();
                return {
                    id,
                    title,
                    date: new Date(lastDate).toLocaleDateString()
                };
            })
            .reverse(); // Newest first
    }

    startNewChat(): string {
        const newId = crypto.randomUUID();
        this.getMemory(newId); // Init
        return newId;
    }

}

// Load history on startup
const service = new ChatServiceClass();
service.loadHistory();
export const ChatService = service;
