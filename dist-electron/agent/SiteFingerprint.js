/**
 * SiteFingerprint.ts — Domain-specific execution tips for known sites
 *
 * Detects site patterns from URL and returns tips for the agent
 * to interact efficiently with that specific site.
 */
export function getSiteDirective(url) {
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
