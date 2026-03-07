/**
 * NextGenAgent.ts â€” Unified Next-Gen Autonomous Browser Agent
 *
 * ReAct Reasoning Loop: OBSERVE â†’ THINK â†’ PLAN â†’ ACT â†’ REFLECT
 * 50+ tools, human-like behavior, CAPTCHA awareness, error recovery,
 * adaptive turn budget, persistent memory, stuck detection.
 */

import { BrowserWindow, webContents } from 'electron';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ToolRegistry, ToolContext } from './ToolRegistry.js';
import { AgentMemory } from './AgentMemory.js';
import { GeminiKeyRotator, THROTTLE_DELAY_MS } from './GeminiKeyRotator.js';
import { registerAllBrowserTools } from './BrowserTools.js';
import crypto from 'crypto';
import { getSiteDirective } from './SiteFingerprint.js';
import { ImmuneMemory, NetworkOracle } from './ImmuneMemory.js';
import { TaskExecutor, TemplateLibrary } from './TaskExecutor.js';
import { OneShotPlanner, CausalWebModel } from './OneShotPlanner.js';
import { SkillVault, SkillComposer, AutonomousWorkLoop, SkillOptimizer } from './SkillFabric.js';
import { AdversarialPreMortem, GlassBoxSafety, SpeculativeExecutor, PromptGenome } from './AdvancedIntelligence.js';
import { PageAnalyzer } from './PageAnalyzer.js';
import { getSpeculativePrefetch, getSmartRouter, getAdaptiveSpeed, getSessionIntelligence, getTaskDecomposer, getSmartContextBuilder } from './AGIEnhancements.js';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface NextGenAgentConfig {
    apiKeys: string[];
    defaultModel: string;
    screenWidth: number;
    screenHeight: number;
}

export interface AgentState {
    status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
    currentTask: string;
    logs: string[];
    turnCount: number;
    maxTurns: number;
    toolsUsed: string[];
}

type TaskComplexity = 'simple' | 'medium' | 'complex';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SET-OF-MARK INJECTION (inline to avoid import issues)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SOM_INJECT_SCRIPT = `(() => {
    document.querySelectorAll('.eterx-som-badge').forEach(el => el.remove());
    const selectors = [
        'button', 'a[href]', 'input:not([type="hidden"])', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
        '[role="switch"]', '[role="tab"]', '[role="menuitem"]', '[role="option"]',
        '[role="combobox"]', '[role="searchbox"]', '[role="textbox"]',
        '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
        'summary', 'label[for]', 'th[onclick]', 'td[onclick]',
        '[data-action]', '[data-click]', '.clickable', '.btn'
    ].join(', ');
    const bestCSS = (el) => {
        if (el.id) return '#' + CSS.escape(el.id);
        if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        if (el.name && el.tagName !== 'A') return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
        if (el.getAttribute('aria-label')) return '[aria-label="' + el.getAttribute('aria-label') + '"]';
        const tag = el.tagName.toLowerCase();
        const type = el.type ? '[type="' + el.type + '"]' : '';
        const parent = el.parentElement;
        if (parent) {
            const siblings = Array.from(parent.querySelectorAll(':scope > ' + tag + type));
            if (siblings.length === 1) return tag + type;
            const idx = siblings.indexOf(el);
            return tag + type + ':nth-of-type(' + (idx + 1) + ')';
        }
        return tag + type;
    };
    const elements = Array.from(document.querySelectorAll(selectors));
    let id = 1;
    const mapped = [];
    for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) continue;
        if (el.disabled && el.tagName !== 'A') continue;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) < 0.1) continue;
        if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0) continue;
        const badge = document.createElement('div');
        badge.className = 'eterx-som-badge';
        badge.textContent = String(id);
        Object.assign(badge.style, {
            position: 'fixed', left: rect.left + 'px', top: (rect.top - 2) + 'px',
            background: '#e11d48', color: '#fff', fontSize: '10px', fontWeight: '700',
            padding: '0px 3px', borderRadius: '3px', zIndex: '2147483647',
            pointerEvents: 'none', lineHeight: '13px', fontFamily: 'monospace'
        });
        document.body.appendChild(badge);
        const entry = {
            id, tag: el.tagName.toLowerCase(),
            type: el.type || '',
            text: (el.innerText || el.textContent || '').substring(0, 60).trim(),
            css: bestCSS(el),
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
        };
        if (el.name) entry.name = el.name;
        if (el.value) entry.val = el.value.substring(0, 40);
        if (el.placeholder) entry.ph = el.placeholder.substring(0, 40);
        if (el.required) entry.req = true;
        if (el.getAttribute('aria-label')) entry.aria = el.getAttribute('aria-label').substring(0, 40);
        if (el.href) entry.href = el.href.substring(0, 60);
        if (el.checked !== undefined) entry.checked = el.checked;
        if (el.tagName === 'SELECT') {
            entry.options = Array.from(el.options).slice(0, 8).map(o => o.text.substring(0, 20));
        }
        if (el.getAttribute('role')) entry.role = el.getAttribute('role');
        mapped.push(entry);
        id++;
    }
    mapped.sort((a, b) => a.y - b.y || a.x - b.x);
    mapped.forEach((e, i) => e.id = i + 1);
    return mapped;
})()`;

const SOM_CLEANUP_SCRIPT = `document.querySelectorAll('.eterx-som-badge').forEach(el => el.remove())`;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SYSTEM PROMPT â€” The brain of the agent
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildSystemPrompt(memory: AgentMemory, currentDomain?: string, footprintContext?: string): string {
    const memoryContext = memory.generateMemoryContext(currentDomain);

    return `You are ETERX — an AGI-level Autonomous Browser Agent. You SEE the screen via screenshots, UNDERSTAND the page via DOM/SOM analysis, ACT precisely via tools, and VERIFY results. You can do ANYTHING a human can do in a browser.

## ABSOLUTE RULES
1. **DO, don't describe.** Every turn MUST call a tool. "Create form" = ACTUALLY create it. "Send email" = ACTUALLY send it.
2. **OBSERVE before ACT.** First turn on any new page: use \`read_page_content\` or \`analyze_page_structure\`. Never click blindly.
3. **VERIFY after ACT.** After submit/click: check page changed. Don't assume success.
4. **Never hallucinate.** All data (emails, URLs, prices) MUST come from the page.
5. **Never give up early.** Try 5+ approaches: click > find_and_click > evaluate_js > click_xy > navigate.
6. **ALWAYS explain reasoning.** In EVERY tool call, include a "reason" field with a brief conversational explanation of what you're doing and why, like: "I'll click the compose button to start drafting the email" or "I can see the search results, let me scroll down to find more relevant links". This reason is shown to the user in real-time.

## ELEMENT TARGETING (Use SOM data with CSS selectors, names, coords)
Priority: CSS selector > SOM ID > text match > name attribute > XY coordinates
- CSS: evaluate_js("document.querySelector('SELECTOR').click()")
- SOM ID: click({element_id: N})
- Text: find_and_click({text: "button text"})
- Name: batch_fill_form with field names
- XY: click_xy({x, y}) from SOM coords

## ⚡ ONE-SHOT SPEED — CRITICAL
When you can see ALL needed elements on the current screen, execute ALL actions at once:
- Use execute_action_plan with ALL steps as JSON array for fastest execution
- Use batch_fill_form to fill ALL form fields in ONE call
- Use execute_js_sequence for multiple JS operations in ONE call
- Use multi_action for parallel independent actions
NEVER waste turns doing one action at a time when you can batch. ONE screenshot → ALL actions → done.

## STRATEGIES

### SEARCH: navigate({url:"https://google.com/search?q=query"}) or type_text + Enter
### FORMS: read_page_content first. batch_fill_form for all fields. select_option for dropdowns. find_and_click("Submit").
### MULTI-PAGE: execute_action_plan for known sequences. Observe after each transition.
### DATA: read_page_content | read_table | map_full_page | extract_text
### COMPLEX: drag_drop | right_click | hover | press_key("Control+a") | scroll_to_text | file_upload

## TOOL REFERENCE
| Need | Tool |
|------|------|
| Fill form | batch_fill_form / find_and_click + type_text |
| Click | find_and_click / click / click_xy |
| Read page | read_page_content / map_full_page |
| Type | type_text (press_enter: true for search) |
| Dropdown | select_option |
| JavaScript | evaluate_js / execute_js_sequence |
| Wait | wait_for_text / wait_for_element |
| Navigate | navigate / go_back |
| Scroll | scroll / scroll_to_text / scroll_to_bottom |
| Multi-step | execute_action_plan |
| Extract | read_table / extract_text |
| **⚡ Fast search** | **fast_search (HTTP, ~500ms)** |
| **⚡ Fast read** | **fast_read (HTTP, ~200ms)** |
| **⚡ Parallel search** | **parallel_search (3 queries at once)** |
| **⚡ Parallel read** | **parallel_read (3 pages at once)** |
| **⚡ Fast research** | **fast_research (search + read ~2s)** |
| **⚡ Parallel exec** | **parallel_execute (JS on 3 sites at once)** |
| **User context** | **get_user_history / get_video_resume** |
| **Background actions** | **shadow_execute (ANY action) / shadow_search / shadow_read_page / shadow_fill_and_submit / shadow_read_emails** |

## 🔮 SHADOW AGENT — Universal Zero-Click Background Worker
You have a SHADOW AGENT that can do ANYTHING on ANY website silently in the background. It shares the user's login session (cookies, auth) so it can access Gmail, YouTube, GitHub, etc.

**shadow_execute is your UNIVERSAL tool — it can do ANYTHING:**
Navigate to ANY URL and run ANY JavaScript. You are NOT limited to predefined actions.
Examples of what you can do:
- Read Gmail: shadow_execute({url:"https://mail.google.com", script:"(() => [...document.querySelectorAll('tr.zA')].map(r => r.innerText).join('\\n'))"})
- Send email via Gmail compose: shadow_execute({url:"https://mail.google.com/mail/u/0/#inbox?compose=new", script:"..."})
- Check YouTube notifications: shadow_execute({url:"https://youtube.com", script:"..."})
- Read GitHub issues: shadow_execute({url:"https://github.com/user/repo/issues", script:"..."})
- Extract data from any dashboard: shadow_execute({url:"...", script:"..."})
- Fill and submit any form: shadow_fill_and_submit({url:"...", fields:{...}})

**Shortcut tools (faster for common tasks):**
- shadow_search: Google search results instantly
- shadow_read_page: Read full page content from any URL  
- shadow_research: Search + read top pages combined
- shadow_quick_answer: Instant factual answers
- shadow_read_emails: Gmail inbox summary
- shadow_fill_and_submit: Fill form + submit on any URL

The visible browser is NEVER touched. Use shadow tools whenever you need info or actions on other sites.

## DOMAIN STRATEGIES
For Gmail: Use shadow_read_emails for inbox, shadow_execute for compose/send
For YouTube: get_video_resume to check where user left off, then navigate
For Google Search: fast_search (HTTP) is 10x faster than navigating to google.com
For Research/Learning: Use fast_research for deep info (search + reads top 3 pages in ~2s)
For Shopping (Amazon, Flipkart): Use parallel_read to compare prices across sites
For GitHub/Dev: fast_read works perfectly for docs and code pages
For Forms/Registration: Use batch_fill_form + find_and_click for speed

## SPEED PRIORITY
For searches: fast_search (HTTP ~500ms) > shadow_search (browser ~5s) > navigate to Google
For page reads: fast_read (HTTP ~200ms) > shadow_read_page (browser ~3s) > read_page_content (current tab)
For multi-data: parallel_search/parallel_read > sequential calls
For user context: get_user_history FIRST before asking the user questions

## ERROR RECOVERY
Not found: scroll > different selector > evaluate_js. Click failed: find_and_click > click_xy > JS. Stuck 3 turns: different approach or task_failed.

## COMPLETION
task_complete ONLY when DONE + VERIFIED. "Do" tasks must be ACTUALLY done. Tried everything: task_failed with details.

${ memoryContext ? '\n## MEMORY\n' + memoryContext : '' }${ footprintContext || '' }`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COMPLEXITY CLASSIFIER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function classifyComplexity(goal: string): TaskComplexity {
    const lower = goal.toLowerCase();
    const complexSignals = ['create', 'make', 'build', 'write', 'compose', 'form', 'register', 'sign up',
        'fill', 'book', 'send', 'mail', 'email', 'research', 'compare', 'fill out', 'login', 'purchase', 'buy',
        'download', 'upload', 'multiple', 'all', 'every', 'scrape', 'collect', 'analyze', 'submit', 'order'];
    const mediumSignals = ['search', 'find', 'navigate', 'go to', 'open', 'look up', 'check', 'get'];

    if (complexSignals.some(s => lower.includes(s))) return 'complex';
    if (mediumSignals.some(s => lower.includes(s))) return 'medium';
    return 'simple';
}

function getMaxTurns(complexity: TaskComplexity): number {
    switch (complexity) {
        case 'simple': return 20;
        case 'medium': return 40;
        case 'complex': return 80;
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NEXT-GEN AGENT CLASS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class NextGenAgent {
    private config: NextGenAgentConfig;
    private registry: ToolRegistry;
    private memory: AgentMemory;
    private keyRotator: GeminiKeyRotator;
    private state: AgentState;
    private window: BrowserWindow | null = null;
    private activeWebContentsId: number | null = null;
    private chatSession: any = null;
    private isRunning: boolean = false;
    private _recentActionSignatures: string[] = [];
    private immuneMemory: ImmuneMemory;
    private agiPrefetch: any;
    private agiRouter: any;
    private agiSpeed: any;
    private agiSession: any;
    private agiDecomposer: any;
    private agiContext: any;
    private networkOracle: NetworkOracle;
    private templateLibrary: TemplateLibrary;
    // OneShotPlanner removed — agent uses reactive loop with execute_action_plan for fast one-shot-per-screen execution
    private causalModel: CausalWebModel;
    private skillVault: SkillVault;
    private skillComposer: SkillComposer;
    private workLoop: AutonomousWorkLoop;

    constructor(apiKeys: string[]) {
        this.config = {
            apiKeys,
            defaultModel: 'gemini-2.5-flash',
            screenWidth: 1280,
            screenHeight: 720,
        };

        // Smart key rotator â€” manages 11 keys across 4 model tiers
        this.keyRotator = new GeminiKeyRotator(apiKeys);
        this.registry = new ToolRegistry();
        this.memory = new AgentMemory();
        // AGI Enhancements
        this.agiPrefetch = getSpeculativePrefetch();
        this.agiRouter = getSmartRouter();
        this.agiSpeed = getAdaptiveSpeed();
        this.agiSession = getSessionIntelligence();
        this.agiDecomposer = getTaskDecomposer();
        this.agiContext = getSmartContextBuilder();
        this.immuneMemory = new ImmuneMemory();
        this.networkOracle = new NetworkOracle();
        this.templateLibrary = new TemplateLibrary();
        this.causalModel = new CausalWebModel();
        // One-shot-per-screen: agent sees screen → execute_action_plan batches ALL actions → fast sequential execution
        this.skillVault = new SkillVault();
        this.skillComposer = new SkillComposer(this.skillVault);
        this.workLoop = new AutonomousWorkLoop();

        // Register all 90+ tools
        registerAllBrowserTools(this.registry);

        this.state = {
            status: 'idle',
            currentTask: '',
            logs: [],
            turnCount: 0,
            maxTurns: 30,
            toolsUsed: [],
        };

        const stats = this.registry.getStats();
        console.log(`[NextGenAgent] ✅ Initialized with ${ stats.total } tools (${ stats.enabled } enabled)`);
        console.log(`[NextGenAgent] 📊 Tools by category: `, stats.byCategory);
        console.log(`[NextGenAgent] 🔑 Key Rotator: ${ apiKeys.length } keys, model chain: ${ this.keyRotator.getModelChain().join(' → ') }`);

        // Store API key for shadow sub-agent access
        if (apiKeys.length > 0) {
            this.memory.setVariable('gemini_api_key', apiKeys[0]);
        }
    }

    // ——————————————————————————————————————————————————————————————————————————
    // PUBLIC API
    // ——————————————————————————————————————————————————————————————————————————

    public setTargetWindow(win: BrowserWindow): void {
        this.window = win;
    }

    public setActiveWebContentsId(id: number): void {
        this.activeWebContentsId = id;
    }

    public getState(): AgentState {
        return { ...this.state };
    }

    public async executeObjective(task: string, options?: { zeroClickMode?: boolean }): Promise<void> {
        if (this.isRunning) {
            this.stop();
            await new Promise(r => setTimeout(r, 500));
        }

        const zeroClick = options?.zeroClickMode ?? false;
        this.isRunning = true;
        const complexity = classifyComplexity(task);
        const maxTurns = getMaxTurns(complexity);

        this.state = {
            status: 'running',
            currentTask: task,
            logs: [],
            turnCount: 0,
            maxTurns,
            toolsUsed: [],
        };

        this.memory.startNewTask(task);
        this.log(`ðŸš€ Task: "${ task }" | Complexity: ${ complexity } | Budget: ${ maxTurns } turns${ zeroClick ? ' | âš¡ ZERO-CLICK MODE' : '' }`);
        this.updateStatus('running');

        try {
            // ═══ TEMPLATE FAST-PATH: Check cached plans for known workflows ═══
            if (this.activeWebContentsId) {
                const domain = this.getCurrentDomain() || '';
                const cached = this.templateLibrary.findMatch(task, domain);
                if (cached) {
                    this.log('📦 Template hit! Executing cached plan (0 AI calls)...');
                    const executor = new TaskExecutor(this.activeWebContentsId, (msg, type) => this.log(msg, type as any));
                    const result = await executor.execute(cached);
                    if (result.status === 'complete') {
                        this.log(`✅ Template: ${ result.steps_completed }/${ result.steps_total } steps in ${ result.total_duration_ms }ms`);
                        this.state.turnCount = result.steps_total;
                        return; // Done — zero AI calls!
                    }
                    this.log('⚠️ Template incomplete, falling back to reactive loop...');
                }
            }

            // ═══ SHADOW TASK ROUTING: If task mentions shadow/delegate, use shadow tools directly ═══
            const taskLower = task.toLowerCase();
            const isShadowTask = ['shadow', 'delegate', 'zero-click', 'zero click', 'background agent'].some(w => taskLower.includes(w));
            if (isShadowTask) {
                this.log('🔮 Shadow task detected — routing to shadow agent (no visible browser interaction)...');
                try {
                    const ctx = this.createToolContext();
                    let shadowResult: any;

                    // Extract the actual task from "Delegate to shadow agent: ACTUAL TASK"
                    const actualTask = task.replace(/^.*?(shadow\s*agent|delegate|zero.?click)\s*:?\s*/i, '').trim() || task;

                    if (['email', 'gmail', 'inbox', 'mail'].some(w => taskLower.includes(w))) {
                        // Email task → use shadow_read_emails
                        this.log('📧 Routing to shadow_read_emails...');
                        shadowResult = await this.registry.execute('shadow_read_emails', { max_emails: 15 }, ctx);
                        this.state.toolsUsed.push('shadow_read_emails');
                    } else if (['search', 'find', 'look up', 'lookup', 'google'].some(w => taskLower.includes(w)) && !taskLower.includes('http')) {
                        // Search task → use shadow_search
                        this.log('🔍 Routing to shadow_search...');
                        shadowResult = await this.registry.execute('shadow_search', { query: actualTask }, ctx);
                        this.state.toolsUsed.push('shadow_search');
                    } else if (taskLower.match(/https?:\/\/|www\.|\.com|\.org|\.net/) || ['read', 'check', 'get', 'open'].some(w => taskLower.includes(w) && taskLower.includes('.'))) {
                        // URL-based task → use shadow_read_page
                        const urlMatch = task.match(/https?:\/\/[^\s]+|www\.[^\s]+/);
                        const url = urlMatch ? urlMatch[0] : actualTask;
                        this.log('📄 Routing to shadow_read_page...');
                        shadowResult = await this.registry.execute('shadow_read_page', { url }, ctx);
                        this.state.toolsUsed.push('shadow_read_page');
                    } else if (['research', 'deep search', 'investigate'].some(w => taskLower.includes(w))) {
                        // Research task → use shadow_research
                        this.log('🔬 Routing to shadow_research...');
                        shadowResult = await this.registry.execute('shadow_research', { query: actualTask, depth: 3 }, ctx);
                        this.state.toolsUsed.push('shadow_research');
                    } else {
                        // Complex task → delegate to AI-powered shadow sub-agent
                        this.log('🧠 Routing to shadow_agent_task (AI sub-agent)...');
                        // Inject footprint context for smart delegation
                        let delegateContext = '';
                        try {
                            const { getUserFootprint } = await import('./UserFootprint.js');
                            const fp = getUserFootprint();
                            const recent = fp.getRecentHistory(3);
                            const loggedIn = fp.getLoggedInSites();
                            if (recent.length > 0) delegateContext += 'Recent pages: ' + recent.map(p => p.title).join(', ') + '. ';
                            if (loggedIn.length > 0) delegateContext += 'Logged in: ' + loggedIn.join(', ') + '.';
                        } catch (_) { }
                        shadowResult = await this.registry.execute('shadow_agent_task', { task: actualTask, context: delegateContext }, ctx);
                        this.state.toolsUsed.push('shadow_agent_task');
                    }

                    // Report shadow result
                    const resultStr = typeof shadowResult === 'string' ? shadowResult : JSON.stringify(shadowResult, null, 2).substring(0, 3000);
                    this.log(`✅ Shadow task complete: ${ resultStr.substring(0, 200) }...`, 'action');

                    if (this.window && !this.window.isDestroyed()) {
                        this.window.webContents.send('agent:result', {
                            success: true,
                            type: 'shadow',
                            data: shadowResult,
                        });
                        this.window.webContents.send('gemini:response', `🔮 **Shadow Agent Result:**\n\`\`\`json\n${ resultStr }\n\`\`\``);
                    }
                    this.updateStatus('idle');
                    return; // Done — shadow task complete
                } catch (shadowError: any) {
                    this.log(`⚠️ Shadow routing failed: ${ shadowError.message }, falling back to reactive loop...`, 'error');
                    // Fall through to reactive loop
                }
            }

            // ═══ REACTIVE LOOP: See screen → decide ALL actions → execute → repeat ═══
            // The agent uses execute_action_plan to batch all visible-screen actions in one call
            // AGI: TASK DECOMPOSITION — Break complex goals into sub-tasks
            const taskPlan = this.agiDecomposer.generatePlanContext(task);
            if (taskPlan) {
                this.log('📋 AGI: Complex task decomposed into sub-tasks');
                this.memory.recordObservation('Task Plan: ' + taskPlan);
            }
            this.agiSpeed.reset();

            await this.reactLoop(task, maxTurns, zeroClick);
        } catch (error: any) {
            this.log(`âŒ Critical: ${ error.message } `, 'error');
            this.updateStatus('error');
        } finally {
            this.isRunning = false;
            if (this.state.status !== 'stopped') {
                this.updateStatus('idle');
            }
            // Save episode
            this.memory.saveEpisode({
                goal: task,
                success: this.state.status !== 'error',
                duration: this.memory.getTaskDuration(),
                turnCount: this.state.turnCount,
                toolsUsed: [...new Set(this.state.toolsUsed)],
                domain: this.getCurrentDomain(),
                timestamp: Date.now(),
            });
        }
    }

    public stop(): void {
        this.isRunning = false;
        this.updateStatus('stopped');
        this.log('ðŸ›‘ Stopped by user.');
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ReAct LOOP â€” The Core Intelligence
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private async reactLoop(goal: string, maxTurns: number, zeroClick: boolean = false): Promise<void> {
        // Reset rotator to primary model for each new task
        this.keyRotator.resetToDefault();
        let currentKeyIndex = 0;
        let lastUrl = '';
        let stuckEscapeLevel = 0;
        let rateLimitedLastTurn = false; // Guard for stuck detection during rate-limit turns

        const createSession = async (modelOverride?: string, history?: any[]) => {
            const client = this.keyRotator.getClient();
            currentKeyIndex = client.keyIndex;
            const modelName = modelOverride || client.model;
            const currentDomain = this.getCurrentDomain();
            // Load user footprint context for AGI-level awareness
            let footprintContext = '';
            try {
                const { getUserFootprint } = await import('./UserFootprint.js');
                footprintContext = getUserFootprint().getFootprintContext();
            } catch (_) { }
            const systemPrompt = buildSystemPrompt(this.memory, currentDomain, footprintContext);

            const model = client.genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
                tools: [{ functionDeclarations: this.registry.toGeminiFunctionDeclarations() as any }],
            });

            return history
                ? model.startChat({ history })
                : model.startChat({
                    history: [{ role: 'user', parts: [{ text: `OBJECTIVE: ${ goal }\n\nBegin by analyzing the current page state. Use fast tools (fast_search, fast_read) for speed. Use your context tools (get_user_history) if you need user browsing context. Prefer parallel tools when doing multiple operations.` }] }]
                });
        };

        this.chatSession = await createSession();
        let consecutiveErrors = 0;
        let planFailureCount = 0; // Track execute_action_plan failures for fallback
        let lastTurnWasPlanSuccess = false; // Skip heavy analysis after plan success
        let lastUpdateTurn = 0; // For context trimming

        while (this.state.turnCount < maxTurns && this.isRunning) {
            this.state.turnCount++;
            this.memory.incrementTurn();
            const turn = this.state.turnCount;
            // Context window trimming - every 10 turns, recreate session with last 6 messages
            if (turn > 1 && turn % 10 === 0) {
                try {
                    const hist = await this.chatSession.getHistory();
                    // SMART TRIM: Keep first message (objective) + last 5 most informative messages
                    const first = hist[0]; // Always keep objective
                    const rest = hist.slice(1);
                    // Prioritize recent messages but keep any with errors/completions
                    const trimmedHist = [first, ...rest.slice(-5)];
                    this.chatSession = await createSession(undefined, trimmedHist);
                    this.log('Context trimmed: ' + hist.length + ' -> ' + trimmedHist.length + ' messages');
                } catch (e) {
                    this.log('Context trim failed, continuing with full history');
                }
            }

            this.log(`â”€â”€ Turn ${ turn }/${ maxTurns } â”€â”€`);

            // Send turn start to UI
            if (this.window && !this.window.isDestroyed()) {
                this.window.webContents.send('agent:step', { type: 'turn_start', turn, maxTurns, url: lastUrl });
            }

            // Get active webContents â€” auto-recover if tab was destroyed
            if (!this.activeWebContentsId) {
                this.log('â³ No active tab yet, waiting...');
                await new Promise(r => setTimeout(r, 1000));
                if (!this.activeWebContentsId) {
                    this.log('âš ï¸ No active tab after wait.', 'error');
                    continue; // Try next turn â€” main.ts may update the ID
                }
            }
            let wc = webContents.fromId(this.activeWebContentsId);
            if (!wc || wc.isDestroyed()) {
                this.log('â³ Tab changed â€” waiting for new webview...');
                // Wait up to 2s for main.ts to update activeWebContentsId
                for (let i = 0; i < 8; i++) {
                    await new Promise(r => setTimeout(r, 250));
                    wc = this.activeWebContentsId ? webContents.fromId(this.activeWebContentsId) : undefined;
                    if (wc && !wc.isDestroyed()) break;
                }
                if (!wc || wc.isDestroyed()) {
                    this.log('âš ï¸ Tab still unavailable, retrying next turn...', 'error');
                    rateLimitedLastTurn = true; // Don't count for stuck detection
                    continue;
                }
                this.log('âœ… Reconnected to new tab.');
            }

            // â•â•â• FAST AUTO-WAIT (never blocks more than 600ms) â•â•â•
            let pageLoadState = 'unknown';
            try {
                pageLoadState = await wc.executeJavaScript('document.readyState');
                if (pageLoadState === 'loading') {
                    this.log(`â³ DOM loading... quick wait...`);
                    await new Promise<void>(resolve => {
                        const timer = setTimeout(resolve, 600);
                        const checkInterval = setInterval(async () => {
                            try {
                                const state = await wc.executeJavaScript('document.readyState');
                                if (state !== 'loading') { clearInterval(checkInterval); clearTimeout(timer); resolve(); }
                            } catch (_) { clearInterval(checkInterval); clearTimeout(timer); resolve(); }
                        }, 100);
                    });
                }
            } catch (_) { }

            // â•â•â• URL CHANGE DETECTION â•â•â•
            // SAFE: wc.getURL with crash protection
            let currentUrl = '';
            try { currentUrl = wc.getURL(); } catch (_) { this.log('Tab destroyed mid-turn', 'error'); continue; }
            const urlChanged = currentUrl !== lastUrl;
            lastUrl = currentUrl;

            if (urlChanged && turn > 1) {
                this.log('ðŸ”€ URL changed â€” auto-analyzing new page...');
                stuckEscapeLevel = 0; // Reset stuck counter on URL change
                // Start network oracle capture on new page
                try { await this.networkOracle.startCapture(wc); } catch (_) { }
            }

            this.memory.setCurrentUrl(currentUrl);

            // â•â•â• AUTO PAGE ANALYSIS â•â•â•
            // On first turn or URL change, automatically read the page structure
            let autoPageAnalysis = '';
            if (turn === 1 || urlChanged) {
                try {
                    const analysis = await wc.executeJavaScript(`(() => {
                        const title = document.title;
                        const h1 = document.querySelector('h1')?.innerText?.trim() || '';
                        const mainText = (document.querySelector('main, article, [role="main"]') || document.body).innerText.substring(0, 3000);
                        const forms = document.querySelectorAll('form').length;
                        const inputs = document.querySelectorAll('input:not([type="hidden"]),textarea,select').length;
                        const buttons = document.querySelectorAll('button,[role="button"],input[type="submit"]').length;
                        const links = document.querySelectorAll('a[href]').length;
                        const iframes = document.querySelectorAll('iframe').length;
                        const images = document.querySelectorAll('img').length;
                        const hasSearch = !!document.querySelector('input[type="search"], input[name="q"], input[name="query"], input[placeholder*="earch"]');
                        const hasLogin = !!document.querySelector('input[type="password"], form[action*="login"], form[action*="signin"]');
                        const hasCaptcha = !!document.querySelector('.g-recaptcha, .h-captcha, .cf-turnstile, iframe[src*="recaptcha"], iframe[src*="hcaptcha"]');
                        const hasPopup = !!document.querySelector('[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"], [role="dialog"]');
                        const hasCookieBanner = !!document.querySelector('[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"]');
                        const scrollable = document.body.scrollHeight > window.innerHeight;
                        const scrollPct = Math.round((window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100);
                        return JSON.stringify({title, h1, mainText, stats: {forms, inputs, buttons, links, iframes, images}, signals: {hasSearch, hasLogin, hasCaptcha, hasPopup, hasCookieBanner, scrollable, scrollPct}});
                    })()`);
                    autoPageAnalysis = analysis;
                    this.log(`ðŸ“Š Auto-analysis: ${ JSON.stringify(JSON.parse(analysis).stats) }`);

                    // Auto-inject stealth on sites known to have anti-bot
                    const parsed = JSON.parse(analysis);
                    if (parsed.signals.hasCaptcha) {
                        this.log('ðŸ›¡ï¸ CAPTCHA detected â€” auto-injecting stealth...');
                        const domain = this.getCurrentDomain();
                        if (domain) this.memory.recordCaptchaDetection(domain, 'recaptcha_v2');
                        try {
                            await wc.executeJavaScript(`(() => {
                                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                                Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
                                window.chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
                            })()`);
                        } catch (_) { }
                    }

                    // Auto-dismiss popups/cookie banners
                    if (parsed.signals.hasPopup || parsed.signals.hasCookieBanner) {
                        this.log('ðŸ§¹ Auto-dismissing popups/banners...');
                        try {
                            await wc.executeJavaScript(`(() => {
                                // Cookie consent
                                const cookieBtns = ['button[id*="accept"]', 'button[class*="accept"]', 'button[class*="agree"]', 'button[aria-label*="Accept"]', 'a[id*="accept"]', '[data-testid*="accept"]', 'button[id*="consent"]'];
                                for (const sel of cookieBtns) {
                                    const btn = document.querySelector(sel);
                                    if (btn && btn.offsetParent !== null) { btn.click(); break; }
                                }
                                // Close modals
                                const closeBtns = ['[class*="modal"] [class*="close"]', '[role="dialog"] [class*="close"]', 'button[aria-label="Close"]', 'button[class*="dismiss"]'];
                                for (const sel of closeBtns) {
                                    const btn = document.querySelector(sel);
                                    if (btn && btn.offsetParent !== null) { btn.click(); }
                                }
                                // Restore scroll
                                if (document.body.style.overflow === 'hidden') document.body.style.overflow = '';
                            })()`);
                        } catch (_) { }
                    }
                } catch (e: any) {
                    autoPageAnalysis = '{"error": "analysis failed"}';
                }
            }

            // â•â•â• OBSERVE: Capture vision + DOM â•â•â•
            this.log('ðŸ‘“ Capturing viewport + DOM...');

            // Inject Set-of-Mark annotations
            let somElements: any[] = [];
            try {
                somElements = await wc.executeJavaScript(SOM_INJECT_SCRIPT);
            } catch (e: any) {
                this.log(`âš ï¸ SOM injection failed: ${ e.message }`, 'error');
            }

            // Minimal render pause
            await new Promise(r => setTimeout(r, 20));

            // Screenshot
            let screenshotBase64: string | null = null;
            try {
                const image = await wc.capturePage();
                const resized = image.resize({ width: 900 });
                screenshotBase64 = resized.toJPEG(this.agiSpeed.getScreenshotQuality()).toString('base64');
            } catch (e) {
                this.log('âš ï¸ Screenshot failed.', 'error');
            }

            // AGI: Speculative prefetch — pre-fetch pages agent might navigate to
            try {
                const nextUrls = this.agiPrefetch.predictNextUrls(somElements, goal);
                if (nextUrls.length > 0) this.agiPrefetch.prefetchUrls(nextUrls);
            } catch (_) { }

            // AGI: Session intelligence — detect login state on first turn / URL change
            if ((turn === 1 || urlChanged) && wc) {
                try {
                    const loginState = await this.agiSession.detectLoginState(wc);
                    if (loginState.loggedIn) {
                        this.log('\u{1F511} Logged in' + (loginState.user ? ' as ' + loginState.user : ''));
                    }
                } catch (_) { }
            }

            // Clean up SOM badges immediately
            try { await wc.executeJavaScript(SOM_CLEANUP_SCRIPT); } catch (_) { }

            if (!screenshotBase64) {
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            // Track screenshot hash for stuck detection
            // BUT: Only record hash if last turn was NOT a rate-limit error
            // Rate-limit turns don't perform actions so the page SHOULD look the same
            const hash = crypto.createHash('md5').update(screenshotBase64.substring(0, 1000)).digest('hex');
            if (!rateLimitedLastTurn) {
                this.memory.recordScreenshotHash(hash);
            }
            rateLimitedLastTurn = false; // Reset for this turn

            // â•â•â• PROGRESSIVE STUCK ESCAPE â•â•â•
            // Only trigger stuck detection after 5 identical screenshots (not 3)
            if (this.memory.isStuck(5)) {
                stuckEscapeLevel++;
                if (stuckEscapeLevel === 1) {
                    this.log('ðŸ”„ Stuck Level 1: Trying evaluate_js fallback...', 'action');
                    this.memory.recordObservation('Stuck L1: Page unchanged for 5 turns. Try: evaluate_js, fast_search, or navigate to a different URL.');
                } else if (stuckEscapeLevel === 2) {
                    this.log('ðŸ”„ Stuck Level 2: Refreshing page...', 'action');
                    this.memory.recordObservation('Stuck L2: JS fallback failed. Refreshing page.');
                    try { wc.reload(); await new Promise(r => setTimeout(r, 800)); } catch (_) { }
                    continue;
                } else if (stuckEscapeLevel >= 3) {
                    this.log('ðŸ”„ Stuck Level 3: Must try completely different approach!', 'error');
                    this.memory.recordObservation('Stuck L3: All escape attempts failed. Need totally different approach or give up.');
                }
            } else {
                stuckEscapeLevel = Math.max(0, stuckEscapeLevel - 1);
            }

            // â•â•â• BUILD CONTEXT MESSAGE â•â•â•
            const recentActions = this.memory.getRecentActionsSummary(4);
            const domInfo = somElements.slice(0, this.agiSpeed.getSOMLimit()).map((el: any) => {
                let line = `[${ el.id }] <${ el.tag }${ el.type ? ' type=' + el.type : '' }>`;
                if (el.css) line += ` css="${ el.css }"`;
                if (el.name) line += ` name=${ el.name }`;
                if (el.text) line += ` "${ el.text.substring(0, 40) }"`;
                if (el.ph) line += ` ph="${ el.ph }"`;
                if (el.val) line += ` val="${ el.val }"`;
                if (el.req) line += ` [REQ]`;
                if (el.aria) line += ` aria="${ el.aria }"`;
                if (el.href) line += ` href=${ el.href.substring(0, 50) }`;
                if (el.checked !== undefined) line += ` checked=${ el.checked }`;
                if (el.options) line += ` options=[${ el.options.join('|') }]`;
                if (el.role) line += ` role=${ el.role }`;
                line += ` @(${ el.x },${ el.y })`;
                return line;
            }).join('\n');

            // Build rich warning messages
            let warnings = '';
            if (stuckEscapeLevel >= 1) {
                warnings += `\nâš ï¸ STUCK ALERT (Level ${ stuckEscapeLevel }/3): Page has NOT changed. You MUST try a COMPLETELY DIFFERENT approach NOW.`;
                if (stuckEscapeLevel >= 2) warnings += ` Use evaluate_js, navigate to a different URL, or call task_failed.`;
                if (stuckEscapeLevel >= 3) warnings += ` LAST CHANCE â€” if this doesn't work, call task_failed.`;
                warnings += '\n';
            }
            if (turn > maxTurns * 0.8) {
                warnings += `\nâ° RUNNING LOW ON TURNS (${ maxTurns - turn } left). Wrap up or call task_complete/task_failed.\n`;
            }

            // Page analysis section (only on new pages)
            const pageAnalysisSection = autoPageAnalysis ? `\n## PAGE_ANALYSIS_AUTO\n${ autoPageAnalysis }\n` : '';

            // Self-reflection injection every 5 turns
            let reflectionPrompt = '';
            if (turn > 0 && turn % 5 === 0) {
                const uniqueTools = [...new Set(this.state.toolsUsed)].length;
                reflectionPrompt = `\n## ðŸªž SELF-REFLECTION (Turn ${ turn })
PAUSE and reflect before your next action:
1. What progress have I made toward: "${ goal }"?
2. Am I stuck or making real progress?
3. What's the FASTEST path to completion from here?
4. Should I change my approach entirely?
5. Am I wasting turns on ineffective actions?
You have used ${ uniqueTools } different tools so far. Make this turn count.\n`;
            }

            // Goal progress context
            const goalContext = `GOAL: "${ goal }"`;

            const zeroClickDirective = zeroClick ? `
âš¡ ZERO-CLICK MODE ACTIVE â€” Use batch_fill_form, execute_js_sequence, find_and_click, auto_type_and_submit INSTEAD of clicking individual elements. Execute directly via JS. Be FAST and PRECISE.` : '';

            // Action plan directive â€” gets stronger over turns
            let actionPlanDirective = '';
            if (planFailureCount >= 2) {
                actionPlanDirective = `\nâš ï¸ execute_action_plan has FAILED ${ planFailureCount } times. Use individual tools: click, type_text, find_and_click instead.\n`;
            } else if (turn >= 5) {
                actionPlanDirective = `\nðŸš€ SPEED WARNING: You've used ${ turn } turns. Use \`execute_action_plan\` NOW with ALL remaining steps as a JSON array. Example:
execute_action_plan({ steps: [{"action":"type_into","target":"field_label","text":"value","clear":true}, {"action":"click_text","text":"Button"}, {"action":"wait","ms":500}] })
This executes ALL steps in ONE call (microseconds) instead of wasting more turns.\n`;
            } else if (turn >= 3) {
                actionPlanDirective = `\nâš¡ TIP: If you know your next 3+ steps, use \`execute_action_plan\` with ALL steps as JSON array. It's 10x faster.\n`;
            }

            const siteDirective = getSiteDirective(currentUrl);

            // Harvest network oracle data and get immune memory tips
            try { await this.networkOracle.harvest(wc); } catch (_) { }
            const networkContext = this.networkOracle.getContextSummary(3);
            const immunePreventions = this.immuneMemory.scan({ tool: 'all', domain: this.getCurrentDomain() || '' });
            const immuneContext = immunePreventions.length > 0 ? `\n## Immune Tips\n${ immunePreventions.join(', ') }\n` : '';

            // Smart page context: detect forms, page type, and provide structured hints
            let pageTypeHint = '';
            try {
                const formDetect = somElements.filter((el: any) => ['input', 'textarea', 'select'].includes(el.tag));
                if (formDetect.length > 0) {
                    const inputs = formDetect.filter((el: any) => el.tag === 'input' || el.tag === 'textarea');
                    const selects = formDetect.filter((el: any) => el.tag === 'select');
                    const emptyFields = inputs.filter((el: any) => !el.val);
                    const requiredFields = formDetect.filter((el: any) => el.req);
                    const hasSubmit = somElements.some((el: any) =>
                        (el.tag === 'button' || el.type === 'submit') &&
                        /submit|sign|log|send|create|save|next|continue/i.test(el.text || '')
                    );

                    pageTypeHint = `\n## 📋 PAGE INTELLIGENCE\nFORM DETECTED: ${ inputs.length } inputs, ${ selects.length } selects, ${ emptyFields.length } empty, ${ requiredFields.length } required${ hasSubmit ? ', submit button FOUND' : ', NO submit button visible' }`;

                    if (emptyFields.length > 0) {
                        const fieldList = emptyFields.slice(0, 8).map((f: any) =>
                            `  → ${ f.name || f.ph || f.aria || `${ f.tag }[${ f.type }]` }${ f.req ? ' [REQUIRED]' : '' } @(${ f.x },${ f.y })`
                        ).join('\n');
                        pageTypeHint += `\nEMPTY FIELDS TO FILL:\n${ fieldList }`;
                        pageTypeHint += `\n💡 TIP: Use batch_fill_form({fields:{${ emptyFields.slice(0, 5).map((f: any) => `"${ f.name || f.ph || f.aria || f.type }":"value"`).join(',') }}) to fill all at once.`;
                    }
                }
            } catch (_) { }

            // AGI: Smart context — extraction + navigation hints
            let extractionContext = '';
            let routerHints = '';
            try { routerHints = this.agiRouter.getRoutingHints(); } catch (_) { }
            let navHints = '';
            try {
                extractionContext = this.agiContext.buildExtractionContext(somElements, goal);
                navHints = this.agiContext.buildNavigationHints(currentUrl, somElements);
            } catch (_) { }

            const contextMessage = `${ goalContext }
CURRENT URL: ${ currentUrl }
PAGE STATE: ${ pageLoadState } | TURN: ${ turn }/${ maxTurns }${ zeroClickDirective }${ actionPlanDirective }${ siteDirective }
${ warnings }${ reflectionPrompt }${ pageTypeHint }${ pageAnalysisSection }${ networkContext }${ immuneContext }${ routerHints }
## Interactive Elements (SOM IDs — css selectors, names, coords included)
${ domInfo || 'No interactive elements detected.' }

## Recent Actions
${ recentActions }

${ extractionContext }${ navHints }

Analyze the screenshot and take the next best action toward the goal.`;

            // THINK + PLAN + ACT: Send to Gemini
            try {
                this.log(`ðŸ§  Thinking [${ this.keyRotator.getCurrentModel() }]...`);
                const startTime = Date.now();

                const result = await this.chatSession.sendMessage([
                    { inlineData: { mimeType: 'image/jpeg', data: screenshotBase64 } },
                    { text: contextMessage }
                ]);

                // Record successful API call
                this.keyRotator.recordSuccess(currentKeyIndex);

                const latency = Date.now() - startTime;
                this.log(`â±ï¸ Inference: ${ (latency / 1000).toFixed(2) }s`);

                const allFunctionCalls = result.response.functionCalls() || [];

                if (allFunctionCalls.length > 0) {
                    // â•â•â• MULTI-ACTION EXECUTION: Process ALL function calls in one turn â•â•â•
                    const functionResponses: any[] = [];
                    let shouldBreak = false;

                    for (const functionCall of allFunctionCalls) {
                        if (shouldBreak) break;
                        const { name, args } = functionCall;
                        this.log(`âš¡ ${ name }(${ JSON.stringify(args).substring(0, 120) })`, 'action');
                        this.state.toolsUsed.push(name);

                        // Send structured step to UI
                        if (this.window && !this.window.isDestroyed()) {
                            // Reasoning text
                            if (args.reason) {
                                this.window.webContents.send('agent:step', { type: 'thought', text: args.reason, turn, model: this.keyRotator.getCurrentModel() });
                            }
                            // Build human-readable detail
                            let detail = '';
                            if (args.url) detail = args.url;
                            else if (args.text && name.includes('type')) detail = `"${ (args.text || '').substring(0, 50) }"`;
                            else if (args.query) detail = args.query;
                            else if (args.target) detail = args.target;
                            else if (args.element_id !== undefined) detail = `element #${ args.element_id }`;
                            else if (args.task) detail = args.task;
                            else if (args.direction) detail = args.direction;
                            else if (args.selector) detail = args.selector;
                            else if (args.key) detail = args.key;
                            else if (args.steps) detail = `${ Array.isArray(args.steps) ? args.steps.length : '?' } steps`;
                            this.window.webContents.send('agent:step', { type: 'action', tool: name, detail, turn, url: currentUrl });
                        }

                        const toolCtx = this.createToolContext();
                        const _toolStart = Date.now();
                        // SAFE: urlBefore with crash protection
                        let urlBefore = '';
                        try { urlBefore = wc.getURL(); } catch (_) { }
                        // TOOL_TIMEOUT + AUTO_RETRY: 60s timeout + 1 retry on transient failures
                        let toolResult: any;
                        for (let _attempt = 0; _attempt < 2; _attempt++) {
                            toolResult = await Promise.race([
                                this.registry.execute(name, args, toolCtx),
                                new Promise<any>(r => setTimeout(() => r({ success: false, error: 'Tool timed out after 60s' }), 60000))
                            ]);
                            // Retry on transient errors (timeout, network)
                            if (toolResult.error && _attempt === 0 && (
                                toolResult.error.includes('timed out') ||
                                toolResult.error.includes('net::') ||
                                toolResult.error.includes('ECONNREFUSED') ||
                                toolResult.error.includes('ETIMEDOUT')
                            )) {
                                this.log(`  ↻ Retrying ${ name } (transient error)...`);
                                await new Promise(r => setTimeout(r, 500 * (_attempt + 1))); // Backoff
                                continue;
                            }
                            break;
                        }
                        this.log(`  â†’ ${ JSON.stringify(toolResult).substring(0, 150) }`);

                        // Send result to UI
                        if (this.window && !this.window.isDestroyed()) {
                            this.window.webContents.send('agent:step', { type: 'result', tool: name, success: !!toolResult.success, error: toolResult.error, turn });
                        }

                        // Quick inline verification (no extra JS calls, just URL check)
                        if (toolResult.success && ['click', 'click_by_text', 'navigate'].includes(name)) {
                            try {
                                const urlAfter = wc.getURL();
                                if (urlAfter !== urlBefore) {
                                    toolResult._verification = `[URL changed: ${ urlAfter }]`;
                                }
                            } catch (_) { }
                        }

                        // Failed action suggestions
                        if (toolResult.error) {
                            const alts: Record<string, string> = {
                                'click': 'Try: find_and_click, evaluate_js, or scroll first.',
                                'type_text': 'Try: batch_fill_form or evaluate_js.',
                                'navigate': 'Try: smart_search for URL.',
                            };
                            if (alts[name]) toolResult._suggestion = alts[name];
                            // Immune Memory: learn from failure
                            this.immuneMemory.learnFromFailure({
                                tool: name, args, error: toolResult.error,
                                url: currentUrl, domain: this.getCurrentDomain() || ''
                            });
                        }

                        // Action loop detection
                        const actionSig = `${ name }:${ JSON.stringify(args) }`;
                        if (!this._recentActionSignatures) this._recentActionSignatures = [];
                        this._recentActionSignatures.push(actionSig);
                        if (this._recentActionSignatures.length > 5) this._recentActionSignatures.shift();
                        const repeats = this._recentActionSignatures.filter((s: string) => s === actionSig).length;
                        if (repeats >= 3) {
                            toolResult._loopWarning = `[LOOP: ${ name } repeated ${ repeats }x. Try DIFFERENT approach.]`;
                            this.memory.recordObservation(`Loop: ${ name } repeated ${ repeats }x`);
                        }

                        // Track plan failures for fallback
                        if (name === 'execute_action_plan') {
                            if (toolResult.failed > 0 || toolResult.error) {
                                planFailureCount++;
                                this.log(`ðŸ“‹ Action plan: ${ toolResult.completed || 0 }/${ toolResult.total || 0 } steps done, ${ toolResult.failed || 'error' } failed (attempt ${ planFailureCount })`, 'error');
                            } else {
                                planFailureCount = 0; // Reset on success
                                this.log(`ðŸ“‹ âœ… Action plan: ${ toolResult.completed }/${ toolResult.total } steps completed!`, 'action');
                            }
                            // Visual feedback to UI
                            if (this.window && !this.window.isDestroyed()) {
                                this.window.webContents.send('gemini:thought', `ðŸ“‹ Action Plan: ${ toolResult.summary || toolResult.error || 'executed' }`);
                            }
                        }

                        // Record in memory
                        this.memory.recordAction({ tool: name, args, result: toolResult, timestamp: Date.now(), url: currentUrl, screenshotHash: hash });

                        functionResponses.push({ functionResponse: { name, response: { content: toolResult } } });

                        // Terminal tool check
                        if (this.registry.isTerminal(name)) {
                            if (name === 'task_complete') {
                                const goalLower = goal.toLowerCase();
                                const readWords = ['read', 'check', 'get', 'find', 'search', 'shadow', 'delegate', 'look', 'see', 'show', 'list', 'what', 'tell'];
                                const isReadTask = readWords.some(w => goalLower.includes(w));
                                const actionWords = ['send', 'create', 'register', 'fill', 'book', 'submit', 'sign up', 'buy', 'purchase', 'compose', 'write', 'post', 'upload', 'download', 'order'];
                                const isActionTask = actionWords.some(w => goalLower.includes(w)) && !isReadTask;
                                const interactionToolsUsed = this.state.toolsUsed.filter(t =>
                                    ['click', 'type_text', 'click_by_text', 'fill_form_smart', 'select_option', 'press_key', 'click_and_wait', 'find_and_click', 'batch_fill_form', 'auto_type_and_submit', 'execute_js_sequence', 'read_page_content', 'evaluate_js', 'navigate', 'shadow_search', 'shadow_read_page', 'shadow_read_emails', 'shadow_execute', 'shadow_agent_task', 'shadow_research', 'shadow_fill_and_submit', 'execute_action_plan', 'scroll_to_text', 'click_xy', 'fast_search', 'fast_read', 'parallel_search', 'parallel_read', 'get_user_history'].includes(t)
                                ).length;

                                if (isActionTask && interactionToolsUsed < 2 && turn < maxTurns - 2) {
                                    this.log(`âš ï¸ PREMATURE COMPLETION BLOCKED â€” only ${ interactionToolsUsed } interactions`, 'error');
                                    functionResponses[functionResponses.length - 1] = {
                                        functionResponse: {
                                            name, response: {
                                                content: { error: 'COMPLETION REJECTED. Only ' + interactionToolsUsed + ' interactions done. KEEP WORKING on: "' + goal + '"' }
                                            }
                                        }
                                    };
                                    break; // Break inner loop, continue outer
                                }
                            }
                            this.log(`âœ… Task ${ toolResult.success ? 'completed' : 'failed' }: ${ toolResult.outcome || toolResult.reason || '' }`, 'action');
                            // Send completion to UI
                            if (this.window && !this.window.isDestroyed()) {
                                this.window.webContents.send('agent:step', { type: toolResult.success ? 'done' : 'error', text: toolResult.outcome || toolResult.reason || '', turn });
                            }
                            if (toolResult.success) {
                                const ctx = this.memory.getWorkingContext();
                                this.memory.learnProcedure(goal, ctx.actions, this.getCurrentDomain());
                            }
                            shouldBreak = true;
                        }
                    }

                    // Send ALL function responses back at once (batched)
                    if (functionResponses.length > 0) {
                        try {
                            await this.chatSession.sendMessage(functionResponses);
                        } catch (sendErr: any) {
                            this.log(`Send function responses failed: ${ sendErr.message }`, 'error');
                            // Recreate session if send fails (context corrupted)
                            try {
                                const hist = await this.chatSession.getHistory();
                                this.chatSession = await createSession(undefined, hist.slice(-6));
                            } catch (_) {
                                this.chatSession = await createSession();
                            }
                        }
                    }

                    if (shouldBreak) break;
                    consecutiveErrors = 0;
                } else {
                    // Text-only response (thought)
                    // SAFE: text response extraction
                    let thought = '';
                    try { thought = result.response.text() || ''; } catch (_) { thought = '[no text response]'; }
                    this.log(`ðŸ’­ ${ thought.substring(0, 200) }`);
                    this.memory.recordThinking(thought);

                    if (this.window && !this.window.isDestroyed()) {
                        this.window.webContents.send('gemini:thought', thought);
                    }
                }

            } catch (error: any) {
                const msg = (error.message || '').toLowerCase();

                // â”€â”€ TIER 1: Model not found (404) â†’ instant skip to next model â”€â”€
                if (msg.includes('not found') || msg.includes('404') || msg.includes('not supported')) {
                    this.log(`âš ï¸ Model "${ this.keyRotator.getCurrentModel() }" not available. Skipping...`, 'error');
                    const nextModel = this.keyRotator.forceNextModel();
                    if (nextModel) {
                        try {
                            const oldHistory = await this.chatSession.getHistory();
                            const client = this.keyRotator.getClient();
                            currentKeyIndex = client.keyIndex;
                            this.chatSession = await createSession(client.model, oldHistory);
                            this.log(`â­ï¸ Switched to model: ${ client.model }, Key: ${ client.keyIndex }`);
                        } catch (_) {
                            const client = this.keyRotator.getClient();
                            currentKeyIndex = client.keyIndex;
                            this.chatSession = await createSession(client.model);
                            this.log(`â­ï¸ New session with model: ${ client.model }`);
                        }
                        rateLimitedLastTurn = true; // Don't count as stuck
                        continue; // Don't count as consecutive error
                    } else {
                        this.log('âŒ All models exhausted. No fallback available.', 'error');
                        break;
                    }
                }

                // â”€â”€ TIER 2: Rate limit (429) â†’ smart wait + rotate key â”€â”€
                if (msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('overloaded') || msg.includes('exhausted') || msg.includes('too many')) {
                    this.keyRotator.recordRateLimit(currentKeyIndex);
                    rateLimitedLastTurn = true;
                    const status = this.keyRotator.getStatusSummary();
                    this.log(`âš ï¸ Rate limited. ${ status }`, 'error');

                    // Smart wait: if all keys cooling, wait briefly then switch
                    const waitTime = this.keyRotator.getWaitTimeMs();
                    if (waitTime > 0 && waitTime < 8_000) {
                        this.log(`⏳ Keys cooling. Waiting ${ Math.ceil(waitTime / 1000) }s...`);
                        await new Promise(r => setTimeout(r, waitTime + 200));
                    }

                    const client = this.keyRotator.getClient();
                    currentKeyIndex = client.keyIndex;

                    try {
                        const oldHistory = await this.chatSession.getHistory();
                        this.chatSession = await createSession(client.model, oldHistory);
                        this.log(`ðŸ”„ Session restored. Model: ${ client.model }, Key: ${ client.keyIndex }`);
                    } catch (_) {
                        this.chatSession = await createSession(client.model);
                        this.log(`ðŸ”„ New session (history lost). Model: ${ client.model }, Key: ${ client.keyIndex }`);
                    }
                    // Don't count rate limits as consecutive errors
                    continue;
                }

                // â”€â”€ TIER 3: Other errors â†’ standard backoff â”€â”€
                consecutiveErrors++;
                this.keyRotator.recordError(currentKeyIndex);
                this.log(`âš ï¸ Error: ${ error.message }`, 'error');
                if (consecutiveErrors >= 5) { // Increased from 3 to 5
                    this.log('âŒ Too many consecutive errors. Stopping.', 'error');
                    break;
                }
                await new Promise(r => setTimeout(r, 2000));
            }

            // Speed: No blanket throttle â€” rate-limit handler has its own smart wait
        }

        if (this.state.turnCount >= maxTurns) {
            this.log(`â° Turn budget exhausted (${ maxTurns } turns).`);
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // HELPERS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private createToolContext(): ToolContext {
        const wc = this.activeWebContentsId ? webContents.fromId(this.activeWebContentsId) : null;
        return {
            webContents: (wc && !wc.isDestroyed()) ? wc : null,
            window: this.window,
            activeWebContentsId: this.activeWebContentsId,
            screenWidth: this.config.screenWidth,
            screenHeight: this.config.screenHeight,
            log: (msg: string, type?: 'info' | 'error' | 'action') => this.log(msg, type as any),
            sendToRenderer: (channel: string, ...args: any[]) => {
                if (this.window && !this.window.isDestroyed()) {
                    this.window.webContents.send(channel, ...args);
                }
            },
            executeTool: (name: string, args: any) => this.registry.execute(name, args, this.createToolContext()),
            humanDelay: (min?: number, max?: number) => this.humanDelay(min, max),
            memory: {
                get: (key: string) => this.memory.getVariable(key),
                set: (key: string, val: any) => this.memory.setVariable(key, val),
            },
        };
    }

    private log(message: string, type: 'info' | 'error' | 'action' = 'info'): void {
        const entry = `[NextGenAgent] ${ message }`;
        console.log(entry);
        this.state.logs.push(entry);
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('agent:log', entry);
        }
    }

    private updateStatus(status: AgentState['status']): void {
        this.state.status = status;
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('agent:status', status);
        }
    }

    private async humanDelay(min: number = 200, max: number = 600): Promise<void> {
        const delay = min + Math.random() * (max - min);
        await new Promise(r => setTimeout(r, delay));
    }

    private getCurrentDomain(): string | undefined {
        try {
            if (!this.activeWebContentsId) return undefined;
            const wc = webContents.fromId(this.activeWebContentsId);
            if (!wc || wc.isDestroyed()) return undefined;
            return new URL(wc.getURL()).hostname;
        } catch {
            return undefined;
        }
    }
}
