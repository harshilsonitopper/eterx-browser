const fs = require('fs');
const sidebarPath = 'c:/Harshil projects/eterx-browser/components/SmartSidebar.tsx';
let sidebar = fs.readFileSync(sidebarPath, 'utf8');
let u = 0;

// ═══════════════════════════════════════════════
// 1. Add URL detection + content fetch before Gemini call
// ═══════════════════════════════════════════════

// Insert URL content fetching BEFORE "Construct Gemini Payload"
const insertBefore = "// Construct Gemini Payload";
if (sidebar.includes(insertBefore) && !sidebar.includes('URL_CONTENT_FETCH')) {
    const urlFetchCode = `// === URL_CONTENT_FETCH: Auto-detect URLs and fetch content for AI context ===
            let linkContext = '';
            try {
                // Detect URLs in user message
                const urlRegex = /https?:\\/\\/[^\\s<>]+/gi;
                const urls = (text.match(urlRegex) || []).slice(0, 3); // Max 3 URLs
                
                if (urls.length > 0) {
                    for (const url of urls) {
                        const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
                        
                        if (isYouTube) {
                            // YouTube: Fetch transcript with timestamps
                            // @ts-ignore
                            const transcript = await window.electron?.summarizeYouTube?.({ url });
                            if (transcript?.success) {
                                linkContext += \`\\n\\n[YouTube Video: "\${transcript.title}" (Duration: \${transcript.totalDuration})]\\n\`;
                                linkContext += \`Total segments: \${transcript.segmentCount}\\n\\n\`;
                                // Include timestamped chunks for AI
                                if (transcript.chunks) {
                                    linkContext += transcript.chunks.map((c: any) => \`[\${c.timestamp}] \${c.text}\`).join('\\n');
                                } else {
                                    linkContext += transcript.transcript || '';
                                }
                                linkContext += \`\\n\\n[INSTRUCTIONS: When referencing parts of this video, include clickable timestamps in format **[MM:SS]** so user can jump to that point. If user asks to summarize, create a timestamped summary with key topics.]\`;
                            } else {
                                linkContext += \`\\n\\n[YouTube Video URL: \${url} — Transcript not available: \${transcript?.error || 'unknown error'}]\`;
                            }
                        } else {
                            // Regular link: Read page content via FastScraper
                            // @ts-ignore
                            const pageContent = await window.electron?.readLink?.(url);
                            if (pageContent?.success && pageContent?.content) {
                                linkContext += \`\\n\\n[Link Content: "\${pageContent.title || url}"]\\n\`;
                                linkContext += pageContent.content.substring(0, 4000);
                                linkContext += \`\\n[Source: \${url}]\`;
                            } else {
                                linkContext += \`\\n\\n[Link: \${url} — Could not fetch content]\`;
                            }
                        }
                    }
                }
                
                // Also check if active tab is YouTube — auto-provide transcript context
                if (!linkContext && activeTabUrl?.includes('youtube.com/watch')) {
                    const ytKeywords = ['summarize', 'summary', 'transcript', 'explain', 'tell me about', 'what is', 'timestamp', 'chapter'];
                    const isAboutVideo = ytKeywords.some(k => text.toLowerCase().includes(k)) || text.length < 30;
                    if (isAboutVideo) {
                        // @ts-ignore
                        const transcript = await window.electron?.summarizeYouTube?.({ url: activeTabUrl });
                        if (transcript?.success) {
                            linkContext += \`\\n\\n[Active YouTube Video: "\${transcript.title}" (Duration: \${transcript.totalDuration})]\\n\`;
                            if (transcript.chunks) {
                                linkContext += transcript.chunks.map((c: any) => \`[\${c.timestamp}] \${c.text}\`).join('\\n');
                            }
                            linkContext += \`\\n\\n[INSTRUCTIONS: User is watching this video. Provide timestamped references. Format timestamps as **[MM:SS]** for clickability.]\`;
                        }
                    }
                }
            } catch (e) {
                console.error('URL content fetch error:', e);
            }

            `;
    
    sidebar = sidebar.replace(insertBefore, urlFetchCode + insertBefore);
    u++;
    console.log('1. Added URL content fetch before Gemini payload');
}

// ═══════════════════════════════════════════════
// 2. Inject linkContext into the Gemini prompt
// ═══════════════════════════════════════════════
if (sidebar.includes("text + contextText,") && !sidebar.includes("linkContext +")) {
    sidebar = sidebar.replace(
        "text + contextText,",
        "text + contextText + linkContext,"
    );
    u++;
    console.log('2. Injected linkContext into Gemini prompt');
}

// ═══════════════════════════════════════════════
// 3. Add timestamp click handler for YouTube seek
// ═══════════════════════════════════════════════

// We need to add a click handler that intercepts timestamp clicks in rendered markdown
// Find the markdown rendering section for chat messages

if (!sidebar.includes('handleTimestampClick')) {
    // Add the timestamp click handler function
    const scrollToBottom = "// Scroll to bottom";
    if (sidebar.includes(scrollToBottom)) {
        const timestampHandler = `// YouTube timestamp click handler
    const handleTimestampClick = async (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // Match timestamp patterns like [0:00], [1:23], [12:34:56]
        const text = target.innerText || '';
        const tsMatch = text.match(/^\\[?(\\d{1,2}:)?\\d{1,2}:\\d{2}\\]?$/);
        if (tsMatch) {
            e.preventDefault();
            const parts = text.replace(/[\\[\\]]/g, '').split(':').map(Number);
            let seconds = 0;
            if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
            // @ts-ignore
            await window.electron?.seekYouTube?.(seconds);
        }
    };

    `;
        sidebar = sidebar.replace(scrollToBottom, timestampHandler + scrollToBottom);
        u++;
        console.log('3. Added timestamp click handler');
    }
}

// ═══════════════════════════════════════════════
// 4. Add onClick to the message container for timestamp handling
// ═══════════════════════════════════════════════
// Find where MarkdownRenderer is used for assistant messages
if (sidebar.includes('<MarkdownRenderer') && !sidebar.includes('onClick={handleTimestampClick}')) {
    // Add onClick to the message wrapper div that contains MarkdownRenderer
    // Find the first occurrence in the chat message rendering
    sidebar = sidebar.replace(
        '<MarkdownRenderer content={turn.text}',
        '<div onClick={handleTimestampClick} style={{cursor: "default"}}><MarkdownRenderer content={turn.text}'
    );
    // Need to close the wrapper div - find the closing after MarkdownRenderer
    sidebar = sidebar.replace(
        '<MarkdownRenderer content={turn.text} /></div>',
        '<MarkdownRenderer content={turn.text} /></div></div>'
    );
    // If the above didn't work (different formatting), try alternate
    if (!sidebar.includes('handleTimestampClick')) {
        console.log('4. WARNING: Could not add timestamp click wrapper - manual check needed');
    } else {
        u++;
        console.log('4. Added timestamp click wrapper around MarkdownRenderer');
    }
}

fs.writeFileSync(sidebarPath, sidebar, 'utf8');
console.log(`\nSmartSidebar: ${u} additions`);
