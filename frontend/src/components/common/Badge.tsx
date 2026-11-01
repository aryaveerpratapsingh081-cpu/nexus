import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'violet' | 'cyan' | 'emerald' | 'rose' | 'amber' | 'slate';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'violet', size = 'sm' }) => {
  const styles = {
    violet: 'bg-violet-950/70 text-violet-300 border-violet-800/50',
    cyan: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/50',
    emerald: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50',
    rose: 'bg-rose-950/70 text-rose-300 border-rose-800/50',
    amber: 'bg-amber-950/70 text-amber-300 border-amber-800/50',
    slate: 'bg-nexus-800 text-nexus-500 border-nexus-700',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${styles[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

