/**
 * GeminiKeyRotator.ts — Smart API Key & Model Rotation System
 *
 * Manages independent API keys across 4 model tiers:
 *   1. gemini-2.5-flash-lite  (primary — fastest, best for speed-focused agentic tasks)
 *   2. gemini-2.5-flash       (fallback 1 — fast, great reasoning)
 *   3. gemini-3.0-flash       (fallback 2 — latest generation, testing phase)
 *   4. gemini-2.5-pro         (last resort — most powerful, lowest limits)
 *
 * Features:
 *   - Per-key cooldown tracking (keys that hit 429 get a 30s cooldown)
 *   - Proactive key rotation (picks freshest key — least recent usage)
 *   - Model cascade on total key exhaustion
 *   - 404 model-not-found → instant skip to next model
 *   - Per-minute request tracking to avoid slamming same key
 *   - Auto-recovery: cooled-down keys automatically come back online
 *   - Smart wait: when all keys cooling, auto-waits for first available
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
// ─────────────────────────────────────────────
// MODEL CHAIN — verified working model IDs
// ─────────────────────────────────────────────
const MODEL_CHAIN = [
    'gemini-2.5-flash', // Primary: fast, great reasoning
    'gemini-2.5-flash-lite', // Fallback 1: fastest, lightweight tasks
    'gemini-3.0-flash', // Fallback 2: latest generation, testing phase
];
// Per-minute request limits per key (conservative for FREE tier)
const MODEL_RPM_LIMITS = {
    'gemini-2.5-flash': 10,
    'gemini-2.5-flash-lite': 10,
    'gemini-3.0-flash': 10,
};
const COOLDOWN_DURATION_MS = 5_000; // 5s cooldown after 429 — switch model fast
const MINUTE_WINDOW_MS = 60_000;
export const THROTTLE_DELAY_MS = 1_500; // 1.5s between API calls — fast pacing
// ─────────────────────────────────────────────
// GEMINI KEY ROTATOR
// ─────────────────────────────────────────────
export class GeminiKeyRotator {
    keys;
    currentModel;
    currentModelIndex = 0;
    genAI;
    constructor(apiKeys) {
        if (apiKeys.length === 0)
            throw new Error('No API keys provided');
        this.keys = apiKeys.map((key, index) => ({
            key, index,
            lastUsed: 0,
            cooldownUntil: 0,
            requestsThisMinute: 0,
            minuteWindowStart: Date.now(),
            totalRequests: 0,
            totalErrors: 0,
        }));
        this.currentModel = MODEL_CHAIN[0];
        this.genAI = new GoogleGenerativeAI(apiKeys[0]);
        console.log(`[KeyRotator] ✅ Initialized with ${apiKeys.length} keys, model: ${this.currentModel}`);
    }
    // ─────────────────────────────────────────
    // GET THE BEST AVAILABLE KEY
    // ─────────────────────────────────────────
    getBestKey() {
        const now = Date.now();
        const rpmLimit = MODEL_RPM_LIMITS[this.currentModel] || 2;
        // Reset minute windows
        for (const k of this.keys) {
            if (now - k.minuteWindowStart > MINUTE_WINDOW_MS) {
                k.requestsThisMinute = 0;
                k.minuteWindowStart = now;
            }
        }
        // Filter to available keys
        const available = this.keys.filter(k => k.cooldownUntil <= now && k.requestsThisMinute < rpmLimit);
        if (available.length === 0)
            return null;
        // Sort by least recently used
        available.sort((a, b) => a.lastUsed - b.lastUsed);
        return available[0];
    }
    // ─────────────────────────────────────────
    // PUBLIC: GET CURRENT genAI + MODEL
    // ─────────────────────────────────────────
    getClient() {
        const best = this.getBestKey();
        if (best) {
            this.genAI = new GoogleGenerativeAI(best.key);
            return { genAI: this.genAI, model: this.currentModel, keyIndex: best.index };
        }
        // All keys exhausted for current model — cascade
        if (this.currentModelIndex < MODEL_CHAIN.length - 1) {
            this.currentModelIndex++;
            this.currentModel = MODEL_CHAIN[this.currentModelIndex];
            for (const k of this.keys) {
                k.cooldownUntil = 0;
                k.requestsThisMinute = 0;
                k.minuteWindowStart = Date.now();
            }
            console.log(`[KeyRotator] 🔄 All keys exhausted. Cascading to model: ${this.currentModel}`);
            return this.getClient();
        }
        // Absolute last resort: wait for earliest cooldown to expire
        const earliest = [...this.keys].sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
        this.genAI = new GoogleGenerativeAI(earliest.key);
        return { genAI: this.genAI, model: this.currentModel, keyIndex: earliest.index };
    }
    // ─────────────────────────────────────────
    // RECORD SUCCESS / FAILURE
    // ─────────────────────────────────────────
    recordSuccess(keyIndex) {
        const k = this.keys[keyIndex];
        if (!k)
            return;
        k.lastUsed = Date.now();
        k.requestsThisMinute++;
        k.totalRequests++;
    }
    recordRateLimit(keyIndex) {
        const k = this.keys[keyIndex];
        if (!k)
            return;
        k.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
        k.totalErrors++;
        console.log(`[KeyRotator] ⚠️ Key ${keyIndex} rate-limited. Cooldown until ${new Date(k.cooldownUntil).toLocaleTimeString()}`);
    }
    recordError(keyIndex) {
        const k = this.keys[keyIndex];
        if (!k)
            return;
        k.totalErrors++;
    }
    /**
     * Force skip to next model — used when current model returns 404.
     * Returns the new model name or null if all exhausted.
     */
    forceNextModel() {
        if (this.currentModelIndex < MODEL_CHAIN.length - 1) {
            this.currentModelIndex++;
            this.currentModel = MODEL_CHAIN[this.currentModelIndex];
            // Reset all keys for the new model
            for (const k of this.keys) {
                k.cooldownUntil = 0;
                k.requestsThisMinute = 0;
                k.minuteWindowStart = Date.now();
            }
            console.log(`[KeyRotator] ⏭️ Model not found. Force-skipping to: ${this.currentModel}`);
            return this.currentModel;
        }
        return null;
    }
    /**
     * Calculate wait time until next key becomes available.
     * Returns 0 if a key is already available.
     */
    getWaitTimeMs() {
        const now = Date.now();
        const rpmLimit = MODEL_RPM_LIMITS[this.currentModel] || 2;
        // Check if any key is already available
        const available = this.keys.filter(k => k.cooldownUntil <= now && k.requestsThisMinute < rpmLimit);
        if (available.length > 0)
            return 0;
        // Find earliest cooldown expiry
        const cooldownKeys = this.keys.filter(k => k.cooldownUntil > now);
        if (cooldownKeys.length > 0) {
            const earliest = Math.min(...cooldownKeys.map(k => k.cooldownUntil));
            return Math.max(0, earliest - now);
        }
        // All at RPM limit — wait for minute window reset
        const earliestMinuteReset = Math.min(...this.keys.map(k => k.minuteWindowStart + MINUTE_WINDOW_MS));
        return Math.max(0, earliestMinuteReset - now);
    }
    // ─────────────────────────────────────────
    // MODEL MANAGEMENT
    // ─────────────────────────────────────────
    resetToDefault() {
        this.currentModelIndex = 0;
        this.currentModel = MODEL_CHAIN[0];
        console.log(`[KeyRotator] 🔄 Reset to primary model: ${this.currentModel}`);
    }
    getCurrentModel() {
        return this.currentModel;
    }
    getModelChain() {
        return MODEL_CHAIN;
    }
    // ─────────────────────────────────────────
    // DIAGNOSTICS
    // ─────────────────────────────────────────
    getStatus() {
        const now = Date.now();
        const rpmLimit = MODEL_RPM_LIMITS[this.currentModel] || 2;
        return {
            currentModel: this.currentModel,
            availableKeys: this.keys.filter(k => k.cooldownUntil <= now && k.requestsThisMinute < rpmLimit).length,
            totalKeys: this.keys.length,
            cooldownKeys: this.keys.filter(k => k.cooldownUntil > now).length,
            keyStats: this.keys.map(k => ({
                index: k.index,
                rpm: k.requestsThisMinute,
                cooldown: k.cooldownUntil > now,
                totalReqs: k.totalRequests,
                totalErrs: k.totalErrors,
            })),
        };
    }
    getStatusSummary() {
        const s = this.getStatus();
        return `Model: ${s.currentModel} | Keys: ${s.availableKeys}/${s.totalKeys} available | ${s.cooldownKeys} cooling down`;
    }
}
