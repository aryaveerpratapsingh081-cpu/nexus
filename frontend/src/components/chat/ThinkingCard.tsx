import React, { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface ThinkingCardProps {
  thinking: string;
}

export const ThinkingCard: React.FC<ThinkingCardProps> = ({ thinking }) => {
  const [expanded, setExpanded] = useState(false);

  if (!thinking || !thinking.trim()) return null;

  return (
    <div className="mb-3 text-xs rounded-xl border border-violet-900/40 bg-violet-950/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-violet-900/20 transition-colors text-left text-violet-300"
      >
        <div className="flex items-center space-x-2">
          <Brain className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-medium text-violet-200">Model Reasoning Process</span>
        </div>
        <div className="flex items-center space-x-1 text-violet-400/80">
          <span>{expanded ? 'Collapse' : 'Expand'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-violet-900/40 bg-nexus-950/80 text-slate-300 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
          {thinking}
        </div>
      )}
    </div>
  );
};

