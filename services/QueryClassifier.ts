/**
 * QueryClassifier.ts - Smart Query Classification
 * 
 * Classifies user queries into:
 * - "chat" → General questions, answered by AI
 * - "action" → Tasks requiring browser automation
 */

import { LLMService } from './LLMService';

export type QueryType = 'chat' | 'action';

export interface ClassificationResult {
    type: QueryType;
    rewrittenQuery: string;  // Cleaned up version of the query
    confidence: number;
}

// Classification prompt
const CLASSIFY_PROMPT = `You are a query classifier. Analyze the user's query and respond with JSON only.

RULES:
1. "chat" = General questions, greetings, explanations, calculations, writing
   Examples: "What is AI?", "Hi", "Write a poem", "Calculate 5+5", "Explain quantum physics"

2. "action" = Browser tasks: navigation, clicking, buying, searching on websites
   Examples: "Open Amazon", "Search for headphones", "Go to YouTube", "Buy this product"

Also rewrite the query to fix any spelling mistakes and make it clearer.

Respond ONLY with this JSON:
{"type": "chat" or "action", "rewrittenQuery": "cleaned query", "confidence": 0.0-1.0}`;

class QueryClassifierClass {
    /**
     * Classify a user query
     */
    async classify(query: string): Promise<ClassificationResult> {
        try {
            const prompt = `${CLASSIFY_PROMPT}\n\nUser query: "${query}"\n\nJSON:`;
            const response = await LLMService.generate(prompt);

            // Parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                type: parsed.type === 'action' ? 'action' : 'chat',
                rewrittenQuery: parsed.rewrittenQuery || query,
                confidence: parsed.confidence || 0.8
            };

        } catch (error) {
            console.error('[Classifier] Error:', error);
            // Default: treat as chat
            return {
                type: 'chat',
                rewrittenQuery: query,
                confidence: 0.5
            };
        }
    }

    /**
     * Quick check if query looks like an action (no API call)
     */
    isLikelyAction(query: string): boolean {
        const actionKeywords = [
            'open', 'go to', 'navigate', 'visit',
            'search', 'find', 'look for',
            'buy', 'purchase', 'order', 'add to cart',
            'click', 'type', 'enter', 'submit',
            'book', 'reserve', 'download'
        ];

        const lowerQuery = query.toLowerCase();
        return actionKeywords.some(kw => lowerQuery.includes(kw));
    }
}

export const QueryClassifier = new QueryClassifierClass();
