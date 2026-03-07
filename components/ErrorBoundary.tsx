import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 text-white p-4">
                    <div className="flex flex-col w-full max-w-4xl p-8 bg-gray-900 rounded-lg shadow-2xl border border-red-500/30 overflow-hidden max-h-[90vh]">
                        <div className="text-red-400 text-2xl font-bold mb-4 font-mono">⚠️ Runtime Error</div>
                        <div className="text-left bg-black/50 p-4 rounded mb-4 overflow-auto max-h-[150px] border border-white/10">
                            <code className="text-red-300 font-mono text-sm block mb-2">{this.state.error?.toString()}</code>
                        </div>
                        <div className="text-left bg-black/50 p-4 rounded mb-6 overflow-auto border border-white/10 flex-1">
                            <pre className="text-gray-400 font-mono text-xs whitespace-pre-wrap">{this.state.error?.stack}</pre>
                        </div>
                        <div className="flex gap-4 mt-auto">
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                            >
                                Clear Storage & Reload
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded font-medium transition-colors"
                            >
                                Reload
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
