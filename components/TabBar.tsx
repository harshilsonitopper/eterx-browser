import React, { useState, useMemo } from 'react';
import { X, Plus, Pin, Globe, Volume2, VolumeX, Monitor, Layout, Grid, Maximize, Smartphone, ChevronRight, ChevronDown, Circle, Mic, FileText, FileImage, File } from 'lucide-react';
import { Tab } from '../types';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { TabPreview } from './TabPreview';
import { TabContextMenu } from './TabContextMenu';
import { MinimalLoader } from './MinimalLoader';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onSplitView?: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleMute: (id: string) => void;
  onFloatTab?: (id: string) => void;
  onNewTabRight?: (id: string) => void;
  onAddToGroup?: (id: string, group?: string) => void;
  onMoveToWindow?: (id: string) => void;
  onReorderTabs?: (tabs: Tab[]) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onNewTab,
  onSplitView,
  onTogglePin,
  onToggleMute,
  onFloatTab,
  onNewTabRight,
  onAddToGroup,
  onMoveToWindow,
  onReorderTabs
}) => {
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleContextAction = (action: string, tabId: string) => {
    switch (action) {
      case 'close': onCloseTab(tabId); break;
      case 'split-view': onSplitView?.(tabId); break;
      case 'pin': onTogglePin(tabId); break;
      case 'mute': onToggleMute(tabId); break;
      case 'float-tab': onFloatTab?.(tabId); break;
      case 'new-tab-right': onNewTabRight?.(tabId); break;
      case 'add-to-group': onAddToGroup?.(tabId); break;
      case 'move-to-window': onMoveToWindow?.(tabId); break;
    }
    setContextMenu(null);
  };

  const toggleGroupCollapse = (groupId: string) => {
    const newSet = new Set(collapsedGroups);
    if (newSet.has(groupId)) newSet.delete(groupId);
    else newSet.add(groupId);
    setCollapsedGroups(newSet);
  };

  // Group tabs into sections
  const sections = useMemo(() => {
    const res: { groupId?: string; groupColor?: string; tabs: Tab[] }[] = [];
    if (tabs.length === 0) return res;

    let currentSection = {
      groupId: tabs[0].groupId,
      groupColor: tabs[0].groupColor,
      tabs: [tabs[0]]
    };

    for (let i = 1; i < tabs.length; i++) {
      const tab = tabs[i];
      if (tab.groupId !== currentSection.groupId) {
        res.push(currentSection);
        currentSection = {
          groupId: tab.groupId,
          groupColor: tab.groupColor,
          tabs: [tab]
        };
      } else {
        currentSection.tabs.push(tab);
      }
    }
    res.push(currentSection);
    return res;
  }, [tabs]);

  const handleReorder = (sectionIndex: number, newSectionTabs: Tab[]) => {
    const newTabs = sections.flatMap((s, i) =>
      i === sectionIndex ? { ...s, tabs: newSectionTabs } : s
    ).flatMap(s => s.tabs);
    onReorderTabs?.(newTabs);
  };

  return (
    <>
      {/* Context Menu */}
      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      <div
        className="flex-1 flex items-end h-full select-none px-2 drag-region overflow-hidden"
        style={{ paddingTop: '10px', paddingBottom: '0px' }}
      >
        <div className="flex-1 flex items-end h-full min-w-0 pr-1">
          {sections.map((section, idx) => {
            const isGroup = !!section.groupId;
            const isCollapsed = isGroup && collapsedGroups.has(section.groupId!);

            return (
              <React.Fragment key={idx}>
                {/* Group Header */}
                {isGroup && (
                  <div className="flex items-end mx-1 mb-2 no-drag z-20 flex-shrink-0">
                    <button
                      onClick={() => toggleGroupCollapse(section.groupId!)}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all ring-1 ring-white/20"
                      style={{ backgroundColor: section.groupColor || '#2196F3' }}
                    >
                      {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                      <span className="truncate max-w-[80px]">{section.groupId}</span>
                      <span className="bg-black/10 px-1 py-0 rounded-full text-[9px] min-w-[14px]">{section.tabs.length}</span>
                    </button>
                  </div>
                )}

                {/* Tabs in this section */}
                {(!isGroup || !isCollapsed) && (
                  <Reorder.Group
                    axis="x"
                    values={section.tabs}
                    onReorder={(newOrder) => handleReorder(idx, newOrder)}
                    className="flex items-end h-full flex-initial min-w-0" // Removed flex-1 so it doesn't push + button away
                    style={{ gap: '2px' }} // Removed flexGrow style
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {section.tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const isPinned = !!tab.pinned;
                        const totalTabs = sections.reduce((acc, s) => acc + s.tabs.length, 0);
                        const isSmall = totalTabs > 8;

                        return (
                          <Reorder.Item
                            key={tab.id}
                            value={tab}
                            className={`h-[40px] relative group no-drag flex items-center transition-all duration-200 ease-out 
                                ${ isPinned ? 'flex-none w-[44px]' : 'flex-initial w-[240px] min-w-[36px]' }
                                ${ isSmall ? 'small-tab' : '' }`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
                            }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, width: 0 }}
                            layout
                            style={{ flexGrow: 0 }} // Ensure it doesn't try to grow beyond width in flex-initial parent
                          >
                            {/* Tab Background */}
                            {isActive ? (
                              <div className="absolute inset-0 z-10 pointer-events-none">
                                {/* Main Body */}
                                <div className="absolute top-[2px] bottom-[-2px] left-[16px] right-[16px] bg-white rounded-t-[14px]" />

                                {/* Left Chrome Curve (SVG) */}
                                <div className="absolute bottom-[-1px] left-0 w-[16px] h-[16px] z-20">
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0 16A16 16 0 0 0 16 0L16 16L0 16Z" fill="white" />
                                  </svg>
                                </div>

                                {/* Right Chrome Curve (SVG) */}
                                <div className="absolute bottom-[-1px] right-0 w-[16px] h-[16px] z-20">
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0 0A16 16 0 0 0 16 16L0 16L0 0Z" fill="white" />
                                  </svg>
                                </div>

                                {/* Bottom Filler */}
                                <div className="absolute bottom-[-2px] left-[16px] right-[16px] h-[4px] bg-white z-20" />
                              </div>
                            ) : (
                              /* Inactive Tab - Chrome Style (Transparent, Pill on Hover) */
                              <div className="absolute inset-0 z-0 pointer-events-none opacity-60 grayscale-[30%]">
                                <div className="absolute top-[2px] bottom-[2px] left-[2px] right-[2px] rounded-lg bg-transparent group-hover:bg-black/5 transition-colors duration-200" />
                                {/* Separator Line */}
                                <div className="absolute right-[-1px] top-[10px] bottom-[10px] w-[1px] bg-black/10 group-hover:opacity-0 transition-opacity" />
                              </div>
                            )}

                            {/* Group Color Line */}
                            {tab.groupId && (
                              <div
                                className="absolute bottom-[-1px] left-0 right-0 h-[3px] rounded-t-sm z-20"
                                style={{ backgroundColor: tab.groupColor || '#2196F3', opacity: isActive ? 1 : 0.6 }}
                              />
                            )}

                            {/* Tab Content */}
                            <div
                              className={`absolute top-0 bottom-0 left-[16px] right-[16px] flex items-center cursor-pointer z-20 
                                ${ isSmall || isPinned ? 'justify-center px-1' : 'px-3' }`}
                              onClick={() => onSwitchTab(tab.id)}
                            >
                              {/* Icon/Favicon */}
                              <div className={`flex-shrink-0 flex items-center justify-center w-4 h-4 relative ${ !isPinned && !isSmall ? 'mr-2' : '' }`}>
                                {tab.isLoading ? (
                                  <MinimalLoader size={16} className="text-gray-500" />
                                ) : isPinned ? (
                                  <Pin size={12} className="text-gray-600" />
                                ) : (
                                  <>
                                    {(() => {
                                      // 🧠 Handle Local Blob, Custom Protocol, and HTTP File Server Attachments
                                      const isLocalFile = tab.url?.startsWith('blob:') || tab.url?.startsWith('eterx-local://') || (tab.url?.includes('#name=') && tab.url?.includes('&type='));
                                      if (isLocalFile) {
                                        try {
                                          const hashSplit = tab.url.split('#');
                                          if (hashSplit.length > 1) {
                                            const params = new URLSearchParams(hashSplit[1]);
                                            const type = params.get('type') || '';
                                            if (type.includes('pdf')) return <FileText size={14} className="text-red-500" />;
                                            if (type.includes('text') || type.includes('plain')) return <FileText size={14} className="text-gray-500" />;
                                            if (type.includes('image')) return <FileImage size={14} className="text-blue-500" />;
                                            return <File size={14} className="text-gray-500" />;
                                          }
                                        } catch (e) { }
                                        return <FileText size={14} className="text-gray-500" />;
                                      }

                                      // Standard web pages or internal pages
                                      if (!tab.url || tab.url.startsWith('eterx://')) {
                                        return <Globe size={13} className="text-gray-400" />;
                                      } else {
                                        try {
                                          const hostname = new URL(tab.url).hostname;
                                          return (
                                            <img
                                              src={tab.favicon || `https://www.google.com/s2/favicons?sz=64&domain=${ hostname }`}
                                              alt=""
                                              style={{ imageRendering: '-webkit-optimize-contrast' as any }}
                                              className="w-4 h-4 rounded-sm relative z-10 bg-transparent object-contain transition-all duration-300"
                                              loading="eager"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://www.google.com/s2/favicons?sz=64&domain=google.com';
                                              }}
                                            />
                                          );
                                        } catch (e) {
                                          return <Globe size={13} className="text-gray-400" />;
                                        }
                                      }
                                    })()}
                                  </>
                                )}
                              </div>

                              {/* Title */}
                              {!isPinned && (
                                <span
                                  className={`text-[13px] truncate flex-1 transition-colors duration-200 select-none
                                      ${ isActive ? 'text-[#1e1e1e] font-medium' : 'text-[#474747] font-medium group-hover:text-black' }
                                      group-[.small-tab]:hidden`}
                                >
                                  {(() => {
                                    const isLocalFile2 = tab.url?.startsWith('blob:') || tab.url?.startsWith('eterx-local://') || (tab.url?.includes('#name=') && tab.url?.includes('&type='));
                                    if (isLocalFile2) {
                                      try {
                                        const hashSplit = tab.url.split('#');
                                        if (hashSplit.length > 1) {
                                          const params = new URLSearchParams(hashSplit[1]);
                                          const name = params.get('name');
                                          if (name) return decodeURIComponent(name);
                                        }
                                      } catch (e) { }
                                      return 'Local File Preview';
                                    }
                                    return tab.title || 'New Tab';
                                  })()}
                                </span>
                              )}

                              {/* Audio/Recording Indicators */}
                              {(tab.isPlaying || tab.muted || tab.isRecording) && !isPinned && (
                                <div className="flex items-center gap-1 flex-shrink-0 group-[.small-tab]:hidden">
                                  {/* Recording Indicator */}
                                  {tab.isRecording && (
                                    <div className="p-0.5 rounded-full hover:bg-black/10 text-red-500 transition-colors">
                                      <Mic size={12} />
                                    </div>
                                  )}

                                  {/* Audio Indicator */}
                                  {(tab.isPlaying || tab.muted) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onToggleMute(tab.id); }}
                                      className={`
                                        p-1 rounded-full transition-all duration-300 relative group/audio flex items-center justify-center
                                        ${ tab.muted
                                          ? 'bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600'
                                          : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'
                                        }
                                      `}
                                    >
                                      {/* Pulse Effect when Playing */}
                                      {!tab.muted && (
                                        <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-30 animate-ping" style={{ animationDuration: '2s' }}></div>
                                      )}

                                      {tab.muted ? (
                                        <VolumeX size={12} strokeWidth={2.5} className="relative z-10 transition-transform group-hover/audio:scale-110" />
                                      ) : (
                                        <Volume2 size={12} strokeWidth={2.5} className="relative z-10 transition-transform group-hover/audio:scale-110" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Close Button */}
                              {!isPinned && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                                  className={`ml-1.5 p-0.5 rounded-full hover:bg-black/10 transition-opacity flex-shrink-0 
                                      ${ isActive ? 'opacity-100 text-gray-500' : 'opacity-0 group-hover:opacity-100 text-gray-400' }
                                      group-[.small-tab]:hidden`}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </Reorder.Item>
                        );
                      })}
                    </AnimatePresence>
                  </Reorder.Group>
                )
                }
              </React.Fragment>
            );
          })}

          {/* New Tab Button */}
          <button
            onClick={onNewTab}
            className="ml-1.5 mb-[6px] p-0 rounded-full hover:bg-black/10 text-gray-600 transition-colors no-drag flex-shrink-0 w-7 h-7 flex items-center justify-center active:scale-95"
            title="New Tab"
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>
      </div >
    </>
  );
};
