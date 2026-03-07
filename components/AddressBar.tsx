import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Globe, Lock, X, ArrowLeft, ArrowRight, RotateCw, Star, Home, MoreHorizontal, LayoutGrid, Zap, Settings, Layout, AudioLines, Sparkles, PanelRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchService } from '../services/SearchService';
import { PermissionPopup } from './PermissionPopup';

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onToggleSidebar: () => void;
  onToggleSmartSidebar?: () => void;
  isSidebarOpen: boolean;
  isSmartSidebarOpen?: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onNewTab: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenServices: () => void;
  onOpenSpreadsheet: () => void;
  onToggleMenu: () => void;
  onAskAI: (query: string) => void;
  onProfileClick: () => void;
  searchEngine?: string;
  showHomeButton?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  userAvatar?: string;
  activePermissionRequest?: { permission: string, origin: string } | null;
  onPermissionResponse?: (allow: boolean) => void;
  onStartLive?: () => void;
}

interface Suggestion {
  text: string;
  type: 'search' | 'url' | 'history';
}

export const AddressBar: React.FC<AddressBarProps> = ({
  url,
  onNavigate,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onReload,
  onToggleSidebar,
  isSidebarOpen,
  onToggleMenu,
  onAskAI,
  onProfileClick,
  searchEngine = 'google',
  showHomeButton = false,
  isBookmarked = false,
  onToggleBookmark,
  userAvatar,
  onOpenSettings,
  activePermissionRequest,
  onPermissionResponse,
  onStartLive,
  onToggleSmartSidebar,
  isSmartSidebarOpen
}) => {
  const [input, setInput] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const parseUrl = useCallback((urlString: string) => {
    if (urlString === 'eterx://newtab' || !urlString) return { domain: '', path: '', isSecure: false };
    try {
      const parsed = new URL(urlString);
      return {
        isSecure: parsed.protocol === 'https:',
        domain: parsed.hostname.replace('www.', ''),
        path: parsed.pathname + parsed.search
      };
    } catch {
      return { domain: urlString, path: '', isSecure: false };
    }
  }, []);

  const urlParts = parseUrl(url);

  useEffect(() => {
    if (!isFocused) {
      setInput(url === 'eterx://newtab' ? '' : url);
    }
  }, [url, isFocused]);

  // Cache for suggestions
  const suggestionCache = useRef<Map<string, string[]>>(new Map());

  // Fetch suggestions
  useEffect(() => {
    if (!input.trim() || input.length < 2 || !isFocused) {
      setSuggestions([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchSuggestions = async () => {
      // Check cache first
      if (suggestionCache.current.has(input)) {
        const cached = suggestionCache.current.get(input)!;
        setSuggestions(cached.map(t => ({ text: t, type: 'search' } as Suggestion)).slice(0, 6));
        return;
      }

      const sugs = await SearchService.getSuggestions(input);
      suggestionCache.current.set(input, sugs); // Cache result
      setSuggestions(sugs.map(t => ({ text: t, type: 'search' } as Suggestion)).slice(0, 6));
    };

    // INSTANT fetch - no debounce
    fetchSuggestions();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [input, isFocused]);

  // Detect if input is a natural language query (Comet-style)
  const isNaturalLanguageQuery = (text: string): boolean => {
    const lower = text.toLowerCase().trim();

    // Agentic patterns
    const agenticPatterns = [
      /^(search for|find|look for|buy|purchase|order|book)\s/,
      /^(go to|open|navigate to|take me to)\s/,
      /^(what is|what are|who is|when is|where is|why is|how to|how do|how can)\s/,
      /^(summarize|compare|analyze|explain|describe)\s/,
      /^(help me|i want to|i need to|can you|could you|please)\s/,
      /^(show me|tell me|give me)\s/
    ];

    // Check patterns
    if (agenticPatterns.some(p => p.test(lower))) return true;

    // Question marks indicate natural language
    if (text.includes('?')) return true;

    // Multiple words with common question words
    const words = lower.split(/\s+/);
    if (words.length >= 3 && ['what', 'how', 'why', 'when', 'where', 'who', 'which'].includes(words[0])) {
      return true;
    }

    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = selectedIndex >= 0 && suggestions[selectedIndex]
      ? suggestions[selectedIndex].text
      : input.trim();

    const getSearchUrl = (engine: string, query: string) => {
      const q = encodeURIComponent(query);
      switch (engine) {
        case 'bing': return `https://www.bing.com/search?q=${ q }`;
        case 'duckduckgo': return `https://duckduckgo.com/?q=${ q }`;
        case 'yahoo': return `https://in.search.yahoo.com/search?p=${ q }`;
        case 'yandex': return `https://yandex.com/search/?text=${ q }`;
        case 'google': default: return `https://www.google.com/search?q=${ q }`;
      }
    };

    if (value) {
      // 🧠 COMET-STYLE: Detect natural language and route to AI
      if (isNaturalLanguageQuery(value)) {
        console.log('[AddressBar] 🤖 Detected NL query, routing to AI:', value);
        if (onAskAI) {
          onAskAI(value);
        }
        inputRef.current?.blur();
        setSuggestions([]);
        setSelectedIndex(-1);
        return;
      }

      let targetUrl = value;
      // Simple heuristic for URLs
      const isUrl = /^(http(s)?:\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g.test(value) ||
        /^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{1,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g.test(value) ||
        value.startsWith('eterx://') ||
        value.startsWith('file://');

      if (!isUrl && !value.startsWith('http')) {
        targetUrl = getSearchUrl(searchEngine, value);
      } else if (!value.startsWith('http') && !value.startsWith('eterx://') && !value.startsWith('file://')) {
        targetUrl = `https://${ value }`;
      }

      onNavigate(targetUrl);
      inputRef.current?.blur();
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onNavigate(suggestion);
    setInput(suggestion);
    inputRef.current?.blur();
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
      setInput(url === 'eterx://newtab' ? '' : url);
      setSuggestions([]);
      setSelectedIndex(-1);
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      if (suggestions[0]) {
        setInput(suggestions[0].text);
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInput(url === 'eterx://newtab' ? '' : url); // Show full URL on focus
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setSelectedIndex(-1);
      // Format URL for display
      try {
        if (url && !url.startsWith('eterx://') && !url.startsWith('file://')) {
          const urlObj = new URL(url);
          // "youtube.com" instead of "https://www.youtube.com/..."
          const clean = urlObj.hostname.replace(/^www\./, '') + (urlObj.pathname === '/' ? '' : urlObj.pathname);
          setInput(clean);
        }
      } catch (e) {
        // Fallback
      }
    }, 200);
  };

  // Initial Sync for clean URL
  useEffect(() => {
    if (!isFocused && url && !url.startsWith('eterx://')) {
      try {
        const urlObj = new URL(url);
        const clean = urlObj.hostname.replace(/^www\./, '') + (urlObj.pathname === '/' ? '' : urlObj.pathname);
        setInput(clean);
      } catch {
        setInput(url);
      }
    } else if (!isFocused) {
      setInput(url === 'eterx://newtab' ? '' : url);
    }
  }, [url, isFocused]);

  return (
    <div className="flex items-center w-full gap-1 h-full px-2">
      {/* Navigation Controls - Clean Island Style */}
      <div className="flex items-center gap-0.5 px-1 text-gray-700">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className={`p-1.5 rounded-full transition-all flex items-center justify-center
            ${ canGoBack ? 'hover:bg-black/5 active:scale-95' : 'opacity-40 cursor-not-allowed' }
          `}
          title="Back"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <button
          onClick={onForward}
          disabled={!canGoForward}
          className={`p-1.5 rounded-full transition-all flex items-center justify-center
            ${ canGoForward ? 'hover:bg-black/5 active:scale-95' : 'opacity-40 cursor-not-allowed' }
          `}
          title="Forward"
        >
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
        <button
          onClick={onReload}
          className="p-1.5 rounded-full transition-all flex items-center justify-center hover:bg-black/5 active:scale-95 group"
          title="Reload"
        >
          <RotateCw size={17} strokeWidth={2.5} className="group-active:rotate-180 transition-transform duration-500" />
        </button>

        {showHomeButton && (
          <button
            onClick={() => onNavigate('eterx://newtab')}
            className={`
              p-1.5 rounded-full transition-all active:scale-95 group
              ${ url === 'eterx://newtab' ? 'bg-black/5' : 'hover:bg-black/5' }
            `}
            title="Home"
          >
            <Home size={17} strokeWidth={2.5} className="transition-transform group-hover:scale-105" />
          </button>
        )}
      </div>

      {/* Address Bar - Chrome Omnibox Style */}
      <motion.div
        className={`flex-1 relative h-9 ${ isFocused ? 'z-50' : '' } transition-all duration-200`}
        initial={false}
      >
        <form onSubmit={handleSubmit} className="relative w-full h-full">
          <div
            className={`
              flex items-center gap-2 px-3 h-full w-full transition-all duration-200
              ${ isFocused && suggestions.length > 0 ? 'rounded-t-[20px] rounded-b-none' : 'rounded-full' }
              ${ isFocused
                ? 'bg-white shadow-[0_1px_6px_rgba(32,33,36,0.28)] border-transparent'
                : 'bg-[#f1f3f4] border-transparent hover:bg-[#e8eaed] shadow-[inset_0_-1px_0_rgba(0,0,0,0.03)]'
              }
            `}
          >
            {/* Permission Chip (Left Side) */}
            <AnimatePresence>
              {activePermissionRequest && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex items-center gap-2 bg-red-100/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1 mr-2 rounded-full border border-red-200/50 dark:border-red-800/30 flex-shrink-0"
                >
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {activePermissionRequest.permission} requested
                  </span>
                  <PermissionPopup
                    isOpen={true}
                    permission={activePermissionRequest.permission}
                    origin={activePermissionRequest.origin}
                    onAllow={() => onPermissionResponse && onPermissionResponse(true)}
                    onBlock={() => onPermissionResponse && onPermissionResponse(false)}
                    onClose={() => onPermissionResponse && onPermissionResponse(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Security Icon */}
            <div className={`flex-shrink-0 transition-opacity ml-1 flex items-center justify-center ${ isFocused ? 'opacity-100' : 'opacity-70' }`}>
              {urlParts.isSecure ? (
                <Lock size={14} className="text-green-700" strokeWidth={2.5} />
              ) : url === 'eterx://newtab' ? (
                <Search size={14} className="text-gray-500" strokeWidth={2.5} />
              ) : (
                <Globe size={14} className="text-gray-500" strokeWidth={2.5} />
              )}
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={isFocused ? input : (url === 'eterx://newtab' ? '' : urlParts.domain + (urlParts.path !== '/' ? urlParts.path : ''))}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectedIndex(-1);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Search or enter URL"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] h-full w-full font-medium ml-1"
              spellCheck={false}
              autoComplete="off"
            />

            {/* AI Mode Dynamic Ray Pill (Right Side of URL Bar) */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="ai-mode-pill focus:outline-none focus:ring-2 focus:ring-indigo-500/30 flex-shrink-0 z-10"
            >
              <div className="ai-mode-pill-inner">
                <AudioLines size={15} strokeWidth={2.5} className="opacity-80" />
                <span>AI Mode</span>
              </div>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isFocused && input && (
                <button
                  type="button"
                  onClick={() => { setInput(''); inputRef.current?.focus(); }}
                  className="p-1 hover:bg-black/5 rounded-full text-[var(--text-tertiary)] transition-colors"
                >
                  <X size={14} />
                </button>
              )}

              {/* Voice Search Button Removed */}

              {url !== 'eterx://newtab' && !isFocused && (
                <button
                  type="button"
                  className={`p-1 rounded-full transition-colors hover:bg-black/5 ${ isBookmarked ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-700' }`}
                  onClick={onToggleBookmark}
                >
                  <Star size={16} strokeWidth={2.5} fill={isBookmarked ? "currentColor" : "none"} />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Suggestions Dropdown - Solid White & Connected */}
        <AnimatePresence>
          {isFocused && (suggestions.length > 0 || (input && input.length > 0)) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.05, ease: "easeOut" }} // Lightning fast
              className="absolute top-full left-0 right-0 mt-0 rounded-b-2xl overflow-hidden z-[100] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-black/5 border-t border-gray-100"
            >
              {suggestions.map((suggestion, index) => {
                // Highlight matching part
                const matchIndex = suggestion.text.toLowerCase().indexOf(input.toLowerCase());
                const pre = matchIndex >= 0 ? suggestion.text.slice(0, matchIndex) : '';
                const match = matchIndex >= 0 ? suggestion.text.slice(matchIndex, matchIndex + input.length) : '';
                const post = matchIndex >= 0 ? suggestion.text.slice(matchIndex + input.length) : suggestion.text;

                return (
                  <div
                    key={index}
                    className={`
                    group flex items-center justify-between px-3 py-2.5 mx-2 my-1 transition-all cursor-pointer relative rounded-xl
                    ${ selectedIndex === index ? 'bg-[#f2f2f2]' : 'hover:bg-[#f2f2f2]' }
                  `}
                  >
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-colors
                      ${ selectedIndex === index ? 'bg-white shadow-sm text-black' : 'text-gray-400 group-hover:text-gray-600' }
                    `}>
                        {suggestion.type === 'history' ? <RotateCw size={15} strokeWidth={2} /> : <Search size={16} strokeWidth={2} />}
                      </div>

                      <span className={`text-[15px] truncate text-[#202124] ${ selectedIndex === index ? 'font-medium' : '' }`}>
                        {matchIndex >= 0 ? (
                          <>
                            {pre}<span className="font-semibold">{match}</span><span className="font-bold">{post}</span>
                          </>
                        ) : (
                          suggestion.text
                        )}
                      </span>
                    </button>

                    {/* Hover Arrow Action with Modern Spring Animation */}
                    <motion.button
                      initial={{ opacity: 0, x: -5, scale: 0.8 }}
                      whileHover={{ scale: 1.15, rotate: -45, color: '#1a73e8' }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInput(suggestion.text);
                        inputRef.current?.focus();
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:bg-white hover:shadow-sm rounded-full transition-all"
                      title="Fill into search"
                    >
                      <ArrowLeft size={16} className="rotate-45" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 pl-4 pr-3 text-gray-700">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSmartSidebar}
          className={`p-1.5 rounded-full transition-all ${ isSmartSidebarOpen ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'hover:bg-black/5' }`}
          title="Toggle Sidebar"
        >
          <PanelRight size={18} strokeWidth={2.5} />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-full hover:bg-black/5 transition-all"
          title="Settings"
        >
          <Settings size={18} strokeWidth={2.5} />
        </button>

        {/* Profile */}
        <button
          onClick={onProfileClick}
          className="flex items-center justify-center p-1 rounded-full hover:bg-black/5 transition-all"
        >
          <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-700 text-[11px] font-bold">
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>U</span>
            )}
          </div>
        </button>

        {/* Browser Menu */}
        <button
          onClick={onToggleMenu}
          className="p-1.5 rounded-full hover:bg-black/5 transition-all"
        >
          <MoreHorizontal size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};