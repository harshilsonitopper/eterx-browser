import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, Cpu, HardDrive, Wifi, WifiOff,
    ArrowDown, ArrowUp, Clock, Zap, Activity
} from 'lucide-react';

interface TabPreviewProps {
    tabId: string;
    tabTitle: string;
    tabUrl: string;
    isVisible: boolean;
    position: { x: number; y: number };
    webviewRef: any;
    onClose: () => void;
}

interface TabMetrics {
    cpu: number;
    memory: number;
    networkUp: number;
    networkDown: number;
    isActive: boolean;
    lastActivity: number;
}

export const TabPreview: React.FC<TabPreviewProps> = ({
    tabId,
    tabTitle,
    tabUrl,
    isVisible,
    position,
    webviewRef,
    onClose
}) => {
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<TabMetrics>({
        cpu: 0,
        memory: 0,
        networkUp: 0,
        networkDown: 0,
        isActive: true,
        lastActivity: Date.now()
    });
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Capture screenshot on visibility
    useEffect(() => {
        if (!isVisible || !webviewRef) return;

        const captureScreenshot = async () => {
            try {
                const img = await webviewRef.capturePage();
                if (img) {
                    const dataUrl = img.toDataURL();
                    setScreenshot(dataUrl);
                }
            } catch (err) {
                console.error('Failed to capture screenshot:', err);
            }
        };

        // Initial capture
        captureScreenshot();

        // Update every 500ms for "live" feel
        intervalRef.current = setInterval(captureScreenshot, 500);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isVisible, webviewRef]);

    // Fetch metrics (simulated for now - would use IPC in production)
    useEffect(() => {
        if (!isVisible) return;

        const updateMetrics = async () => {
            try {
                // In production, this would call:
                // const data = await window.electron.getProcessMetrics(webviewRef?.getWebContentsId?.());

                // Simulated metrics for now
                setMetrics(prev => ({
                    cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() - 0.5) * 10)),
                    memory: 50 + Math.random() * 100,
                    networkUp: Math.random() * 50,
                    networkDown: Math.random() * 200,
                    isActive: true,
                    lastActivity: Date.now()
                }));
            } catch (err) {
                console.error('Failed to get metrics:', err);
            }
        };

        const metricsInterval = setInterval(updateMetrics, 1000);
        updateMetrics();

        return () => clearInterval(metricsInterval);
    }, [isVisible, webviewRef]);

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes.toFixed(0)} B/s`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
    };

    const formatMemory = (mb: number) => {
        if (mb < 1024) return `${mb.toFixed(0)} MB`;
        return `${(mb / 1024).toFixed(1)} GB`;
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="fixed z-[10000] pointer-events-none"
                    style={{
                        left: Math.max(10, Math.min(position.x - 160, window.innerWidth - 340)),
                        top: position.y + 20
                    }}
                >
                    {/* Main Preview Container - Glassmorphism */}
                    <div className="w-80 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-glass)] backdrop-blur-xl bg-[var(--bg-glass-panel)]">
                        {/* Screenshot Preview */}
                        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                            {screenshot ? (
                                <img
                                    src={screenshot}
                                    alt="Tab preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Globe className="w-12 h-12 text-gray-400 animate-pulse" />
                                </div>
                            )}

                            {/* Live indicator */}
                            <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/50 rounded-full backdrop-blur-sm">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-medium text-white">LIVE</span>
                            </div>
                        </div>

                        {/* Tab Info */}
                        <div className="p-3 border-b border-[var(--border)]">
                            <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                                {tabTitle || 'Untitled'}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                                {tabUrl}
                            </p>
                        </div>

                        {/* Performance Metrics */}
                        <div className="p-3 grid grid-cols-2 gap-2">
                            {/* CPU */}
                            <MetricCard
                                icon={Cpu}
                                label="CPU"
                                value={`${metrics.cpu.toFixed(1)}%`}
                                color={metrics.cpu > 50 ? 'text-orange-500' : 'text-blue-500'}
                                percentage={metrics.cpu}
                            />

                            {/* Memory */}
                            <MetricCard
                                icon={HardDrive}
                                label="Memory"
                                value={formatMemory(metrics.memory)}
                                color="text-purple-500"
                                percentage={Math.min(100, (metrics.memory / 500) * 100)}
                            />

                            {/* Network Down */}
                            <MetricCard
                                icon={ArrowDown}
                                label="Download"
                                value={formatBytes(metrics.networkDown * 1024)}
                                color="text-green-500"
                            />

                            {/* Network Up */}
                            <MetricCard
                                icon={ArrowUp}
                                label="Upload"
                                value={formatBytes(metrics.networkUp * 1024)}
                                color="text-cyan-500"
                            />
                        </div>

                        {/* Activity Status */}
                        <div className="px-3 pb-3">
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-tertiary)] rounded-lg">
                                <Activity size={12} className={metrics.isActive ? 'text-green-500' : 'text-[var(--text-muted)]'} strokeWidth={1.5} />
                                <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                                    {metrics.isActive ? 'Active' : 'Idle'} • Last activity {formatTimeAgo(metrics.lastActivity)}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Metric card subcomponent
const MetricCard: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
    percentage?: number;
}> = ({ icon: Icon, label, value, color, percentage }) => (
    <div className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded-lg">
        <div className={`p-1.5 rounded-md bg-[var(--bg-main)] ${color}`}>
            <Icon size={12} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">{value}</div>
        </div>
        {percentage !== undefined && (
            <div className="w-8 h-8 relative">
                <svg className="w-full h-full -rotate-90">
                    <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${(percentage / 100) * 75} 75`}
                        className={color}
                    />
                </svg>
            </div>
        )}
    </div>
);

// Time ago formatter
const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
};

export default TabPreview;
