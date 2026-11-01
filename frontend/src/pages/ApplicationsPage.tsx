import React, { useState, useEffect } from 'react';
import { 
  AppWindow, 
  Search, 
  Plus, 
  Play, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Terminal, 
  Calculator, 
  FileText, 
  Palette, 
  Code2,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { RegisteredAppItem } from '../types';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const ApplicationsPage: React.FC = () => {
  const [apps, setApps] = useState<RegisteredAppItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [launchingAppId, setLaunchingAppId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Register modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    executable_path: '',
    arguments: '',
    category: 'Productivity',
    icon: 'AppWindow',
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  const fetchApps = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const data = await api.getApplications(searchTerm);
      setApps(data);
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps(query);
  }, [query]);

  const handleLaunch = async (app: RegisteredAppItem) => {
    setLaunchingAppId(app.id);
    setStatusMessage(null);
    try {
      const res = await api.launchApplication(app.id);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Launched ${res.app_name} successfully (PID: ${res.pid}).`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || `Failed to launch ${app.name}.`,
        });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: (err as Error).message || `Security policy rejected launching ${app.name}.`,
      });
    } finally {
      setLaunchingAppId(null);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setStatusMessage(null);
    try {
      await api.registerApplication(formData);
      setStatusMessage({
        type: 'success',
        text: `Application '${formData.name}' registered to allowlist!`,
      });
      setRegisterModalOpen(false);
      setFormData({ name: '', executable_path: '', arguments: '', category: 'Productivity', icon: 'AppWindow' });
      fetchApps();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: (err as Error).message || 'Failed to register application.',
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDelete = async (appId: string, name: string) => {
    try {
      await api.deleteApplication(appId);
      setStatusMessage({
        type: 'success',
        text: `Removed '${name}' from application catalog.`,
      });
      fetchApps();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: (err as Error).message || 'Failed to remove application.',
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'filetext':
      case 'notepad':
        return <FileText className="w-5 h-5 text-amber-400" />;
      case 'calculator':
      case 'calc':
        return <Calculator className="w-5 h-5 text-emerald-400" />;
      case 'palette':
      case 'paint':
        return <Palette className="w-5 h-5 text-violet-400" />;
      case 'code2':
      case 'vscode':
        return <Code2 className="w-5 h-5 text-cyan-400" />;
      default:
        return <AppWindow className="w-5 h-5 text-slate-400" />;
    }
  };

  const applyPreset = (preset: { name: string; path: string; category: string; icon: string }) => {
    setFormData({
      name: preset.name,
      executable_path: preset.path,
      arguments: '',
      category: preset.category,
      icon: preset.icon,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top search & register header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search allowlisted apps..."
            className="w-full bg-nexus-900 border border-nexus-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500"
          />
        </div>

        <button
          onClick={() => setRegisterModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-violet-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>Register New App</span>
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-900/60 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Grid of registered apps */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-violet-400" />
        </div>
      ) : apps.length === 0 ? (
        <Card className="p-12 text-center text-slate-400">
          <AppWindow className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h3 className="text-base font-semibold text-slate-200">No applications registered</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add applications using the Register New App button above or select a preset below.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <Card key={app.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 rounded-xl bg-nexus-950 border border-nexus-800">
                    {getIconComponent(app.icon)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={app.is_available ? 'emerald' : 'rose'} size="sm">
                      {app.is_available ? 'Verified' : 'Path Missing'}
                    </Badge>
                    {!app.is_builtin && (
                      <button
                        onClick={() => handleDelete(app.id, app.name)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove from allowlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-100">{app.name}</h3>
                <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                  ID: {app.id}
                </span>

                <div className="mt-3 p-2 bg-nexus-950 rounded-lg border border-nexus-800 text-[11px] font-mono text-slate-400 truncate" title={app.executable_path}>
                  {app.executable_path}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-nexus-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">{app.category}</span>
                <button
                  onClick={() => handleLaunch(app)}
                  disabled={launchingAppId === app.id || !app.is_available}
                  className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-md shadow-violet-900/30"
                >
                  {launchingAppId === app.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Launch</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Setup Guidance Info Box */}
      <Card className="bg-nexus-950/70 border-nexus-800">
        <div className="flex items-start space-x-3">
          <HelpCircle className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Security & Allowlisting Guidance</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Nexus AI OS enforces strict application allowlisting. The local AI model can only launch executables
              explicitly registered in this catalog. Destructive system binaries (e.g. <code>cmd.exe</code>, <code>powershell.exe</code>, <code>regedit.exe</code>)
              are hard-blocked to protect your Windows computer from prompt injections.
            </p>
          </div>
        </div>
      </Card>

      {/* Register App Modal */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Register Allowlisted Application"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Quick Windows Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Notepad', path: 'C:\\Windows\\System32\\notepad.exe', category: 'Productivity', icon: 'FileText' },
                { name: 'Calculator', path: 'C:\\Windows\\System32\\calc.exe', category: 'Utilities', icon: 'Calculator' },
                { name: 'Paint', path: 'C:\\Windows\\System32\\mspaint.exe', category: 'Graphics', icon: 'Palette' },
                { name: 'VS Code', path: 'C:\\Users\\hp\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe', category: 'Development', icon: 'Code2' },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 text-xs rounded bg-nexus-950 hover:bg-nexus-800 border border-nexus-700 text-slate-300 transition-colors"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Application Display Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Notepad, Visual Studio Code"
              className="w-full bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Executable Path (.exe) *
            </label>
            <input
              type="text"
              value={formData.executable_path}
              onChange={(e) => setFormData({ ...formData, executable_path: e.target.value })}
              placeholder="C:\Windows\System32\notepad.exe"
              className="w-full bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 font-mono outline-none focus:border-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200"
              >
                <option value="Productivity">Productivity</option>
                <option value="Development">Development</option>
                <option value="Utilities">Utilities</option>
                <option value="Graphics">Graphics</option>
                <option value="Media">Media</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Icon
              </label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200"
              >
                <option value="AppWindow">Default App</option>
                <option value="FileText">Document / Text</option>
                <option value="Calculator">Calculator</option>
                <option value="Code2">Coding / IDE</option>
                <option value="Palette">Graphics / Paint</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setRegisterModalOpen(false)}
              className="px-4 py-2 text-xs bg-nexus-800 hover:bg-nexus-700 rounded-lg text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerLoading || !formData.name || !formData.executable_path}
              className="px-4 py-2 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {registerLoading ? 'Validating...' : 'Register Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

