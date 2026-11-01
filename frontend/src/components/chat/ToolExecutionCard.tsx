import React, { useState } from 'react';
import { Wrench, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ToolCallLog } from '../../types';

interface ToolExecutionCardProps {
  tool: ToolCallLog;
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ tool }) => {
  const [expanded, setExpanded] = useState(false);
  const isSuccess = tool.status === 'success';

  return (
    <div className="my-2 text-xs rounded-xl border border-nexus-700/60 bg-nexus-950/60 overflow-hidden shadow-inner">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-nexus-850/50 hover:bg-nexus-800/60 transition-colors text-left"
      >
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-md bg-violet-950/80 text-violet-300">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono font-medium text-slate-200">
            tool::{tool.tool_name}
          </span>
          {isSuccess ? (
            <span className="inline-flex items-center text-emerald-400 text-[11px] space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Executed</span>
            </span>
          ) : (
            <span className="inline-flex items-center text-rose-400 text-[11px] space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <span>{expanded ? 'Hide' : 'Inspect'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-nexus-950/90 border-t border-nexus-800 space-y-2">
          {tool.arguments && Object.keys(tool.arguments).length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                Arguments
              </div>
              <pre className="p-2 bg-nexus-900 rounded font-mono text-slate-300 overflow-x-auto text-[11px]">
                {JSON.stringify(tool.arguments, null, 2)}
              </pre>
            </div>
          )}

          {Boolean(tool.result) && (
            <div>
              <div className="text-[10px] uppercase font-semibold text-emerald-400/90 tracking-wider mb-1">
                Output
              </div>
              <pre className="p-2 bg-nexus-900 rounded font-mono text-slate-300 max-h-48 overflow-y-auto overflow-x-auto text-[11px]">
                {typeof tool.result === 'object'
                  ? JSON.stringify(tool.result, null, 2)
                  : String(tool.result)}
              </pre>
            </div>
          )}

          {tool.error && (
            <div>
              <div className="text-[10px] uppercase font-semibold text-rose-400/90 tracking-wider mb-1">
                Error Details
              </div>
              <div className="p-2 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 font-mono text-[11px]">
                {tool.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
