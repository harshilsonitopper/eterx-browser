
import { useState, useCallback } from 'react';

export type BrowserAction =
    | { type: 'TAB_CLOSE'; tab: any; index: number }
    | { type: 'TAB_OPEN'; tab: any }
    | { type: 'NAVIGATE'; tabId: string; fromUrl: string; toUrl: string };

export const useUndoRedo = (
    onRestoreTab: (tab: any) => void,
    onCloseTab: (id: string) => void,
    onNavigate: (url: string, tabId: string) => void
) => {
    const [undoStack, setUndoStack] = useState<BrowserAction[]>([]);
    const [redoStack, setRedoStack] = useState<BrowserAction[]>([]);

    const record = useCallback((action: BrowserAction) => {
        console.log('[UndoRedo] Recording:', action.type);
        setUndoStack(prev => [...prev.slice(-49), action]); // Limit 50
        setRedoStack([]); // Clear redo on new action
    }, []);

    const undo = useCallback(() => {
        setUndoStack(prev => {
            if (prev.length === 0) return prev;
            const action = prev[prev.length - 1];
            const newStack = prev.slice(0, -1);

            console.log('[UndoRedo] Undoing:', action.type);

            // Execute Inverse
            switch (action.type) {
                case 'TAB_CLOSE':
                    onRestoreTab(action.tab);
                    setRedoStack(r => [...r, action]);
                    break;
                case 'TAB_OPEN':
                    onCloseTab(action.tab.id);
                    setRedoStack(r => [...r, action]);
                    break;
                case 'NAVIGATE':
                    // Complex: We just navigate back to 'fromUrl'
                    // In reality, webview.goBack() is better, but this handles URL state
                    onNavigate(action.fromUrl, action.tabId);
                    setRedoStack(r => [...r, action]);
                    break;
            }

            return newStack;
        });
    }, [onRestoreTab, onCloseTab, onNavigate]);

    const redo = useCallback(() => {
        setRedoStack(prev => {
            if (prev.length === 0) return prev;
            const action = prev[prev.length - 1];
            const newStack = prev.slice(0, -1);

            console.log('[UndoRedo] Redoing:', action.type);

            // Re-Execute
            switch (action.type) {
                case 'TAB_CLOSE':
                    onCloseTab(action.tab.id);
                    setUndoStack(u => [...u, action]);
                    break;
                case 'TAB_OPEN':
                    // Redo Open: Re-create the tab
                    onRestoreTab(action.tab);
                    setUndoStack(u => [...u, action]);
                    break;
                case 'NAVIGATE':
                    onNavigate(action.toUrl, action.tabId);
                    setUndoStack(u => [...u, action]);
                    break;
            }

            return newStack;
        });
    }, [onCloseTab, onNavigate, onRestoreTab]);

    return { undo, redo, record, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
};
