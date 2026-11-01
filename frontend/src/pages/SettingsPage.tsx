import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sparkles, 
  FolderCheck, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle,
  HardDrive,
  Activity,
  Layers,
  ExternalLink
} from 'lucide-react';
import { AllSettings, OllamaStatus } from '../types';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';

interface SettingsPageProps {
  ollamaStatus: OllamaStatus | null;
  onRefreshOllama: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  ollamaStatus,
  onRefreshOllama,
}) => {
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://127.0.0.1:11434');
  const [selectedModel, setSelectedModel] = useState('qwen3:4b');
  const [refreshInterval, setRefreshInterval] = useState(3);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // New approved dir form
  const [newDirPath, setNewDirPath] = useState('');
  const [newDirAlias, setNewDirAlias] = useState('');
  const [dirError, setDirError] = useState<string | null>(null);

  // Confirmation dialogs
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearChat, setConfirmClearChat] = useState(false);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setOllamaEndpoint(data.ollama_endpoint);
      setSelectedModel(data.selected_model);
      setRefreshInterval(data.system_monitor_refresh_interval);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      await api.updateSettings({
        ollama_endpoint: ollamaEndpoint,
        selected_model: selectedModel,
        system_monitor_refresh_interval: Number(refreshInterval),
      });
      setSaveStatus('Settings successfully saved.');
      onRefreshOllama();
      loadSettings();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: unknown) {
      setSaveStatus(`Failed to save: ${(err as Error).message}`);
    }
  };

  const handleAddDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirError(null);
    if (!newDirPath.trim() || !newDirAlias.trim()) return;

    try {
      await api.addApprovedDirectory(newDirPath.trim(), newDirAlias.trim());
      setNewDirPath('');
      setNewDirAlias('');
      loadSettings();
    } catch (err: unknown) {
      setDirError((err as Error).message || 'Failed to add approved directory');
    }
  };

  const handleRemoveDirectory = async (id: number) => {
    try {
      await api.removeApprovedDirectory(id);
      loadSettings();
    } catch (err: unknown) {
      setDirError((err as Error).message || 'Failed to remove directory');
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await api.clearTasks();
      setConfirmClearHistory(false);
      setSaveStatus('All task history records cleared.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllChat = async () => {
    try {
      await api.clearChatMessages('default');
      setConfirmClearChat(false);
      setSaveStatus('All chat conversations cleared.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Save Status Alert */}
      {saveStatus && (
        <div className="p-3.5 rounded-xl bg-violet-950/60 border border-violet-800 text-violet-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-violet-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Ollama & Model Configuration */}
      <Card className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-nexus-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-950 text-violet-400 border border-violet-800/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Local AI Engine (Ollama)</h3>
              <p className="text-xs text-slate-400">Configure local model connection, models, and endpoints.</p>
            </div>
          </div>

          <button
            onClick={onRefreshOllama}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-nexus-850 hover:bg-nexus-800 border border-nexus-700 text-xs text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Test Connection</span>
          </button>
        </div>

        {/* Ollama Live Status Pill */}
        <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Ollama Daemon Status:</span>
            {ollamaStatus?.is_available ? (
              <Badge variant="emerald">Running ({ollamaStatus.endpoint})</Badge>
            ) : (
              <Badge variant="rose">Offline</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Configured Model:</span>
            {ollamaStatus?.is_selected_model_available ? (
              <Badge variant="emerald">Ready: {ollamaStatus.selected_model}</Badge>
            ) : (
              <Badge variant="amber">Missing in Ollama: {selectedModel}</Badge>
            )}
          </div>

          {ollamaStatus?.troubleshooting_guide && (
            <div className="mt-3 p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-amber-300 whitespace-pre-wrap leading-relaxed text-[11px]">
              {ollamaStatus.troubleshooting_guide}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSaveGeneral} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ollama Local API Endpoint
              </label>
              <input
                type="text"
                value={ollamaEndpoint}
                onChange={(e) => setOllamaEndpoint(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="w-full bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Model Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="qwen3:4b"
                  className="flex-1 bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none focus:border-violet-500"
                />
                {ollamaStatus?.models && ollamaStatus.models.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) setSelectedModel(e.target.value);
                    }}
                    className="bg-nexus-950 border border-nexus-700 rounded-lg px-2 text-xs text-slate-300"
                  >
                    <option value="">Detected ({ollamaStatus.models.length})</option>
                    {ollamaStatus.models.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              System Telemetry Refresh Interval (seconds)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-40 bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-900/30 transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </Card>

      {/* Approved Directories Manager */}
      <Card className="space-y-5">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-nexus-800">
          <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/40">
            <FolderCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Approved Directories (Filesystem Sandbox)</h3>
            <p className="text-xs text-slate-400">
              Only files inside these locations can be read, searched, or created by the local AI engine.
            </p>
          </div>
        </div>

        {dirError && (
          <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{dirError}</span>
          </div>
        )}

        {/* Existing approved directories */}
        <div className="space-y-2">
          {settings?.approved_directories?.map((dir) => (
            <div
              key={dir.id}
              className="p-3.5 bg-nexus-950 rounded-xl border border-nexus-800 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-semibold text-slate-200 block">{dir.alias}</span>
                <span className="font-mono text-slate-400 text-[11px] block mt-0.5">{dir.path}</span>
              </div>
              <div className="flex items-center space-x-2">
                {dir.is_default && (
                  <Badge variant="cyan" size="sm">Default</Badge>
                )}
                {(!dir.is_default || !dir.path.toLowerCase().includes('workspace')) && (
                  <button
                    onClick={() => handleRemoveDirectory(dir.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove directory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add new directory form */}
        <form onSubmit={handleAddDirectory} className="p-4 bg-nexus-950/60 border border-nexus-800 rounded-xl space-y-3">
          <span className="text-xs font-semibold text-slate-300 block">Add Permitted Directory</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newDirAlias}
              onChange={(e) => setNewDirAlias(e.target.value)}
              placeholder="Alias (e.g., CSE Project Files)"
              className="bg-nexus-900 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
              required
            />
            <input
              type="text"
              value={newDirPath}
              onChange={(e) => setNewDirPath(e.target.value)}
              placeholder="Absolute path (e.g., D:\MyFolder)"
              className="sm:col-span-2 bg-nexus-900 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Directory</span>
            </button>
          </div>
        </form>
      </Card>

      {/* Storage and Maintenance */}
      <Card className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Data Management & Maintenance
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-nexus-950 border border-nexus-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Clear Stored Task History</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Purges all logged command runs and tool execution records from the SQLite database.
            </p>
          </div>
          <button
            onClick={() => setConfirmClearHistory(true)}
            className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-900 text-xs font-semibold transition-colors flex-shrink-0"
          >
            Clear Tasks
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-nexus-950 border border-nexus-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Clear Chat Conversations</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Deletes past conversation history and reasoning traces from the Assistant.
            </p>
          </div>
          <button
            onClick={() => setConfirmClearChat(true)}
            className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-900 text-xs font-semibold transition-colors flex-shrink-0"
          >
            Clear Messages
          </button>
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={confirmClearHistory}
        title="Clear All Task History?"
        message="Are you sure you want to delete all stored task audit records? This cannot be undone."
        confirmLabel="Clear Task History"
        danger
        onConfirm={handleClearAllHistory}
        onCancel={() => setConfirmClearHistory(false)}
      />

      <ConfirmationDialog
        isOpen={confirmClearChat}
        title="Clear All Chat History?"
        message="Are you sure you want to delete your previous chat conversations with the Assistant?"
        confirmLabel="Clear Conversations"
        danger
        onConfirm={handleClearAllChat}
        onCancel={() => setConfirmClearChat(false)}
      />
    </div>
  );
};

