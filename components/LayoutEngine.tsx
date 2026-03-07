import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutMode, TabPosition, LayoutState, DEFAULT_LAYOUT_STATE, TabContextAction, TabGroup } from '../types/layout';
import { Tab } from '../types';
import { PaneToolbar } from './PaneToolbar';
import { EmptyPaneInput } from './EmptyPaneInput';
import {
    Grid3X3, Columns, Square, Layers, Move,
    Pin, Copy, Volume2, VolumeX, X, Plus,
    ArrowRightFromLine, PanelLeft, PanelRight,
    Save, RotateCcw, FolderPlus, Ungroup, GripVertical,
    ArrowLeftRight, Minimize2
} from 'lucide-react';

interface LayoutEngineProps {
    tabs: Tab[];
    activeTabId: string;
    secondaryActiveTabId: string | null;
    layoutState: LayoutState;
    onLayoutChange: (state: LayoutState) => void;
    onTabSelect: (tabId: string, pane: 'primary' | 'secondary') => void;
    onTabClose: (tabId: string) => void;
    onTabDuplicate: (tabId: string) => void;
    renderWebview: (tab: Tab, style: React.CSSProperties) => React.ReactNode;
    focusedPane: 'primary' | 'secondary';
    onFocusPane: (pane: 'primary' | 'secondary') => void;
    onNewTab?: () => void;
    onSwapPanes?: () => void;
    onNavigate?: (url: string, tabId: string) => void;
    onBack?: (tabId: string) => void;
    onForward?: (tabId: string) => void;
    onReload?: (tabId: string) => void;
}

// Layout mode icons and labels
const LAYOUT_MODES: { mode: LayoutMode; icon: React.ElementType; label: string }[] = [
    { mode: 'single', icon: Square, label: 'Single' },
    { mode: 'split', icon: Columns, label: 'Split' },
    { mode: 'grid', icon: Grid3X3, label: 'Grid' },
    { mode: 'stack', icon: Layers, label: 'Stack' },
    { mode: 'free', icon: Move, label: 'Free' },
];

export const LayoutEngine: React.FC<LayoutEngineProps> = ({
    tabs,
    activeTabId,
    secondaryActiveTabId,
    layoutState,
    onLayoutChange,
    onTabSelect,
    onTabClose,
    onTabDuplicate,
    renderWebview,
    focusedPane,
    onFocusPane,
    onNewTab,
    onSwapPanes,
    onNavigate,
    onBack,
    onForward,
    onReload
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

    // Free Mode State
    const [draggingTab, setDraggingTab] = useState<string | null>(null);
    const [resizingTab, setResizingTab] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

    // Split Mode State
    const [splitRatio, setSplitRatio] = useState(0.5); // 0.0 to 1.0 (50% default)
    const [isResizingSplit, setIsResizingSplit] = useState(false);

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Handle layout mode change
    const setLayoutMode = useCallback((mode: LayoutMode) => {
        let newState: LayoutState = { ...layoutState, mode };

        // Initialize positions for grid/free modes if empty
        if ((mode === 'grid' || mode === 'free') && layoutState.positions.length === 0) {
            const container = containerRef.current;
            if (container) {
                const { width, height } = container.getBoundingClientRect();
                const cols = layoutState.gridColumns || 2;
                const rows = layoutState.gridRows || 2;
                const cellWidth = width / cols;
                const cellHeight = height / rows;

                newState.positions = tabs.map((tab, i) => ({
                    tabId: tab.id,
                    x: (i % cols) * cellWidth,
                    y: Math.floor(i / cols) * cellHeight,
                    width: cellWidth,
                    height: cellHeight,
                    zIndex: i + 1
                }));
            }
        }

        onLayoutChange(newState);
    }, [layoutState, tabs, onLayoutChange]);

    // Handle context menu action
    const handleContextAction = useCallback((action: TabContextAction, tabId: string) => {
        setContextMenu(null);

        switch (action) {
            case 'duplicate': onTabDuplicate(tabId); break;
            case 'close': onTabClose(tabId); break;
            case 'closeOthers': tabs.filter(t => t.id !== tabId).forEach(t => onTabClose(t.id)); break;
            case 'closeToRight':
                const idx = tabs.findIndex(t => t.id === tabId);
                tabs.slice(idx + 1).forEach(t => onTabClose(t.id));
                break;
            case 'splitLeft':
                setLayoutMode('split');
                onTabSelect(tabId, 'primary');
                break;
            case 'splitRight':
                setLayoutMode('split');
                onTabSelect(tabId, 'secondary');
                break;
            case 'addToGrid': setLayoutMode('grid'); break;
            case 'floatTab': setLayoutMode('free'); break;
            case 'saveLayout':
                const saved = {
                    id: Date.now().toString(),
                    name: `Layout ${ layoutState.savedLayouts.length + 1 }`,
                    mode: layoutState.mode,
                    positions: layoutState.positions,
                    createdAt: Date.now()
                };
                onLayoutChange({
                    ...layoutState,
                    savedLayouts: [...layoutState.savedLayouts, saved]
                });
                break;
        }
    }, [tabs, layoutState, onLayoutChange, onTabClose, onTabDuplicate, onTabSelect, setLayoutMode]);

    // === FREE MODE INTERACTIONS ===
    const handleDragStart = (tabId: string, e: React.MouseEvent) => {
        if (layoutState.mode !== 'free') return;
        e.preventDefault();
        const pos = layoutState.positions.find(p => p.tabId === tabId);
        if (pos) {
            setDraggingTab(tabId);
            setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
            bringToFront(tabId);
        }
    };

    const handleResizeStart = (tabId: string, e: React.MouseEvent) => {
        if (layoutState.mode !== 'free') return;
        e.preventDefault();
        e.stopPropagation();
        const pos = layoutState.positions.find(p => p.tabId === tabId);
        if (pos) {
            setResizingTab(tabId);
            setResizeStart({ x: e.clientX, y: e.clientY, w: pos.width, h: pos.height });
            bringToFront(tabId);
        }
    };

    const bringToFront = (tabId: string) => {
        const maxZ = Math.max(...layoutState.positions.map(p => p.zIndex), 0);
        const newPositions = layoutState.positions.map(p =>
            p.tabId === tabId ? { ...p, zIndex: maxZ + 1 } : p
        );
        onLayoutChange({ ...layoutState, positions: newPositions });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (draggingTab) {
            const newPositions = layoutState.positions.map(p => {
                if (p.tabId === draggingTab) {
                    return { ...p, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
                }
                return p;
            });
            onLayoutChange({ ...layoutState, positions: newPositions });
        } else if (resizingTab) {
            const newPositions = layoutState.positions.map(p => {
                if (p.tabId === resizingTab) {
                    const deltaX = e.clientX - resizeStart.x;
                    const deltaY = e.clientY - resizeStart.y;
                    return {
                        ...p,
                        width: Math.max(200, resizeStart.w + deltaX),
                        height: Math.max(150, resizeStart.h + deltaY)
                    };
                }
                return p;
            });
            onLayoutChange({ ...layoutState, positions: newPositions });
        } else if (isResizingSplit && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newRatio = (e.clientX - containerRect.left) / containerRect.width;
            // Clamp between 0.2 and 0.8
            setSplitRatio(Math.min(0.8, Math.max(0.2, newRatio)));
        }
    }, [draggingTab, dragOffset, resizingTab, resizeStart, isResizingSplit, layoutState, onLayoutChange]);

    const handleMouseUp = () => {
        setDraggingTab(null);
        setResizingTab(null);
        setIsResizingSplit(false);
    };

    useEffect(() => {
        if (draggingTab || resizingTab || isResizingSplit) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [draggingTab, resizingTab, isResizingSplit, handleMouseMove]);


    // === RENDERERS ===

    const renderLayout = () => {
        const primaryTab = tabs.find(t => t.id === activeTabId);
        const secondaryTab = secondaryActiveTabId ? tabs.find(t => t.id === secondaryActiveTabId) : null;

        switch (layoutState.mode) {
            case 'single':
                return (
                    <div className="w-full h-full relative rounded-b-xl overflow-hidden shadow-sm bg-transparent">
                        {tabs.map(tab => {
                            const isActive = tab.id === activeTabId;
                            return (
                                <div
                                    key={tab.id}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        visibility: isActive ? 'visible' : 'hidden',
                                        zIndex: isActive ? 10 : 0,
                                        pointerEvents: isActive ? 'auto' : 'none',
                                    }}
                                    className="bg-transparent"
                                >
                                    {renderWebview(tab, { width: '100%', height: '100%' })}
                                </div>
                            );
                        })}
                    </div>
                );

            case 'split':
                return (
                    <div ref={containerRef} className="flex w-full h-full relative p-2" style={{ backgroundColor: 'var(--chrome-secondary, #E3F2FD)' }}>
                        {/* Primary Pane */}
                        <div
                            style={{ width: `${ splitRatio * 100 }%` }}
                            className="h-full pr-1 relative flex flex-col"
                        >
                            <div
                                className={`flex-1 flex flex-col w-full h-full rounded-2xl overflow-hidden bg-transparent shadow-sm transition-shadow relative ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`}
                                onClick={() => onFocusPane('primary')}
                            >
                                {primaryTab ? (
                                    <>
                                        <PaneToolbar
                                            tab={primaryTab}
                                            isActive={focusedPane === 'primary'}
                                            onNavigate={(url) => onNavigate?.(url, primaryTab.id)}
                                            onBack={() => onBack?.(primaryTab.id)}
                                            onForward={() => onForward?.(primaryTab.id)}
                                            onReload={() => onReload?.(primaryTab.id)}
                                            onFocus={() => onFocusPane('primary')}
                                        />
                                        <div className="flex-1 relative">
                                            {renderWebview(primaryTab, { width: '100%', height: '100%' })}
                                        </div>
                                    </>
                                ) : (
                                    <EmptyPaneInput
                                        onNavigate={(url) => onNavigate?.(url, activeTabId)}
                                        onFocus={() => onFocusPane('primary')}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Drag Handle */}
                        <div
                            className="w-2 -ml-1 -mr-1 z-30 cursor-col-resize flex items-center justify-center group outline-none h-full"
                            onMouseDown={(e) => { e.preventDefault(); setIsResizingSplit(true); }}
                        >
                            <div className="w-[4px] h-12 rounded-full bg-blue-200/50 group-hover:bg-blue-500 transition-colors backdrop-blur-sm" />
                        </div>

                        {/* Secondary Pane */}
                        <div
                            style={{ width: `${ (1 - splitRatio) * 100 }%` }}
                            className="h-full pl-1 relative flex flex-col"
                        >
                            <div
                                className={`flex-1 flex flex-col w-full h-full rounded-2xl overflow-hidden bg-transparent shadow-sm transition-shadow relative ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`}
                                onClick={() => onFocusPane('secondary')}
                            >
                                {secondaryTab ? (
                                    <>
                                        <PaneToolbar
                                            tab={secondaryTab}
                                            isActive={focusedPane === 'secondary'}
                                            onNavigate={(url) => onNavigate?.(url, secondaryTab.id)}
                                            onBack={() => onBack?.(secondaryTab.id)}
                                            onForward={() => onForward?.(secondaryTab.id)}
                                            onReload={() => onReload?.(secondaryTab.id)}
                                            onFocus={() => onFocusPane('secondary')}
                                        />
                                        <div className="flex-1 relative">
                                            {renderWebview(secondaryTab, { width: '100%', height: '100%' })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 p-4 overflow-auto">
                                        <EmptyPaneInput
                                            onNavigate={(url) => {
                                                onFocusPane('secondary');
                                                onNewTab?.();
                                                setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100);
                                            }}
                                            onFocus={() => onFocusPane('secondary')}
                                            placeholder="Open new URL in this pane"
                                        />
                                        {tabs.filter(t => t.id !== activeTabId).length > 0 && (
                                            <div className="mt-4 px-4">
                                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Or use existing tab</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {tabs.filter(t => t.id !== activeTabId).slice(0, 5).map(tab => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => onTabSelect(tab.id, 'secondary')}
                                                            className="px-3 py-1.5 rounded-full bg-transparent border border-gray-200 text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors truncate max-w-[150px]"
                                                        >
                                                            {tab.title || 'Untitled'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Floating Layout Controls */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 bg-transparent/90 backdrop-blur-md shadow-lg shadow-blue-500/20 rounded-full border border-blue-100 transition-all hover:scale-105 active:scale-95">
                            <button
                                onClick={() => onSwapPanes?.()}
                                className="p-2 rounded-full hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                                title="Swap Panes"
                            >
                                <ArrowLeftRight size={18} />
                            </button>
                            <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                            <button
                                onClick={() => onLayoutChange({ ...layoutState, mode: 'single' })}
                                className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-sm transition-colors flex items-center gap-2"
                                title="Merge / Close Split"
                            >
                                <Minimize2 size={16} /> Merge
                            </button>
                        </div>
                    </div>
                );

            // 1-2 Layout: Left (large) | Right (top/bottom stacked)
            case 'split-1-2':
                return (
                    <div ref={containerRef} className="flex w-full h-full relative bg-[#E3F2FD] p-2 gap-2">
                        {/* Left Pane (60%) */}
                        <div className="flex flex-col w-[60%] h-full">
                            <div
                                className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`}
                                onClick={() => onFocusPane('primary')}
                            >
                                {primaryTab ? (
                                    <>
                                        <PaneToolbar tab={primaryTab} isActive={focusedPane === 'primary'} onNavigate={(url) => onNavigate?.(url, primaryTab.id)} onBack={() => onBack?.(primaryTab.id)} onForward={() => onForward?.(primaryTab.id)} onReload={() => onReload?.(primaryTab.id)} onFocus={() => onFocusPane('primary')} />
                                        <div className="flex-1 relative">{renderWebview(primaryTab, { width: '100%', height: '100%' })}</div>
                                    </>
                                ) : <EmptyPaneInput onNavigate={(url) => onNavigate?.(url, activeTabId)} onFocus={() => onFocusPane('primary')} />}
                            </div>
                        </div>
                        {/* Right Pane (40% split top/bottom) */}
                        <div className="flex flex-col w-[40%] h-full gap-2">
                            <div
                                className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`}
                                onClick={() => onFocusPane('secondary')}
                            >
                                {secondaryTab ? (
                                    <>
                                        <PaneToolbar tab={secondaryTab} isActive={focusedPane === 'secondary'} onNavigate={(url) => onNavigate?.(url, secondaryTab.id)} onBack={() => onBack?.(secondaryTab.id)} onForward={() => onForward?.(secondaryTab.id)} onReload={() => onReload?.(secondaryTab.id)} onFocus={() => onFocusPane('secondary')} />
                                        <div className="flex-1 relative">{renderWebview(secondaryTab, { width: '100%', height: '100%' })}</div>
                                    </>
                                ) : <EmptyPaneInput onNavigate={(url) => { onFocusPane('secondary'); onNewTab?.(); setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100); }} onFocus={() => onFocusPane('secondary')} />}
                            </div>
                            <div className="flex-1 rounded-2xl overflow-hidden bg-transparent shadow-sm flex items-center justify-center text-gray-400">
                                <Plus size={24} className="mr-2" /> Slot 3 (Coming Soon)
                            </div>
                        </div>
                    </div>
                );

            // 2-1 Layout: Left (top/bottom stacked) | Right (large)
            case 'split-2-1':
                return (
                    <div ref={containerRef} className="flex w-full h-full relative bg-[#E3F2FD] p-2 gap-2">
                        {/* Left Pane (40% split top/bottom) */}
                        <div className="flex flex-col w-[40%] h-full gap-2">
                            <div
                                className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`}
                                onClick={() => onFocusPane('primary')}
                            >
                                {primaryTab ? (
                                    <>
                                        <PaneToolbar tab={primaryTab} isActive={focusedPane === 'primary'} onNavigate={(url) => onNavigate?.(url, primaryTab.id)} onBack={() => onBack?.(primaryTab.id)} onForward={() => onForward?.(primaryTab.id)} onReload={() => onReload?.(primaryTab.id)} onFocus={() => onFocusPane('primary')} />
                                        <div className="flex-1 relative">{renderWebview(primaryTab, { width: '100%', height: '100%' })}</div>
                                    </>
                                ) : <EmptyPaneInput onNavigate={(url) => onNavigate?.(url, activeTabId)} onFocus={() => onFocusPane('primary')} />}
                            </div>
                            <div className="flex-1 rounded-2xl overflow-hidden bg-transparent shadow-sm flex items-center justify-center text-gray-400">
                                <Plus size={24} className="mr-2" /> Slot 3 (Coming Soon)
                            </div>
                        </div>
                        {/* Right Pane (60%) */}
                        <div className="flex flex-col w-[60%] h-full">
                            <div
                                className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`}
                                onClick={() => onFocusPane('secondary')}
                            >
                                {secondaryTab ? (
                                    <>
                                        <PaneToolbar tab={secondaryTab} isActive={focusedPane === 'secondary'} onNavigate={(url) => onNavigate?.(url, secondaryTab.id)} onBack={() => onBack?.(secondaryTab.id)} onForward={() => onForward?.(secondaryTab.id)} onReload={() => onReload?.(secondaryTab.id)} onFocus={() => onFocusPane('secondary')} />
                                        <div className="flex-1 relative">{renderWebview(secondaryTab, { width: '100%', height: '100%' })}</div>
                                    </>
                                ) : <EmptyPaneInput onNavigate={(url) => { onFocusPane('secondary'); onNewTab?.(); setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100); }} onFocus={() => onFocusPane('secondary')} />}
                            </div>
                        </div>
                    </div>
                );

            // Horizontal Split: Top & Bottom
            case 'split-h':
                return (
                    <div ref={containerRef} className="flex flex-col w-full h-full bg-[#E3F2FD] p-2 gap-2">
                        <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('primary')}>
                            {primaryTab ? (
                                <>
                                    <PaneToolbar tab={primaryTab} isActive={focusedPane === 'primary'} onNavigate={(url) => onNavigate?.(url, primaryTab.id)} onBack={() => onBack?.(primaryTab.id)} onForward={() => onForward?.(primaryTab.id)} onReload={() => onReload?.(primaryTab.id)} onFocus={() => onFocusPane('primary')} />
                                    <div className="flex-1 relative">{renderWebview(primaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => onNavigate?.(url, activeTabId)} onFocus={() => onFocusPane('primary')} />}
                        </div>
                        <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('secondary')}>
                            {secondaryTab ? (
                                <>
                                    <PaneToolbar tab={secondaryTab} isActive={focusedPane === 'secondary'} onNavigate={(url) => onNavigate?.(url, secondaryTab.id)} onBack={() => onBack?.(secondaryTab.id)} onForward={() => onForward?.(secondaryTab.id)} onReload={() => onReload?.(secondaryTab.id)} onFocus={() => onFocusPane('secondary')} />
                                    <div className="flex-1 relative">{renderWebview(secondaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => { onFocusPane('secondary'); onNewTab?.(); setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100); }} onFocus={() => onFocusPane('secondary')} />}
                        </div>
                    </div>
                );

            // Vertical Split (same as split, but explicit)
            case 'split-v':
                return (
                    <div ref={containerRef} className="flex w-full h-full bg-[#E3F2FD] p-2 gap-2">
                        <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('primary')}>
                            {primaryTab ? (
                                <>
                                    <PaneToolbar tab={primaryTab} isActive={focusedPane === 'primary'} onNavigate={(url) => onNavigate?.(url, primaryTab.id)} onBack={() => onBack?.(primaryTab.id)} onForward={() => onForward?.(primaryTab.id)} onReload={() => onReload?.(primaryTab.id)} onFocus={() => onFocusPane('primary')} />
                                    <div className="flex-1 relative">{renderWebview(primaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => onNavigate?.(url, activeTabId)} onFocus={() => onFocusPane('primary')} />}
                        </div>
                        <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('secondary')}>
                            {secondaryTab ? (
                                <>
                                    <PaneToolbar tab={secondaryTab} isActive={focusedPane === 'secondary'} onNavigate={(url) => onNavigate?.(url, secondaryTab.id)} onBack={() => onBack?.(secondaryTab.id)} onForward={() => onForward?.(secondaryTab.id)} onReload={() => onReload?.(secondaryTab.id)} onFocus={() => onFocusPane('secondary')} />
                                    <div className="flex-1 relative">{renderWebview(secondaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => { onFocusPane('secondary'); onNewTab?.(); setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100); }} onFocus={() => onFocusPane('secondary')} />}
                        </div>
                    </div>
                );

            // Split 1-3: Big left + 3 stacked right
            case 'split-1-3':
                return (
                    <div ref={containerRef} className="flex w-full h-full bg-[#E3F2FD] p-2 gap-2">
                        {/* Big left pane */}
                        <div className={`w-[70%] flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('primary')}>
                            {primaryTab ? (
                                <>
                                    <PaneToolbar tab={primaryTab} isActive={focusedPane === 'primary'} onNavigate={(url) => onNavigate?.(url, primaryTab.id)} onBack={() => onBack?.(primaryTab.id)} onForward={() => onForward?.(primaryTab.id)} onReload={() => onReload?.(primaryTab.id)} onFocus={() => onFocusPane('primary')} />
                                    <div className="flex-1 relative">{renderWebview(primaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => onNavigate?.(url, activeTabId)} onFocus={() => onFocusPane('primary')} />}
                        </div>
                        {/* 3 stacked panes on right */}
                        <div className="w-[30%] flex flex-col gap-2">
                            <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('secondary')}>
                                {secondaryTab ? (
                                    <>
                                        <PaneToolbar tab={secondaryTab} isActive={focusedPane === 'secondary'} onNavigate={(url) => onNavigate?.(url, secondaryTab.id)} onBack={() => onBack?.(secondaryTab.id)} onForward={() => onForward?.(secondaryTab.id)} onReload={() => onReload?.(secondaryTab.id)} onFocus={() => onFocusPane('secondary')} />
                                        <div className="flex-1 relative">{renderWebview(secondaryTab, { width: '100%', height: '100%' })}</div>
                                    </>
                                ) : <EmptyPaneInput onNavigate={(url) => { onFocusPane('secondary'); onNewTab?.(); setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100); }} onFocus={() => onFocusPane('secondary')} />}
                            </div>
                            <div className="flex-1 flex items-center justify-center rounded-2xl bg-transparent shadow-sm text-gray-400"><Plus size={20} className="mr-2" /> Pane 3</div>
                            <div className="flex-1 flex items-center justify-center rounded-2xl bg-transparent shadow-sm text-gray-400"><Plus size={20} className="mr-2" /> Pane 4</div>
                        </div>
                    </div>
                );

            // Split 3-1: 3 stacked left + big right
            case 'split-3-1':
                return (
                    <div ref={containerRef} className="flex w-full h-full bg-[#E3F2FD] p-2 gap-2">
                        {/* 3 stacked panes on left */}
                        <div className="w-[30%] flex flex-col gap-2">
                            <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('primary')}>
                                {primaryTab ? (
                                    <>
                                        <PaneToolbar tab={primaryTab} isActive={focusedPane === 'primary'} onNavigate={(url) => onNavigate?.(url, primaryTab.id)} onBack={() => onBack?.(primaryTab.id)} onForward={() => onForward?.(primaryTab.id)} onReload={() => onReload?.(primaryTab.id)} onFocus={() => onFocusPane('primary')} />
                                        <div className="flex-1 relative">{renderWebview(primaryTab, { width: '100%', height: '100%' })}</div>
                                    </>
                                ) : <EmptyPaneInput onNavigate={(url) => onNavigate?.(url, activeTabId)} onFocus={() => onFocusPane('primary')} />}
                            </div>
                            <div className="flex-1 flex items-center justify-center rounded-2xl bg-transparent shadow-sm text-gray-400"><Plus size={20} className="mr-2" /> Pane 2</div>
                            <div className="flex-1 flex items-center justify-center rounded-2xl bg-transparent shadow-sm text-gray-400"><Plus size={20} className="mr-2" /> Pane 3</div>
                        </div>
                        {/* Big right pane */}
                        <div className={`w-[70%] flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('secondary')}>
                            {secondaryTab ? (
                                <>
                                    <PaneToolbar tab={secondaryTab} isActive={focusedPane === 'secondary'} onNavigate={(url) => onNavigate?.(url, secondaryTab.id)} onBack={() => onBack?.(secondaryTab.id)} onForward={() => onForward?.(secondaryTab.id)} onReload={() => onReload?.(secondaryTab.id)} onFocus={() => onFocusPane('secondary')} />
                                    <div className="flex-1 relative">{renderWebview(secondaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => { onFocusPane('secondary'); onNewTab?.(); setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100); }} onFocus={() => onFocusPane('secondary')} />}
                        </div>
                    </div>
                );

            // Quad View: 2x2 Grid
            case 'quad':
                return (
                    <div ref={containerRef} className="grid grid-cols-2 grid-rows-2 w-full h-full gap-2 bg-[#E3F2FD] p-2">
                        <div className={`flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'primary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('primary')}>
                            {primaryTab ? (
                                <>
                                    <PaneToolbar tab={primaryTab} isActive={focusedPane === 'primary'} onNavigate={(url) => onNavigate?.(url, primaryTab.id)} onBack={() => onBack?.(primaryTab.id)} onForward={() => onForward?.(primaryTab.id)} onReload={() => onReload?.(primaryTab.id)} onFocus={() => onFocusPane('primary')} />
                                    <div className="flex-1 relative">{renderWebview(primaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => onNavigate?.(url, activeTabId)} onFocus={() => onFocusPane('primary')} />}
                        </div>
                        <div className={`flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm ${ focusedPane === 'secondary' ? 'ring-2 ring-blue-400' : '' }`} onClick={() => onFocusPane('secondary')}>
                            {secondaryTab ? (
                                <>
                                    <PaneToolbar tab={secondaryTab} isActive={focusedPane === 'secondary'} onNavigate={(url) => onNavigate?.(url, secondaryTab.id)} onBack={() => onBack?.(secondaryTab.id)} onForward={() => onForward?.(secondaryTab.id)} onReload={() => onReload?.(secondaryTab.id)} onFocus={() => onFocusPane('secondary')} />
                                    <div className="flex-1 relative">{renderWebview(secondaryTab, { width: '100%', height: '100%' })}</div>
                                </>
                            ) : <EmptyPaneInput onNavigate={(url) => { onFocusPane('secondary'); onNewTab?.(); setTimeout(() => onNavigate?.(url, secondaryActiveTabId || ''), 100); }} onFocus={() => onFocusPane('secondary')} />}
                        </div>
                        <div className="flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm items-center justify-center text-gray-400"><Plus size={24} className="mr-2" /> Pane 3</div>
                        <div className="flex flex-col rounded-2xl overflow-hidden bg-transparent shadow-sm items-center justify-center text-gray-400"><Plus size={24} className="mr-2" /> Pane 4</div>
                    </div>
                );

            case 'grid':
                const cols = layoutState.gridColumns || 2;
                return (
                    <div ref={containerRef} className="w-full h-full grid gap-1 p-1 bg-gray-100" style={{ gridTemplateColumns: `repeat(${ cols }, 1fr)`, gridAutoRows: '1fr' }}>
                        {tabs.map((tab, i) => (
                            <div
                                key={tab.id}
                                className={`relative bg-transparent rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md ${ tab.id === activeTabId ? 'ring-2 ring-blue-500' : '' }`}
                                onClick={() => onTabSelect(tab.id, 'primary')}
                                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id }); }}
                            >
                                <div className="absolute top-0 left-0 right-0 h-7 bg-gray-50 border-b flex items-center px-2 z-10 group">
                                    <span className="text-xs text-gray-600 truncate flex-1">{tab.title}</span>
                                    <button onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }} className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100">
                                        <X size={12} />
                                    </button>
                                </div>
                                <div className="pt-7 h-full">
                                    {renderWebview(tab, { width: '100%', height: '100%' })}
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'stack':
                return (
                    <div ref={containerRef} className="w-full h-full relative bg-gray-100 p-8 flex items-center justify-center overflow-hidden">
                        {tabs.map((tab, i) => {
                            const idx = tabs.findIndex(t => t.id === activeTabId);
                            const dist = i - idx;
                            const isActive = i === idx;
                            return (
                                <motion.div
                                    key={tab.id}
                                    layout
                                    className={`absolute w-[80%] h-[80%] bg-transparent rounded-xl shadow-2xl overflow-hidden border border-gray-200 ${ isActive ? 'z-50' : '' }`}
                                    initial={false}
                                    animate={{
                                        scale: isActive ? 1 : 1 - Math.abs(dist) * 0.05,
                                        y: dist * 40,
                                        opacity: isActive ? 1 : 0.5,
                                        zIndex: isActive ? 100 : 100 - Math.abs(dist)
                                    }}
                                    onClick={() => onTabSelect(tab.id, 'primary')}
                                >
                                    {renderWebview(tab, { width: '100%', height: '100%' })}
                                </motion.div>
                            );
                        })}
                    </div>
                );

            case 'free':
                return (
                    <div ref={containerRef} className="w-full h-full relative bg-[#e3e5ea] overflow-hidden">
                        {/* Background hint */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                            <Move size={120} />
                        </div>

                        {layoutState.positions.map(pos => {
                            const tab = tabs.find(t => t.id === pos.tabId);
                            if (!tab) return null;

                            return (
                                <motion.div
                                    key={tab.id}
                                    initial={false}
                                    className={`absolute bg-transparent rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col ${ tab.id === activeTabId ? 'ring-2 ring-blue-500 z-[100]' : '' }`}
                                    style={{
                                        left: pos.x, top: pos.y, width: pos.width, height: pos.height, zIndex: pos.zIndex
                                    }}
                                    onMouseDown={() => { if (tab.id !== activeTabId) { onTabSelect(tab.id, 'primary'); bringToFront(tab.id); } }}
                                >
                                    {/* Draggable Header */}
                                    <div
                                        className="h-9 bg-gray-50 border-b flex items-center px-2 cursor-grab active:cursor-grabbing select-none shrink-0"
                                        onMouseDown={(e) => handleDragStart(tab.id, e)}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-gray-300 mr-2" />
                                        <span className="text-xs text-gray-700 font-medium truncate flex-1">{tab.title}</span>
                                        <div className="flex gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); setLayoutMode('single'); onTabSelect(tab.id, 'primary'); }} className="p-1 hover:bg-gray-200 rounded" title="Maximize">
                                                <Square size={10} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }} className="p-1 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    <PaneToolbar
                                        tab={tab}
                                        isActive={tab.id === activeTabId}
                                        onNavigate={(url) => onNavigate?.(url, tab.id)}
                                        onBack={() => onBack?.(tab.id)}
                                        onForward={() => onForward?.(tab.id)}
                                        onReload={() => onReload?.(tab.id)}
                                        onFocus={() => { onTabSelect(tab.id, 'primary'); bringToFront(tab.id); }}
                                    />

                                    {/* Webview Content */}
                                    <div className="flex-1 relative bg-transparent">
                                        {/* Interaction blocker overlay while dragging for performance */}
                                        {(draggingTab || resizingTab) && <div className="absolute inset-0 z-50 bg-transparent" />}
                                        {renderWebview(tab, { width: '100%', height: '100%' })}
                                    </div>

                                    {/* Resize Handles */}
                                    <div
                                        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center z-20 group"
                                        onMouseDown={(e) => handleResizeStart(tab.id, e)}
                                    >
                                        <svg width="8" height="8" viewBox="0 0 8 8" className="text-gray-300 group-hover:text-blue-500 transition-colors">
                                            <path d="M8 0L8 8L0 8" fill="currentColor" />
                                        </svg>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">


            {/* Main Area */}
            <div className="flex-1 relative overflow-hidden bg-transparent">
                {renderLayout()}
            </div>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed bg-transparent/90 backdrop-blur-md rounded-xl shadow-2xl border border-gray-100 py-1.5 z-[9999] min-w-[200px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ContextMenuItem icon={Copy} label="Duplicate Tab" onClick={() => handleContextAction('duplicate', contextMenu.tabId)} />
                        <ContextMenuItem icon={Pin} label="Pin Tab" onClick={() => handleContextAction('pin', contextMenu.tabId)} />
                        <div className="h-px bg-gray-200/50 my-1.5" />
                        <ContextMenuItem icon={PanelLeft} label="Split Left" onClick={() => handleContextAction('splitLeft', contextMenu.tabId)} />
                        <ContextMenuItem icon={PanelRight} label="Split Right" onClick={() => handleContextAction('splitRight', contextMenu.tabId)} />
                        <ContextMenuItem icon={Grid3X3} label="Add to Grid" onClick={() => handleContextAction('addToGrid', contextMenu.tabId)} />
                        <ContextMenuItem icon={Move} label="Float Tab (Free Mode)" onClick={() => handleContextAction('floatTab', contextMenu.tabId)} />
                        <div className="h-px bg-gray-200/50 my-1.5" />
                        <ContextMenuItem icon={X} label="Close Tab" onClick={() => handleContextAction('close', contextMenu.tabId)} danger />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Context menu item (reused)
const ContextMenuItem: React.FC<{ icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }> = ({ icon: Icon, label, onClick, danger }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${ danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100' }`}>
        <Icon size={15} className={danger ? "text-red-500" : "text-gray-500"} />
        {label}
    </button>
);

export default LayoutEngine;
