/**
 * AdvancedIntelligence.ts — Phase 5 Systems
 *
 * 1. AdversarialPreMortem — Pre-flight failure prediction
 * 2. SpeculativeExecutor — Execute likely-next-steps in parallel
 * 3. PromptGenome — Evolutionary prompt optimization
 * 4. GlassBoxSafety — Human-readable action preview & risk gating
 */
export class AdversarialPreMortem {
    /**
     * Analyze a TaskJSON plan and predict failure modes BEFORE execution.
     * Returns risk score and actionable mitigations.
     */
    static analyze(task, knownFailures) {
        const failures = [];
        const mitigations = [];
        let riskScore = 0;
        for (const step of task.steps) {
            // ─── Element Not Found ───
            if (['click', 'click_text', 'type', 'select_option', 'submit_form'].includes(step.action.type)) {
                if (!step.action.target.fallback_1 && !step.action.target.fallback_2) {
                    failures.push({
                        id: `f_nofallback_${step.step_id}`,
                        description: `Step ${step.step_id} has no fallback targeting — if primary target fails, step will fail`,
                        probability: 0.3, impact: 'medium', affected_step: step.step_id,
                        mitigation: 'Add fallback_1 (CSS selector) and fallback_2 (xy coordinates)',
                        auto_mitigated: false,
                    });
                    riskScore += 10;
                }
            }
            // ─── No Expected State Verification ───
            if (step.risk === 'high' || step.risk === 'critical') {
                if (!step.expected_state || Object.keys(step.expected_state).length === 0) {
                    failures.push({
                        id: `f_noverify_${step.step_id}`,
                        description: `High-risk step ${step.step_id} has no expected state verification`,
                        probability: 0.2, impact: 'high', affected_step: step.step_id,
                        mitigation: 'Add expected_state with text_visible or url_contains check',
                        auto_mitigated: false,
                    });
                    riskScore += 15;
                }
            }
            // ─── Navigation Without Wait ───
            if (step.action.type === 'navigate' && step.action.timing?.timeout_ms < 5000) {
                failures.push({
                    id: `f_fastnav_${step.step_id}`,
                    description: `Navigation timeout too short (${step.action.timing.timeout_ms}ms)`,
                    probability: 0.4, impact: 'medium', affected_step: step.step_id,
                    mitigation: 'Increase timeout to at least 8000ms',
                    auto_mitigated: true,
                });
                step.action.timing.timeout_ms = Math.max(step.action.timing.timeout_ms, 8000);
                mitigations.push(`Increased nav timeout for ${step.step_id} to 8000ms`);
                riskScore += 5;
            }
            // ─── Form Submit Without Prior Verification ───
            if (step.action.type === 'submit_form' || step.action.type === 'click_text') {
                const prevStep = task.steps[task.steps.indexOf(step) - 1];
                if (prevStep && prevStep.action.type === 'type' && !prevStep.expected_state?.text_visible) {
                    failures.push({
                        id: `f_blindsubmit_${step.step_id}`,
                        description: `Submitting without verifying form data was entered correctly`,
                        probability: 0.15, impact: 'high', affected_step: step.step_id,
                        mitigation: 'Add text_visible check to the type step before submit',
                        auto_mitigated: false,
                    });
                    riskScore += 12;
                }
            }
            // ─── No Retry on Critical Steps ───
            if (step.risk === 'critical' && step.on_failure?.retry_count === 0) {
                failures.push({
                    id: `f_noretry_${step.step_id}`,
                    description: `Critical step ${step.step_id} has 0 retries`,
                    probability: 0.1, impact: 'catastrophic', affected_step: step.step_id,
                    mitigation: 'Set retry_count to at least 1 for critical steps',
                    auto_mitigated: true,
                });
                step.on_failure.retry_count = 1;
                mitigations.push(`Added 1 retry to critical step ${step.step_id}`);
                riskScore += 8;
            }
            // ─── Timing: Click immediately after type ───
            if (step.action.type === 'type') {
                const nextIdx = task.steps.indexOf(step) + 1;
                if (nextIdx < task.steps.length) {
                    const next = task.steps[nextIdx];
                    if (['click', 'submit_form'].includes(next.action.type)) {
                        if (!step.action.timing || step.action.timing.timeout_ms < 500) {
                            failures.push({
                                id: `f_fastclick_${step.step_id}`,
                                description: `Click immediately after type — input may not have registered`,
                                probability: 0.25, impact: 'medium', affected_step: next.step_id,
                                mitigation: 'Add 200ms wait after type before click',
                                auto_mitigated: true,
                            });
                            step.action.timing = { ...step.action.timing, timeout_ms: Math.max(step.action.timing?.timeout_ms || 0, 1000), poll_interval_ms: 200, wait_for: 'dom_stable' };
                            mitigations.push(`Added dom_stable wait after type in ${step.step_id}`);
                        }
                    }
                }
            }
            // ─── Known domain failures ───
            if (knownFailures) {
                const domainFailures = knownFailures.get(task.target_domain) || [];
                for (const kf of domainFailures) {
                    if (step.action.target.primary.toLowerCase().includes(kf.toLowerCase())) {
                        failures.push({
                            id: `f_known_${step.step_id}`,
                            description: `Known failure pattern on ${task.target_domain}: "${kf}"`,
                            probability: 0.5, impact: 'high', affected_step: step.step_id,
                            mitigation: 'Use alternate targeting or JavaScript fallback',
                            auto_mitigated: false,
                        });
                        riskScore += 15;
                    }
                }
            }
        }
        // Global checks
        if (task.steps.length > 15) {
            failures.push({
                id: 'f_long_plan', description: `Plan has ${task.steps.length} steps — higher chance of cascade failure`,
                probability: 0.3, impact: 'medium', affected_step: 'all',
                mitigation: 'Consider breaking into sub-tasks or using fill_form_all to merge steps',
                auto_mitigated: false,
            });
            riskScore += 10;
        }
        if (!task.fallback_strategies || Object.keys(task.fallback_strategies).length === 0) {
            failures.push({
                id: 'f_no_fallbacks', description: 'No fallback strategies defined',
                probability: 0.2, impact: 'high', affected_step: 'all',
                mitigation: 'Add at least f_scroll_down and f_dismiss_popup fallback strategies',
                auto_mitigated: false,
            });
            riskScore += 15;
        }
        return {
            risk_score: Math.min(100, riskScore),
            failure_modes: failures,
            mitigations_applied: mitigations,
            safe_to_proceed: riskScore < 50,
        };
    }
}
export class SpeculativeExecutor {
    /**
     * While current step executes, pre-resolve elements for upcoming steps.
     * This eliminates element lookup time for the next 2-3 steps.
     */
    static async preResolve(upcomingSteps, executeJS, maxSteps = 3) {
        const results = [];
        const stepsToCheck = upcomingSteps.slice(0, maxSteps);
        for (const step of stepsToCheck) {
            const start = Date.now();
            try {
                const target = step.action.target.primary;
                if (!target || target.startsWith('url:')) {
                    results.push({ step_id: step.step_id, pre_resolved: false, preparation_ms: 0 });
                    continue;
                }
                const searchText = target.replace(/^(semantic|text|label|placeholder|aria):/, '').trim();
                if (!searchText) {
                    results.push({ step_id: step.step_id, pre_resolved: false, preparation_ms: 0 });
                    continue;
                }
                // Pre-resolve element position
                const coords = await executeJS(`(() => {
                    const s = ${JSON.stringify(searchText)}.toLowerCase();
                    const els = document.querySelectorAll('button,a,input,select,textarea,[role="button"],[contenteditable="true"],label');
                    for (const el of els) {
                        const t = (el.innerText||el.textContent||el.getAttribute('aria-label')||el.getAttribute('placeholder')||'').toLowerCase();
                        if (t.includes(s)) {
                            const r = el.getBoundingClientRect();
                            if (r.width>0 && r.height>0) return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
                        }
                    }
                    return null;
                })()`);
                results.push({
                    step_id: step.step_id,
                    pre_resolved: !!coords,
                    cached_coords: coords || undefined,
                    preparation_ms: Date.now() - start,
                });
            }
            catch {
                results.push({ step_id: step.step_id, pre_resolved: false, preparation_ms: Date.now() - start });
            }
        }
        return results;
    }
}
export class PromptGenome {
    genes = new Map();
    activeGenes = new Set();
    /**
     * Register a prompt gene
     */
    addGene(variant, category) {
        const id = `gene_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        this.genes.set(id, {
            id, variant, category, fitness: 0.5, generation: 1, mutations: 0, created_at: Date.now(),
        });
        this.activeGenes.add(id);
        return id;
    }
    /**
     * Update fitness of a gene based on task outcome
     */
    updateFitness(geneId, success) {
        const gene = this.genes.get(geneId);
        if (!gene)
            return;
        // Exponential moving average
        gene.fitness = gene.fitness * 0.8 + (success ? 1 : 0) * 0.2;
    }
    /**
     * Mutate a gene — create a variation
     */
    mutate(geneId, newVariant) {
        const parent = this.genes.get(geneId);
        if (!parent)
            return '';
        const childId = `gene_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        this.genes.set(childId, {
            id: childId, variant: newVariant, category: parent.category,
            fitness: parent.fitness, generation: parent.generation + 1,
            mutations: parent.mutations + 1, parent_id: parent.id,
            created_at: Date.now(),
        });
        return childId;
    }
    /**
     * Evolve — keep top performers, remove weak genes
     */
    evolve() {
        const byCategory = new Map();
        for (const gene of this.genes.values()) {
            const list = byCategory.get(gene.category) || [];
            list.push(gene);
            byCategory.set(gene.category, list);
        }
        let survived = 0, culled = 0;
        for (const [cat, genes] of byCategory) {
            genes.sort((a, b) => b.fitness - a.fitness);
            // Keep top 5 per category, cull the rest if more than 8
            if (genes.length > 8) {
                const toCull = genes.slice(5);
                for (const g of toCull) {
                    this.genes.delete(g.id);
                    this.activeGenes.delete(g.id);
                    culled++;
                }
            }
            survived += Math.min(genes.length, 5);
        }
        return { survived, culled };
    }
    /**
     * Get the best gene per category for current prompt construction
     */
    getBestGenes() {
        const best = new Map();
        for (const gene of this.genes.values()) {
            const existing = best.get(gene.category);
            if (!existing || gene.fitness > existing.fitness) {
                best.set(gene.category, gene);
            }
        }
        return [...best.values()];
    }
    getStats() {
        let totalFit = 0;
        const cats = new Set();
        for (const g of this.genes.values()) {
            totalFit += g.fitness;
            cats.add(g.category);
        }
        return { totalGenes: this.genes.size, avgFitness: this.genes.size > 0 ? totalFit / this.genes.size : 0, categories: [...cats] };
    }
}
export class GlassBoxSafety {
    blockedPatterns = [
        'delete account', 'remove account', 'deactivate account',
        'transfer money', 'wire transfer', 'send payment',
        'purchase', 'buy now', 'place order', 'confirm order',
        'delete all', 'remove all', 'clear all data',
        'change password', 'reset password',
        'unsubscribe all', 'revoke access',
    ];
    /**
     * Evaluate whether a task step is safe to execute
     */
    evaluate(step, taskIntent) {
        const actionDesc = this.describeAction(step);
        const intentLower = taskIntent.toLowerCase();
        const targetLower = (step.action.target.primary || '').toLowerCase();
        const valueLower = (step.action.value || '').toLowerCase();
        const combined = `${intentLower} ${targetLower} ${valueLower}`;
        // Check against blocked patterns
        for (const pattern of this.blockedPatterns) {
            if (combined.includes(pattern)) {
                return {
                    allowed: false, risk_level: 'critical',
                    reason: `Blocked pattern detected: "${pattern}"`,
                    requires_human_confirm: true,
                    preview: actionDesc,
                };
            }
        }
        // Risk-based gating
        if (step.risk === 'critical') {
            return {
                allowed: true, risk_level: 'critical',
                reason: 'Critical risk — human confirmation required before execution',
                requires_human_confirm: true,
                preview: actionDesc,
            };
        }
        if (step.risk === 'high') {
            return {
                allowed: true, risk_level: 'high',
                reason: 'High risk — will show preview to human',
                requires_human_confirm: step.glass_box?.pause_before_execute || false,
                preview: actionDesc,
            };
        }
        return {
            allowed: true, risk_level: step.risk || 'low',
            reason: 'Safe to execute',
            requires_human_confirm: false,
            preview: actionDesc,
        };
    }
    /**
     * Generate human-readable description of an action
     */
    describeAction(step) {
        const t = step.action.type;
        const target = step.action.target.primary || '';
        const value = step.action.value || '';
        const descriptions = {
            navigate: `🌐 Go to: ${value || target}`,
            click: `👆 Click: "${target}"`,
            click_text: `👆 Click text: "${target}"`,
            type: `⌨️ Type "${value}" into "${target}"`,
            type_and_enter: `⌨️ Type "${value}" and press Enter in "${target}"`,
            submit_form: `📤 Submit form via "${target}"`,
            select_option: `📋 Select "${value}" from "${target}"`,
            fill_form_all: `📝 Fill form fields: ${value}`,
            press_key: `⌨️ Press key: ${value}`,
            scroll: `📜 Scroll ${value || 'down'}`,
            wait: `⏳ Wait ${value}ms`,
            verify: `✅ Verify page state`,
            js: `💻 Run JavaScript`,
        };
        return descriptions[t] || step.glass_box?.label_for_human || `${t}: ${target}`;
    }
    /**
     * Preview an entire TaskJSON plan for human review
     */
    previewPlan(task) {
        return task.steps.map(step => {
            const decision = this.evaluate(step, task.task_intent);
            const risk = decision.risk_level === 'critical' ? '🔴' : decision.risk_level === 'high' ? '🟠' : decision.risk_level === 'medium' ? '🟡' : '🟢';
            const confirm = decision.requires_human_confirm ? ' ⚠️ NEEDS APPROVAL' : '';
            return `${risk} ${decision.preview}${confirm}`;
        });
    }
}
