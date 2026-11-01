import React from 'react';
import { Sparkles, Server, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { OllamaStatus } from '../../types';

interface StatusBarProps {
  ollamaStatus: OllamaStatus | null;
  backendHealthy: boolean;
  onNavigateSettings: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  ollamaStatus,
  backendHealthy,
  onNavigateSettings,
}) => {
  const isOllamaOnline = ollamaStatus?.is_available ?? false;
  const isModelReady = ollamaStatus?.is_selected_model_available ?? false;
  const currentModel = ollamaStatus?.selected_model || 'qwen3:4b';

  return (
    <footer className="h-9 px-6 bg-nexus-950 border-t border-nexus-800 flex items-center justify-between text-xs text-slate-400 select-none">
      {/* Left: Backend & Ollama indicators */}
      <div className="flex items-center space-x-5">
        {/* Backend Status */}
        <div className="flex items-center space-x-1.5">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span>Backend:</span>
          {backendHealthy ? (
            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>127.0.0.1:8005</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Offline</span>
            </span>
          )}
        </div>

        {/* Ollama Status */}
        <div 
          onClick={onNavigateSettings}
          className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200 transition-colors"
          title="Click to view Ollama diagnostics in Settings"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Ollama:</span>
          {isOllamaOnline ? (
            isModelReady ? (
              <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400 font-medium">
                <AlertTriangle className="w-3 h-3" />
                <span>Model Missing</span>
              </span>
            )
          ) : (
            <span className="flex items-center space-x-1 text-rose-400 font-medium">
              <XCircle className="w-3 h-3" />
              <span>Offline</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Active Model Badge */}
      <div className="flex items-center space-x-2">
        <span>Active Model:</span>
        <button
          onClick={onNavigateSettings}
          className="px-2 py-0.5 rounded-md bg-nexus-850 hover:bg-nexus-800 text-slate-200 font-mono text-[11px] border border-nexus-700/80 transition-colors"
        >
          {currentModel}
        </button>
      </div>
    </footer>
  );
};
