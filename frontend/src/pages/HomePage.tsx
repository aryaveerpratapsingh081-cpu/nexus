import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  AppWindow, 
  Activity, 
  Cpu, 
  HardDrive, 
  Sparkles, 
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  History,
  Send,
  Mic
} from 'lucide-react';
import { PageId, SystemStats, OllamaStatus, TaskItem } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

interface HomePageProps {
  systemStats: SystemStats | null;
  ollamaStatus: OllamaStatus | null;
  recentTasks: TaskItem[];
  onNavigate: (page: PageId) => void;
  onExecutePrompt: (prompt: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  systemStats,
  ollamaStatus,
  recentTasks,
  onNavigate,
  onExecutePrompt,
}) => {
  const [commandInput, setCommandInput] = useState('');

  const now = new Date();
  const hours = now.getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSubmitCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    onExecutePrompt(commandInput.trim());
  };

  const primaryDisk = systemStats?.disks?.[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            {greeting}, User
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">{formattedDate}</p>
        </div>

        {/* Ollama Status Pill */}
        <div 
          onClick={() => onNavigate('settings')}
          className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-xl bg-nexus-900 border border-nexus-700/70 hover:border-nexus-500/70 cursor-pointer transition-colors shadow-sm self-start md:self-auto"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">
            Local AI: <span className="font-mono text-violet-300">{ollamaStatus?.selected_model || 'qwen3:4b'}</span>
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Large Natural-Language Command Box */}
      <Card className="border-violet-800/40 bg-gradient-to-br from-nexus-900 via-nexus-900 to-violet-950/20 shadow-xl">
        <form onSubmit={handleSubmitCommand} className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-violet-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Ask Kashish: Natural-Language Command Engine</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="e.g., 'Search for PDF reports on my computer', 'Summarize notes.txt', or 'Check CPU and memory'..."
              className="w-full bg-nexus-950/80 border border-nexus-700/80 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3.5 pr-28 text-slate-100 placeholder-slate-500 text-sm outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!commandInput.trim()}
              className="absolute right-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-md shadow-violet-900/30"
            >
              <span>Execute</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-400">
            <span className="text-slate-500">Quick suggestions:</span>
            {[
              'Check system stats',
              'Search for PDF files',
              'Launch Notepad',
              'Show recent task history'
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCommandInput(s)}
                className="px-2.5 py-1 rounded-md bg-nexus-850 hover:bg-nexus-800 text-slate-300 hover:text-white border border-nexus-700/60 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Quick Action Cards */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card hover onClick={() => onNavigate('kashish')} className="group border-violet-700/60 bg-gradient-to-br from-violet-950/40 to-nexus-900">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-900/40">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-white">Talk to Kashish</h3>
            <p className="text-xs text-slate-300 mt-1">Two-way voice assistant with real-time animated orb.</p>
          </Card>

          <Card hover onClick={() => onNavigate('files')} className="group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                <Search className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Search Files</h3>
            <p className="text-xs text-slate-400 mt-1">Locate documents within approved directories safely.</p>
          </Card>

          <Card hover onClick={() => onNavigate('files')} className="group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/40">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Summarize PDF</h3>
            <p className="text-xs text-slate-400 mt-1">Extract text with PyMuPDF and generate key takeaways.</p>
          </Card>

          <Card hover onClick={() => onNavigate('apps')} className="group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <AppWindow className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Open Application</h3>
            <p className="text-xs text-slate-400 mt-1">Launch Notepad, Calculator, or custom registered apps.</p>
          </Card>

          <Card hover onClick={() => onNavigate('system')} className="group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/40">
                <Activity className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">System Telemetry</h3>
            <p className="text-xs text-slate-400 mt-1">Check CPU percentage, RAM consumption, and storage.</p>
          </Card>
        </div>
      </div>

      {/* Hardware Telemetry Summary Row */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Hardware Diagnostics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CPU Card */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>CPU Utilization</span>
              </span>
              <span className="text-xs text-slate-400">
                {systemStats?.cpu.core_count ?? 0} Cores
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-100 font-mono">
                {systemStats ? `${systemStats.cpu.usage_percent}%` : '--'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-nexus-950 h-2 rounded-full overflow-hidden mt-3 border border-nexus-800">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, systemStats?.cpu.usage_percent || 0))}%` }}
              />
            </div>
          </Card>

          {/* RAM Card */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-violet-400" />
                <span>Memory (RAM)</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {systemStats ? `${systemStats.memory.used_gb} / ${systemStats.memory.total_gb} GB` : '--'}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-100 font-mono">
                {systemStats ? `${systemStats.memory.usage_percent}%` : '--'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-nexus-950 h-2 rounded-full overflow-hidden mt-3 border border-nexus-800">
              <div
                className="bg-violet-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, systemStats?.memory.usage_percent || 0))}%` }}
              />
            </div>
          </Card>

          {/* Disk Card */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Available Disk ({primaryDisk?.device || 'Drive'})</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {primaryDisk ? `${primaryDisk.free_gb} GB free` : '--'}
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-100 font-mono">
                {primaryDisk ? `${primaryDisk.usage_percent}%` : '--'}
              </span>
              <span className="text-xs text-slate-400">used</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-nexus-950 h-2 rounded-full overflow-hidden mt-3 border border-nexus-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, primaryDisk?.usage_percent || 0))}%` }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Task History Widget */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-4 h-4" />
            <span>Recent Task History</span>
          </h2>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <Card className="p-0 overflow-hidden">
          {recentTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <History className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <span>No tasks executed yet. Try typing a command above!</span>
            </div>
          ) : (
            <div className="divide-y divide-nexus-800">
              {recentTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-nexus-850/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    {task.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-200 line-clamp-1">{task.user_request}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0 text-right">
                    {task.tool_name && (
                      <Badge variant="slate" size="sm">
                        {task.tool_name}
                      </Badge>
                    )}
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

