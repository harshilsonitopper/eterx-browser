/**
 * types/layout.ts - Layout Types
 */

export type LayoutMode =
    | 'single'
    | 'split'
    | 'grid'
    | 'free'
    | 'stack'
    | 'split-1-2'
    | 'split-2-1'
    | 'split-h'
    | 'split-v'
    | 'split-1-3'
    | 'split-3-1'
    | 'quad';

export interface TabPosition {
    tabId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
}

export type TabContextAction =
    | 'duplicate'
    | 'pin'
    | 'close'
    | 'closeOthers'
    | 'closeToRight'
    | 'splitLeft'
    | 'splitRight'
    | 'addToGrid'
    | 'floatTab'
    | 'saveLayout';

export interface TabGroup {
    id: string;
    title: string;
    color: string;
    tabIds: string[];
}

export interface SavedLayout {
    id: string;
    name: string;
    mode: LayoutMode;
    positions: TabPosition[];
    createdAt: number;
}

export interface LayoutState {
    mode: LayoutMode;
    primaryPane: string[];
    secondaryPane?: string[];
    splitRatio?: number;
    gridConfig?: {
        rows: number;
        cols: number;
    };
    // Extended properties for LayoutEngine
    positions: TabPosition[];
    gridColumns?: number;
    gridRows?: number;
    savedLayouts: SavedLayout[];
}

export const DEFAULT_LAYOUT_STATE: LayoutState = {
    mode: 'single',
    primaryPane: [],
    secondaryPane: [],
    splitRatio: 0.5,
    positions: [], // Default empty
    savedLayouts: [] // Default empty
};
