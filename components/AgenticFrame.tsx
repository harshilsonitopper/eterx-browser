import React from 'react';

interface AgenticFrameProps {
    isActive: boolean;
    status?: string;
}

/**
 * AgenticFrame - Animated border overlay when AI agent is actively working
 * Shows a pulsing/scanning border effect to indicate autonomous operation
 */
export const AgenticFrame: React.FC<AgenticFrameProps> = ({ isActive, status }) => {
    if (!isActive) return null;

    return (
        <div className="agentic-frame-overlay">
            {/* Animated border - all 4 sides */}
            <div className="agentic-border agentic-border-top" />
            <div className="agentic-border agentic-border-right" />
            <div className="agentic-border agentic-border-bottom" />
            <div className="agentic-border agentic-border-left" />

            {/* Corner accents */}
            <div className="agentic-corner agentic-corner-tl" />
            <div className="agentic-corner agentic-corner-tr" />
            <div className="agentic-corner agentic-corner-bl" />
            <div className="agentic-corner agentic-corner-br" />

            {/* Status indicator */}
            {status && (
                <div className="agentic-status">
                    <div className="agentic-pulse" />
                    <span>{status}</span>
                </div>
            )}

            <style>{`
        .agentic-frame-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
        }
        
        .agentic-border {
          position: absolute;
          background: linear-gradient(90deg, 
            transparent 0%, 
            #00ff88 20%, 
            #00ffff 50%, 
            #00ff88 80%, 
            transparent 100%
          );
          animation: scanline 2s linear infinite;
        }
        
        .agentic-border-top {
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          animation: scanline-horizontal 1.5s ease-in-out infinite;
        }
        
        .agentic-border-bottom {
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          animation: scanline-horizontal 1.5s ease-in-out infinite reverse;
        }
        
        .agentic-border-left {
          top: 0;
          left: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, 
            transparent 0%, 
            #00ff88 20%, 
            #00ffff 50%, 
            #00ff88 80%, 
            transparent 100%
          );
          animation: scanline-vertical 1.5s ease-in-out infinite;
        }
        
        .agentic-border-right {
          top: 0;
          right: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, 
            transparent 0%, 
            #00ff88 20%, 
            #00ffff 50%, 
            #00ff88 80%, 
            transparent 100%
          );
          animation: scanline-vertical 1.5s ease-in-out infinite reverse;
        }
        
        .agentic-corner {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 3px solid #00ff88;
        }
        
        .agentic-corner-tl {
          top: 10px;
          left: 10px;
          border-right: none;
          border-bottom: none;
          animation: corner-pulse 1s ease-in-out infinite;
        }
        
        .agentic-corner-tr {
          top: 10px;
          right: 10px;
          border-left: none;
          border-bottom: none;
          animation: corner-pulse 1s ease-in-out infinite 0.25s;
        }
        
        .agentic-corner-bl {
          bottom: 10px;
          left: 10px;
          border-right: none;
          border-top: none;
          animation: corner-pulse 1s ease-in-out infinite 0.5s;
        }
        
        .agentic-corner-br {
          bottom: 10px;
          right: 10px;
          border-left: none;
          border-top: none;
          animation: corner-pulse 1s ease-in-out infinite 0.75s;
        }
        
        .agentic-status {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid #00ff88;
          border-radius: 30px;
          color: #00ff88;
          font-size: 13px;
          font-weight: 600;
          font-family: system-ui, -apple-system, sans-serif;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }
        
        .agentic-pulse {
          width: 10px;
          height: 10px;
          background: #00ff88;
          border-radius: 50%;
          animation: pulse 0.8s ease-in-out infinite;
        }
        
        @keyframes scanline-horizontal {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes scanline-vertical {
          0% { background-position: 0 -200%; }
          100% { background-position: 0 200%; }
        }
        
        @keyframes corner-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
        </div>
    );
};

/**
 * ClickIndicator - Visual ripple effect at click location
 */
export const ClickIndicator: React.FC<{ x: number; y: number; onComplete: () => void }> = ({ x, y, onComplete }) => {
    React.useEffect(() => {
        const timer = setTimeout(onComplete, 600);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="click-indicator" style={{ left: x, top: y }}>
            <div className="click-ripple" />
            <div className="click-dot" />
            <style>{`
        .click-indicator {
          position: fixed;
          pointer-events: none;
          z-index: 10000;
          transform: translate(-50%, -50%);
        }
        
        .click-ripple {
          width: 60px;
          height: 60px;
          border: 3px solid #ff4444;
          border-radius: 50%;
          animation: click-expand 0.6s ease-out forwards;
        }
        
        .click-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          background: #ff4444;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: click-dot-fade 0.6s ease-out forwards;
        }
        
        @keyframes click-expand {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        
        @keyframes click-dot-fade {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
        }
      `}</style>
        </div>
    );
};

/**
 * TypeIndicator - Visual indicator for typing action
 */
export const TypeIndicator: React.FC<{ x: number; y: number; text: string }> = ({ x, y, text }) => {
    return (
        <div className="type-indicator" style={{ left: x, top: y }}>
            <span className="type-text">{text}</span>
            <div className="type-cursor" />
            <style>{`
        .type-indicator {
          position: fixed;
          pointer-events: none;
          z-index: 10000;
          display: flex;
          align-items: center;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid #ffaa00;
          border-radius: 6px;
          color: #ffaa00;
          font-size: 12px;
          font-family: monospace;
          transform: translateY(-100%);
          margin-top: -10px;
        }
        
        .type-text {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .type-cursor {
          width: 2px;
          height: 14px;
          background: #ffaa00;
          margin-left: 2px;
          animation: blink 0.5s linear infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default AgenticFrame;
