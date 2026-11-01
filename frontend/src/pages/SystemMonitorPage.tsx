import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Activity, 
  HardDrive, 
  Clock, 
  Layers, 
  Server, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { SystemStats } from '../types';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

interface SystemMonitorPageProps {
  stats: SystemStats | null;
  onRefresh: () => void;
}

export const SystemMonitorPage: React.FC<SystemMonitorPageProps> = ({ stats, onRefresh }) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    setLastRefreshed(new Date());
  }, [stats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, onRefresh]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top telemetry bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-nexus-900 border border-nexus-700/60">
        <div className="flex items-center space-x-3 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">Live Telemetry Feed (via psutil)</span>
          <span className="text-slate-500 font-mono">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-nexus-950 border-nexus-700 text-violet-600 focus:ring-0"
            />
            <span>Auto-refresh ({refreshInterval}s)</span>
          </label>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-nexus-850 hover:bg-nexus-800 text-slate-300 border border-nexus-700 transition-colors"
            title="Manual refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main CPU & Memory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU Detailed Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Processor (CPU)</h3>
                <p className="text-xs text-slate-400">Total load across cores</p>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-cyan-400 font-mono">
              {stats ? `${stats.cpu.usage_percent}%` : '--'}
            </div>
          </div>

          {/* Bar */}
          <div className="w-full bg-nexus-950 h-3 rounded-full overflow-hidden border border-nexus-800">
            <div
              className="bg-gradient-to-r from-cyan-500 to-violet-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, stats?.cpu.usage_percent || 0))}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-nexus-800 text-xs">
            <div className="p-2.5 bg-nexus-950 rounded-lg">
              <span className="text-slate-500 block">Physical Cores</span>
              <span className="font-mono text-slate-200 font-semibold mt-0.5 block">
                {stats?.cpu.core_count ?? '--'}
              </span>
            </div>
            <div className="p-2.5 bg-nexus-950 rounded-lg">
              <span className="text-slate-500 block">Logical Cores</span>
              <span className="font-mono text-slate-200 font-semibold mt-0.5 block">
                {stats?.cpu.logical_core_count ?? '--'}
              </span>
            </div>
            <div className="p-2.5 bg-nexus-950 rounded-lg">
              <span className="text-slate-500 block">Frequency</span>
              <span className="font-mono text-slate-200 font-semibold mt-0.5 block">
                {stats?.cpu.frequency_mhz ? `${stats.cpu.frequency_mhz} MHz` : 'Dynamic'}
              </span>
            </div>
          </div>
        </Card>

        {/* Memory (RAM) Detailed Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-violet-950 text-violet-400 border border-violet-800/40">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Physical Memory (RAM)</h3>
                <p className="text-xs text-slate-400">Allocated memory consumption</p>
              </div>
            </div>
            <div className="text-3xl font-extrabold text-violet-400 font-mono">
              {stats ? `${stats.memory.usage_percent}%` : '--'}
            </div>
          </div>

          {/* Bar */}
          <div className="w-full bg-nexus-950 h-3 rounded-full overflow-hidden border border-nexus-800">
            <div
              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, stats?.memory.usage_percent || 0))}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-nexus-800 text-xs">
            <div className="p-2.5 bg-nexus-950 rounded-lg">
              <span className="text-slate-500 block">Used RAM</span>
              <span className="font-mono text-slate-200 font-semibold mt-0.5 block">
                {stats ? `${stats.memory.used_gb} GB` : '--'}
              </span>
            </div>
            <div className="p-2.5 bg-nexus-950 rounded-lg">
              <span className="text-slate-500 block">Available RAM</span>
              <span className="font-mono text-slate-200 font-semibold mt-0.5 block">
                {stats ? `${stats.memory.available_gb} GB` : '--'}
              </span>
            </div>
            <div className="p-2.5 bg-nexus-950 rounded-lg">
              <span className="text-slate-500 block">Total Installed</span>
              <span className="font-mono text-slate-200 font-semibold mt-0.5 block">
                {stats ? `${stats.memory.total_gb} GB` : '--'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Disks & Storage */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Storage Volumes & Partitions</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.disks?.map((disk, idx) => (
            <Card key={idx} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                    <span>{disk.device}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-950 text-slate-400 border border-nexus-800 font-mono">
                      {disk.fstype}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">Mount: {disk.mountpoint}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {disk.usage_percent}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">used</span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-nexus-950 h-2.5 rounded-full overflow-hidden border border-nexus-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, disk.usage_percent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
                <span>Free: {disk.free_gb} GB</span>
                <span>Total: {disk.total_gb} GB</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* OS Environment & Uptime Summary */}
      <Card className="bg-nexus-950/70 border-nexus-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-nexus-900 text-slate-400 border border-nexus-800">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-500 block">Host Operating System</span>
              <span className="text-slate-200 font-medium">{stats?.platform || 'Windows'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-nexus-900 text-slate-400 border border-nexus-800">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-500 block">System Uptime</span>
              <span className="text-slate-200 font-mono font-medium">
                {stats ? formatUptime(stats.uptime_seconds) : '--'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-nexus-900 text-slate-400 border border-nexus-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-slate-500 block">Measurement Engine</span>
              <span className="text-slate-200 font-medium">Native Windows psutil</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

