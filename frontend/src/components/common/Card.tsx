import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-nexus-900/90 border border-nexus-700/50 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all duration-200 ${
        hover ? 'hover:border-nexus-500/60 hover:bg-nexus-850 cursor-pointer hover:shadow-nexus-accent/5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

