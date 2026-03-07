/**
 * UserPreferenceService.ts
 * Manages persistent user preferences for the Agent.
 * Uses localStorage to persist settings across sessions.
 */

export interface UserPreferences {
    defaultSearchMode?: 'fast' | 'deep' | 'research';
    alwaysUseVideo?: boolean;
    autoReadAloud?: boolean;
    theme?: 'light' | 'dark' | 'system';
}

const STORAGE_KEY = 'eterx_agent_preferences';

class UserPreferenceServiceClass {
    private preferences: UserPreferences;

    constructor() {
        this.preferences = this.load();
    }

    private load(): UserPreferences {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Failed to load preferences:', e);
            return {};
        }
    }

    private save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
        } catch (e) {
            console.error('Failed to save preferences:', e);
        }
    }

    get<K extends keyof UserPreferences>(key: K): UserPreferences[K] | undefined {
        return this.preferences[key];
    }

    set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
        this.preferences[key] = value;
        this.save();
        console.log(`[Preferences] Set ${key} = ${value}`);
    }

    getAll(): UserPreferences {
        return { ...this.preferences };
    }
}

export const UserPreferenceService = new UserPreferenceServiceClass();
