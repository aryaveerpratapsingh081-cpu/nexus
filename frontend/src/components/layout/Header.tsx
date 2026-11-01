import React from 'react';
import { PageId } from '../../types';

interface HeaderProps {
  currentPage: PageId;
  actions?: React.ReactNode;
}

const pageTitles: Record<PageId, { title: string; description: string }> = {
  home: {
    title: 'Control Center',
    description: 'Overview of system telemetry, natural-language commands, and quick operations.',
  },
  kashish: {
    title: 'Kashish Voice Assistant',
    description: 'Your Personal AI Companion with real-time speech and two-way voice conversations.',
  },
  assistant: {
    title: 'Kashish Chat',
    description: 'Chat directly with Kashish to execute verified system tools on Windows.',
  },
  files: {
    title: 'Smart Files',
    description: 'Safely search approved folders, inspect documents, and generate summaries.',
  },
  apps: {
    title: 'Applications',
    description: 'Launch allowlisted Windows software and register trusted binaries.',
  },
  system: {
    title: 'System Monitor',
    description: 'Real-time CPU, RAM, disk capacity, and operating system metrics via psutil.',
  },
  tasks: {
    title: 'Task History',
    description: 'Audit log of actions, commands, and tool executions stored in SQLite.',
  },
  settings: {
    title: 'Settings',
    description: 'Manage local Ollama parameters, approved folders, and application allowlists.',
  },
};

export const Header: React.FC<HeaderProps> = ({ currentPage, actions }) => {
  const meta = pageTitles[currentPage];

  return (
    <header className="px-8 py-5 border-b border-nexus-800/80 bg-nexus-900/60 backdrop-blur-md flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">{meta.title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{meta.description}</p>
      </div>
      {actions && <div className="flex items-center space-x-3">{actions}</div>}
    </header>
  );
};

