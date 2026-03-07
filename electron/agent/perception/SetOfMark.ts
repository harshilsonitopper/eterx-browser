import { WebContents } from 'electron';

export interface ElementAnnotation {
    id: number;
    tag: string;
    role: string | null;
    ariaLabel: string | null;
    text: string;
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export class SetOfMark {
    /**
     * Injects a script into the WebContents to draw bounding boxes and numbers
     * on all interactive elements in the viewport.
     * Returns a JSON mapping of those elements.
     */
    static async annotateViewport(wc: WebContents): Promise<ElementAnnotation[]> {
        const script = `
            (() => {
                // 1. Cleanup any existing annotations
                document.querySelectorAll('._som_annotation').forEach(el => el.remove());

                // 2. Identify interactive elements
                const interactiveSelectors = [
                    'button', 'a', 'input', 'select', 'textarea', 
                    '[role="button"]', '[role="link"]', '[role="checkbox"]', 
                    '[role="radio"]', '[role="switch"]', '[role="tab"]',
                    '[tabindex]:not([tabindex="-1"])'
                ].join(', ');

                const elements = Array.from(document.querySelectorAll(interactiveSelectors));
                
                let idCounter = 1;
                const annotations = [];

                elements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    
                    // Filter out invisible, offscreen, or zero-size elements
                    if (rect.width === 0 || rect.height === 0 || el.disabled || window.getComputedStyle(el).visibility === 'hidden') {
                        return;
                    }

                    // Check if it's within the viewport
                    if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0) {
                        return;
                    }

                    const currentId = idCounter++;
                    
                    // Build annotation data
                    annotations.push({
                        id: currentId,
                        tag: el.tagName.toLowerCase(),
                        role: el.getAttribute('role'),
                        ariaLabel: el.getAttribute('aria-label'),
                        text: el.innerText ? el.innerText.trim().slice(0, 50) : '',
                        rect: {
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        }
                    });

                    // 3. Draw Bounding Box and Badge
                    const box = document.createElement('div');
                    box.className = '_som_annotation';
                    box.style.position = 'absolute';
                    box.style.left = (rect.left + window.scrollX) + 'px';
                    box.style.top = (rect.top + window.scrollY) + 'px';
                    box.style.width = rect.width + 'px';
                    box.style.height = rect.height + 'px';
                    box.style.border = '2px solid rgba(255, 0, 0, 0.7)';
                    box.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                    box.style.pointerEvents = 'none'; // Don't block clicks
                    box.style.zIndex = '2147483647'; // Max z-index
                    box.style.boxSizing = 'border-box';

                    const badge = document.createElement('div');
                    badge.className = '_som_annotation';
                    badge.textContent = currentId.toString();
                    badge.style.position = 'absolute';
                    badge.style.left = (rect.left + window.scrollX - 2) + 'px';
                    badge.style.top = (rect.top + window.scrollY - 16) + 'px';
                    badge.style.backgroundColor = 'red';
                    badge.style.color = 'white';
                    badge.style.fontSize = '12px';
                    badge.style.fontWeight = 'bold';
                    badge.style.padding = '0 4px';
                    badge.style.borderRadius = '2px';
                    badge.style.pointerEvents = 'none';
                    badge.style.zIndex = '2147483647';
                    
                    document.body.appendChild(box);
                    document.body.appendChild(badge);
                });

                return annotations;
            })();
        `;

        try {
            const result = await wc.executeJavaScript(script);
            return result as ElementAnnotation[];
        } catch (e) {
            console.error("SetOfMark annotation failed:", e);
            return [];
        }
    }

    /**
     * Removes the bounding boxes from the page.
     */
    static async cleanup(wc: WebContents) {
        const script = `
            (() => {
                document.querySelectorAll('._som_annotation').forEach(el => el.remove());
            })();
        `;
        try {
            await wc.executeJavaScript(script);
        } catch (e) {
            // Ignore
        }
    }
}
