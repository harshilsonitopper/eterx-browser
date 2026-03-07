/**
 * PermissionManager.ts
 * 
 * Handles persistent permission storage for the browser.
 * 
 * Structure:
 * {
 *   "example.com": {
 *     "media": "allow",
 *     "geolocation": "block",
 *     "notifications": "ask"
 *   }
 * }
 */

export type PermissionType = 'media' | 'geolocation' | 'notifications' | 'midi' | 'pointerLock' | 'openExternal' | 'unknown';
export type PermissionState = 'allow' | 'block' | 'ask';

interface PermissionStore {
    [domain: string]: {
        [key in PermissionType]?: PermissionState;
    };
}

const STORAGE_KEY = 'eterx_permissions_v1';

export const PermissionManager = {
    // Load from storage
    load(): PermissionStore {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('[PermissionManager] Failed to load permissions', e);
            return {};
        }
    },

    // Save to storage
    save(store: PermissionStore) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        } catch (e) {
            console.error('[PermissionManager] Failed to save permissions', e);
        }
    },

    // Get permission state for a domain
    getPermission(domain: string, type: PermissionType): PermissionState {
        if (!domain) return 'ask';
        const store = this.load();

        // Check wildcard or specific
        if (store[domain] && store[domain][type]) {
            return store[domain][type]!;
        }

        return 'ask'; // Default
    },

    // Set permission state
    setPermission(domain: string, type: PermissionType, state: PermissionState) {
        if (!domain) return;
        const store = this.load();

        if (!store[domain]) {
            store[domain] = {};
        }

        store[domain][type] = state;
        this.save(store);
        console.log(`[PermissionManager] Set ${domain} ${type} to ${state}`);
    },

    // Reset/Clear for a domain
    resetPermissions(domain: string) {
        const store = this.load();
        if (store[domain]) {
            delete store[domain];
            this.save(store);
        }
    },

    // Helper: Extract domain from URL
    getDomain(url: string): string {
        try {
            // Support eterx://, file://, http://, https://
            if (!url) return '';
            const hostname = new URL(url).hostname;
            return hostname || url; // Fallback for some schemes
        } catch {
            return '';
        }
    }
};
