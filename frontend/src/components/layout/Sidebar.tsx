import React from 'react';
import { 
  Home, 
  Mic,
  Bot, 
  FolderSearch, 
  LayoutGrid, 
  Activity, 
  History, 
  Settings,
  ShieldCheck,
  Terminal,
  Sparkles
} from 'lucide-react';
import { PageId } from '../../types';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const navItems: { id: PageId; label: string; icon: React.FC<{ className?: string }>; highlight?: boolean }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'kashish', label: 'Kashish Voice', icon: Mic, highlight: true },
    { id: 'assistant', label: 'Kashish Chat', icon: Bot },
    { id: 'files', label: 'Smart Files', icon: FolderSearch },
    { id: 'apps', label: 'Applications', icon: LayoutGrid },
    { id: 'system', label: 'System Monitor', icon: Activity },
    { id: 'tasks', label: 'Task History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-nexus-900 border-r border-nexus-700/50 flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-nexus-800/80 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-md shadow-violet-900/30">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-slate-100 flex items-center gap-1.5">
              <span>NEXUS</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800/60">
                AI OS
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Desktop Environment</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
                    : item.highlight
                    ? 'text-violet-300 hover:bg-violet-950/40 hover:text-white border border-violet-900/30'
                    : 'text-slate-300 hover:bg-nexus-800 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Security Shield Badge at bottom of sidebar */}
      <div className="p-4 m-3 rounded-xl bg-nexus-850 border border-nexus-700/60">
        <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-300 mb-1">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Security Enforced</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Restricted directories & allowlisted application launcher active.
        </p>
      </div>
    </aside>
  );
};

