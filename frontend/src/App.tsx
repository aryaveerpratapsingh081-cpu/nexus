import React, { useState, useEffect } from 'react';
import { PageId, SystemStats, OllamaStatus, TaskItem } from './types';
import { api } from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatusBar } from './components/layout/StatusBar';
import { HomePage } from './pages/HomePage';
import { KashishVoiceAssistantPage } from './pages/KashishVoiceAssistantPage';
import { AssistantPage } from './pages/AssistantPage';
import { SmartFilesPage } from './pages/SmartFilesPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { SystemMonitorPage } from './pages/SystemMonitorPage';
import { TaskHistoryPage } from './pages/TaskHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [pendingPrompt, setPendingPrompt] = useState<string>('');
  
  // Real-time states
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [backendHealthy, setBackendHealthy] = useState<boolean>(true);

  // Poll system stats & Ollama status
  const fetchStats = async () => {
    try {
      const stats = await api.getSystemStats();
      setSystemStats(stats);
      setBackendHealthy(true);
    } catch {
      setBackendHealthy(false);
    }
  };

  const fetchOllama = async () => {
    try {
      const status = await api.getOllamaStatus();
      setOllamaStatus(status);
    } catch {
      setOllamaStatus(null);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const res = await api.getTasks(undefined, undefined, 1, 4);
      setRecentTasks(res.tasks || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats();
    fetchOllama();
    fetchRecentTasks();

    const statsInterval = setInterval(fetchStats, 4000);
    const ollamaInterval = setInterval(fetchOllama, 10000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(ollamaInterval);
    };
  }, []);

  const handleExecutePromptFromHome = (prompt: string) => {
    setPendingPrompt(prompt);
    setCurrentPage('assistant');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nexus-950 text-slate-100 font-sans">
      {/* Left Sidebar */}
      <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Backend offline warning banner */}
        {!backendHealthy && (
          <div className="bg-rose-950/80 border-b border-rose-900/90 text-rose-200 text-xs py-2 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>
                Backend server is unreachable at <code>http://127.0.0.1:8005</code>. Please ensure the Python FastAPI service is running.
              </span>
            </div>
            <button
              onClick={fetchStats}
              className="text-xs bg-rose-900 hover:bg-rose-800 text-white px-2.5 py-0.5 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Header */}
        <Header currentPage={currentPage} />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {currentPage === 'home' && (
            <HomePage
              systemStats={systemStats}
              ollamaStatus={ollamaStatus}
              recentTasks={recentTasks}
              onNavigate={setCurrentPage}
              onExecutePrompt={handleExecutePromptFromHome}
            />
          )}

          {currentPage === 'kashish' && <KashishVoiceAssistantPage />}

          {currentPage === 'assistant' && (
            <AssistantPage
              initialPrompt={pendingPrompt}
              onClearInitialPrompt={() => setPendingPrompt('')}
            />
          )}

          {currentPage === 'files' && <SmartFilesPage />}

          {currentPage === 'apps' && <ApplicationsPage />}

          {currentPage === 'system' && (
            <SystemMonitorPage stats={systemStats} onRefresh={fetchStats} />
          )}

          {currentPage === 'tasks' && <TaskHistoryPage />}

          {currentPage === 'settings' && (
            <SettingsPage
              ollamaStatus={ollamaStatus}
              onRefreshOllama={fetchOllama}
            />
          )}
        </main>

        {/* Bottom Status Bar */}
        <StatusBar
          ollamaStatus={ollamaStatus}
          backendHealthy={backendHealthy}
          onNavigateSettings={() => setCurrentPage('settings')}
        />
      </div>
    </div>
  );
};

export default App;
