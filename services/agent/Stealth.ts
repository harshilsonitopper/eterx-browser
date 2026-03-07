
/**
 * services/agent/Stealth.ts
 * 
 * Implements evasion tactics to bypass bot detection (PerimeterX, Cloudflare, etc.).
 * 
 * 1. Human-like Mouse Movement (Bezier curves).
 * 2. Random delays.
 * 3. Fingerprint spoofing logic (injected via CDP/Preload).
 */

export class AgentStealth {

    /**
     * Generates a Bézier curve path for mouse movement to simulate human behavior.
     * Returns a list of {x, y} coordinates.
     */
    static generateHumanPath(startX: number, startY: number, endX: number, endY: number, steps: number = 20): { x: number, y: number }[] {
        const path = [];

        // Random control point for the curve
        const controlX = startX + (endX - startX) / 2 + (Math.random() - 0.5) * 100;
        const controlY = startY + (endY - startY) / 2 + (Math.random() - 0.5) * 100;

        for (let t = 0; t <= 1; t += 1 / steps) {
            // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX;
            const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY;
            path.push({ x, y });
        }

        return path;
    }

    /**
     * Returns a script to mask automation indicators (webdriver, navigator properties).
     */
    static getStealthInjectionScript(): string {
        return `
        (function() {
            // Mask navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // Mock Plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3] // Primitive mock
            });

            // Mask Chrome Automation Extension
            window.chrome = {
                runtime: {}
            };
            
            // Randomize Canvas Fingerprint (Subtle noise)
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                // Add tiny variations if it's a fingerprinting attempt
                return originalToDataURL.apply(this, arguments);
            };
        })();
        `;
    }

    /**
     * Calculates a randomized delay based on human reaction times.
     */
    static getThinkingDelay(complexity: 'low' | 'medium' | 'high' = 'medium'): number {
        const base = complexity === 'low' ? 500 : complexity === 'medium' ? 1500 : 3000;
        const variance = Math.random() * 1000;
        return base + variance;
    }
}
