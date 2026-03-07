import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Book, ChevronRight, ChevronDown,
    Layout, Command, Sparkles, Settings,
    Monitor, Keyboard, Mouse, Zap,
    Grid3X3, Columns, Move, Layers
} from 'lucide-react';

interface HelpGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Section {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
}

export const HelpGuide: React.FC<HelpGuideProps> = ({ isOpen, onClose }) => {
    const [expandedSection, setExpandedSection] = useState<string | null>('layouts');

    const sections: Section[] = [
        {
            id: 'layouts',
            title: 'Tab Layouts',
            icon: Layout,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        EterX offers multiple layout modes to organize your tabs the way you work best.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <LayoutCard
                            icon={Monitor}
                            title="Single"
                            description="Focus on one tab at a time. Classic browsing experience."
                        />
                        <LayoutCard
                            icon={Columns}
                            title="Split View"
                            description="View two tabs side by side. Great for comparison or reference."
                        />
                        <LayoutCard
                            icon={Grid3X3}
                            title="Grid"
                            description="Arrange tabs in a customizable grid. Monitor multiple pages at once."
                        />
                        <LayoutCard
                            icon={Layers}
                            title="Stack"
                            description="Tabs stacked like cards. Quick visual switching between tabs."
                        />
                        <LayoutCard
                            icon={Move}
                            title="Free Layout"
                            description="Drag and resize tabs anywhere. Create your perfect workspace."
                        />
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Tip:</strong> Right-click any tab to access layout options quickly!
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'shortcuts',
            title: 'Keyboard Shortcuts',
            icon: Keyboard,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Speed up your workflow with keyboard shortcuts.
                    </p>

                    <div className="space-y-2">
                        <ShortcutRow keys={['Ctrl', 'T']} action="New tab" />
                        <ShortcutRow keys={['Ctrl', 'W']} action="Close tab" />
                        <ShortcutRow keys={['Ctrl', 'Shift', 'T']} action="Reopen closed tab" />
                        <ShortcutRow keys={['Ctrl', 'L']} action="Focus address bar" />
                        <ShortcutRow keys={['Ctrl', 'Shift', 'S']} action="Toggle split view" />
                        <ShortcutRow keys={['Ctrl', 'Shift', 'G']} action="Grid layout" />
                        <ShortcutRow keys={['Ctrl', 'Shift', 'A']} action="Toggle AI sidebar" />
                        <ShortcutRow keys={['F11']} action="Fullscreen" />
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Open the <strong>Shortcut Manager</strong> (Ctrl+K) to customize all shortcuts.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'ai',
            title: 'AI Assistant',
            icon: Sparkles,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        EterX includes a powerful AI assistant to help you browse smarter.
                    </p>

                    <div className="space-y-3">
                        <FeatureCard
                            title="Smart Navigation"
                            description="Tell the AI what you want to do, and it will navigate for you."
                        />
                        <FeatureCard
                            title="Page Analysis"
                            description="Ask questions about the current page content."
                        />
                        <FeatureCard
                            title="Task Automation"
                            description="Let the AI fill forms, click buttons, and complete multi-step tasks."
                        />
                    </div>

                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                            <strong>Try it:</strong> Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">Ctrl+Shift+Space</kbd> for quick AI query.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'preview',
            title: 'Tab Previews',
            icon: Monitor,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Hover over any tab to see a live preview with performance metrics.
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Live page preview (updates in real-time)</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">CPU & Memory usage per tab</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Zap className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Network activity (upload/download)</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'settings',
            title: 'Settings & Customization',
            icon: Settings,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Personalize EterX to match your preferences.
                    </p>

                    <div className="space-y-2">
                        <SettingItem title="Appearance" description="Light/Dark mode, accent colors, fonts" />
                        <SettingItem title="Privacy" description="Clear data, ad privacy, tracking protection" />
                        <SettingItem title="AI Settings" description="Model selection, creativity level, sidebar position" />
                        <SettingItem title="Startup" description="New tab, restore session, custom homepage" />
                        <SettingItem title="Shortcuts" description="Customize all keyboard shortcuts" />
                    </div>
                </div>
            )
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sidebar */}
                        <div className="w-64 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-800 p-4">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                    <Book className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-white">Help Guide</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Learn EterX</p>
                                </div>
                            </div>

                            <nav className="space-y-1">
                                {sections.map(section => (
                                    <button
                                        key={section.id}
                                        onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${expandedSection === section.id
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <section.icon size={16} />
                                        <span className="flex-1 text-sm font-medium">{section.title}</span>
                                        <ChevronRight
                                            size={14}
                                            className={`transition-transform ${expandedSection === section.id ? 'rotate-90' : ''}`}
                                        />
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                    {sections.find(s => s.id === expandedSection)?.title || 'Welcome'}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <AnimatePresence mode="wait">
                                    {expandedSection ? (
                                        <motion.div
                                            key={expandedSection}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            {sections.find(s => s.id === expandedSection)?.content}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-12"
                                        >
                                            <Book className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                                Welcome to EterX
                                            </h3>
                                            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                                Select a topic from the sidebar to learn about EterX features.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Helper components
const LayoutCard: React.FC<{ icon: React.ElementType; title: string; description: string }> = ({ icon: Icon, title, description }) => (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
            <Icon size={16} className="text-blue-500" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">{title}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
);

const ShortcutRow: React.FC<{ keys: string[]; action: string }> = ({ keys, action }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{action}</span>
        <div className="flex items-center gap-1">
            {keys.map((key, i) => (
                <React.Fragment key={i}>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
                        {key}
                    </kbd>
                    {i < keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
                </React.Fragment>
            ))}
        </div>
    </div>
);

const FeatureCard: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-0.5">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
);

const SettingItem: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <ChevronRight size={14} className="text-gray-400" />
    </div>
);

export default HelpGuide;
