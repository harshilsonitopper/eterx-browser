/**
 * SkillFabric.ts — Self-Expanding Skill System
 * From SkillFabric Architecture Document
 *
 * The agent becomes a "digital employee" that:
 * 1. Stores successful task executions as reusable Skills
 * 2. Auto-generates new skills from observed patterns
 * 3. Composes complex workflows by chaining skills
 * 4. Runs autonomous work loops for background tasks
 * 5. Self-optimizes skills based on execution metrics
 */
// ═══════════════════════════════════════════════════════════════════════
// SKILL VAULT — Storage, retrieval, and matching of Skills
// ═══════════════════════════════════════════════════════════════════════
export class SkillVault {
    skills = new Map();
    triggerIndex = new Map(); // trigger_word → skill_ids
    /**
     * Store a new skill or update an existing one
     */
    register(skill) {
        this.skills.set(skill.skill_id, skill);
        // Index trigger patterns for fast lookup
        for (const trigger of skill.trigger_patterns) {
            const words = trigger.toLowerCase().split(/\s+/);
            for (const word of words) {
                if (word.length < 3)
                    continue; // Skip short words
                const existing = this.triggerIndex.get(word) || [];
                if (!existing.includes(skill.skill_id)) {
                    existing.push(skill.skill_id);
                    this.triggerIndex.set(word, existing);
                }
            }
        }
    }
    /**
     * Find matching skills for a user intent
     * Returns top N skills ranked by relevance + performance
     */
    findSkills(intent, domain, maxResults = 5) {
        const intentWords = intent.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
        const candidateScores = new Map();
        // Score by trigger word overlap
        for (const word of intentWords) {
            const skillIds = this.triggerIndex.get(word) || [];
            for (const id of skillIds) {
                candidateScores.set(id, (candidateScores.get(id) || 0) + 1);
            }
        }
        // Also check domain match and trigger pattern similarity
        for (const [id, skill] of this.skills) {
            let score = candidateScores.get(id) || 0;
            // Domain bonus
            if (domain && skill.domain === domain)
                score += 3;
            // Trigger pattern fuzzy match
            for (const trigger of skill.trigger_patterns) {
                const trigLower = trigger.toLowerCase();
                const intentLower = intent.toLowerCase();
                // Check if intent contains the trigger pattern
                if (intentLower.includes(trigLower) || trigLower.includes(intentLower)) {
                    score += 5;
                }
                // Jaccard similarity
                const trigWords = new Set(trigLower.split(/\s+/));
                const intWords = new Set(intentLower.split(/\s+/));
                const intersection = [...intWords].filter(w => trigWords.has(w)).length;
                const union = new Set([...intWords, ...trigWords]).size;
                score += (intersection / union) * 4;
            }
            // Performance bonus — prefer reliable skills
            if (skill.performance.success_rate > 0.8)
                score += 2;
            if (skill.performance.execution_count > 10)
                score += 1;
            if (score > 0)
                candidateScores.set(id, score);
        }
        // Sort by score, return top N
        const sorted = [...candidateScores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxResults);
        return sorted
            .map(([id]) => this.skills.get(id))
            .filter((s) => !!s);
    }
    /**
     * Create a skill from a successfully executed TaskJSON
     */
    createFromExecution(taskJSON, executionMetrics) {
        const skill = {
            skill_id: `skill_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
            version: '1.0.0',
            name: this.intentToName(taskJSON.task_intent),
            domain: taskJSON.target_domain,
            category: this.inferCategory(taskJSON),
            description: taskJSON.task_intent,
            trigger_patterns: this.generateTriggers(taskJSON.task_intent),
            required_inputs: this.extractInputs(taskJSON),
            execution_plan: taskJSON,
            success_criteria: taskJSON.success_criteria,
            glass_box: {
                risk_level: taskJSON.risk_level,
                human_preview_before: taskJSON.requires_human_approval,
                show_draft_to_human: taskJSON.risk_level === 'high' || taskJSON.risk_level === 'critical',
            },
            composability: {
                accepts_output_from: [],
                provides_output_to: [],
            },
            performance: {
                avg_execution_ms: executionMetrics.duration_ms,
                success_rate: executionMetrics.success ? 1.0 : 0.0,
                fallback_rate: 0,
                last_optimized: new Date().toISOString(),
                execution_count: 1,
            },
            metadata: {
                generated_by: 'auto_from_execution',
                generated_at: new Date().toISOString(),
                last_validated: new Date().toISOString(),
                tags: this.inferTags(taskJSON),
            },
        };
        this.register(skill);
        return skill;
    }
    /**
     * Update skill performance metrics after each execution
     */
    updatePerformance(skillId, success, durationMs) {
        const skill = this.skills.get(skillId);
        if (!skill)
            return;
        const p = skill.performance;
        const totalMs = p.avg_execution_ms * p.execution_count + durationMs;
        p.execution_count++;
        p.avg_execution_ms = totalMs / p.execution_count;
        p.success_rate = (p.success_rate * (p.execution_count - 1) + (success ? 1 : 0)) / p.execution_count;
    }
    /**
     * Get all skills for a domain
     */
    getByDomain(domain) {
        return [...this.skills.values()].filter(s => s.domain === domain);
    }
    /**
     * Get vault statistics
     */
    getStats() {
        const byCategory = {};
        const byDomain = {};
        let totalRate = 0;
        for (const s of this.skills.values()) {
            byCategory[s.category] = (byCategory[s.category] || 0) + 1;
            byDomain[s.domain] = (byDomain[s.domain] || 0) + 1;
            totalRate += s.performance.success_rate;
        }
        return {
            totalSkills: this.skills.size,
            byCategory, byDomain,
            avgSuccessRate: this.skills.size > 0 ? totalRate / this.skills.size : 0,
        };
    }
    // ─── Internal helpers ───
    intentToName(intent) {
        return intent.split(/\s+/).slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    inferCategory(task) {
        const intent = task.task_intent.toLowerCase();
        if (intent.match(/email|send|compose|mail/))
            return 'communication';
        if (intent.match(/form|survey|questionnaire/))
            return 'data_entry';
        if (intent.match(/search|find|lookup|browse/))
            return 'research';
        if (intent.match(/create|make|build|add|new/))
            return 'creation';
        if (intent.match(/edit|update|change|modify/))
            return 'modification';
        if (intent.match(/delete|remove|cancel/))
            return 'deletion';
        if (intent.match(/buy|purchase|order|checkout/))
            return 'commerce';
        if (intent.match(/post|publish|share|tweet/))
            return 'social';
        if (intent.match(/download|upload|export|import/))
            return 'file_transfer';
        if (intent.match(/schedule|book|reserve|calendar/))
            return 'scheduling';
        if (intent.match(/login|register|signup|account/))
            return 'authentication';
        return 'general';
    }
    generateTriggers(intent) {
        const triggers = [intent.toLowerCase()];
        // Generate variations
        const words = intent.toLowerCase().split(/\s+/);
        if (words.length > 3) {
            triggers.push(words.slice(0, 3).join(' ')); // First 3 words
            triggers.push(words.filter(w => w.length > 3).join(' ')); // Only significant words
        }
        return triggers;
    }
    extractInputs(task) {
        const inputs = {};
        for (const [key, value] of Object.entries(task.parameters || {})) {
            inputs[key] = { type: typeof value, description: `Parameter: ${key}` };
        }
        return inputs;
    }
    inferTags(task) {
        const tags = [task.target_domain, task.risk_level];
        const actionTypes = new Set(task.steps.map(s => s.action.type));
        for (const t of actionTypes)
            tags.push(t);
        return tags;
    }
}
export class SkillComposer {
    vault;
    constructor(vault) {
        this.vault = vault;
    }
    /**
     * Automatically compose a workflow from a complex goal
     * by finding and chaining relevant skills
     */
    compose(goal, domain) {
        // Break goal into sub-intents
        const subIntents = this.decomposeGoal(goal);
        if (subIntents.length < 2)
            return null;
        const chain = [];
        let totalMs = 0;
        let maxRisk = 'low';
        const riskOrder = ['low', 'medium', 'high', 'critical'];
        for (const intent of subIntents) {
            const matches = this.vault.findSkills(intent, domain, 1);
            if (matches.length === 0)
                return null; // Can't compose if any sub-skill is missing
            const skill = matches[0];
            chain.push({
                skill_id: skill.skill_id,
                input_mapping: {},
            });
            totalMs += skill.performance.avg_execution_ms;
            if (riskOrder.indexOf(skill.glass_box.risk_level) > riskOrder.indexOf(maxRisk)) {
                maxRisk = skill.glass_box.risk_level;
            }
        }
        return {
            id: `wf_${Date.now().toString(36)}`,
            name: `Workflow: ${goal.substring(0, 50)}`,
            description: goal,
            skill_chain: chain,
            estimated_total_ms: totalMs,
            overall_risk: maxRisk,
        };
    }
    /**
     * Decompose a complex goal into sub-intents
     */
    decomposeGoal(goal) {
        const lower = goal.toLowerCase();
        // Split on conjunctions and sequential markers
        const parts = lower.split(/\s*(?:then|and then|after that|next|,\s*then|;\s*)\s*/);
        if (parts.length > 1)
            return parts.filter(p => p.trim().length > 5);
        // Split on "and" if it separates distinct actions
        const andParts = lower.split(/\s+and\s+/);
        if (andParts.length > 1 && andParts.every(p => p.trim().length > 5))
            return andParts;
        return [goal]; // Can't decompose
    }
}
export class AutonomousWorkLoop {
    queue = [];
    isRunning = false;
    currentItem = null;
    maxConcurrent = 1;
    completedHistory = [];
    maxHistory = 100;
    /**
     * Add a work item to the queue
     */
    enqueue(item) {
        const id = `wi_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        const workItem = {
            ...item,
            id,
            status: 'queued',
            created_at: Date.now(),
        };
        this.queue.push(workItem);
        // Sort by priority
        this.queue.sort((a, b) => {
            const order = { urgent: 0, high: 1, medium: 2, low: 3 };
            return order[a.priority] - order[b.priority];
        });
        return id;
    }
    /**
     * Schedule a recurring work item
     */
    scheduleRecurring(goal, domain, intervalMs, priority = 'low') {
        return this.enqueue({
            goal, domain, priority,
            scheduled_at: Date.now() + intervalMs,
            repeat_interval_ms: intervalMs,
        });
    }
    /**
     * Get the next item ready for execution
     */
    dequeue() {
        if (this.currentItem)
            return null; // Already running something
        const now = Date.now();
        const idx = this.queue.findIndex(item => item.status === 'queued' && (!item.scheduled_at || item.scheduled_at <= now));
        if (idx === -1)
            return null;
        const item = this.queue.splice(idx, 1)[0];
        item.status = 'running';
        item.started_at = now;
        this.currentItem = item;
        return item;
    }
    /**
     * Mark current item as completed
     */
    complete(result) {
        if (!this.currentItem)
            return;
        this.currentItem.status = 'completed';
        this.currentItem.completed_at = Date.now();
        this.currentItem.result = result;
        // If recurring, re-schedule
        if (this.currentItem.repeat_interval_ms) {
            this.enqueue({
                goal: this.currentItem.goal,
                domain: this.currentItem.domain,
                priority: this.currentItem.priority,
                scheduled_at: Date.now() + this.currentItem.repeat_interval_ms,
                repeat_interval_ms: this.currentItem.repeat_interval_ms,
                skill_id: this.currentItem.skill_id,
            });
        }
        this.completedHistory.push(this.currentItem);
        if (this.completedHistory.length > this.maxHistory) {
            this.completedHistory = this.completedHistory.slice(-this.maxHistory);
        }
        this.currentItem = null;
    }
    /**
     * Mark current item as failed
     */
    fail(error) {
        if (!this.currentItem)
            return;
        this.currentItem.status = 'failed';
        this.currentItem.completed_at = Date.now();
        this.currentItem.error = error;
        this.completedHistory.push(this.currentItem);
        this.currentItem = null;
    }
    /**
     * Pause the current item and re-queue it
     */
    pause() {
        if (!this.currentItem)
            return;
        this.currentItem.status = 'queued';
        this.currentItem.started_at = undefined;
        this.queue.unshift(this.currentItem);
        this.currentItem = null;
    }
    /**
     * Get queue stats
     */
    getStats() {
        const completed = this.completedHistory.filter(i => i.status === 'completed').length;
        const failed = this.completedHistory.filter(i => i.status === 'failed').length;
        const now = Date.now();
        const nextReady = this.queue.find(i => !i.scheduled_at || i.scheduled_at <= now);
        return {
            queued: this.queue.length,
            running: this.currentItem ? 1 : 0,
            completed, failed,
            currentItem: this.currentItem,
            nextItem: nextReady || null,
        };
    }
    /**
     * Get recent completion history
     */
    getHistory(limit = 10) {
        return this.completedHistory.slice(-limit);
    }
    /**
     * Clear all queued items
     */
    clearQueue() {
        this.queue = [];
    }
}
// ═══════════════════════════════════════════════════════════════════════
// SKILL OPTIMIZER — Self-improvement of existing skills
// ═══════════════════════════════════════════════════════════════════════
export class SkillOptimizer {
    /**
     * Analyze a skill's execution history and suggest optimizations
     */
    static analyze(skill) {
        const suggestions = [];
        const canRemoveSteps = [];
        const canMergeSteps = [];
        let speedup = 1.0;
        const plan = skill.execution_plan;
        if (!plan || !plan.steps)
            return { suggestions, canRemoveSteps, canMergeSteps, estimatedSpeedup: 1.0 };
        // 1. Find consecutive wait steps that can be merged
        for (let i = 0; i < plan.steps.length - 1; i++) {
            const curr = plan.steps[i];
            const next = plan.steps[i + 1];
            if (curr.action.type === 'wait' && next.action.type === 'wait') {
                canMergeSteps.push([curr.step_id, next.step_id]);
                suggestions.push(`Merge consecutive waits: ${curr.step_id} + ${next.step_id}`);
                speedup *= 0.9;
            }
        }
        // 2. Find verify steps after low-risk actions (can be skipped if success rate > 95%)
        if (skill.performance.success_rate > 0.95) {
            for (const step of plan.steps) {
                if (step.action.type === 'verify' && step.risk === 'low') {
                    canRemoveSteps.push(step.step_id);
                    suggestions.push(`Skip verification ${step.step_id} — 95%+ success rate`);
                    speedup *= 0.85;
                }
            }
        }
        // 3. Reduce timeouts if avg execution is fast
        if (skill.performance.avg_execution_ms < 5000 && plan.steps.length > 5) {
            suggestions.push('Reduce all timeouts by 30% — skill executes fast historically');
            speedup *= 0.7;
        }
        // 4. Suggest fill_form_all for consecutive type actions
        let consecutiveTypes = 0;
        for (const step of plan.steps) {
            if (step.action.type === 'type') {
                consecutiveTypes++;
            }
            else {
                if (consecutiveTypes >= 3) {
                    suggestions.push(`Merge ${consecutiveTypes} consecutive type actions into fill_form_all`);
                    speedup *= (1 - consecutiveTypes * 0.05);
                }
                consecutiveTypes = 0;
            }
        }
        return {
            suggestions,
            canRemoveSteps,
            canMergeSteps,
            estimatedSpeedup: Math.max(0.5, speedup),
        };
    }
    /**
     * Apply optimizations to a skill and return the optimized version
     */
    static optimize(skill) {
        const analysis = this.analyze(skill);
        if (analysis.suggestions.length === 0)
            return skill;
        const optimized = JSON.parse(JSON.stringify(skill));
        // Remove skippable steps
        if (analysis.canRemoveSteps.length > 0) {
            optimized.execution_plan.steps = optimized.execution_plan.steps.filter(s => !analysis.canRemoveSteps.includes(s.step_id));
            // Re-chain steps
            for (let i = 0; i < optimized.execution_plan.steps.length; i++) {
                const step = optimized.execution_plan.steps[i];
                if (i < optimized.execution_plan.steps.length - 1) {
                    step.on_success = `proceed_to:${optimized.execution_plan.steps[i + 1].step_id}`;
                }
                else {
                    step.on_success = 'done';
                }
            }
        }
        // Reduce timeouts by 30% if fast skill
        if (skill.performance.avg_execution_ms < 5000) {
            for (const step of optimized.execution_plan.steps) {
                step.action.timing.timeout_ms = Math.round(step.action.timing.timeout_ms * 0.7);
            }
        }
        optimized.version = this.bumpVersion(skill.version);
        optimized.performance.last_optimized = new Date().toISOString();
        return optimized;
    }
    static bumpVersion(version) {
        const parts = version.split('.').map(Number);
        parts[2] = (parts[2] || 0) + 1;
        return parts.join('.');
    }
}
