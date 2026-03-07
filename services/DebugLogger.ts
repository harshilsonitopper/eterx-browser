type LogType = 'info' | 'success' | 'warn' | 'error';

export interface LogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: LogType;
    source?: string;
}

type LogListener = (entry: LogEntry) => void;

class DebugLoggerService {
    private listeners: LogListener[] = [];
    private logs: LogEntry[] = [];
    private MAX_LOGS = 50;

    public log(message: string, source: string = 'System') {
        this.addEntry(message, 'info', source);
    }

    public success(message: string, source: string = 'System') {
        this.addEntry(message, 'success', source);
    }

    public warn(message: string, source: string = 'System') {
        this.addEntry(message, 'warn', source);
    }

    public error(message: string, source: string = 'System') {
        this.addEntry(message, 'error', source);
    }

    private addEntry(message: string, type: LogType, source: string) {
        const entry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            message,
            type,
            source
        };

        this.logs = [entry, ...this.logs].slice(0, this.MAX_LOGS);
        this.notifyListeners(entry);

        // Also log to browser console for devtools access
        const style = type === 'error' ? 'color: red' : type === 'success' ? 'color: green' : 'color: blue';
        console.log(`%c[${source}] ${message}`, style);
    }

    public subscribe(listener: LogListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public getLogs() {
        return this.logs;
    }

    public clear() {
        this.logs = [];
        this.listeners.forEach(l => l({
            id: 'clear',
            timestamp: Date.now(),
            message: 'Logs cleared',
            type: 'info'
        }));
    }

    private notifyListeners(entry: LogEntry) {
        this.listeners.forEach(l => l(entry));
    }
}

export const DebugLogger = new DebugLoggerService();
