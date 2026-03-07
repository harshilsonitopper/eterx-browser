export class CDPManager {
    static attachedSessions = new Map();
    /**
     * Attaches the debugger to the specified WebContents if not already attached.
     */
    static async attach(webContents) {
        const id = webContents.id;
        if (this.attachedSessions.get(id))
            return;
        try {
            if (!webContents.debugger.isAttached()) {
                webContents.debugger.attach('1.3');
            }
            // Enable required domains
            await webContents.debugger.sendCommand('Input.enable');
            await webContents.debugger.sendCommand('Page.enable');
            await webContents.debugger.sendCommand('Runtime.enable');
            await webContents.debugger.sendCommand('Network.enable');
            this.attachedSessions.set(id, true);
            console.log(`[CDPManager] Attached to WebContents ${id}`);
            webContents.on('destroyed', () => {
                this.attachedSessions.delete(id);
            });
        }
        catch (err) {
            console.error(`[CDPManager] Failed to attach to WebContents ${id}:`, err);
            throw err;
        }
    }
    /**
     * Dispatches a native mouse click at the specified coordinates.
     */
    static async mouseClick(webContents, x, y) {
        await this.attach(webContents);
        // Mouse Down
        await webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: x,
            y: y,
            button: 'left',
            clickCount: 1
        });
        // Small delay to simulate human click
        await new Promise(resolve => setTimeout(resolve, 50));
        // Mouse Up
        await webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: x,
            y: y,
            button: 'left',
            clickCount: 1
        });
    }
    /**
     * Dispatches native layout-aware typing.
     */
    static async typeText(webContents, text) {
        await this.attach(webContents);
        for (const char of text) {
            await webContents.debugger.sendCommand('Input.dispatchKeyEvent', {
                type: 'char',
                text: char,
                unmodifiedText: char,
            });
            // Random human-like delay between keys
            await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
        }
    }
    /**
     * Performs a wheel scroll.
     */
    static async scroll(webContents, deltaX, deltaY) {
        await this.attach(webContents);
        await webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            x: 0,
            y: 0,
            deltaX: deltaX,
            deltaY: deltaY
        });
    }
    /**
     * captures a high-quality screenshot via CDP (bypassing renderer overhead)
     */
    static async captureScreenshot(webContents) {
        await this.attach(webContents);
        const result = await webContents.debugger.sendCommand('Page.captureScreenshot', {
            format: 'jpeg',
            quality: 50,
            fromSurface: true
        });
        return result.data; // Base64 jpeg
    }
    /**
     * Gets the accessibility tree for precise element targeting.
     */
    static async getAccessibilityTree(webContents) {
        await this.attach(webContents);
        return await webContents.debugger.sendCommand('Accessibility.getFullAXTree');
    }
}
