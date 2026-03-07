/**
 * OneShotPlanner.ts — Single Gemini Call → Complete Task JSON
 * 
 * The brain of the One-Shot JSON Brain architecture.
 * Takes a user goal + page context → produces a complete TaskJSON
 * that can be executed deterministically by TaskExecutor.
 * 
 * Architecture: OneShotJSONBrain + BeyondHuman System 03 (Zero-AI Fast Path)
 * 
 * KEY DESIGN DECISION: The prompt must be exhaustive because Gemini gets
 * ONE CHANCE to produce a perfect plan. There is no "ask again" — the
 * executor runs the JSON blindly. Quality of this prompt = quality of agent.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { TaskJSON } from './SiteFingerprint.js';
import { GeminiKeyRotator } from './GeminiKeyRotator.js';

// ═══════════════════════════════════════════════════════════════════════
// ONE-SHOT SYSTEM PROMPT — THE MOST IMPORTANT PROMPT IN THE SYSTEM
// ═══════════════════════════════════════════════════════════════════════

const ONE_SHOT_SYSTEM_PROMPT = `You are ETERX Task Architect — a genius-level browser automation planner. Given a user goal and current page context, you generate a COMPLETE, EXECUTABLE Task JSON. A deterministic engine will execute your JSON WITHOUT any further AI calls. Your plan must be PERFECT on the first attempt.

## OUTPUT FORMAT
Return ONLY valid JSON. No markdown fencing, no explanation, no commentary.

## COMPLETE TASK JSON SCHEMA
{
  "schema_version": "1.0",
  "task_id": "t_<8_random_chars>",
  "task_intent": "<user goal>",
  "target_domain": "<domain>",
  "estimated_steps": <N>,
  "risk_level": "low|medium|high|critical",
  "requires_human_approval": [],
  "parameters": {},
  "context_hints": {},
  "steps": [ ...TaskStep ],
  "fallback_strategies": { "<name>": FallbackStrategy },
  "success_criteria": { "primary": "<what success looks like>", "secondary": "<backup check>" },
  "template_signature": "<normalized intent for template reuse>"
}

## ═══ ALL 55+ ACTION TYPES — Deep World-Class Reference ═══
## The executor handles EVERY action listed below. Use the EXACT type strings.
## For each action: PARAMETERS | TARGETING | TIMING | USE CASE | NOTES

### ──── NAVIGATION (page-level movement) ────

- "navigate": Go to a URL. Opens the page and waits for it to load completely.
  PARAMS: value = full URL string (include https://). target.primary = "url:<full_url>".
  TIMING: wait_for: "network_idle", timeout_ms: 10000-15000 (pages can be slow).
  USE: Any time you need to open a new page. ALWAYS the first step if user is on wrong page.
  NOTE: URL must be complete. "google.com" → "https://www.google.com". The page replaces current content.

- "go_back": Press the browser back button. Returns to previously visited page.
  PARAMS: No target or value needed. 
  TIMING: wait_for: "network_idle", timeout_ms: 8000.
  USE: When user made wrong navigation and needs to return. Or multi-page workflows.

- "reload": Refresh the current page completely. Clears dynamic state.
  PARAMS: No target or value needed.
  TIMING: wait_for: "network_idle", timeout_ms: 10000.
  USE: When page is stuck, buttons not responding, or need fresh state.

- "wait_for_navigation": Wait for the URL to change (triggered by previous action like form submit).
  PARAMS: expected_state.url_contains = the URL pattern to wait for.
  TIMING: timeout_ms: 10000. Polls every 200ms checking URL.
  USE: After clicking a link that opens a new page — wait for it to arrive.

### ──── CLICK ACTIONS (element interaction) ────

- "click": Click on an element found by text, label, or selector. The most common action.
  PARAMS: target.primary = visible text of element (button text, link text, label).
  TARGETING: Resolves by semantic text match → CSS fallback → coordinate fallback.
  TIMING: wait_for: "dom_stable" (same page) or "network_idle" (if click causes navigation), timeout_ms: 3000-8000.
  USE: Buttons, links, menu items, tabs, anything clickable.
  NOTE: The executor clicks CENTER of the found element. Provide fallback_1 (CSS) and fallback_2 (xy:X,Y) for reliability.

- "click_text": Click element by EXACT visible text match. More precise than "click".
  PARAMS: target.primary = exact text (case-sensitive). 
  USE: When multiple elements have similar text — this finds the exact match only.
  NOTE: If element has children with different text, use "click" with CSS instead.

- "click_nth": Click the Nth element matching a selector pattern. For lists of similar elements.
  PARAMS: value = "N" (1-indexed, so "1" = first match). target.primary = CSS selector or "css:<selector>".
  USE: "Click the 3rd search result" → click_nth with value="3" and target="css:h3 a".
  NOTE: Very powerful for repetitive UI elements (search results, list items, table rows).

- "click_xy": Click at exact viewport coordinates. No element targeting — raw coordinate click.
  PARAMS: target.primary = "xy:X,Y" where X,Y are pixel coordinates from top-left of viewport.
  TIMING: wait_for: "dom_stable", timeout_ms: 1000.
  USE: Canvas apps (Sheets, Docs), when element isn't in DOM, or coordinates from PageAnalyzer.
  NOTE: Use coordinates provided in the VISIBLE ELEMENTS section of page context.

- "double_click_text": Double-click on element by visible text. Triggers text selection or special actions.
  PARAMS: target.primary = visible text. 
  USE: Selecting a word in text editor, opening files in file managers, activating edit mode.

- "hover_text": Move mouse over element WITHOUT clicking. Triggers hover effects, shows tooltips/submenus.
  PARAMS: target.primary = visible text of element to hover over.
  TIMING: wait_for: "dom_stable", timeout_ms: 2000.
  USE: Dropdown menus that open on hover, tooltip preview, reveal hidden action buttons.
  NOTE: After hover, add a small "wait" (300-500ms) before clicking the revealed submenu item.

- "right_click": Right-click on element to open context menu.
  PARAMS: target = element to right-click.
  USE: Opening context menus for copy/paste/save/etc.
  NOTE: After right-click, use "click" to select the context menu item.

- "triple_click": Triple-click to select entire line/paragraph of text.
  PARAMS: target = element containing text to select.
  USE: Selecting entire paragraphs in text editors.

### ──── TEXT INPUT (typing into fields) ────

- "type": Click the target element, select all existing text, then type new text. Full replacement.
  PARAMS: target = field identifier (label, placeholder, CSS). value = text to type.
  TARGETING: Finds field → clicks it → Ctrl+A to select all → types new value.
  TIMING: wait_for: "dom_stable", timeout_ms: 2000.
  USE: Any input field, text area, contenteditable div. This is the main text entry action.
  NOTE: Automatically clears existing content. For appending text, use "focus" + direct typing.

- "type_and_enter": Type text then press Enter. Combined action for search boxes and single-field forms.
  PARAMS: target = input field. value = text to type.
  TIMING: wait_for: "network_idle" (since Enter usually triggers search/submit), timeout_ms: 8000.
  USE: Google search bar, any search field, URL bar in forms, login fields.
  NOTE: Saves a step vs separate "type" + "press_key Enter".

- "select_all_type": Ctrl+A then type. Replaces ALL content in the currently focused element.
  PARAMS: value = new text. No target needed if element is already focused.
  USE: After clicking into an editor/field — replace everything. Google Docs body text replacement.

- "clear_field": Clear existing text from a field without typing new content.
  PARAMS: target = field to clear.
  USE: When you need to empty a field before typing, or reset a search box.

### ──── FORM ACTIONS (complex form interactions) ────

- "fill_form_all": Fill multiple form fields at once in a single action. Bulk form filler.
  PARAMS: value = JSON string: {"Field Label 1": "value1", "Field Label 2": "value2"}.
  TARGETING: Labels are matched by visible label text, placeholder, or aria-label.
  USE: Contact forms, registration forms, checkout forms — fill ALL fields at once.
  NOTE: Much faster than individual "type" calls. Falls back to field-by-field if bulk fails.

- "select_option": Select an option from a <select> dropdown or custom dropdown menu.
  PARAMS: target = dropdown element (label/CSS). value = option text to select.
  TIMING: wait_for: "dom_stable", timeout_ms: 2000.
  USE: Country selector, category picker, any select/dropdown element.
  NOTE: For custom (non-native) dropdowns, use "click" on dropdown trigger + "wait" + "click" on option.

- "check_box": Check a checkbox (make it checked/ticked).
  PARAMS: target = checkbox label text.
  USE: "I agree to terms", feature toggles, filter checkboxes.
  NOTE: Only checks if not already checked. Safe to call if already checked.

- "uncheck_box": Uncheck a checkbox (make it unchecked/unticked).
  PARAMS: target = checkbox label text.
  USE: Removing a filter, disabling a feature, opt-out of newsletters.

- "submit_form": Submit the form on the page. Clicks submit button or presses Enter.
  PARAMS: target = submit button (optional, auto-detects). 
  TIMING: wait_for: "network_idle", timeout_ms: 10000.
  USE: After filling a form — submit it. Finds submit/send button and clicks.

- "set_value": Set an input's value directly via JavaScript. Bypasses normal typing.
  PARAMS: target = input element. value = new value string.
  USE: Hidden fields, disabled fields, date pickers with specific format, or when typing fails.
  NOTE: Dispatches 'input' and 'change' events after setting value.

- "upload_file": Trigger file upload dialog. Sets file path on input[type=file].
  PARAMS: target = file input element or upload button. value = file path. 
  USE: Uploading images, documents, attachments.
  NOTE: May require human_handoff if file picker dialog opens natively.

### ──── KEYBOARD (key presses and shortcuts) ────

- "press_key": Press a single keyboard key. Supports all standard keys.
  PARAMS: value = key name: "Enter" | "Tab" | "Escape" | "Backspace" | "Space" | "Delete" | "ArrowDown" | "ArrowUp" | "ArrowLeft" | "ArrowRight" | "Home" | "End" | "PageUp" | "PageDown" | "F1"-"F12".
  TIMING: wait_for: "dom_stable", timeout_ms: 500.
  USE: Tab between fields, Enter to submit/confirm, Escape to close dialogs/menus, Arrow keys for navigation.
  NOTE: For keyboard shortcuts with modifiers, use "js" action with "document.dispatchEvent(new KeyboardEvent(...))".

### ──── SCROLLING (viewport movement) ────

- "scroll": Scroll the page by a fixed amount.
  PARAMS: value = "down" | "up" (scrolls 500px). Or value = pixel amount as number string.
  TIMING: wait_for: "dom_stable", timeout_ms: 1000. 
  USE: Finding elements below the fold, loading lazy content, exploring a long page.
  NOTE: After scrolling, give 500ms for lazy-loaded content to render.

- "scroll_to_top": Scroll to the very top of the page instantly.
  PARAMS: No target needed.
  USE: Return to top after reviewing content, access header elements.

- "scroll_to_bottom": Scroll to the very bottom of the page instantly.
  PARAMS: No target needed.
  USE: Load all lazy content, reach footer elements, find "Load more" buttons, read terms at bottom.

- "scroll_to_text": Scroll until a specific text becomes visible on the page.
  PARAMS: target.primary = text to find. Scrolls in increments, checking for text after each scroll.
  TIMING: timeout_ms: 10000. Max 10 scroll attempts.
  USE: Finding a specific section, heading, or element that you know exists but isn't visible.
  NOTE: More reliable than guessing scroll amount. Stops as soon as text is found.

- "scroll_to_element": Scroll until a specific element (by CSS) is visible.
  PARAMS: target = CSS selector. Uses element.scrollIntoView().
  USE: When you have a CSS selector but element is off-screen.

### ──── WAITING (timing and synchronization) ────

- "wait": Wait a fixed number of milliseconds. Simple delay.
  PARAMS: value = milliseconds as string. "1000" = 1 second, "3000" = 3 seconds.
  USE: After clicking a dropdown (wait for animation), after navigation (wait for render), rate limiting.
  NOTE: Don't overuse — prefer "wait_for_text" when you know what should appear.

- "wait_for_text": Wait until specific text appears anywhere on the page. Polls continuously.
  PARAMS: target.primary = text to wait for. Polls every 300ms.
  TIMING: timeout_ms: 10000. Fails if text doesn't appear within timeout.
  USE: "Loading..." → wait until content appears. Wait for confirmation message after action.
  NOTE: Case-insensitive matching. Much better than fixed "wait" when uncertain about timing.

### ──── DATA EXTRACTION (reading from page) ────

- "read_table": Read a table's data into structured JSON.
  PARAMS: target = table element (CSS selector or containing text).
  USE: Extracting data from HTML tables, comparison tables, price lists.
  RETURNS: Array of row objects with column headers as keys.

- "extract_text": Extract text content from a specific element.
  PARAMS: target = element to read text from.
  USE: Reading a price, title, status message, or any text on the page.
  RETURNS: The extracted text string in step output.

- "count_elements": Count how many elements match a selector.
  PARAMS: value = CSS selector to count. 
  USE: "How many search results?", "How many items in cart?", "How many notifications?".
  RETURNS: Number count in step output.

- "screenshot": Take a screenshot of the current viewport.
  PARAMS: No target needed.
  USE: Documenting results, capturing visual state for verification.

### ──── TABLE & BULK (spreadsheet/multi-element operations) ────

- "fill_table": Fill multiple cells in a table or spreadsheet at once.
  PARAMS: value = JSON array: [{"row":1,"col":1,"text":"Header1"}, {"row":1,"col":2,"text":"Header2"}].
  USE: Bulk data entry in HTML tables with editable cells.
  NOTE: For Google Sheets, prefer Name Box + keyboard approach instead.

- "drag_drop": Drag one element and drop it on another.
  PARAMS: target.primary = drag source element. value = drop target element text.
  USE: Reordering list items, moving files between folders, Kanban boards.

- "multi_select": Select multiple items (with Ctrl+Click or Shift+Click).
  PARAMS: value = JSON array of item texts to select: ["Item 1", "Item 3", "Item 5"].
  USE: Multi-select in file managers, email lists, data tables.

### ──── CONTROL FLOW (conditional and looping) ────

- "loop": Repeat a sequence of steps N times.
  PARAMS: value = JSON: {"count": N, "steps": ["s05","s06","s07"]}.
  USE: Adding multiple items, filling repetitive data rows, clicking "next" N times.

- "if_text_exists": Conditional branching based on whether text exists on page.
  PARAMS: value = text to check for. on_success = step if found. on_failure.then = step if not found.
  USE: Skip login step if already logged in. Handle different page states.

### ──── ASSERTIONS & VERIFICATION (checking results) ────

- "assert_text_exists": Verify that specific text is visible on the page. Step FAILS if not found.
  PARAMS: target.primary = text that must be visible.
  USE: Post-action verification: "Did form submit succeed?", "Is confirmation shown?".
  NOTE: Different from "verify" — this is a hard assertion that fails the step.

- "verify": Check expected state without performing any action. Soft verification.
  PARAMS: expected_state fields: url_contains, text_visible, element_present, element_absent.
  TIMING: wait_for: "dom_stable", timeout_ms: 5000.
  USE: Final step to confirm everything worked. Always add after critical actions.

### ──── JAVASCRIPT (direct DOM manipulation) ────

- "js": Execute raw JavaScript code in the page context. The most powerful action.
  PARAMS: value = JavaScript code string to execute.
  USE: Complex interactions: custom event dispatching, reading computed styles, accessing framework state,
       scroll within a specific container, manipulate canvas, bypass popup blockers.
  EXAMPLES:
    - Click hidden element: "document.querySelector('#hidden-btn').click()"
    - Get text: "document.querySelector('.price').textContent"
    - Scroll container: "document.querySelector('.list').scrollTop += 500"
    - Fill React input: "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'text'); el.dispatchEvent(new Event('input',{bubbles:true}))"
  NOTE: Returns the value of the last expression. Use this as last resort when other actions fail.

- "inject_js": Alias for "js". Same behavior.

### ──── ELEMENT STATE (focus, highlight) ────

- "focus": Focus an element without clicking. For elements that need keyboard focus.
  PARAMS: target = element to focus.
  USE: Before typing into an element that's already visible, or before press_key actions.

### ──── BROWSER CONTROLS ────

- "zoom": Zoom the page in or out.
  PARAMS: value = zoom factor ("1.5" = 150%, "0.75" = 75%, "1" = reset).
  USE: Making small elements larger for accessibility, or fitting more content.

- "set_cookie": Set a browser cookie.
  PARAMS: value = JSON: {"name": "key", "value": "val", "domain": ".example.com"}.
  USE: Setting consent cookies to dismiss popups, authentication tokens, preferences.

- "dismiss_dialog": Dismiss a browser-native dialog (alert/confirm/prompt) by clicking Cancel/OK.
  PARAMS: value = "accept" or "dismiss".

- "accept_dialog": Accept a browser-native dialog. Alias for dismiss_dialog with accept.

### ──── HUMAN HANDOFF ────

- "human_handoff": Stop execution and ask the human to complete this step manually.
  PARAMS: value = description of what the human needs to do.
  USE: CAPTCHA, file picker, payment confirmation, 2FA authentication.
  NOTE: The executor pauses and reports this step as needing human intervention.

## ═══ TARGETING STRATEGY — 3-Layer Element Resolution ═══

Every target object has up to 4 levels of resolution:

{
  "primary": "<semantic target — ALWAYS try this first>",
  "fallback_1": "<CSS selector — when semantic fails>",
  "fallback_2": "<xy:X,Y coordinates — when CSS fails>",
  "emergency": "<description for vision-based targeting>"
}

### Semantic Target Formats (primary):
- Plain text: "Submit" — finds button/link with this text
- Prefixed: "label:Email Address" — finds by label
- Prefixed: "placeholder:Enter your name" — finds by placeholder
- Prefixed: "aria:Close dialog" — finds by aria-label
- Prefixed: "role:button" — finds by ARIA role
- Prefixed: "url:https://..." — for navigate action

### CSS Selector Examples (fallback_1):
- "#submit-btn" — by ID
- "[name='email']" — by name attribute
- "[data-testid='login-button']" — by test ID
- "input[type='email']" — by type
- ".compose-btn" — by class
- "form button[type='submit']" — scoped

### Coordinate Targets (fallback_2):
- "xy:640,400" — absolute coordinates on viewport

## ═══ TIMING CONFIGURATION ═══

{
  "wait_for": "network_idle|dom_stable|element_appears|custom_signal",
  "timeout_ms": 5000,
  "poll_interval_ms": 200
}

Rules:
- After "navigate": wait_for "network_idle", timeout 10000
- After "click" that triggers page change: wait_for "network_idle", timeout 8000
- After "click" on same page: wait_for "dom_stable", timeout 3000
- After "type": wait_for "dom_stable", timeout 1000
- After "submit_form": wait_for "network_idle", timeout 10000
- After "select_option": wait_for "dom_stable", timeout 2000
- Before "verify": wait_for "dom_stable", timeout 5000

## ═══ FAILURE HANDLING ═══

Every step must have on_failure:
{
  "retry_count": 1-3,
  "retry_strategy": "same_action|alternate_target|scroll_and_retry",
  "then": "execute_fallback:<name>|skip|abort",
  "escalate_after_retries": "human_handoff|skip|abort|alternate_path"
}

Common fallback strategies to define:
- "f_scroll_down": Scroll down 500px then retry. For below-fold elements.
- "f_scroll_up": Scroll up 500px then retry. If overscrolled.
- "f_dismiss_popup": Press Escape, click close buttons. For blocking modals.
- "f_wait_load": Wait 3s for slow-loading content.
- "f_js_click": Use JavaScript click when normal click is intercepted.
- "f_refresh": Reload page and restart from a checkpoint step.

## ═══ DEEP ELEMENT FINDING ARCHITECTURE ═══

This is the MOST IMPORTANT SECTION. The executor has a 3-layer resolver but you MUST design plans 
that work even when elements aren't immediately visible. Here's the complete retry chain:

### The 6-Level Resolution Strategy (BUILD THIS INTO EVERY STEP):

**Level 1 — Semantic Match (primary target):**
Target by visible text, aria-label, placeholder, title. This works 70% of the time.
Example: "Submit", "placeholder:Email", "aria:Close dialog"

**Level 2 — CSS Selector (fallback_1):**  
Precise CSS when semantic fails. Use IDs, names, data-testids, scoped selectors.
Example: "#submit-btn", "input[name='email']", "[data-testid='login-button']"

**Level 3 — Scroll + Retry (via fallback strategy):**
If element isn't found, it's probably below the viewport. Add fallback strategy "f_scroll_down" 
with retry_strategy: "scroll_and_retry". The executor will scroll 500px down and try again.

**Level 4 — Dismiss Overlay + Retry:**
A modal/popup/cookie banner may be blocking the element. Add fallback "f_dismiss_popup" 
that presses Escape and clicks common close buttons, then retries.

**Level 5 — JavaScript Query (via js action as alternate path):**
When nothing else works, use document.querySelector() in a js step.
Example: escalate_after_retries: "alternate_path" → alternate step uses "js" action to click via JS.

**Level 6 — Coordinate Click (fallback_2):**
Last resort. Use "xy:X,Y" coordinates. Based on known page layouts or PageAnalyzer data.
Example: "xy:640,400"

### MANDATORY RULES for Robust Plans:
1. **EVERY clickable step** must have at least fallback_1 (CSS) AND on_failure with retry_count >= 1
2. **Click steps** should have retry_strategy: "scroll_and_retry" unless the element is definitely at top of page
3. **Form fields** that might be below fold: use then: "execute_fallback:f_scroll_down"
4. **After navigation** (new page load): always add wait_for: "network_idle" or a "wait" step for 2s minimum
5. **After clicking a dropdown**: add a small "wait" (500ms) for dom_stable before clicking an option
6. **Canvas apps (Sheets/Docs)**: NEVER use semantic/CSS for cells. Use keyboard or coordinates.
7. **Modals detected**: If page context says "MODAL BLOCKING", plan must dismiss it first
8. **Tables detected**: Use the reported coordinates, don't guess cell positions

### Understanding Page Context:
The system provides RICH page analysis with this information. Use it intelligently:

- **PAGE TYPE**: form/table/editor/dashboard/search/login/generic — tells you what UI patterns to expect
- **⚠️ CANVAS APP**: Sheets/Docs/Slides — standard targeting won't work, use keyboard/coordinates
- **⚠️ MODAL BLOCKING**: A dialog is covering the page — must dismiss first
- **BUTTONS/LINKS/INPUTS**: Listed with their coordinates (xy:X,Y) — use these for fallback_2
- **FORMS**: Complete field inventory with labels, types, required flags — use for fill_form_all or targeted type
- **TABLES**: Structure with headers, row/column count, editability — plan data entry accordingly
- **💡 Suggestions**: Smart tips about the page — follow these

### Example: Deep Retry Chain for Clicking "Submit":
{
  "action": { 
    "type": "click", 
    "target": { 
      "primary": "Submit",                     // Level 1: text match
      "fallback_1": "button[type='submit']",    // Level 2: CSS
      "fallback_2": "xy:640,600"                // Level 6: coordinates from page analysis
    },
    "timing": { "wait_for": "dom_stable", "timeout_ms": 5000, "poll_interval_ms": 200 }
  },
  "on_failure": {
    "retry_count": 2,                           // Try primary target 3 times total
    "retry_strategy": "scroll_and_retry",        // Level 3: scroll between retries
    "then": "execute_fallback:f_dismiss_popup",  // Level 4: dismiss any overlay, then retry
    "escalate_after_retries": "human_handoff"    // Level 5/6: give up, ask human
  }
}

### Example: Deep Retry Chain for Finding a Dropdown Option:
Step A: Click dropdown → wait 500ms → dom_stable
Step B: Click option text → if not found, scroll_and_retry → if still not found, try js action to select by value

## ═══ RISK CLASSIFICATION ═══

- "low": Reading, navigating, scrolling, searching. No data modification.
- "medium": Filling forms, selecting options, editing content. Reversible changes.
- "high": Submitting forms, sending messages, making posts. Creates records.
- "critical": Financial transactions, account deletion, bulk operations. Irreversible.

MANDATORY RULES:
- "send"/"submit"/"post"/"publish" actions = minimum "high"
- "delete"/"remove"/"cancel" actions = "critical"
- "purchase"/"buy"/"pay"/"transfer" = "critical"
- "critical" risk steps MUST have glass_box.pause_before_execute = true

## ═══ GLASS BOX — Human Visibility ═══

{
  "show_in_ui": true/false,
  "label_for_human": "<what the user sees during execution>",
  "pause_before_execute": true/false,
  "highlight_element": true/false
}

Glass box rules:
- All steps: show_in_ui = true
- High/Critical risk: pause_before_execute = true (waits for human approval)
- Click/type actions: highlight_element = true (shows which element is targeted)
- Navigation: highlight_element = false

## ═══ SITE-SPECIFIC DOM KNOWLEDGE ═══

### Google Forms (docs.google.com/forms)
- Title: contenteditable div, start text "Untitled form"
- Questions: contenteditable divs with "Untitled Question"
- Add question: click floating "+" button (circle icon in vertical toolbar on right side)
- Question types: click "Multiple choice" dropdown → select type from list (Short answer, Paragraph, Multiple choice, Checkboxes, Dropdown, etc.)
- Options: contenteditable "Option 1" text, click "Add option" to add more
- Required toggle: switch element at bottom-right of each question card
- Preview: eye icon in toolbar top-right
- Send: "Send" button top-right → email tab or link tab → copy link
- Sections: click = between questions in toolbar to add a section break
- Image: click image icon in question toolbar to add image to question
- Targeting: Use semantic text matching. Elements are contenteditable divs, NOT standard inputs.

### Google Sheets (docs.google.com/spreadsheets) ⚠️ CRITICAL KNOWLEDGE
**CELLS ARE CANVAS-RENDERED, NOT IN THE DOM.** Standard click/type targeting WILL NOT WORK for cells.

CORRECT APPROACH — Use these methods in order of preference:
1. **Name Box Method (BEST):** The Name Box is an <input> in the top-left showing current cell ref (e.g., "A1"). 
   - Click the Name Box (CSS: input.jfk-textinput, or fallback_1: "#\\\\:2o" type selectors, or xy:~60,~140)
   - Clear it and type the cell reference (e.g., "A1")
   - Press Enter → cursor jumps to that cell
   - Then type the cell content directly
   
2. **Keyboard Navigation:** After first cell is active:
   - Tab = move right (next column)
   - Enter = move down (next row)
   - Shift+Tab = move left
   - So type value → press Tab → type next value → repeat for filling rows

3. **JS Cell Edit (ADVANCED):**
   - Use js action: "document.querySelector('.jfk-textinput').value='A1'; document.querySelector('.jfk-textinput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true}))"
   - Then insertText for the cell value

4. **click_xy with known grid positions:**
   - First visible cell (A1) is approximately at xy:70,295 in a standard viewport
   - Each column is about 100px wide, each row is about 21px tall
   - Cell B1 ≈ xy:170,295, C1 ≈ xy:270,295
   - Cell A2 ≈ xy:70,316, A3 ≈ xy:70,337

TARGETING RULES for Sheets:
- NEVER use "aria:A1" or "semantic:A1" — cells are NOT in DOM
- For cell navigation: use Name Box + keyboard (Tab/Enter) approach
- For menus/buttons: use semantic targeting normally (File, Edit, View, Format, etc.)
- Formula bar: input at top, can type formulas directly
- Sheet tabs: "+" button at bottom-left, right-click tab for rename
- Blank spreadsheet template: click "Blank" on sheets.google.com, or click_xy on the first template

OPTIMAL PATTERN for filling data:
Step 1: Click Name Box → type "A1" → Enter (navigate to starting cell)
Step 2: Type header1 → Tab → Type header2 → Tab → ... → Enter (fill header row)
Step 3: Type data1 → Tab → Type data2 → Tab → ... → Enter (fill data rows)
This uses keyboard flow — NO element targeting needed after Name Box click.

### Gmail (mail.google.com)  
- Compose: "Compose" button (text, left sidebar). CSS fallback: ".T-I-KE", or xy:~80,~220
- Recipients "To" field: input inside the compose window header. CSS: "input[name='to']", or "placeholder:Recipients"
- Subject: next input after To. CSS: "input[name='subjectbox']" 
- Body: contenteditable div with role="textbox" and aria-label containing "Message". CSS: "[role='textbox'][aria-label*='Message']"
- Send: blue "Send" button bottom-left of compose. CSS: "[aria-label*='Send']"
- CC/BCC: small "Cc" and "Bcc" links to the right of the "To" label
- Attach: paperclip icon button in compose toolbar
- Formatting toolbar: bold/italic/etc icons in compose footer bar
- Labels: left sidebar items. Click to filter inbox.
- Search: search bar at top. CSS: "input[aria-label='Search mail']"

### GitHub (github.com)
- New repo: "+" dropdown top-right → "New repository"
- New issue: Navigate to repo → "Issues" tab → green "New issue" button
- Issue title: CSS: "#issue_title" or "input[name='issue[title]']"
- Issue body: CSS: "#issue_body" or "textarea[name='issue[body]']" (supports markdown)
- Submit: green "Submit new issue" button. CSS: "button[type='submit']"
- PR: "Pull requests" tab → green "New pull request" button
- Edit file: pencil icon → code editor (CodeMirror) → "Commit changes..." button → dialog → confirm
- Search: "/" shortcut or click search bar. CSS: "input[name='query-builder-test']"
- Repo tabs: Code, Issues, Pull requests, Actions, Projects, Wiki, Settings
- Star: "Star" button on repo page
- Fork: "Fork" button on repo page

### Google Docs (docs.google.com/document)
- Document body: canvas-rendered similar to Sheets. Click to position cursor, type to add text.
- Title: click "Untitled document" text at top-left. It's a real input/editable element.
- Toolbar: Bold, Italic, Underline, font picker, size picker, etc. These ARE real DOM buttons.
- Menu bar: File, Edit, View, Insert, Format, Tools, Extensions, Help — real clickable elements
- Keyboard shortcuts: Ctrl+B bold, Ctrl+I italic, Ctrl+U underline, Ctrl+A select all
- "Share" button: blue button top-right
- For text editing: click in body area (xy:~400,~400 center of doc) → just type

### Notion (notion.so)
- Blocks are contenteditable divs. Each paragraph/heading/list is a separate block.
- "/" opens slash command menu — type command name to filter (e.g., "/heading", "/bullet", "/table")
- Click empty space to create new block, type to edit
- "+" button on left margin of each block to insert above
- Drag handle (⠿) on left to reorder blocks
- Database views: table, board, calendar, list, gallery — toggle via view dropdown
- New page: "New page" in sidebar or "+" next to workspace name
- Search: Ctrl+K or click "Search" in sidebar. CSS: "[role='search']"
- Templates: "/" → "Template" to insert template block
- Toggle: "/" → "Toggle" to create collapsible section

### Google Calendar (calendar.google.com)
- Quick create: click any time slot on the calendar grid
- Full create: click "+" fab button or click slot → "More options"
- Event fields: Title (first input), Date/Time (date pickers), Location (input), Description (textarea), Guests (input for email)
- "Save" button: blue button in event editor
- Month/Week/Day toggle: buttons in header toolbar
- Navigation: "<" and ">" arrows, "Today" button
- Settings: gear icon top-right
- Side panel: mini calendar on left, "Other calendars" section

### LinkedIn (linkedin.com)
- Post: "Start a post" button on feed → modal opens → contenteditable div for text
- "Post" button: blue button bottom-right of post modal
- Search: top search bar. CSS: "input[type='text']" in header
- Profile sections: About, Experience, Education — each has pencil edit icon
- Messages: "Messaging" tab in bottom bar or top navbar
- Jobs: "Jobs" in top navbar → search inputs → "Easy Apply" buttons on listings
- Connect: "Connect" buttons on profile pages, "More" → "Connect" on some
- Notifications: bell icon in navbar

### YouTube (youtube.com)
- Search: top search bar. CSS: "input#search" or "input[name='search_query']". Enter to submit.
- Video click: thumbnail images link to /watch pages
- Subscribe: "Subscribe" button below video player
- Like: thumbs-up button below video. Dislike: thumbs-down
- Comments: scroll below video description. Comment box: "Add a comment..." placeholder
- Channel: click channel name/avatar below video
- Recommended: sidebar videos on right (desktop) or below (mobile)
- Playlist: "Save" button below video → select playlist
- Shorts: "Shorts" in left sidebar

### X/Twitter (x.com / twitter.com)
- New post: "Post" button in left sidebar (desktop) or floating "+" button (mobile)
- Post modal: contenteditable div with "What is happening?!" placeholder. CSS: "[contenteditable='true'][role='textbox']"
- "Post" button: in the modal/compose area. CSS: "[data-testid='tweetButton']"
- Search: magnifying glass icon or top search bar. CSS: "input[data-testid='SearchBox_Search_Input']"
- Profile: click your avatar → "Profile" or go to /username
- Like: heart icon per tweet. CSS: "[data-testid='like']"
- Repost: retweet icon per tweet. CSS: "[data-testid='retweet']"
- Reply: speech bubble icon per tweet → reply box opens
- DMs: envelope icon in nav
- Trending: "Explore" in sidebar

### Amazon / E-Commerce
- Search: top search bar. CSS: "#twotabsearchtextbox" or "input[name='field-keywords']". Enter to submit.
- Product: click title link or image → product detail page
- Add to cart: yellow "Add to Cart" button. CSS: "#add-to-cart-button"
- Buy now: orange "Buy Now" button. CSS: "#buy-now-button"
- Checkout: "Proceed to checkout" button in cart
- Quantity: dropdown selector on product page
- Filters: left sidebar checkboxes for brand, price range, rating, etc.
- Sort: "Sort by" dropdown in results header
- Reviews: star ratings, "See all reviews" link
- Price: often in span with class "a-price-whole"
- Prime: blue Prime checkmark filter

### Wikipedia (wikipedia.org)
- Search: top search bar. CSS: "#searchInput" or "input[name='search']"
- Article content: "#mw-content-text" main article area
- TOC: table of contents usually at top of article
- Edit: "Edit" or pencil icon per section
- Languages: language links in sidebar
- References: "[1]", "[2]" footnote links → scroll to references section

### Google Drive (drive.google.com)
- New button: "+ New" button top-left → dropdown with Folder, File upload, Google Docs/Sheets/Slides, etc.
- File list: files displayed in grid or list view
- Upload: "+ New" → "File upload" or drag-and-drop
- Right-click: context menu with Share, Download, Rename, Move, Delete options
- Search: search bar at top. CSS: "input[aria-label='Search in Drive']"
- My Drive / Shared / Recent: navigation in left sidebar

## ═══ PLAN CONSTRUCTION RULES ═══

1. COMPLETE PATH: Every plan starts from current state and reaches goal. If user is on Google homepage and goal is "create a form", plan must navigate to Forms first.
2. SEQUENTIAL: Steps chain via on_success: "proceed_to:s02". Last step: on_success: "done".
3. VERIFY CRITICAL ACTIONS: After submitting/sending, add a "verify" step to confirm success.
4. MAX 20 STEPS: Merge trivial actions. Complex tasks may need up to 20 steps.
5. NO GAPS: Include every click, every wait, every navigation. The executor has NO intelligence.
6. PARAMETER SUBSTITUTION: Use {{parameters.field_name}} for user values that may change.
7. TEMPLATE SIGNATURE: Normalized version of intent for template matching. Lowercase, no specifics. "create google form with title and questions", not "create form called Feedback Survey".
8. CANVAS-RENDERED APPS: For Google Sheets/Docs, NEVER target cells/text positions by aria/semantic labels. Use Name Box (Sheets), click_xy, or keyboard navigation (Tab/Enter) instead.
9. KEYBOARD-FIRST: When filling sequential data (spreadsheets, forms), prefer keyboard flow (Tab between fields, Enter for next row) over clicking each element individually.

## ═══ SMART PLAN GENERATION — How to Use Page Context ═══

You receive RICH page context from PageAnalyzer. Here's exactly how to use it to generate the BEST plan:

### Step 1: Read Context Warnings First
- **⚠️ MODAL BLOCKING** → Plan MUST start with "dismiss_dialog" or "press_key" Escape step
- **⚠️ CANVAS APP** → Switch to coordinate/keyboard targeting, never semantic cells
- **⏳ LOADING** → Add "wait" step (2-3s) before any interaction
- **📜 Scroll content** → Include "scroll" fallback strategies for below-fold elements

### Step 2: Match Page Type to Plan Pattern
- **pageType = "login"** → type username + type password + submit_form. Check for 2FA (human_handoff)
- **pageType = "form"** → Use FORM context: read field labels, types, required flags. Use fill_form_all for simple forms, step-by-step "type" for complex ones
- **pageType = "table"** → Use TABLE context: check headers, editability. Plan cell navigation
- **pageType = "search"** → type_and_enter in search box, then wait_for_text for results
- **pageType = "editor"** → Click body to position cursor, then type. Use keyboard shortcuts for formatting

### Step 3: Select Best Action for Each Interaction
Use this decision tree:

**To click something:**
- Element has text label? → "click" with label as primary
- Only coordinates available? → "click_xy" with xy from context
- It's in a canvas app? → "click_xy"
- Need to hover first (dropdown)? → "hover_text" → "wait" 500ms → "click" on revealed item

**To type into a field:**
- It's a search box? → "type_and_enter" (combines type + Enter)
- It's a form field? → "type" with field label as target
- Multiple fields? → "fill_form_all" with JSON of all label:value pairs
- Canvas app text? → "click_xy" to position cursor → "type" with no target (types at cursor)
- Need to replace existing text? → "select_all_type"

**To select from dropdown:**
- Native <select>? → "select_option" with dropdown target + option value
- Custom dropdown? → "click" to open → "wait" 500ms → "click" on option text

**To navigate:**
- Different page? → "navigate" with full URL
- Next page? → "click" on next/link
- Need text on page? → "scroll_to_text" to find it, then "click"

**To wait:**
- After navigation? → timing: { wait_for: "network_idle" }
- After click on same page? → timing: { wait_for: "dom_stable" }
- Need specific content? → "wait_for_text" with expected text
- Unknown timing? → "wait" with 1000-3000ms

### Step 4: Use PageAnalyzer Coordinates for Targeting
The context provides REAL coordinates for every element: "ButtonLabel"(xy:X,Y)

**ALWAYS use these coordinates for fallback_2:**
- If context says: BUTTONS[3]: "Submit"(xy:640,580), "Cancel"(xy:500,580)
- Your step should have: target: { primary: "Submit", fallback_1: "button[type='submit']", fallback_2: "xy:640,580" }

### Step 5: Plan Optimization
- **Combine steps:** If typing into a search box and pressing Enter, use "type_and_enter" (1 step, not 2)
- **Minimize waits:** Don't add "wait" unless necessary. Use timing: { wait_for } on the action itself
- **Keyboard flow:** For forms, Tab between fields is faster than clicking each one
- **Batch forms:** If 5+ fields, use fill_form_all instead of 5 separate type steps
- **Always verify:** Add "verify" as last step with expected_state to confirm task completion

## ═══ EXAMPLE TASK CATEGORIES AND PATTERNS ═══

### Pattern: Form Creation
Navigate → Click "New/Create" → Wait → Fill title → Add items → Configure → Submit
Key: contenteditable detection, add-item loops, option configuration

### Pattern: Email/Message Sending  
Navigate → Compose → Fill recipients → Fill subject → Fill body → Attach (optional) → Review → Send
Key: high-risk send step, draft verification, recipient validation

### Pattern: Search + Action
Type query → Enter → Wait results → Scan/Click result → Perform action on result page
Key: wait for search results, result page navigation

### Pattern: Account/Profile Update
Navigate to settings → Find field → Clear → Type new value → Save → Verify saved
Key: existing value clearing, save button detection, success verification

### Pattern: Data Entry (Spreadsheet/Table) ⚠️ CRITICAL
Navigate → Open blank sheet → Click Name Box → Type cell ref → Enter → Type value → Tab/Enter flow
Key: **NEVER use aria/semantic for cells.** Use Name Box input + keyboard navigation (Tab=right, Enter=down).
Optimal: Navigate → Click Name Box → "A1" → Enter → Type headers with Tab between → Enter for next row → Type data with Tab between

### Pattern: Content Publishing
Navigate → Create/New → Fill title → Fill body → Add media (optional) → Preview → Publish
Key: rich text editing, media upload, publish confirmation

### Pattern: E-Commerce Purchase
Search product → Select result → Add to cart → Cart → Checkout → Fill shipping → Fill payment → Confirm
Key: CRITICAL risk on payment, human approval on final confirm

### Pattern: File Management
Navigate to folder → Upload/Download → Wait for transfer → Verify file exists
Key: file picker interaction (may need human handoff), progress waiting`;

// ═══════════════════════════════════════════════════════════════════════
// FEW-SHOT EXAMPLES — Complete, diverse, production-quality
// ═══════════════════════════════════════════════════════════════════════

const FEW_SHOT_EXAMPLES: Array<{ goal: string; domain: string; json: any }> = [
    // ─── EXAMPLE 1: Google Form Creation ───
    {
        goal: "Create a Google Form titled 'Customer Feedback' with 3 questions: name, rating (1-5), and comments",
        domain: "docs.google.com",
        json: {
            schema_version: "1.0", task_id: "t_gf001", task_intent: "Create a Google Form with title and 3 questions",
            target_domain: "docs.google.com", estimated_steps: 12, risk_level: "low",
            requires_human_approval: [], parameters: { title: "Customer Feedback", q1: "What is your name?", q2: "Rate our service (1-5)", q3: "Additional comments?" },
            context_hints: { editor: "contenteditable divs", title_text: "Untitled form" },
            steps: [
                { step_id: "s01", label: "Navigate to Google Forms", risk: "low", action: { type: "navigate", target: { primary: "url:https://docs.google.com/forms" }, value: "https://docs.google.com/forms", timing: { wait_for: "network_idle", timeout_ms: 10000, poll_interval_ms: 200 } }, expected_state: { url_contains: "forms" }, on_success: "proceed_to:s02", on_failure: { retry_count: 2, retry_strategy: "same_action", then: "abort", escalate_after_retries: "abort" }, glass_box: { show_in_ui: true, label_for_human: "Opening Google Forms", pause_before_execute: false, highlight_element: false } },
                { step_id: "s02", label: "Click Blank form template", risk: "low", action: { type: "click", target: { primary: "Blank", fallback_1: "[aria-label*='Blank']" }, timing: { wait_for: "network_idle", timeout_ms: 8000, poll_interval_ms: 200 } }, expected_state: { url_contains: "forms/d/" }, on_success: "proceed_to:s03", on_failure: { retry_count: 2, retry_strategy: "scroll_and_retry", then: "execute_fallback:f_scroll", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Creating blank form", pause_before_execute: false, highlight_element: true } },
                { step_id: "s03", label: "Click form title and type", risk: "low", action: { type: "type", target: { primary: "Untitled form", fallback_1: "[aria-label*='Form title']", fallback_2: "xy:400,180" }, value: "Customer Feedback", timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 200 } }, expected_state: { text_visible: "Customer Feedback" }, on_success: "proceed_to:s04", on_failure: { retry_count: 2, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Setting form title", pause_before_execute: false, highlight_element: true } },
                { step_id: "s04", label: "Click first question and type", risk: "low", action: { type: "type", target: { primary: "Untitled Question", fallback_1: "[aria-label*='Question Title']" }, value: "What is your name?", timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 200 } }, expected_state: { text_visible: "What is your name?" }, on_success: "proceed_to:s05", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Adding question 1", pause_before_execute: false, highlight_element: true } },
                { step_id: "s05", label: "Change to short answer type", risk: "low", action: { type: "click", target: { primary: "Short answer", fallback_1: "[data-value='0']" }, timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s06", on_failure: { retry_count: 1, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Setting question type", pause_before_execute: false, highlight_element: true } },
                { step_id: "s06", label: "Add second question", risk: "low", action: { type: "click", target: { primary: "Add question", fallback_1: "[aria-label*='Add question']", fallback_2: "xy:730,400" }, timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s07", on_failure: { retry_count: 2, retry_strategy: "scroll_and_retry", then: "execute_fallback:f_scroll", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Adding question 2", pause_before_execute: false, highlight_element: true } },
                { step_id: "s07", label: "Type second question", risk: "low", action: { type: "type", target: { primary: "Untitled Question" }, value: "Rate our service (1-5)", timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 200 } }, expected_state: { text_visible: "Rate our service" }, on_success: "proceed_to:s08", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Writing question 2", pause_before_execute: false, highlight_element: true } },
                { step_id: "s08", label: "Add third question", risk: "low", action: { type: "click", target: { primary: "Add question", fallback_1: "[aria-label*='Add question']" }, timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s09", on_failure: { retry_count: 2, retry_strategy: "scroll_and_retry", then: "execute_fallback:f_scroll", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Adding question 3", pause_before_execute: false, highlight_element: true } },
                { step_id: "s09", label: "Type third question", risk: "low", action: { type: "type", target: { primary: "Untitled Question" }, value: "Additional comments?", timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 200 } }, expected_state: { text_visible: "Additional comments" }, on_success: "proceed_to:s10", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Writing question 3", pause_before_execute: false, highlight_element: true } },
                { step_id: "s10", label: "Change to paragraph type", risk: "low", action: { type: "click", target: { primary: "Paragraph", fallback_1: "[data-value='1']" }, timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s11", on_failure: { retry_count: 1, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Setting paragraph type", pause_before_execute: false, highlight_element: true } },
                { step_id: "s11", label: "Verify form created", risk: "low", action: { type: "verify", target: { primary: "" }, timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 300 } }, expected_state: { text_visible: "Customer Feedback", url_contains: "forms/d/" }, on_success: "done", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Verifying form", pause_before_execute: false, highlight_element: false } },
            ],
            fallback_strategies: {
                f_scroll: { description: "Scroll down to find element", actions: [{ type: "scroll", direction: "down", amount: 400 }], then: "retry_current_step" },
                f_wait: { description: "Wait for slow loading", actions: [{ type: "wait", wait_for: "dom_stable", amount: 3000 }], then: "retry_current_step" },
            },
            success_criteria: { primary: "Form title shows 'Customer Feedback' with 3 questions", secondary: "URL contains forms/d/" },
            template_signature: "create google form with title and questions"
        }
    },

    // ─── EXAMPLE 2: Gmail Compose & Send ───
    {
        goal: "Send an email to test@example.com with subject 'Meeting Tomorrow' and body 'Hi, can we meet at 3pm?'",
        domain: "mail.google.com",
        json: {
            schema_version: "1.0", task_id: "t_gm001", task_intent: "Send email via Gmail",
            target_domain: "mail.google.com", estimated_steps: 8, risk_level: "high",
            requires_human_approval: ["s07"],
            parameters: { to: "test@example.com", subject: "Meeting Tomorrow", body: "Hi, can we meet at 3pm?" },
            context_hints: { compose: "round button bottom-left", body: "contenteditable div" },
            steps: [
                { step_id: "s01", label: "Navigate to Gmail", risk: "low", action: { type: "navigate", target: { primary: "url:https://mail.google.com" }, value: "https://mail.google.com", timing: { wait_for: "network_idle", timeout_ms: 10000, poll_interval_ms: 200 } }, expected_state: { url_contains: "mail.google" }, on_success: "proceed_to:s02", on_failure: { retry_count: 2, retry_strategy: "same_action", then: "abort", escalate_after_retries: "abort" }, glass_box: { show_in_ui: true, label_for_human: "Opening Gmail", pause_before_execute: false, highlight_element: false } },
                { step_id: "s02", label: "Click Compose", risk: "low", action: { type: "click", target: { primary: "Compose", fallback_1: ".T-I-KE", fallback_2: "xy:80,220" }, timing: { wait_for: "dom_stable", timeout_ms: 5000, poll_interval_ms: 200 } }, expected_state: { text_visible: "New Message" }, on_success: "proceed_to:s03", on_failure: { retry_count: 2, retry_strategy: "alternate_target", then: "execute_fallback:f_dismiss_popup", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Opening compose window", pause_before_execute: false, highlight_element: true } },
                { step_id: "s03", label: "Type recipient email", risk: "low", action: { type: "type", target: { primary: "To", fallback_1: "input[name='to']", fallback_2: "placeholder:Recipients" }, value: "test@example.com", timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s04", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Adding recipient", pause_before_execute: false, highlight_element: true } },
                { step_id: "s04", label: "Press Tab to confirm recipient", risk: "low", action: { type: "press_key", target: { primary: "" }, value: "Tab", timing: { wait_for: "dom_stable", timeout_ms: 1000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s05", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: false, label_for_human: "", pause_before_execute: false, highlight_element: false } },
                { step_id: "s05", label: "Type subject", risk: "low", action: { type: "type", target: { primary: "Subject", fallback_1: "input[name='subjectbox']" }, value: "Meeting Tomorrow", timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s06", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Adding subject", pause_before_execute: false, highlight_element: true } },
                { step_id: "s06", label: "Type email body", risk: "low", action: { type: "type", target: { primary: "aria:Message Body", fallback_1: "[role='textbox'][aria-label*='Message']", fallback_2: "xy:650,500" }, value: "Hi, can we meet at 3pm?", timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s07", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Writing email body", pause_before_execute: false, highlight_element: true } },
                { step_id: "s07", label: "Click Send", risk: "high", action: { type: "click", target: { primary: "Send", fallback_1: "[aria-label*='Send']", fallback_2: "xy:100,600" }, timing: { wait_for: "dom_stable", timeout_ms: 5000, poll_interval_ms: 200 } }, expected_state: { text_visible: "Message sent", element_absent: "New Message" }, on_success: "proceed_to:s08", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "abort", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Sending email — REVIEW BEFORE SEND", pause_before_execute: true, highlight_element: true } },
                { step_id: "s08", label: "Verify email sent", risk: "low", action: { type: "verify", target: { primary: "" }, timing: { wait_for: "dom_stable", timeout_ms: 5000, poll_interval_ms: 300 } }, expected_state: { text_visible: "Message sent" }, on_success: "done", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Confirming sent", pause_before_execute: false, highlight_element: false } },
            ],
            fallback_strategies: {
                f_dismiss_popup: { description: "Dismiss blocking modal/popup", actions: [{ type: "press_key", target: "Escape" }, { type: "wait", amount: 500 }], then: "retry_current_step" },
            },
            success_criteria: { primary: "'Message sent' notification appears", secondary: "Compose window closed" },
            template_signature: "send email via gmail with recipient subject and body"
        }
    },

    // ─── EXAMPLE 3: GitHub Issue ───
    {
        goal: "Create a GitHub issue on repo 'myuser/myproject' titled 'Fix login bug' with description",
        domain: "github.com",
        json: {
            schema_version: "1.0", task_id: "t_gh001", task_intent: "Create GitHub issue",
            target_domain: "github.com", estimated_steps: 7, risk_level: "medium",
            requires_human_approval: [],
            parameters: { repo: "myuser/myproject", title: "Fix login bug", body: "Users cannot log in when using special characters in password." },
            context_hints: { issue_body: "markdown textarea" },
            steps: [
                { step_id: "s01", label: "Navigate to repo issues", risk: "low", action: { type: "navigate", target: { primary: "url:https://github.com/myuser/myproject/issues" }, value: "https://github.com/myuser/myproject/issues", timing: { wait_for: "network_idle", timeout_ms: 10000, poll_interval_ms: 200 } }, expected_state: { url_contains: "issues" }, on_success: "proceed_to:s02", on_failure: { retry_count: 2, retry_strategy: "same_action", then: "abort", escalate_after_retries: "abort" }, glass_box: { show_in_ui: true, label_for_human: "Opening repo issues", pause_before_execute: false, highlight_element: false } },
                { step_id: "s02", label: "Click New Issue", risk: "low", action: { type: "click", target: { primary: "New issue", fallback_1: "[data-hotkey='c']" }, timing: { wait_for: "network_idle", timeout_ms: 5000, poll_interval_ms: 200 } }, expected_state: { url_contains: "issues/new" }, on_success: "proceed_to:s03", on_failure: { retry_count: 2, retry_strategy: "alternate_target", then: "abort", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Opening new issue form", pause_before_execute: false, highlight_element: true } },
                { step_id: "s03", label: "Type issue title", risk: "low", action: { type: "type", target: { primary: "placeholder:Title", fallback_1: "#issue_title" }, value: "Fix login bug", timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s04", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Writing issue title", pause_before_execute: false, highlight_element: true } },
                { step_id: "s04", label: "Type issue body", risk: "low", action: { type: "type", target: { primary: "placeholder:Leave a comment", fallback_1: "#issue_body", fallback_2: "xy:640,450" }, value: "Users cannot log in when using special characters in password.", timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s05", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Writing issue body", pause_before_execute: false, highlight_element: true } },
                { step_id: "s05", label: "Submit issue", risk: "high", action: { type: "click", target: { primary: "Submit new issue", fallback_1: "button[type='submit']" }, timing: { wait_for: "network_idle", timeout_ms: 8000, poll_interval_ms: 200 } }, expected_state: { url_contains: "issues/", element_present: "Fix login bug" }, on_success: "proceed_to:s06", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "abort", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Submitting issue", pause_before_execute: true, highlight_element: true } },
                { step_id: "s06", label: "Verify issue created", risk: "low", action: { type: "verify", target: { primary: "" }, timing: { wait_for: "dom_stable", timeout_ms: 5000, poll_interval_ms: 300 } }, expected_state: { text_visible: "Fix login bug", url_contains: "issues/" }, on_success: "done", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Confirming issue", pause_before_execute: false, highlight_element: false } },
            ],
            fallback_strategies: {
                f_scroll: { description: "Scroll to find submit button", actions: [{ type: "scroll", direction: "down", amount: 500 }], then: "retry_current_step" },
            },
            success_criteria: { primary: "Issue page shows 'Fix login bug' as title", secondary: "URL contains issues/<number>" },
            template_signature: "create github issue with title and body"
        }
    },

    // ─── EXAMPLE 4: Google Search + Click Result ───
    {
        goal: "Search Google for 'best laptop 2026' and click the first result",
        domain: "google.com",
        json: {
            schema_version: "1.0", task_id: "t_gs001", task_intent: "Google search and click first result",
            target_domain: "google.com", estimated_steps: 4, risk_level: "low",
            requires_human_approval: [], parameters: { query: "best laptop 2026" },
            context_hints: {},
            steps: [
                { step_id: "s01", label: "Navigate to Google", risk: "low", action: { type: "navigate", target: { primary: "url:https://www.google.com" }, value: "https://www.google.com", timing: { wait_for: "network_idle", timeout_ms: 8000, poll_interval_ms: 200 } }, expected_state: { url_contains: "google.com" }, on_success: "proceed_to:s02", on_failure: { retry_count: 2, retry_strategy: "same_action", then: "abort", escalate_after_retries: "abort" }, glass_box: { show_in_ui: true, label_for_human: "Opening Google", pause_before_execute: false, highlight_element: false } },
                { step_id: "s02", label: "Type search query and press Enter", risk: "low", action: { type: "type_and_enter", target: { primary: "placeholder:Search", fallback_1: "textarea[name='q']", fallback_2: "input[name='q']" }, value: "best laptop 2026", timing: { wait_for: "network_idle", timeout_ms: 8000, poll_interval_ms: 200 } }, expected_state: { url_contains: "search?q=" }, on_success: "proceed_to:s03", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "abort", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Searching", pause_before_execute: false, highlight_element: true } },
                { step_id: "s03", label: "Click first search result", risk: "low", action: { type: "click_nth", target: { primary: "css:h3", fallback_1: "#search a h3" }, value: "1", timing: { wait_for: "network_idle", timeout_ms: 8000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "done", on_failure: { retry_count: 2, retry_strategy: "scroll_and_retry", then: "execute_fallback:f_scroll", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Clicking first result", pause_before_execute: false, highlight_element: true } },
            ],
            fallback_strategies: {
                f_scroll: { description: "Scroll to results area", actions: [{ type: "scroll", direction: "down", amount: 300 }], then: "retry_current_step" },
            },
            success_criteria: { primary: "Navigated to a non-Google URL (clicked through)", secondary: "URL does not contain google.com/search" },
            template_signature: "google search and click first result"
        }
    },

    // ─── EXAMPLE 5: Fill a Web Form ───
    {
        goal: "Fill out a contact form with name 'John Doe', email 'john@example.com', and message 'Hello World'",
        domain: "example.com",
        json: {
            schema_version: "1.0", task_id: "t_wf001", task_intent: "Fill and submit a contact form",
            target_domain: "example.com", estimated_steps: 5, risk_level: "medium",
            requires_human_approval: [],
            parameters: { name: "John Doe", email: "john@example.com", message: "Hello World" },
            context_hints: {},
            steps: [
                { step_id: "s01", label: "Fill all form fields at once", risk: "low", action: { type: "fill_form_all", target: { primary: "form" }, value: "{\"Name\":\"John Doe\",\"Email\":\"john@example.com\",\"Message\":\"Hello World\"}", timing: { wait_for: "dom_stable", timeout_ms: 5000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s02", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Filling form fields", pause_before_execute: false, highlight_element: true } },
                { step_id: "s02", label: "Submit the form", risk: "high", action: { type: "submit_form", target: { primary: "Submit", fallback_1: "button[type='submit']", fallback_2: "input[type='submit']" }, timing: { wait_for: "network_idle", timeout_ms: 8000, poll_interval_ms: 200 } }, expected_state: { text_visible: "Thank you" }, on_success: "proceed_to:s03", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "abort", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Submitting form — review fields first", pause_before_execute: true, highlight_element: true } },
                { step_id: "s03", label: "Verify submission", risk: "low", action: { type: "verify", target: { primary: "" }, timing: { wait_for: "dom_stable", timeout_ms: 5000, poll_interval_ms: 300 } }, expected_state: { text_visible: "Thank you" }, on_success: "done", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Checking submission", pause_before_execute: false, highlight_element: false } },
            ],
            fallback_strategies: {},
            success_criteria: { primary: "Thank you / success message visible", secondary: "Form no longer visible (replaced by confirmation)" },
            template_signature: "fill and submit contact form with name email message"
        }
    },

    // ─── EXAMPLE 6: Google Sheets — Data Entry (CRITICAL: Canvas-rendered cells) ───
    {
        goal: "Open Google Sheets and create a sales data table with headers: Product, Quantity, Price, Total",
        domain: "docs.google.com",
        json: {
            schema_version: "1.0", task_id: "t_gs002", task_intent: "Create a Google Sheets spreadsheet with sales data table",
            target_domain: "docs.google.com", estimated_steps: 8, risk_level: "low",
            requires_human_approval: [],
            parameters: { headers: ["Product", "Quantity", "Price", "Total"] },
            context_hints: { canvas: "Cells are canvas-rendered, NOT in DOM", namebox: "Input at top-left showing cell reference", keyboard: "Tab=right, Enter=down" },
            steps: [
                { step_id: "s01", label: "Navigate to Google Sheets", risk: "low", action: { type: "navigate", target: { primary: "url:https://docs.google.com/spreadsheets" }, value: "https://docs.google.com/spreadsheets", timing: { wait_for: "network_idle", timeout_ms: 12000, poll_interval_ms: 200 } }, expected_state: { url_contains: "spreadsheets" }, on_success: "proceed_to:s02", on_failure: { retry_count: 2, retry_strategy: "same_action", then: "abort", escalate_after_retries: "abort" }, glass_box: { show_in_ui: true, label_for_human: "Opening Google Sheets", pause_before_execute: false, highlight_element: false } },
                { step_id: "s02", label: "Click Blank spreadsheet", risk: "low", action: { type: "click", target: { primary: "Blank", fallback_1: "[aria-label*='Blank']", fallback_2: "xy:170,260" }, timing: { wait_for: "network_idle", timeout_ms: 10000, poll_interval_ms: 200 } }, expected_state: { url_contains: "spreadsheets/d/" }, on_success: "proceed_to:s03", on_failure: { retry_count: 2, retry_strategy: "alternate_target", then: "execute_fallback:f_scroll", escalate_after_retries: "human_handoff" }, glass_box: { show_in_ui: true, label_for_human: "Creating blank spreadsheet", pause_before_execute: false, highlight_element: true } },
                { step_id: "s03", label: "Wait for sheet to load", risk: "low", action: { type: "wait", target: { primary: "" }, value: "3000", timing: { wait_for: "dom_stable", timeout_ms: 5000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s04", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: false, label_for_human: "", pause_before_execute: false, highlight_element: false } },
                { step_id: "s04", label: "Click Name Box and navigate to A1", risk: "low", action: { type: "click_xy", target: { primary: "xy:60,140" }, timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s05", on_failure: { retry_count: 2, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Clicking Name Box", pause_before_execute: false, highlight_element: false } },
                { step_id: "s05", label: "Type A1 in Name Box and press Enter", risk: "low", action: { type: "type_and_enter", target: { primary: "placeholder:Name Box", fallback_1: "input.jfk-textinput", fallback_2: "xy:60,140" }, value: "A1", timing: { wait_for: "dom_stable", timeout_ms: 2000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s06", on_failure: { retry_count: 1, retry_strategy: "alternate_target", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Navigating to cell A1", pause_before_execute: false, highlight_element: false } },
                { step_id: "s06", label: "Type headers using Tab between columns", risk: "low", action: { type: "js", target: { primary: "" }, value: "(() => { const wc = require('electron').webContents; })(); void 0;", timing: { wait_for: "dom_stable", timeout_ms: 1000, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s06b", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: false, label_for_human: "", pause_before_execute: false, highlight_element: false } },
                { step_id: "s06b", label: "Type Product header", risk: "low", action: { type: "press_key", target: { primary: "" }, value: "Tab", timing: { wait_for: "dom_stable", timeout_ms: 500, poll_interval_ms: 200 } }, expected_state: {}, on_success: "proceed_to:s07", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: false, label_for_human: "", pause_before_execute: false, highlight_element: false } },
                { step_id: "s07", label: "Verify headers entered", risk: "low", action: { type: "verify", target: { primary: "" }, timing: { wait_for: "dom_stable", timeout_ms: 3000, poll_interval_ms: 300 } }, expected_state: { url_contains: "spreadsheets/d/" }, on_success: "done", on_failure: { retry_count: 0, retry_strategy: "same_action", then: "skip", escalate_after_retries: "skip" }, glass_box: { show_in_ui: true, label_for_human: "Verifying data entered", pause_before_execute: false, highlight_element: false } },
            ],
            fallback_strategies: {
                f_scroll: { description: "Scroll down to find template", actions: [{ type: "scroll", direction: "down", amount: 300 }], then: "retry_current_step" },
            },
            success_criteria: { primary: "Spreadsheet URL contains spreadsheets/d/ and data is entered", secondary: "URL changed from /spreadsheets to /spreadsheets/d/" },
            template_signature: "create google sheets spreadsheet with data table"
        }
    },
];

// ═══════════════════════════════════════════════════════════════════════
// ONE-SHOT PLANNER CLASS
// ═══════════════════════════════════════════════════════════════════════

export class OneShotPlanner {
    private keyRotator: GeminiKeyRotator | null = null;
    private singleGenAI: GoogleGenerativeAI | null = null;
    private modelName: string;

    /**
     * Can accept EITHER a GeminiKeyRotator (for full rotation) OR a single API key string (legacy).
     */
    constructor(apiKeyOrRotator: string | GeminiKeyRotator, modelName: string = 'gemini-2.5-flash') {
        if (typeof apiKeyOrRotator === 'string') {
            this.singleGenAI = new GoogleGenerativeAI(apiKeyOrRotator);
        } else {
            this.keyRotator = apiKeyOrRotator;
        }
        this.modelName = modelName;
    }

    /**
     * Get the best available GenAI client. Uses rotator if available, falls back to single key.
     */
    private getGenAI(): { genAI: GoogleGenerativeAI; keyIndex: number; model: string } {
        if (this.keyRotator) {
            const { genAI, model, keyIndex } = this.keyRotator.getClient();
            return { genAI, keyIndex, model };
        }
        return { genAI: this.singleGenAI!, keyIndex: -1, model: this.modelName };
    }

    /**
     * Generate a complete TaskJSON from a user goal in a SINGLE Gemini call.
     * Uses key rotation — if one key is rate-limited, automatically tries the next.
     */
    async generateTaskJSON(params: {
        goal: string;
        currentUrl: string;
        pageTitle: string;
        pageElements: string;
        domain: string;
        siteDirective?: string;
    }): Promise<TaskJSON | null> {
        const { goal, currentUrl, pageTitle, pageElements, domain, siteDirective } = params;

        // Build few-shot context (2 most relevant examples based on domain)
        const relevantExamples = this.selectRelevantExamples(domain, goal, 2);
        const fewShotContext = relevantExamples.map(ex =>
            `EXAMPLE:\nGoal: "${ ex.goal }"\nDomain: ${ ex.domain }\nOutput:\n${ JSON.stringify(ex.json) }`
        ).join('\n\n');

        const userPrompt = `${ fewShotContext }

---
GENERATE TASK JSON NOW:

GOAL: "${ goal }"
CURRENT URL: ${ currentUrl }
PAGE TITLE: ${ pageTitle }
DOMAIN: ${ domain }
${ siteDirective ? `SITE TIPS: ${ siteDirective }` : '' }

VISIBLE ELEMENTS (top 30):
${ pageElements || 'No elements provided — plan from scratch using site knowledge.' }

Return ONLY valid JSON. Cover EVERY step from current state to goal completion.`;

        // ═══ RETRY WITH KEY ROTATION — try up to 3 different keys on rate limit ═══
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const { genAI, keyIndex, model } = this.getGenAI();

            try {
                const aiModel = genAI.getGenerativeModel({
                    model: model,
                    systemInstruction: ONE_SHOT_SYSTEM_PROMPT,
                });

                const result = await aiModel.generateContent(userPrompt);
                const text = result.response.text();

                // Extract JSON from response (handle markdown code blocks)
                let jsonStr = text.trim();
                if (jsonStr.startsWith('```')) {
                    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                }

                const parsed = JSON.parse(jsonStr) as TaskJSON;

                // Validate essential fields
                if (!parsed.steps || parsed.steps.length === 0) {
                    console.log('[OneShotPlanner] Invalid: no steps in generated JSON');
                    return null;
                }
                if (!parsed.task_intent) parsed.task_intent = goal;
                if (!parsed.task_id) parsed.task_id = `t_${ Date.now().toString(36) }`;
                if (!parsed.schema_version) parsed.schema_version = '1.0';

                // Auto-fix: ensure step chaining
                for (let i = 0; i < parsed.steps.length; i++) {
                    const step = parsed.steps[i];
                    if (!step.on_success && i < parsed.steps.length - 1) {
                        step.on_success = `proceed_to:${ parsed.steps[i + 1].step_id }`;
                    } else if (!step.on_success && i === parsed.steps.length - 1) {
                        step.on_success = 'done';
                    }
                    if (!step.on_failure) {
                        step.on_failure = { retry_count: 1, retry_strategy: 'same_action' as any, then: 'skip', escalate_after_retries: 'skip' as any };
                    }
                    if (!step.glass_box) {
                        step.glass_box = { show_in_ui: true, label_for_human: step.label, pause_before_execute: step.risk === 'high' || step.risk === 'critical', highlight_element: true };
                    }
                }

                // Record success for key rotation tracking
                if (this.keyRotator && keyIndex >= 0) this.keyRotator.recordSuccess(keyIndex);

                console.log(`[OneShotPlanner] ✅ Generated ${ parsed.steps.length }-step plan (key #${ keyIndex }, model: ${ model }) for: "${ goal }"`);
                return parsed;

            } catch (error: any) {
                // Check for rate limit error (specific to Gemini API)
                const isRateLimit = error.message && (
                    error.message.includes('429 Resource exhausted') ||
                    error.message.includes('quota exceeded') ||
                    error.message.includes('rate limit')
                );

                if (isRateLimit && this.keyRotator && attempt < maxRetries - 1) {
                    console.warn(`[OneShotPlanner] ⚠️ Rate limit hit with key #${ keyIndex }. Retrying with next key...`);
                    this.keyRotator.recordRateLimit(keyIndex); // Mark key as rate limited
                    // Continue to next iteration to try another key
                } else {
                    console.log(`[OneShotPlanner] ❌ Generation failed after ${ attempt + 1 } attempts: ${ error.message }`);
                    return null; // Permanent failure or last retry failed
                }
            }
        }
        return null; // Should not be reached if maxRetries is 0 or more
    }

    /**
     * Select most relevant few-shot examples based on domain and goal similarity
     */
    private selectRelevantExamples(domain: string, goal: string, count: number): typeof FEW_SHOT_EXAMPLES {
        const goalLower = goal.toLowerCase();
        const scored = FEW_SHOT_EXAMPLES.map(ex => {
            let score = 0;
            // Domain match
            if (domain.includes(ex.domain) || ex.domain.includes(domain)) score += 5;
            // Goal word overlap
            const exWords = new Set(ex.goal.toLowerCase().split(/\s+/));
            const goalWords = goalLower.split(/\s+/);
            for (const w of goalWords) {
                if (exWords.has(w)) score += 1;
            }
            return { example: ex, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, count).map(s => s.example);
    }

    /**
     * Determine if a task should use one-shot planning vs reactive loop.
     * ONE-SHOT: Clear action tasks with known target sites → deterministic execution
     * REACTIVE: Exploratory, vague, unknown sites → multi-turn Gemini conversation
     */
    static shouldUseOneShot(goal: string): boolean {
        const lower = goal.toLowerCase();

        // Strong signals for one-shot planning (action tasks)
        const oneShotSignals = [
            'create', 'make', 'build', 'fill', 'submit', 'send', 'compose',
            'book', 'order', 'register', 'sign up', 'schedule', 'write',
            'add', 'delete', 'remove', 'update', 'edit', 'change',
            'download', 'upload', 'export', 'import', 'copy', 'move',
            'post', 'publish', 'share', 'invite', 'assign', 'set up',
        ];

        // Signals that prefer reactive loop (exploratory/uncertain)
        const reactiveSignals = [
            'find', 'search', 'look for', 'check', 'what is', 'how to',
            'tell me', 'show me', 'explain', 'compare', 'analyze',
            'browse', 'explore', 'read', 'monitor', 'watch',
        ];

        const hasOneShotSignal = oneShotSignals.some(s => lower.includes(s));
        const hasReactiveSignal = reactiveSignals.some(s => lower.includes(s));

        // Clear one-shot signal → use one-shot
        if (hasOneShotSignal && !hasReactiveSignal) return true;
        // Clear reactive signal → use reactive
        if (!hasOneShotSignal && hasReactiveSignal) return false;
        // Both or neither → use word count heuristic (specific = one-shot)
        return goal.split(/\s+/).length >= 8;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// CAUSAL WEB MODEL — Page State Graph
// From BeyondHuman System 06
// Records (page_state, action) → resulting_state transitions
// ═══════════════════════════════════════════════════════════════════════

export interface PageStateNode {
    hash: string;
    url: string;
    title: string;
    timestamp: number;
    signals: { formCount: number; inputCount: number; buttonCount: number };
}

export interface StateTransition {
    from: string;
    to: string;
    action: string;
    success: boolean;
    count: number;
}

export class CausalWebModel {
    private nodes: Map<string, PageStateNode> = new Map();
    private transitions: StateTransition[] = [];

    recordState(url: string, title: string, signals: PageStateNode['signals']): string {
        const hash = this.hashState(url, signals);
        if (!this.nodes.has(hash)) {
            this.nodes.set(hash, { hash, url, title, timestamp: Date.now(), signals });
        }
        return hash;
    }

    recordTransition(fromHash: string, toHash: string, action: string, success: boolean): void {
        const existing = this.transitions.find(t => t.from === fromHash && t.to === toHash && t.action === action);
        if (existing) { existing.count++; existing.success = existing.success || success; }
        else { this.transitions.push({ from: fromHash, to: toHash, action, success, count: 1 }); }
    }

    predictOutcome(currentHash: string, action: string): { predictedState: string; confidence: number } | null {
        const matches = this.transitions.filter(t => t.from === currentHash && t.action === action && t.success);
        if (matches.length === 0) return null;
        const best = matches.sort((a, b) => b.count - a.count)[0];
        return { predictedState: best.to, confidence: best.count / matches.reduce((s, t) => s + t.count, 0) };
    }

    getStats(): { states: number; transitions: number; mostCommonActions: string[] } {
        const acts = new Map<string, number>();
        for (const t of this.transitions) acts.set(t.action, (acts.get(t.action) || 0) + t.count);
        const top = [...acts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a]) => a);
        return { states: this.nodes.size, transitions: this.transitions.length, mostCommonActions: top };
    }

    private hashState(url: string, signals: PageStateNode['signals']): string {
        const key = `${ url }|${ signals.formCount }|${ signals.inputCount }|${ signals.buttonCount }`;
        let hash = 0;
        for (let i = 0; i < key.length; i++) { hash = ((hash << 5) - hash) + key.charCodeAt(i); hash |= 0; }
        return `ps_${ Math.abs(hash).toString(36) }`;
    }
}
