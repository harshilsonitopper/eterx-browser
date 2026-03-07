/**
 * PasswordService.ts - Password Manager Service
 */

import { StorageService } from './StorageService';

export interface SavedPassword {
    id: string;
    url: string;
    username: string;
    password: string;
    createdAt: number;
    updatedAt: number;
}

const PASSWORDS_KEY = 'passwords';

export const PasswordService = {
    /**
     * Get all saved passwords
     */
    getAll(): SavedPassword[] {
        return StorageService.load<SavedPassword[]>(PASSWORDS_KEY, []);
    },

    /**
     * Save a new password
     */
    save(url: string, username: string, password: string): SavedPassword {
        const passwords = this.getAll();
        const newPassword: SavedPassword = {
            id: Math.random().toString(36).substring(7),
            url,
            username,
            password,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        passwords.push(newPassword);
        StorageService.save(PASSWORDS_KEY, passwords);
        return newPassword;
    },

    /**
     * Update a password
     */
    update(id: string, updates: Partial<SavedPassword>): boolean {
        const passwords = this.getAll();
        const index = passwords.findIndex(p => p.id === id);
        if (index >= 0) {
            passwords[index] = { ...passwords[index], ...updates, updatedAt: Date.now() };
            StorageService.save(PASSWORDS_KEY, passwords);
            return true;
        }
        return false;
    },

    /**
     * Delete a password
     */
    delete(id: string): boolean {
        const passwords = this.getAll();
        const filtered = passwords.filter(p => p.id !== id);
        if (filtered.length < passwords.length) {
            StorageService.save(PASSWORDS_KEY, filtered);
            return true;
        }
        return false;
    },

    /**
     * Find passwords for a URL
     */
    findForUrl(url: string): SavedPassword[] {
        const passwords = this.getAll();
        try {
            const domain = new URL(url).hostname;
            return passwords.filter(p => {
                try {
                    return new URL(p.url).hostname === domain;
                } catch {
                    return false;
                }
            });
        } catch {
            return [];
        }
    }
};
