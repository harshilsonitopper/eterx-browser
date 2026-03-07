/**
 * StorageService.ts - Complete Storage Manager
 */

const STORAGE_PREFIX = 'eterx_';

export const StorageService = {
    save<T>(key: string, data: T): void {
        try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data)); }
        catch (e) { console.error('[Storage] Save failed:', e); }
    },

    load<T>(key: string, defaultValue: T): T {
        try {
            const data = localStorage.getItem(STORAGE_PREFIX + key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { return defaultValue; }
    },

    remove(key: string): void { localStorage.removeItem(STORAGE_PREFIX + key); },

    getAllKeys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) keys.push(key.replace(STORAGE_PREFIX, ''));
        }
        return keys;
    },

    clearAll(): void { this.getAllKeys().forEach(key => this.remove(key)); },

    // Settings
    saveSettings(settings: any): void { this.save('settings', settings); },
    loadSettings(): any { return this.load('settings', null); },

    // Tabs
    saveTabs(tabs: any[]): void { this.save('tabs', tabs); },
    loadTabs(): any[] { return this.load('tabs', []); },

    // History
    saveHistory(history: any[]): void { this.save('history', history); },
    loadHistory(): any[] { return this.load('history', []); },
    addHistoryItem(item: any): void {
        const history = this.loadHistory();
        history.unshift(item);
        this.saveHistory(history.slice(0, 1000));
    },

    // Bookmarks
    saveBookmarks(bookmarks: any[]): void { this.save('bookmarks', bookmarks); },
    loadBookmarks(): any[] { return this.load('bookmarks', []); },

    // AI History
    saveAIHistory(history: any[]): void { this.save('ai_history', history); },
    loadAIHistory(): any[] { return this.load('ai_history', []); }
};
