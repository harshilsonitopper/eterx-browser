/**
 * SiteFingerprint.ts — Domain-specific execution tips for known sites
 * 
 * Detects site patterns from URL and returns tips for the agent
 * to interact efficiently with that specific site.
 */

export function getSiteDirective(url: string): string {
    const u = url.toLowerCase();

    if (u.includes('docs.google.com/forms')) {
        return '\nSITE: GOOGLE FORMS - type_into target="Untitled form"/"Question" + click_text "Add question". Ctrl+A before typing. contenteditable divs.';
    }
    if (u.includes('docs.google.com/spreadsheets') || u.includes('sheets.google.com')) {
        return '\nSITE: GOOGLE SHEETS - click_xy on cells then type. Tab=right, Enter=down. fill_table for bulk data.';
    }
    if (u.includes('mail.google.com') || u.includes('gmail.com')) {
        return '\nSITE: GMAIL - click_text "Compose". type_into for To/Subject/Body. click_text "Send" or Ctrl+Enter.';
    }
    if (u.includes('docs.google.com/document')) {
        return '\nSITE: GOOGLE DOCS - Click body to focus, type. Ctrl+A=select, Ctrl+B=bold.';
    }
    if (u.includes('github.com')) {
        return '\nSITE: GITHUB - click_text "New issue", type_into title/body, click_text "Submit new issue".';
    }
    if (u.includes('notion.so') || u.includes('notion.site')) {
        return '\nSITE: NOTION - contenteditable blocks. "/" for slash commands. Click to focus.';
    }
    if (u.includes('calendar.google.com')) {
        return '\nSITE: GOOGLE CALENDAR - click_text for day/time slots. type_into for event details. click_text "Save".';
    }
    if (u.includes('drive.google.com')) {
        return '\nSITE: GOOGLE DRIVE - click_text "New" for uploads/folders. Right-click context menus via evaluate_js.';
    }
    if (u.includes('linkedin.com')) {
        return '\nSITE: LINKEDIN - Posts: click_text "Start a post". Profile: scroll-heavy, use scroll_to_text. Messages: click_text "Messaging".';
    }
    if (u.includes('twitter.com') || u.includes('x.com')) {
        return '\nSITE: X/TWITTER - Posts: use contenteditable div in compose. click_text "Post". DMs: click_text "Messages".';
    }
    if (u.includes('amazon.') || u.includes('flipkart.') || u.includes('shopify.')) {
        return '\nSITE: E-COMMERCE - Search bar: type_and_enter. Product pages: scroll for details. Cart: click_text "Add to Cart".';
    }
    if (u.includes('youtube.com')) {
        return '\nSITE: YOUTUBE - Search: type_and_enter in search box. Videos: click thumbnail. Comments: scroll down first.';
    }

    return '';
}

/**
 * TaskJSON Schema — One-Shot JSON Brain architecture
 * Used for deterministic task execution with zero additional AI calls
 */

export interface TaskJSON {
    schema_version: string;
    task_id: string;
    task_intent: string;
    target_domain: string;
    estimated_steps: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    requires_human_approval: string[];
    parameters: Record<string, any>;
    context_hints: Record<string, string>;
    steps: TaskStep[];
    fallback_strategies: Record<string, FallbackStrategy>;
    success_criteria: SuccessCriteria;
    template_signature: string;
}

export interface TaskStep {
    step_id: string;
    label: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    action: {
        type:
        // Navigation
        | 'navigate' | 'go_back' | 'reload' | 'wait_for_navigation'
        // Click actions
        | 'click' | 'click_text' | 'click_nth' | 'double_click_text' | 'click_xy' | 'hover_text' | 'right_click'
        // Text input
        | 'type' | 'type_and_enter' | 'select_all_type' | 'clear_field' | 'append_text'
        // Form actions
        | 'fill_form_all' | 'select_option' | 'check_box' | 'uncheck_box' | 'submit_form' | 'set_value' | 'upload_file'
        // Keyboard
        | 'press_key' | 'hotkey' | 'key_combo'
        // Scrolling
        | 'scroll' | 'scroll_to_text' | 'scroll_to_element' | 'scroll_to_top' | 'scroll_to_bottom'
        // Waiting
        | 'wait' | 'wait_for_text' | 'wait_for_element' | 'wait_for_url'
        // Data extraction
        | 'read_table' | 'extract_text' | 'count_elements' | 'screenshot'
        // Table & bulk
        | 'fill_table' | 'drag_drop' | 'multi_select' | 'sort_table'
        // Control flow
        | 'loop' | 'if_text_exists' | 'goto_step'
        // Assertions & verification
        | 'assert_text_exists' | 'assert_element_exists' | 'verify'
        // JavaScript injection
        | 'js' | 'inject_js'
        // Targeted
        | 'focus' | 'blur' | 'select_text' | 'copy_text'
        // Tab/Window
        | 'new_tab' | 'close_tab' | 'switch_tab'
        // Misc
        | 'dismiss_dialog' | 'accept_dialog' | 'set_cookie' | 'clear_cookies' | 'zoom';
        target: TargetStrategy;
        value?: string;
        timing: TimingConfig;
    };
    expected_state: ExpectedState;
    on_success: string;
    on_failure: FailureHandler;
    glass_box: GlassBoxStep;
}

export interface TargetStrategy {
    primary: string;       // "semantic:Submit button" or "url:https://..."
    fallback_1?: string;   // "[aria-label*=submit]"
    fallback_2?: string;   // "attention_field:0.85" (vision-based)
    emergency?: string;    // "network:POST /api/submit -> 200"
}

export interface TimingConfig {
    wait_for: 'network_idle' | 'dom_stable' | 'element_appears' | 'custom_signal';
    timeout_ms: number;
    poll_interval_ms: number;
}

export interface ExpectedState {
    url_contains?: string;
    element_present?: string;
    element_absent?: string;
    network_response?: { url_pattern: string; status: number };
    text_visible?: string;
}

export interface FailureHandler {
    retry_count: number;
    retry_strategy: 'same_action' | 'alternate_target' | 'scroll_and_retry';
    then: string;               // "execute_fallback:f_name" or "skip" or "abort"
    escalate_after_retries: 'human_handoff' | 'skip' | 'abort' | 'alternate_path';
}

export interface FallbackStrategy {
    description: string;
    actions: Array<{ type: string; target?: string; direction?: string; amount?: number; wait_for?: string; message?: string }>;
    then: string;           // "retry_from:s01" or "retry_current_step"
}

export interface SuccessCriteria {
    primary: string;
    secondary?: string;
    network?: { url_pattern: string; method: string; status: number };
}

export interface GlassBoxStep {
    show_in_ui: boolean;
    label_for_human: string;
    pause_before_execute: boolean;
    highlight_element: boolean;
}

/**
 * Immune Memory — Failure pattern antibodies
 * From BeyondHuman Architecture System 04
 */
export interface Antibody {
    id: string;
    trigger_pattern: string;       // Semantic description of when this applies
    failure_type: string;          // Error class: 'element_not_found' | 'navigation_failed' | etc.
    prevention_action: string;     // What to do to prevent: 'scroll_first' | 'wait_500ms' | 'use_js_click'
    domain: string;                // Which domain this was learned from
    confidence: number;            // 0-1, how reliable this antibody is
    hit_count: number;             // How many times this antibody prevented a failure
    created_at: number;
    last_used: number;
}

/**
 * Skill Definition — From SkillFabric Architecture
 * A complete, self-contained, reusable unit of capability
 */
export interface SkillDefinition {
    skill_id: string;
    version: string;
    name: string;
    domain: string;
    category: string;
    description: string;
    trigger_patterns: string[];
    required_inputs: Record<string, { type: string; description: string; default?: any }>;
    execution_plan: TaskJSON;
    success_criteria: SuccessCriteria;
    glass_box: { risk_level: string; human_preview_before: string[]; show_draft_to_human: boolean };
    composability: {
        accepts_output_from: string[];
        provides_output_to: string[];
    };
    performance: {
        avg_execution_ms: number;
        success_rate: number;
        fallback_rate: number;
        last_optimized: string;
        execution_count: number;
    };
    metadata: {
        generated_by: string;
        generated_at: string;
        last_validated: string;
        tags: string[];
    };
}
