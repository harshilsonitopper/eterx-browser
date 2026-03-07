/**
 * MarkdownRenderer.tsx — World-Class AI Answer Renderer for EterX
 * 
 * Typography:
 *   Headings → Playfair Display (serif, elegant)
 *   Body     → Inter (clean sans-serif, tight spacing)
 *   Code     → Fira Code (monospace)
 * 
 * Features:
 *   ● Premium tables with alternating rows, sticky headers, gradient accents
 *   ● Hierarchical bullets: ● ○ ■ □ per depth level
 *   ● Task list checkboxes with animated check marks
 *   ● Contextual blockquotes: Final Answer, Warning, Tip, Note
 *   ● FileBlock with expandable preview, download progress, type-colored badges
 *   ● KaTeX math: inline $...$ and display $$...$$
 *   ● Gradient horizontal rules for visual breathing
 *   ● Code blocks with syntax label, copy button, and line numbers
 *   ● Image rendering with alt-text captions
 *   ● Smooth micro-animations throughout
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Copy, Check, Lightbulb, AlertTriangle, CheckCircle2, Info, FileText, Download, ChevronDown, ChevronRight, Eye, ExternalLink } from 'lucide-react';

// ─── Math Detection ─────────────────────────────────────
const MATH_PATTERNS = [
    /[σΣΠπ∫∑∏∂∇√∞≈≠≤≥±∓×÷∈∉⊂⊃∪∩∀∃αβγδεζηθικλμνξρτυφχψωℝℂℤℕℚ⊕⊗⊥∥⟨⟩⌈⌉⌊⌋]/,
    /\^[\({]/, /_{[\({]/, /\\frac|\\sum|\\prod|\\int|\\lim|\\sqrt/,
    /[a-zA-Z]\([a-zA-Z]\)/, /\^\d+/,
    /→|←|↔|⇒|⇐|⇔|∧|∨|¬|⊢|⊨|⊤|⊥/,  // Logic operators
    /≡|≢|≅|≲|≳|≺|≻|⊏|⊐|⊑|⊒/,          // Relations
    /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹]/,         // Super/subscript digits
];

// ─── Unicode → LaTeX Conversion Map (200+ symbols) ─────
const UNICODE_TO_LATEX: [RegExp, string][] = [
    // ── Greek Letters (lowercase) ──
    [/α/g, '\\alpha'], [/β/g, '\\beta'], [/γ/g, '\\gamma'], [/δ/g, '\\delta'],
    [/ε/g, '\\varepsilon'], [/ζ/g, '\\zeta'], [/η/g, '\\eta'], [/θ/g, '\\theta'],
    [/ι/g, '\\iota'], [/κ/g, '\\kappa'], [/λ/g, '\\lambda'], [/μ/g, '\\mu'],
    [/ν/g, '\\nu'], [/ξ/g, '\\xi'], [/π/g, '\\pi'], [/ρ/g, '\\rho'],
    [/σ/g, '\\sigma'], [/τ/g, '\\tau'], [/υ/g, '\\upsilon'], [/φ/g, '\\varphi'],
    [/χ/g, '\\chi'], [/ψ/g, '\\psi'], [/ω/g, '\\omega'],
    // ── Greek Letters (uppercase) ──
    [/Γ/g, '\\Gamma'], [/Δ/g, '\\Delta'], [/Θ/g, '\\Theta'], [/Λ/g, '\\Lambda'],
    [/Ξ/g, '\\Xi'], [/Π/g, '\\Pi'], [/Σ/g, '\\Sigma'], [/Υ/g, '\\Upsilon'],
    [/Φ/g, '\\Phi'], [/Ψ/g, '\\Psi'], [/Ω/g, '\\Omega'],
    // ── Logical Operators ──
    [/∧/g, '\\land'], [/∨/g, '\\lor'], [/¬/g, '\\neg'], [/⊻/g, '\\oplus'],
    [/⊤/g, '\\top'], [/⊥/g, '\\bot'], [/⊢/g, '\\vdash'], [/⊨/g, '\\models'],
    [/∴/g, '\\therefore'], [/∵/g, '\\because'],
    // ── Arrows ──
    [/→/g, '\\rightarrow'], [/←/g, '\\leftarrow'], [/↔/g, '\\leftrightarrow'],
    [/⇒/g, '\\Rightarrow'], [/⇐/g, '\\Leftarrow'], [/⇔/g, '\\Leftrightarrow'],
    [/↦/g, '\\mapsto'], [/↗/g, '\\nearrow'], [/↘/g, '\\searrow'],
    [/↑/g, '\\uparrow'], [/↓/g, '\\downarrow'], [/⇑/g, '\\Uparrow'], [/⇓/g, '\\Downarrow'],
    // ── Set Theory ──
    [/∈/g, '\\in'], [/∉/g, '\\notin'], [/⊂/g, '\\subset'], [/⊃/g, '\\supset'],
    [/⊆/g, '\\subseteq'], [/⊇/g, '\\supseteq'], [/∪/g, '\\cup'], [/∩/g, '\\cap'],
    [/∅/g, '\\emptyset'], [/⊖/g, '\\ominus'], [/⊕/g, '\\oplus'], [/⊗/g, '\\otimes'],
    // ── Number Sets ──
    [/ℝ/g, '\\mathbb{R}'], [/ℂ/g, '\\mathbb{C}'], [/ℤ/g, '\\mathbb{Z}'],
    [/ℕ/g, '\\mathbb{N}'], [/ℚ/g, '\\mathbb{Q}'], [/ℙ/g, '\\mathbb{P}'],
    // ── Calculus & Analysis ──
    [/∂/g, '\\partial'], [/∇/g, '\\nabla'], [/∫/g, '\\int'],
    [/∑/g, '\\sum'], [/∏/g, '\\prod'], [/√/g, '\\sqrt{}'],
    [/∞/g, '\\infty'], [/∝/g, '\\propto'],
    // ── Relations ──
    [/≈/g, '\\approx'], [/≠/g, '\\neq'], [/≤/g, '\\leq'], [/≥/g, '\\geq'],
    [/≡/g, '\\equiv'], [/≢/g, '\\not\\equiv'], [/≅/g, '\\cong'],
    [/≲/g, '\\lesssim'], [/≳/g, '\\gtrsim'], [/≺/g, '\\prec'], [/≻/g, '\\succ'],
    [/∼/g, '\\sim'], [/≪/g, '\\ll'], [/≫/g, '\\gg'],
    // ── Arithmetic ──
    [/±/g, '\\pm'], [/∓/g, '\\mp'], [/×/g, '\\times'], [/÷/g, '\\div'],
    [/·/g, '\\cdot'], [/∘/g, '\\circ'], [/†/g, '\\dagger'], [/‡/g, '\\ddagger'],
    // ── Quantifiers ──
    [/∀/g, '\\forall'], [/∃/g, '\\exists'], [/∄/g, '\\nexists'],
    // ── Brackets & Delimiters ──
    [/⟨/g, '\\langle'], [/⟩/g, '\\rangle'],
    [/⌈/g, '\\lceil'], [/⌉/g, '\\rceil'],
    [/⌊/g, '\\lfloor'], [/⌋/g, '\\rfloor'],
    [/‖/g, '\\|'],
    // ── Superscript/Subscript Unicode Digits ──
    [/⁰/g, '^{0}'], [/¹/g, '^{1}'], [/²/g, '^{2}'], [/³/g, '^{3}'],
    [/⁴/g, '^{4}'], [/⁵/g, '^{5}'], [/⁶/g, '^{6}'], [/⁷/g, '^{7}'],
    [/⁸/g, '^{8}'], [/⁹/g, '^{9}'],
    [/₀/g, '_{0}'], [/₁/g, '_{1}'], [/₂/g, '_{2}'], [/₃/g, '_{3}'],
    [/₄/g, '_{4}'], [/₅/g, '_{5}'], [/₆/g, '_{6}'], [/₇/g, '_{7}'],
    [/₈/g, '_{8}'], [/₉/g, '_{9}'],
    // ── Miscellaneous ──
    [/ℓ/g, '\\ell'], [/ℏ/g, '\\hbar'], [/℘/g, '\\wp'],
    [/ℜ/g, '\\Re'], [/ℑ/g, '\\Im'], [/ℵ/g, '\\aleph'],
    [/⊥/g, '\\perp'], [/∥/g, '\\parallel'],
    [/◊/g, '\\diamond'], [/★/g, '\\bigstar'], [/□/g, '\\square'],
    [/△/g, '\\triangle'], [/▽/g, '\\triangledown'],
];

// Apply Unicode→LaTeX conversions inside math contexts
function convertUnicodeInMath(text: string): string {
    let result = text;
    for (const [pattern, replacement] of UNICODE_TO_LATEX) {
        result = result.replace(pattern, replacement);
    }
    return result;
}

function preprocessContent(raw: string): string {
    let c = raw;

    // ── Step 0: Strip broken image markdown with grounding/redirect URLs ──
    c = c.replace(/!\[([^\]]*)\]\(https?:\/\/vertexaisearch\.cloud\.google\.com[^)]*\)/g, '');
    c = c.replace(/!\[([^\]]*)\]\(https?:\/\/[^)]{500,}\)/g, '');
    c = c.replace(/!\[([^\]]*)\]\([^)]*grounding-api-redirect[^)]*\)/g, '');
    c = c.replace(/\n{3,}/g, '\n\n');

    // Helper: Safely replace formatting only on text OUTSIDE existing $...$ or $$...$$
    function replaceOutsideMath(str: string, regex: RegExp, replacer: any) {
        const tokens = [];
        let current = 0;
        const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
        let match;
        while ((match = mathRegex.exec(str)) !== null) {
            if (match.index > current) {
                tokens.push({ type: 'text', val: str.substring(current, match.index) });
            }
            tokens.push({ type: 'math', val: match[0] });
            current = match.index + match[0].length;
        }
        if (current < str.length) {
            tokens.push({ type: 'text', val: str.substring(current) });
        }
        return tokens.map(t => t.type === 'text' ? t.val.replace(regex, replacer) : t.val).join('');
    }

    // ── Step 0.3: Promote dense inline equations to centered display math ──
    // e.g. "equation A(t) = A_0e^{-\frac{bt}{2m}}." -> centered on new line
    const promoteRegex = /([a-zA-Z:,])\s+((?:[A-Za-z\\][A-Za-z0-9_()^{}\\]*)\s*(?:=|\\approx|\\implies|\\rightarrow|\\to)\s*(?:[^\s.,?!;\n]+(?:\s+[^\s.,?!;\n]+)*))(?=[.,?!;\s]|$)/g;
    c = replaceOutsideMath(c, promoteRegex, (match: string, prefix: string, eq: string) => {
        if (/\\(?:frac|int|sum|prod|sqrt|alpha|beta|gamma|Delta|omega|implies|approx)|\^|_/.test(eq)) {
            if (eq.length > 15 || eq.includes('\\implies') || eq.includes('\\frac')) {
                return `${ prefix }\n$$ ${ eq.trim() } $$\n`;
            } else {
                return `${ prefix } $${ eq.trim() }$`;
            }
        }
        return match;
    });

    // ── Step 0.5: Rescue raw LaTeX using safe tokenization ──
    c = replaceOutsideMath(c, /(\\(?:frac|dfrac|binom)\{(?:[^{}]|\{[^{}]*\})*\}\{(?:[^{}]|\{[^{}]*\})*\})/g, '$$$1$$');
    c = replaceOutsideMath(c, /(\\(?:int|oint|sum|prod)(?:_\{[^}]*\})?(?:\^\{[^}]*\})?\s*[^$\s,.]*)/g, '$$$1$$');
    c = replaceOutsideMath(c, /(\\sqrt\{(?:[^{}]|\{[^{}]*\})*\})/g, '$$$1$$');
    c = replaceOutsideMath(c, /(\\(?:alpha|beta|gamma|delta|epsilon|theta|omega|sigma|lambda|pi|phi|psi|mu|nu|rho|tau|Delta|Omega|Sigma|Gamma|Pi|Lambda|Theta|nabla|partial|infty)\b)/g, '$$$1$$');
    c = replaceOutsideMath(c, /([A-Za-z0-9_()]+)\^\{((?:[^{}]|\{[^{}]*\})+)\}/g, '$$$1^{$2}$$');
    c = replaceOutsideMath(c, /([A-Za-z0-9_()]+)_\{((?:[^{}]|\{[^{}]*\})+)\}/g, '$$$1_{$2}$$');
    c = replaceOutsideMath(c, /(\\text\{(?:[^{}]|\{[^{}]*\})*\})/g, '$$$1$$');
    c = replaceOutsideMath(c, /(\\(?:vec|hat|bar|overline|underline|boxed|tilde)\{(?:[^{}]|\{[^{}]*\})*\})/g, '$$$1$$');

    // Also rescue standalone variables with super/sub scripts that weren't wrapped
    c = replaceOutsideMath(c, /\b([A-Za-z])_([a-zA-Z0-9]+|\{[^}]+\})\b/g, '$$$1_$2$$');

    // ── Step 1: Fenced code blocks that are actually math ──
    c = c.replace(/```\s*\n([\s\S]*?)```/g, (m, inner) => {
        const t = inner.trim();
        const hasCode = /\b(function|const|let|var|if|else|for|while|return|import|export|class|def|print|console)\b/.test(t);
        if (MATH_PATTERNS.some(p => p.test(t)) && !hasCode) {
            return `\n$$${ convertUnicodeInMath(t) }$$\n`;
        }
        return m;
    });

    // ── Step 2: Inline code that's actually math ──
    c = c.replace(/`([^`\n]+)`/g, (m, inner) => {
        const t = inner.trim();
        const hasCode = /\b(function|const|let|var|true|false|null|undefined|console|import|return)\b/.test(t);
        if (MATH_PATTERNS.some(p => p.test(t)) && !hasCode) {
            let l = t.replace(/\^[\(]([^)]+)[\)]/g, '^{$1}').replace(/_[\(]([^)]+)[\)]/g, '_{$1}');
            return `$${ convertUnicodeInMath(l) }$`;
        }
        return m;
    });

    // ── Step 3.5: Fix mismatched AI delimiters ──
    c = c.replace(/(?:^|\n)\$([^$\n]+)\$\$(?=\n|$)/g, '\n$$$$$1$$$$\n');
    c = c.replace(/(?:^|\n)\$\$([^$\n]+)\$(?=\n|$)/g, '\n$$$$$1$$$$\n');

    // ── Step 3.6: Remove inner $ inside $$ blocks ──
    c = c.replace(/\$\$([\s\S]*?)\$\$/g, (m, inner) => {
        const cleanInner = inner.replace(/\$/g, '');
        return `$$${ convertUnicodeInMath(cleanInner) }$$`;
    });

    // ── Step 3.7: Promote complex inline math to centered display math ──
    // The user requested perfect centering and sizing for complex equations like A(t) = ...
    c = c.replace(/(?:^|\s)\$([^$\n]+)\$([.,;:]?)/g, (m, inner, punct) => {
        let t = inner.trim();
        // Promote if it's an equation and has complexity (fractions, integrals, or decently long)
        if (t.includes('=') && (t.includes('\\frac') || t.includes('\\int') || t.includes('\\sum') || t.length > 15)) {
            if (punct) {
                // Incorporate punctuation into the display math safely
                t += ` \\text{${ punct }}`;
            }
            return `\n$$\n${ t }\n$$`;
        }
        return m;
    });

    // ── Step 4: Convert Unicode math symbols ──
    c = c.replace(/\$([^$\n]+)\$/g, (m, inner) => {
        return `$${ convertUnicodeInMath(inner) }$`;
    });

    // ── Step 5: Convert broad exponent patterns outside of $ ──
    c = replaceOutsideMath(c, /(?<![$`])\b([a-zA-Z])\^(\d+|\{[^}]+\})(?![`$])/g, '$$$1^{$2}$$');
    c = replaceOutsideMath(c, /(?<![$`])\blog_(\d+|[a-zA-Z])\(([^)]+)\)(?![`$])/g, '$$\\log_{$1}($2)$$');
    c = replaceOutsideMath(c, /(?<![$`\\])\bsqrt\(([^)]+)\)(?![`$])/g, '$$\\sqrt{$1}$$');
    c = replaceOutsideMath(c, /(?<=\d[A-Z][a-zA-Z₀-₉]*)\s*→\s*(?=\d*[A-Z])/g, ' $\\rightarrow$ ');

    // ── Step 6: Parenthesized LaTeX -> Inline Math ──
    const latexCmds = '(?:sec|cos|sin|tan|cot|csc|log|ln|exp|lim|min|max|sup|inf|arg|deg|det|dim|gcd|hom|ker|Pr|frac|sqrt|sum|prod|int|oint|partial|nabla|forall|exists|in|notin|subset|supset|cup|cap|wedge|vee|neg|land|lor|Rightarrow|Leftarrow|Leftrightarrow|rightarrow|leftarrow|leftrightarrow|mapsto|to|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|infty|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|cong|propto|perp|parallel|angle|triangle|square|circ|star|bullet|ldots|cdots|ddots|vdots|text|mathrm|mathbf|mathbb|mathcal|operatorname|boxed|overline|underline|hat|bar|vec|dot|ddot|tilde|binom|choose)';
    c = replaceOutsideMath(c, new RegExp(`\\(\\s*(\\\\(?:${ latexCmds })(?:[^)]*?(?:\\{[^}]*\\})*[^)]*)?)\\s*\\)`, 'g'), (match: string, inner: string) => {
        if (/\\[a-zA-Z]/.test(inner)) return `$${ inner.trim() }$`;
        return match;
    });

    // Also catch \( ... \) and \[ ... \] delimiters
    c = replaceOutsideMath(c, /\\\(\s*([\s\S]*?)\s*\\\)/g, '$$$1$$');
    c = c.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '\n$$$$$1$$$$\n');

    // ── Step 7: Fix common LaTeX errors from AI ──
    // Fix \left not followed by a delimiter (bracket, paren, pipe, etc.)
    // AI often writes \left\frac which is invalid — strip the orphaned \left
    c = c.replace(/\\left\s*(?=\\\\(?:frac|sum|prod|int|sqrt|begin|text|math))/g, '');
    c = c.replace(/\\right\s*(?=\\\\(?:frac|sum|prod|int|sqrt|begin|end|text|math|,|\s|$))/g, '');
    // Fix \left and \right with no matching delimiter at all
    c = c.replace(/\\left(?![(\[{|.\\])/g, '');
    c = c.replace(/\\right(?![)\]}|.\\])/g, '');

    // ── Step 8: Ensure display math is on its own line without adding double newlines ──
    // If $$ is inline with text, push it to its own line (single newline to prevent empty <p> tags)
    c = c.replace(/([^\n])(\$\$[^$]+\$\$)/g, '$1\n$2');
    c = c.replace(/(\$\$[^$]+\$\$)([^\n])/g, '$1\n$2');

    // ── Step 9: Fix double-escaped backslashes in math ──
    // Sometimes AI outputs \\\\frac instead of \\frac inside $...$
    c = c.replace(/\$([^$]+)\$/g, (m, inner) => {
        // Only fix inside math contexts — replace \\\\ with \\ 
        let fixed = inner.replace(/\\\\\\\\(?=[a-zA-Z])/g, '\\\\');
        // Also fix \\\\{ and \\\\} inside math
        fixed = fixed.replace(/\\\\\\\\([{}])/g, '\\\\$1');
        return `$${ fixed }$`;
    });

    return c;
}

// ─── Font Constants ─────────────────────────────────────
const H_FONT = "var(--font-serif)";
const B_FONT = "var(--font-sans)";
const M_FONT = "'Fira Code', 'SF Mono', 'Cascadia Code', monospace";

// ─── Type Color Map ─────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string, text: string, accent: string, icon: string }> = {
    pdf: { bg: '#FEF2F2', text: '#991B1B', accent: '#EF4444', icon: '#DC2626' },
    markdown: { bg: '#F5F3FF', text: '#5B21B6', accent: '#8B5CF6', icon: '#7C3AED' },
    code: { bg: '#ECFDF5', text: '#065F46', accent: '#10B981', icon: '#059669' },
    text: { bg: '#EFF6FF', text: '#1E40AF', accent: '#3B82F6', icon: '#2563EB' },
    docx: { bg: '#EFF6FF', text: '#1E40AF', accent: '#3B82F6', icon: '#2563EB' },
};

// ─── TerminalBlock — Dark Terminal Execution Card ────────
const TerminalBlock = ({ command, output, status }: { command: string, output?: string, status?: 'running' | 'done' | 'error' }) => {
    const [expanded, setExpanded] = useState(false);
    const statusColor = status === 'error' ? '#ef4444' : status === 'done' ? '#10b981' : '#f59e0b';
    const statusText = status === 'error' ? 'Failed' : status === 'done' ? 'Completed' : 'Running...';

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-[#1e293b] bg-[#0f172a] shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1e293b] border-b border-[#334155]">
                <div className="flex items-center gap-2">
                    <div className="flex gap-[5px]">
                        <span className="w-[7px] h-[7px] rounded-full bg-[#FF5F56] opacity-70"></span>
                        <span className="w-[7px] h-[7px] rounded-full bg-[#FFBD2E] opacity-70"></span>
                        <span className="w-[7px] h-[7px] rounded-full bg-[#27C93F] opacity-70"></span>
                    </div>
                    <span className="text-[10px] text-[#64748b] font-mono font-semibold tracking-wide uppercase ml-1">Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-[6px] h-[6px] rounded-full animate-pulse" style={{ backgroundColor: statusColor }}></div>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: statusColor }}>{statusText}</span>
                    </div>
                    {output && (
                        <button onClick={() => setExpanded(!expanded)} className="text-[9px] text-[#64748b] hover:text-white px-1.5 py-0.5 rounded transition-colors">
                            {expanded ? '▾ Hide' : '▸ Output'}
                        </button>
                    )}
                </div>
            </div>
            {/* Command */}
            <div className="px-3.5 py-2.5">
                <code className="text-[11px] text-[#e2e8f0] font-mono leading-relaxed break-all">
                    <span className="text-[#10b981] mr-1.5">$</span>{command}
                </code>
            </div>
            {/* Output (expandable) */}
            {expanded && output && (
                <div className="border-t border-[#1e293b] px-3.5 py-2.5 max-h-[200px] overflow-y-auto">
                    <pre className="text-[10px] text-[#94a3b8] font-mono whitespace-pre-wrap leading-relaxed">{output}</pre>
                </div>
            )}
        </div>
    );
};

// ─── FileBlock — Premium Document Card ──────────────────
const FileBlock = ({ filename, type, content }: { filename: string, type: 'pdf' | 'docx' | 'markdown' | 'code' | 'text', content: string }) => {
    const [downloading, setDownloading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [progress, setProgress] = useState(0);
    const colors = TYPE_COLORS[type] || TYPE_COLORS.text;

    const ext = filename.split('.').pop()?.toUpperCase() || type.toUpperCase();

    const handleDownload = async () => {
        setDownloading(true);
        setProgress(0);
        const timer = setInterval(() => setProgress(p => Math.min(p + 15, 90)), 120);

        try {
            if (type === 'pdf') {
                // Front-end native PDF generation using html2pdf
                const html2pdf = (await import('html2pdf.js')).default;

                // Advanced HTML Builder for Premium Reports
                const mdToHtml = (md: string) => {
                    // Allow specific HTML tags for creative agent styling (span, div, mark, etc)
                    let h = md.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, '&amp;');
                    h = h.replace(/<(?!(\/?(span|div|mark|p|b|i|strong|em|br|hr|table|tr|th|td|ul|ol|li|h[1-6]|a|img)(>|\s+[^>]*>)))/gi, '&lt;');

                    // Code Blocks
                    h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, c) => `<div style="background:#0f172a;color:#e2e8f0;padding:20px;border-radius:12px;font-family:'Fira Code', monospace;font-size:11px;overflow-x:auto;margin:24px 0;box-shadow:inset 0 2px 4px rgba(0,0,0,0.1);"><pre style="margin:0;"><code>${ c }</code></pre></div>`);

                    // Tables (Ultra-premium styling)
                    h = h.replace(/((\|[^\n]+\|\n)+)/g, (t) => {
                        const rows = t.trim().split('\n');
                        if (rows.length < 2) return t;
                        let tb = '<div style="margin:30px 0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);"><table style="width:100%;border-collapse:collapse;font-size:12px;font-family:system-ui, sans-serif;">';
                        rows.forEach((r, i) => {
                            if (r.replace(/[\|\s\-:]/g, '').length === 0) return;
                            const cells = r.split('|').filter(c => c.trim() !== '');
                            const tag = i === 0 ? 'th' : 'td';
                            const style = i === 0
                                ? 'background:#f8fafc;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;font-size:10px;padding:14px 16px;text-align:left;border-bottom:2px solid #cbd5e1;color:#475569;'
                                : `padding:14px 16px;border-bottom:1px solid #f1f5f9;color:#1e293b;${ i % 2 === 0 ? 'background:#fcfcfd;' : 'background:#ffffff;' }`;
                            tb += `<tr>` + cells.map(c => `<${ tag } style="${ style }">${ c.trim() }</${ tag }>`).join('') + '</tr>';
                        });
                        return tb + '</table></div>';
                    });

                    // Extract Main Title for Cover Page (First H1)
                    let title = "Intelligence Report";
                    h = h.replace(/^#\s+(.+)$/m, (m, t) => { title = t; return ''; });
                    // Any subsequent H1s become standard headers
                    h = h.replace(/^#\s+(.+)$/gm, '<h1 style="font-size:24px;font-weight:800;margin:40px 0 16px;color:#0f172a;border-bottom:3px solid #3b82f6;padding-bottom:8px;display:inline-block;">$1</h1>');

                    // H2, H3
                    h = h.replace(/^##\s+(.+)$/gm, '<h2 style="font-size:18px;font-weight:700;margin:32px 0 12px;color:#1e293b;letter-spacing:-0.01em;">$1</h2>');
                    h = h.replace(/^###\s+(.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:24px 0 8px;color:#334155;text-transform:uppercase;letter-spacing:0.04em;">$1</h3>');

                    // Formatting
                    h = h.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#000;font-weight:700;">$1</strong>');
                    h = h.replace(/\*(.+?)\*/g, '<em style="color:#475569;font-style:italic;">$1</em>');
                    h = h.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;border:1px solid #e2e8f0;padding:2px 6px;border-radius:4px;font-family:monospace;color:#ea580c;font-size:0.9em;">$1</code>');
                    h = h.replace(/^>\s+(.+)$/gm, '<blockquote style="border-left:4px solid #3b82f6;margin:24px 0;padding:16px 20px;background:#eff6ff;color:#1d4ed8;font-size:14px;font-style:italic;border-radius:0 8px 8px 0;">$1</blockquote>');

                    // Lists
                    h = h.replace(/^[-*]\s+(.+)$/gm, '<li style="margin:8px 0;padding-left:4px;">$1</li>');
                    h = h.replace(/(<li.*<\/li>\n?)+/g, m => `<ul style="padding-left:24px;margin:16px 0;color:#334155;">${ m }</ul>`);

                    // Paragraphs
                    h = h.replace(/\n\n+/g, '</p><p style="margin:0 0 16px;line-height:1.7;color:#334155;">');
                    h = '<p style="margin:0 0 16px;line-height:1.7;color:#334155;">' + h + '</p>';

                    // Clean up empty paragraphs
                    h = h.replace(/<p[^>]*>\s*<\/p>/g, '');

                    return { html: h, title };
                };

                const { html: contentHtml, title } = mdToHtml(content);
                const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

                const element = document.createElement('div');
                element.innerHTML = `
                    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 13px; background: #fff;">
                        
                        <!-- COVER PAGE -->
                        <div style="height: 1040px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 80px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
                            <div style="width: 60px; height: 60px; background: #3b82f6; border-radius: 16px; margin-bottom: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5);">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            </div>
                            <h4 style="color: #64748b; font-weight: 700; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 24px;">Strategic Intelligence Report</h4>
                            <h1 style="color: #0f172a; font-size: 42px; font-weight: 900; line-height: 1.1; margin-bottom: 32px; letter-spacing: -0.02em; max-width: 800px;">${ title }</h1>
                            <div style="width: 80px; height: 4px; background: #3b82f6; border-radius: 2px; margin-bottom: 32px;"></div>
                            <p style="color: #64748b; font-size: 14px; font-weight: 500;">Prepared exclusively by EterX Agentic Systems</p>
                            <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">${ dateStr }</p>
                        </div>

                        <!-- PAGE BREAK -->
                        <div class="html2pdf__page-break"></div>

                        <!-- DOCUMENT CONTENT -->
                        <div style="padding: 60px 80px;">
                            ${ contentHtml }
                        </div>
                    </div>
                `;

                const opt: any = {
                    margin: 0, // Zero margin to allow the cover page background to bleed
                    filename: filename,
                    image: { type: 'jpeg', quality: 1.0 },
                    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                    jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }, // A4 strict dimensions
                    pagebreak: { mode: 'css', inside: 'avoid' }
                };

                await html2pdf().set(opt).from(element).save();

            } else {
                // Fallback: Blob-based download for MD/TXT/Code
                const mimeMap: Record<string, string> = {
                    markdown: 'text/markdown',
                    code: 'text/plain',
                    text: 'text/plain',
                };
                const blob = new Blob([content], { type: mimeMap[type] || 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            clearInterval(timer);
            setProgress(100);
            setSuccess(true);
            setTimeout(() => { setSuccess(false); setProgress(0); }, 2500);

        } catch (e) {
            clearInterval(timer);
            setProgress(0);
            console.error("Download failed", e);
        }
        setDownloading(false);
    };

    const previewContent = content.length > 800 ? content.substring(0, 800) + '\n\n... (preview truncated)' : content;

    return (
        <div className="my-4 rounded-2xl overflow-hidden border border-[#e2e8f0] bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] etx-file-block group/file">
            {/* Progress Bar */}
            {(downloading || progress > 0) && (
                <div className="h-[3px] bg-gray-100 overflow-hidden">
                    <div
                        className="h-full transition-all duration-300 ease-out rounded-r-full"
                        style={{ width: `${ progress }%`, background: `linear-gradient(90deg, ${ colors.accent }, ${ colors.accent }dd)` }}
                    />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: colors.bg }}>
                <div className="flex items-center gap-3 min-w-0">
                    {/* File type icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/60"
                        style={{ background: `linear-gradient(135deg, ${ colors.accent }18, ${ colors.accent }30)` }}>
                        <FileText size={18} style={{ color: colors.icon }} strokeWidth={2} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[13.5px] font-semibold text-[#1e293b] truncate leading-tight">{filename}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9.5px] uppercase font-bold tracking-[0.08em] px-1.5 py-[1px] rounded-md"
                                style={{ background: `${ colors.accent }20`, color: colors.text }}>
                                {ext}
                            </span>
                            <span className="text-[10px] text-[#94a3b8] font-medium">
                                {(content.length / 1024).toFixed(1)} KB
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Preview toggle */}
                    {type !== 'pdf' && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1 px-2 py-1.5 text-[10.5px] font-semibold rounded-lg transition-all text-[#64748b] hover:text-[#334155] hover:bg-white/80"
                            title={expanded ? "Hide preview" : "Show preview"}
                        >
                            {expanded ? <ChevronDown size={12} /> : <Eye size={12} />}
                            {expanded ? 'Hide' : 'Preview'}
                        </button>
                    )}
                    {/* Download */}
                    <button
                        onClick={handleDownload}
                        disabled={downloading || success}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all duration-300 shadow-sm ${ success
                            ? 'bg-emerald-500 text-white shadow-emerald-200'
                            : downloading
                                ? 'bg-gray-200 text-gray-500 cursor-wait'
                                : 'text-white hover:shadow-md active:scale-[0.97]'
                            }`}
                        style={!success && !downloading ? {
                            background: `linear-gradient(135deg, ${ colors.accent }, ${ colors.accent }cc)`,
                            boxShadow: `0 2px 8px -2px ${ colors.accent }60`
                        } : undefined}
                    >
                        {success ? <><Check size={12} /> Saved</> : <><Download size={12} /> {downloading ? 'Saving...' : 'Download'}</>}
                    </button>
                </div>
            </div>

            {/* Expandable Preview */}
            {expanded && type !== 'pdf' && (
                <div className="border-t border-[#f1f5f9] animate-in slide-in-from-top-1 duration-200">
                    <div className="max-h-[280px] overflow-y-auto bg-[#fafbfc] p-4 text-[12px] text-[#475569] leading-[1.7] whitespace-pre-wrap custom-scrollbar"
                        style={{ fontFamily: type === 'code' ? M_FONT : B_FONT }}>
                        {previewContent}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Code Block — Premium Dark Syntax Display ────────────
const CodeBlock = ({ className, children }: { className?: string; children: React.ReactNode }) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1] || 'code';
    const [copied, setCopied] = useState(false);
    const text = String(children).replace(/\n$/, '');
    const lines = text.split('\n');
    const showLines = lines.length > 3;

    return (
        <div className="my-5 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#1a1a2e] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] group/code">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#141422] border-b border-[#2a2a3a]">
                <div className="flex items-center gap-2.5">
                    <div className="flex gap-[6px]">
                        <span className="w-[8px] h-[8px] rounded-full bg-[#FF5F56] opacity-70"></span>
                        <span className="w-[8px] h-[8px] rounded-full bg-[#FFBD2E] opacity-70"></span>
                        <span className="w-[8px] h-[8px] rounded-full bg-[#27C93F] opacity-70"></span>
                    </div>
                    <span className="text-[10.5px] text-[#6b7280] font-mono font-semibold tracking-[0.1em] uppercase select-none">{lang}</span>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${ copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#8b95a2] hover:text-white hover:bg-white/10' }`}>
                    {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                </button>
            </div>
            {/* Code content */}
            <div className="overflow-x-auto">
                <pre className="px-0 py-4 m-0">
                    <code className={`${ className || '' } text-[13px] leading-[1.75] text-[#e2e8f0] whitespace-pre`}
                        style={{ fontFamily: M_FONT }}>
                        {showLines ? (
                            lines.map((line, i) => (
                                <div key={i} className="flex hover:bg-white/[0.03] transition-colors">
                                    <span className="inline-block w-[48px] text-right pr-4 text-[11.5px] text-[#4a4a6a] select-none shrink-0 leading-[1.75]"
                                        style={{ fontFamily: M_FONT }}>{i + 1}</span>
                                    <span className="flex-1 px-4">{line || ' '}</span>
                                </div>
                            ))
                        ) : (
                            <span className="px-4">{text}</span>
                        )}
                    </code>
                </pre>
            </div>
        </div>
    );
};

// ─── Global Styles ──────────────────────────────────────
const EtxGlobalStyles = () => (
    <style>{`
        /* ── Premium Table Styles ── */
        .etx-md-root .etx-table-wrap {
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
        .etx-md-root .etx-table-wrap table {
            border-collapse: collapse;
            width: 100%;
        }
        .etx-md-root .etx-table-wrap thead {
            position: sticky;
            top: 0;
            z-index: 2;
        }
        .etx-md-root .etx-table-wrap thead th {
            background: linear-gradient(180deg, #f8f9fb 0%, #f3f4f6 100%);
            border-bottom: 2px solid #e5e7eb;
            font-weight: 750;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            font-size: 10.5px;
            color: #374151;
            padding: 10px 14px;
            text-align: left;
            white-space: nowrap;
        }
        .etx-md-root .etx-table-wrap tbody tr {
            transition: background-color 0.15s ease;
        }
        .etx-md-root .etx-table-wrap tbody tr:nth-child(even) {
            background-color: #fafbfc;
        }
        .etx-md-root .etx-table-wrap tbody tr:hover {
            background-color: #f0f4ff !important;
        }
        .etx-md-root .etx-table-wrap tbody td {
            padding: 9px 14px;
            border-bottom: 1px solid #f0f1f3;
            font-size: 13px;
            line-height: 1.55;
            color: #374151;
            vertical-align: top;
        }
        /* Number columns — right-align if numbers */
        .etx-md-root .etx-table-wrap tbody td:nth-child(n+2) {
            font-variant-numeric: tabular-nums;
        }
        
        /* KaTeX Adjustments for Perfect Rendering */
        .katex-display {
            margin: 0.85em 0 !important;
            padding: 0 !important;
            line-height: 1.2 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            color: #1f2937 !important; /* Near black for math readability */
        }
        .katex-display > .katex {
            display: block !important;
            text-align: center !important;
            white-space: nowrap !important;
            font-size: 1.35em !important; 
        }
        .katex {
            font-size: 1.2em !important;
            color: #1f2937 !important; 
            text-rendering: auto !important;
        }
        .katex-html {
            background: transparent !important;
        }
        
        /* KaTeX Error Handling - Fail gracefully as plain text */
        .katex-error {
            color: inherit !important;
            font-family: inherit !important;
            font-size: 1em !important;
            background: transparent !important;
            padding: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            font-weight: 500;
        }

        /* Links */
        .etx-md-root a.etx-link {
            color: #2563eb !important;
            text-decoration: underline !important;
            text-decoration-color: rgba(37, 99, 235, 0.3) !important;
            text-underline-offset: 3px !important;
            transition: all 0.2s ease;
            font-weight: 500 !important;
        }
        .etx-md-root a.etx-link:hover {
            text-decoration-color: #2563eb !important;
            background-color: rgba(37, 99, 235, 0.05);
            border-radius: 2px;
        }

        /* ── Task List Checkboxes ── */
        .etx-task-check {
            appearance: none;
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border: 2px solid #d1d5db;
            border-radius: 4px;
            margin-right: 8px;
            position: relative;
            top: 3px;
            cursor: default;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        .etx-task-check:checked {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-color: #6366f1;
        }
        .etx-task-check:checked::after {
            content: '';
            position: absolute;
            left: 4px;
            top: 1px;
            width: 5px;
            height: 9px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }
        
        /* ── Hierarchical Bullets ── */
        .etx-li-bullet::before {
            content: '';
            position: absolute;
            left: 2px;
            top: 10px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #374151;
        }
        .etx-li-bullet .etx-li-bullet::before { width: 5px; height: 5px; background: transparent; border: 1.5px solid #9ca3af; border-radius: 50%; top: 10px; }
        .etx-li-bullet .etx-li-bullet .etx-li-bullet::before { width: 4px; height: 4px; background: #d1d5db; border: none; border-radius: 1px; top: 11px; }
        .etx-li-bullet .etx-li-bullet .etx-li-bullet .etx-li-bullet::before { width: 4px; height: 4px; background: transparent; border: 1.5px solid #e5e7eb; border-radius: 1px; }
        
        /* ── Ordered List Counters ── */
        .etx-ol-counter { counter-reset: etx-ol; list-style: none; }
        .etx-li-ordered { counter-increment: etx-ol; }
        .etx-li-ordered::before {
            content: counter(etx-ol) '.';
            position: absolute;
            left: 0;
            top: 0;
            font-size: 14px;
            font-weight: 700;
            color: #1a1a1a;
            font-family: var(--font-sans);
            font-variant-numeric: tabular-nums;
        }
        .etx-li-ordered .etx-li-ordered::before { color: #6b7280; font-weight: 600; font-size: 13px; }
        
        /* ── Gradient HR ── */
        .etx-hr-gradient {
            height: 1px;
            border: none;
            background: linear-gradient(90deg, transparent 0%, #d1d5db 20%, #9ca3af 50%, #d1d5db 80%, transparent 100%);
            margin: 20px 0;
            opacity: 0.7;
        }
        
        /* ── Blockquote Styles ── */
        .etx-bq-final { background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); }
        .etx-bq-warn { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
        .etx-bq-tip { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
        .etx-bq-note { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); }
        
        /* ── Link Styles ── */
        .etx-link {
            color: #4f46e5;
            text-decoration: underline;
            text-underline-offset: 3px;
            decoration-color: #c7d2fe;
            transition: all 0.15s;
            font-weight: 500;
        }
        .etx-link:hover {
            color: #3730a3;
            decoration-color: #818cf8;
        }
        
        /* ── Smooth animation ── */
        .etx-md-root * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
    `}</style>
);

// ─── Main Renderer ──────────────────────────────────────
const MarkdownRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [w, setW] = useState(360);
    useEffect(() => {
        if (!ref.current) return;
        setW(ref.current.offsetWidth);
        const o = new ResizeObserver(e => setW(e[0].contentRect.width));
        o.observe(ref.current);
        return () => o.disconnect();
    }, []);

    const processed = useMemo(() => preprocessContent(content), [content]);
    const n = w < 300;

    // ── Extract <file> blocks BEFORE ReactMarkdown processes them ──
    // Split content into segments: regular markdown, file blocks, and terminal blocks
    const segments = useMemo(() => {
        // Combined regex: matches <file ...>...</file> and <terminal>...</terminal>
        const combinedRegex = /<(file|terminal)\b([^>]*)>([\s\S]*?)<\/\1>/g;
        const result: { type: 'md' | 'file' | 'terminal', content: string, filename?: string, fileType?: string }[] = [];
        let lastIndex = 0;
        let match;

        while ((match = combinedRegex.exec(processed)) !== null) {
            // Add text before this block
            if (match.index > lastIndex) {
                const preMd = processed.substring(lastIndex, match.index).trim();
                if (preMd) result.push({ type: 'md', content: preMd });
            }

            const tagName = match[1]; // 'file' or 'terminal'
            const attributesStr = match[2] || '';
            const blockContent = match[3];

            if (tagName === 'file') {
                const nameMatch = attributesStr.match(/name=["']([^"']+)["']/i);
                const typeMatch = attributesStr.match(/type=["']([^"']+)["']/i);
                const fname = nameMatch ? nameMatch[1] : 'untitled.pdf';
                const ftype = typeMatch ? typeMatch[1] : 'pdf';
                result.push({ type: 'file', content: (blockContent || '').trim(), filename: fname, fileType: ftype });
            } else if (tagName === 'terminal') {
                result.push({ type: 'terminal', content: (blockContent || '').trim() });
            }

            lastIndex = match.index + match[0].length;
        }
        // Add remaining text after last block
        if (lastIndex < processed.length) {
            const remaining = processed.substring(lastIndex).trim();
            if (remaining) result.push({ type: 'md', content: remaining });
        }
        // If no special blocks found, return entire content as markdown
        if (result.length === 0) result.push({ type: 'md', content: processed });
        return result;
    }, [processed]);

    const renderMarkdown = (mdContent: string) => (
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false, trust: true }]]} components={{

            /* ── Paragraphs — detect file blocks ── */
            p: (props) => {
                // Return Fragment for math content to avoid wrapping div/span/math in <p> which creates invalid HTML
                const childArr = React.Children.toArray(props.children);
                if (childArr.length === 1 && React.isValidElement(childArr[0]) &&
                    (childArr[0].type === 'span' || childArr[0].type === 'div') &&
                    (childArr[0].props as any).className?.includes('katex')) {
                    return <>{props.children}</>;
                }

                // Detect <file> blocks in paragraph text
                const childText = childArr.map((c: any) => typeof c === 'string' ? c : '').join('');

                const fileMatch = childText.match(/^<file\b([^>]*)>([\s\S]*?)<\/file>$/);
                if (fileMatch) {
                    const attributesStr = fileMatch[1] || '';
                    const nameMatch = attributesStr.match(/name=["']([^"']+)["']/i);
                    const typeMatch = attributesStr.match(/type=["']([^"']+)["']/i);

                    const fname = nameMatch ? nameMatch[1] : 'untitled.pdf';
                    const ftype = typeMatch ? typeMatch[1] : 'pdf';

                    return <FileBlock filename={fname} type={ftype as any} content={fileMatch[2].trim()} />;
                }

                return (
                    <p className="mb-4 text-[#374151] leading-[1.75]"
                        style={{ fontFamily: B_FONT, fontSize: n ? '14.5px' : '15.5px', fontWeight: 400, letterSpacing: '0px' }}
                        {...props} />
                );
            },

            /* ── Headings — clean, bold, tighter spacing ── */
            h1: (props) => (
                <h1 className="text-[#111827] mt-6 mb-3 pb-2 border-b border-[#f3f4f6]"
                    style={{ fontFamily: H_FONT, fontSize: n ? '20px' : '24px', fontWeight: 700, lineHeight: '1.25', letterSpacing: '-0.02em' }}
                    {...props} />
            ),
            h2: (props) => (
                <h2 className="text-[#111827] mt-6 mb-3"
                    style={{ fontFamily: H_FONT, fontSize: n ? '17px' : '20px', fontWeight: 650, lineHeight: '1.3', letterSpacing: '-0.015em' }}
                    {...props} />
            ),
            h3: (props) => (
                <h3 className="text-[#1f2937] mt-5 mb-2.5"
                    style={{ fontFamily: H_FONT, fontSize: n ? '15px' : '17px', fontWeight: 600, lineHeight: '1.35', letterSpacing: '-0.01em' }}
                    {...props} />
            ),
            h4: (props) => (
                <h4 className="text-[#374151] mt-4 mb-2"
                    style={{ fontFamily: B_FONT, fontSize: n ? '14px' : '15px', fontWeight: 650, lineHeight: '1.4' }}
                    {...props} />
            ),
            h5: (props) => (
                <h5 className="text-[#333] mt-4 mb-1.5"
                    style={{ fontFamily: B_FONT, fontSize: n ? '13.5px' : '14.5px', fontWeight: 600, lineHeight: '1.4', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}
                    {...props} />
            ),
            h6: (props) => (
                <h6 className="text-[#555] mt-3 mb-1"
                    style={{ fontFamily: B_FONT, fontSize: n ? '12.5px' : '13.5px', fontWeight: 600, lineHeight: '1.45', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}
                    {...props} />
            ),

            /* ── Inline ── */
            strong: (props) => <strong className="text-[#000]" style={{ fontFamily: B_FONT, fontWeight: 700 }} {...props} />,
            em: (props) => <em className="text-[#444]" style={{ fontFamily: B_FONT, fontStyle: 'italic' }} {...props} />,
            del: (props) => <del className="text-[#999] line-through" {...props} />,

            /* ── Lists — clean hierarchy with much tighter spacing ── */
            ul: (props) => <ul className="mb-4 space-y-1.5 pl-5 list-disc text-[#374151] marker:text-[#9ca3af]" style={{ fontFamily: B_FONT }} {...props} />,
            ol: (props) => <ol className="mb-4 space-y-1.5 pl-5 list-decimal text-[#374151] marker:text-[#6b7280] marker:font-medium" style={{ fontFamily: B_FONT }} {...props} />,
            li: ({ children, ...props }: any) => {
                const isOl = props.node?.parentNode?.tagName === 'ol' || (props as any).ordered;

                // Task list detection
                const childArr = React.Children.toArray(children);
                const firstChild: any = childArr[0];
                let isTask = false;
                let isChecked = false;

                if (firstChild && typeof firstChild === 'object' && firstChild.props) {
                    if (firstChild.props.type === 'checkbox') {
                        isTask = true;
                        isChecked = !!firstChild.props.checked;
                    }
                }

                if (isTask) {
                    return (
                        <li className={`relative pl-1 flex items-start gap-0 text-[#1a1a1a] ${ isChecked ? 'opacity-60' : '' }`}
                            style={{ fontFamily: B_FONT, fontSize: n ? '14px' : '15px', lineHeight: '1.75', listStyle: 'none' }}>
                            <input type="checkbox" checked={isChecked} readOnly className="etx-task-check" />
                            <span className={isChecked ? 'line-through' : ''}>{childArr.slice(1)}</span>
                        </li>
                    );
                }

                return (
                    <li className={`relative text-[#374151] pl-2`}
                        style={{ fontFamily: B_FONT, fontSize: n ? '14.5px' : '15.5px', lineHeight: '1.7', fontWeight: 400 }}
                        {...props}>{children}</li>
                );
            },

            /* ── Separator — extremely subtle thin line ── */
            hr: () => <hr className="my-6 border-t border-[#e5e7eb] mx-2" />,

            /* ── Tables — premium with sticky headers and alternating rows ── */
            table: (props) => (
                <div className="my-3 overflow-x-auto etx-table-wrap">
                    <table className="w-full text-left border-collapse"
                        style={{ fontFamily: B_FONT, fontSize: n ? '12px' : '13px' }} {...props} />
                </div>
            ),
            thead: (props) => <thead {...props} />,
            tbody: (props) => <tbody {...props} />,
            tr: (props) => <tr {...props} />,
            th: (props) => (
                <th className="px-4 py-3 text-left font-bold text-[11px] uppercase tracking-wide text-[#374151] border-b-2 border-[#e5e7eb] bg-gradient-to-b from-[#f8f9fb] to-[#f3f4f6] whitespace-nowrap"
                    style={{ fontFamily: B_FONT, letterSpacing: '0.06em' }} {...props} />
            ),
            td: (props) => (
                <td className="px-4 py-2.5 text-[13.5px] text-[#333] border-b border-[#f0f0f0]"
                    style={{ fontFamily: B_FONT, fontWeight: 400, lineHeight: '1.6', fontVariantNumeric: 'tabular-nums' }} {...props} />
            ),

            /* ── Blockquote — contextual variants with gradient backgrounds ── */
            blockquote: ({ children, ...props }: any) => {
                const txt = React.Children.toArray(children).map((c: any) => {
                    if (typeof c === 'string') return c;
                    if (c?.props?.children) {
                        const i = c.props.children;
                        if (typeof i === 'string') return i;
                        if (Array.isArray(i)) return i.map((x: any) => typeof x === 'string' ? x : '').join('');
                    }
                    return '';
                }).join('').toLowerCase();

                const isFinal = txt.includes('final answer') || txt.includes('conclusion') || txt.includes('result');
                const isWarn = txt.includes('warning') || txt.includes('caution') || txt.includes('danger');
                const isTip = txt.includes('tip:') || txt.includes('key insight') || txt.includes('pro tip') || txt.includes('best practice');
                const isNote = txt.includes('note:') || txt.includes('important:') || txt.includes('remember');

                if (isFinal) {
                    return (
                        <div className="my-3 rounded-xl border border-[#93c5fd] etx-bq-final px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-1.5">
                                <CheckCircle2 size={14} className="text-[#3b82f6]" strokeWidth={2.5} />
                                <span className="text-[10.5px] font-extrabold text-[#1d4ed8] uppercase tracking-[0.08em]" style={{ fontFamily: B_FONT }}>Final Answer</span>
                            </div>
                            <div className="text-[#1e3a5f] text-[14px] leading-[1.65] [&>p]:mb-0" style={{ fontFamily: B_FONT, fontWeight: 500 }} {...props}>{children}</div>
                        </div>
                    );
                }
                if (isWarn) {
                    return (
                        <div className="my-2.5 rounded-xl border border-[#fcd34d] etx-bq-warn px-4 py-2.5 shadow-sm">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={13} className="text-[#f59e0b] mt-0.5 shrink-0" strokeWidth={2.5} />
                                <div className="text-[#92400e] text-[13.5px] leading-[1.65] [&>p]:mb-0" style={{ fontFamily: B_FONT }}>{children}</div>
                            </div>
                        </div>
                    );
                }
                if (isTip) {
                    return (
                        <div className="my-2.5 rounded-xl border border-[#86efac] etx-bq-tip px-4 py-2.5 shadow-sm">
                            <div className="flex items-start gap-2">
                                <Lightbulb size={13} className="text-[#16a34a] mt-0.5 shrink-0" strokeWidth={2.5} />
                                <div className="text-[#166534] text-[13.5px] leading-[1.65] [&>p]:mb-0" style={{ fontFamily: B_FONT }}>{children}</div>
                            </div>
                        </div>
                    );
                }
                if (isNote) {
                    return (
                        <div className="my-2.5 rounded-xl border border-[#a5b4fc] etx-bq-note px-4 py-2.5 shadow-sm">
                            <div className="flex items-start gap-2">
                                <Info size={13} className="text-[#6366f1] mt-0.5 shrink-0" strokeWidth={2.5} />
                                <div className="text-[#312e81] text-[13.5px] leading-[1.65] [&>p]:mb-0" style={{ fontFamily: B_FONT }}>{children}</div>
                            </div>
                        </div>
                    );
                }

                // Default — elegant left-border with subtle background
                return (
                    <div className="my-3 border-l-[3px] border-[#c7c7c7] pl-4 py-1 bg-[#fafafa] rounded-r-lg">
                        <div className="text-[#555] text-[14px] leading-[1.7] [&>p]:mb-0 italic"
                            style={{ fontFamily: B_FONT, fontWeight: 400 }}>{children}</div>
                    </div>
                );
            },

            /* ── Code — inline & block ── */
            code: ({ node, inline, className, children, ...props }: any) => {
                const text = String(children).replace(/\n$/, '');
                const match = /language-(\w+)/.exec(className || '');
                const isMulti = text.includes('\n');
                const isMath = MATH_PATTERNS.some(p => p.test(text));
                const isCode = /\b(function|const|let|var|if|else|for|while|return|import|export|class|def|print|console)\b/.test(text);

                if (!inline && match) return <CodeBlock className={className}>{children}</CodeBlock>;
                if (!inline && isMulti && (isCode || (!isMath && text.length > 40)))
                    return <CodeBlock className={className}>{children}</CodeBlock>;

                // Inline code
                return (
                    <code className="bg-[#f1f5f9] text-[#0f172a] px-[6px] py-[2.5px] mx-[1px] rounded-md text-[13px] border border-[#e2e8f0]"
                        style={{ fontFamily: M_FONT, fontWeight: 500, letterSpacing: '-0.01em' }} {...props}>{children}</code>
                );
            },

            /* ── Links ── */
            a: (props: any) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="etx-link"
                    style={{ fontFamily: B_FONT, fontSize: 'inherit' }}>{props.children}</a>
            ),

            /* ── Images — premium with smooth loading, hover zoom, captions ── */
            img: (props: any) => {
                const [loaded, setLoaded] = React.useState(false);
                const [error, setError] = React.useState(false);

                // Filter out broken/redirect URLs that aren't actual images
                const src = props.src || '';
                const isBrokenUrl = src.includes('vertexaisearch.cloud.google.com')
                    || src.includes('grounding-api-redirect')
                    || src.includes('googleapis.com/redirect')
                    || src.length > 500  // URLs this long are never real images
                    || src.startsWith('data:text');

                if (error || isBrokenUrl) return null; // Don't render broken/redirect images

                return (
                    <figure className="my-4 group/img">
                        <div className={`relative rounded-xl overflow-hidden border border-[#e5e7eb] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-all duration-500 ${ loaded ? 'opacity-100' : 'opacity-0' }`}
                            style={{ maxHeight: '400px' }}>
                            {/* Loading shimmer */}
                            {!loaded && (
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse rounded-xl"
                                    style={{ minHeight: '120px' }} />
                            )}
                            <img
                                {...props}
                                className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                                loading="lazy"
                                style={{ maxHeight: '400px', objectFit: 'cover' }}
                                onLoad={() => setLoaded(true)}
                                onError={() => setError(true)}
                            />
                            {/* Subtle gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                        {props.alt && props.alt !== '' && props.alt !== 'image' && (
                            <figcaption className="text-center text-[11.5px] text-[#8b95a5] mt-2 italic leading-snug px-2"
                                style={{ fontFamily: B_FONT, fontWeight: 400 }}>
                                {props.alt}
                            </figcaption>
                        )}
                    </figure>
                );
            },

            /* ── Details/Summary (collapsible) ── */
            // @ts-ignore
            details: ({ children, ...props }: any) => (
                <details className="my-2.5 rounded-xl border border-[#e5e7eb] bg-white overflow-hidden group/det shadow-sm" {...props}>
                    {children}
                </details>
            ),
            // @ts-ignore
            summary: ({ children, ...props }: any) => (
                <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none bg-[#f8f9fa] hover:bg-[#f0f1f3] transition-colors font-semibold text-[13.5px] text-[#374151] outline-none"
                    style={{ fontFamily: B_FONT }} {...props}>
                    <ChevronRight size={14} className="text-[#6b7280] group-open/det:rotate-90 transition-transform duration-200" />
                    {children}
                </summary>
            ),
        }}>{mdContent}</ReactMarkdown>
    );

    return (
        <div ref={ref} className={`etx-md-root ${ className }`} style={{ maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            <EtxGlobalStyles />
            {segments.map((seg, i) => (
                seg.type === 'file' ? (
                    <FileBlock key={`file-${ i }`} filename={seg.filename!} type={seg.fileType as any} content={seg.content} />
                ) : seg.type === 'terminal' ? (
                    <TerminalBlock key={`term-${ i }`} command={seg.content} status="done" />
                ) : (
                    <React.Fragment key={`md-${ i }`}>{renderMarkdown(seg.content)}</React.Fragment>
                )
            ))}
        </div>
    );
};

export default MarkdownRenderer;
