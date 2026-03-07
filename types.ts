/**
 * types.ts - Core Application Types
 */

export interface Tab {
    id: string;
    title: string;
    url: string;
    isLoading: boolean;
    favicon?: string;
    history: string[];
    currentIndex: number;
    isSecure?: boolean;
    canGoBack?: boolean;
    canGoForward?: boolean;
    pinned?: boolean;
    muted?: boolean;
    partition?: string;
    groupId?: string;
    groupColor?: string;
    internalUrl?: string; // Tracks the URL for WebView src to prevent reload loops
    isIncognito?: boolean; // For incognito mode tabs
    isPlaying?: boolean; // Track if the tab is playing audio
    isRecording?: boolean; // Track if the tab is accessing microphone/camera
    zoomLevel?: number; // Zoom factor (1.0 = 100%)
}

export interface NewsItem {
    id: string;
    title: string;
    source: string;
    time: string;
    imageUrl: string;
    category: string;
}

export interface Shortcut {
    name: string;
    url: string;
    icon: string;
}

export interface HistoryItem {
    id: string;
    url: string;
    title: string;
    favicon?: string;
    visitedAt: number;
    visitCount?: number;
    timestamp?: number;
}

export interface Bookmark {
    id: string;
    url: string;
    title: string;
    favicon?: string;
    folderId?: string;
    folder?: boolean; // Indicates if this bookmark is a folder
    createdAt: number;
}

export interface BookmarkFolder {
    id: string;
    name: string;
    parentId?: string;
    createdAt: number;
}

export interface Download {
    id: string;
    url: string;
    filename: string;
    path: string;
    size: number;
    downloaded: number;
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
    startedAt: number;
    completedAt?: number;
}
