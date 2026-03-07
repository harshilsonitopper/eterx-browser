
/**
 * services/agent/Perception.ts
 * 
 * Handles the "eyes" of the agent:
 * 1. AxTree Compression: Reducing DOM to semantic accessible elements.
 * 2. Set-of-Mark (SoM): Injecting visual markers for multimodal accuracy.
 */

export class AgentPerception {

    /**
     * Generates the client-side script to extract a Pruned Accessibility Tree.
     * This script is injected into the browser to return a simplified JSON structure.
     */
    static getAxTreeScript(): string {
        return `
        (function() {
            function isVisible(el) {
                if (!el) return false;
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            }

            function getSemanticRole(el) {
                if (el.tagName === 'A') return 'link';
                if (el.tagName === 'BUTTON') return 'button';
                if (el.tagName === 'INPUT') return 'input';
                if (el.tagName === 'IMG') return 'image';
                return el.getAttribute('role') || el.tagName.toLowerCase();
            }

            function traverse(node, depth = 0) {
                if (depth > 10) return null;
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        return { type: 'text', content: node.textContent.trim() };
                    }
                    return null;
                }

                const el = node;
                if (!isVisible(el)) return null;

                const role = getSemanticRole(el);
                const label = el.getAttribute('aria-label') || el.innerText || el.placeholder || '';
                
                // Interactive elements or meaningful text
                const isInteractive = ['link', 'button', 'input', 'textarea', 'select'].includes(role);
                const hasContent = label.length > 0;

                let children = [];
                node.childNodes.forEach(child => {
                    const res = traverse(child, depth + 1);
                    if (res) children.push(res);
                });

                if (isInteractive || (hasContent && children.length === 0)) {
                    // Generate a unique selector or ID
                    // In a real implementation, we'd map this to a unique Map<ID, Element>
                    // For now, we return the path/attributes
                    return {
                        role: role,
                        name: label.substring(0, 50),
                        attributes: {
                           id: el.id,
                           class: el.className,
                           href: el.href
                        },
                        children: children.length > 0 ? children : undefined
                    };
                } else if (children.length > 0) {
                    // Pass-through container
                    return children.length === 1 ? children[0] : { role: 'group', children };
                }
                
                return null;
            }

            return JSON.stringify(traverse(document.body));
        })();
        `;
    }

    /**
     * Generates the script to inject Set-of-Mark (SoM) overlays.
     * Places numbered bounding boxes over interactive elements.
     */
    static getSoMInjectionScript(): string {
        return `
        (function() {
            // Remove existing markers
            document.querySelectorAll('.eterx-som-marker').forEach(el => el.remove());

            const interactables = document.querySelectorAll('a, button, input, textarea, select, [role="button"]');
            let counter = 1;
            
            interactables.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden') {
                    const marker = document.createElement('div');
                    marker.className = 'eterx-som-marker';
                    marker.innerText = counter;
                    marker.style.position = 'absolute';
                    marker.style.left = (rect.left + window.scrollX) + 'px';
                    marker.style.top = (rect.top + window.scrollY) + 'px';
                    marker.style.background = '#000';
                    marker.style.color = '#fff';
                    marker.style.padding = '2px 4px';
                    marker.style.fontSize = '12px';
                    marker.style.fontWeight = 'bold';
                    marker.style.zIndex = '999999';
                    marker.style.pointerEvents = 'none';
                    marker.style.border = '1px solid #fff';
                    
                    document.body.appendChild(marker);
                    el.setAttribute('data-som-id', counter);
                    counter++;
                }
            });
            return counter;
        })();
        `;
    }
}
