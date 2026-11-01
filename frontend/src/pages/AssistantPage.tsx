import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Bot, 
  User, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Terminal,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { ChatMessage } from '../types';
import { api } from '../services/api';
import { ToolExecutionCard } from '../components/chat/ToolExecutionCard';
import { ThinkingCard } from '../components/chat/ThinkingCard';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';

interface AssistantPageProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from SQLite on mount
  const loadHistory = async () => {
    try {
      const res = await api.getChatMessages('default');
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Handle passed initial prompt from Home
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt.trim());
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.sendChatMessage(messageText, 'default');
      
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.response,
        thinking: res.thinking,
        tool_calls: res.tool_executions,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = (err as Error).message || 'Failed to receive response from assistant';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await api.clearChatMessages('default');
      setMessages([]);
      setShowClearConfirm(false);
    } catch (err) {
      setError('Failed to clear chat messages.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-5xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between pb-3 border-b border-nexus-800 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Local Model Sandboxed Execution</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadHistory}
            className="p-1.5 hover:bg-nexus-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Reload history"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages stream */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-900/40 text-white">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Hey! I'm Kashish, your personal AI companion.</h3>
              <p className="text-xs text-slate-400 mt-1">
                I can search your documents, summarize files, check your CPU and RAM, and launch applications for you.
              </p>
            </div>
            <div className="w-full grid grid-cols-1 gap-2 pt-2">
              {[
                'Search for PDF files in my workspace',
                'What is my current CPU and RAM usage?',
                'Launch the Notepad application',
                'What apps are registered in Nexus?'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-nexus-900 hover:bg-nexus-850 border border-nexus-700/70 hover:border-violet-500/50 text-slate-300 transition-all shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex items-start space-x-3.5 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                    isUser
                      ? 'bg-violet-600 text-white rounded-tr-none'
                      : 'bg-nexus-900 border border-nexus-700/80 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* If assistant, render thinking process if available */}
                  {!isUser && msg.thinking && (
                    <ThinkingCard thinking={msg.thinking} />
                  )}

                  {/* If assistant executed tools, render separate tool execution cards */}
                  {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mb-3 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Executed System Operations
                      </div>
                      {msg.tool_calls.map((tool, tIdx) => (
                        <ToolExecutionCard key={tIdx} tool={tool} />
                      ))}
                    </div>
                  )}

                  {/* Message content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>

                  {/* Timestamp */}
                  <div className={`text-[10px] mt-2 font-mono ${isUser ? 'text-violet-200/80 text-right' : 'text-slate-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-nexus-800 border border-nexus-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Processing Indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-nexus-900 border border-nexus-700/80 rounded-2xl rounded-tl-none p-4 shadow-md flex items-center space-x-3 text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <span className="text-xs font-medium">Kashish is thinking & evaluating tools...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/80 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-semibold">Assistant Execution Notice</p>
              <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="pt-3 border-t border-nexus-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type a request for your Windows system..."
            className="w-full bg-nexus-900 border border-nexus-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3.5 pr-24 text-slate-100 placeholder-slate-500 text-sm outline-none transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-md shadow-violet-900/30"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Clear Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearConfirm}
        title="Clear Conversation History?"
        message="This will delete the current chat records from the SQLite database. This action cannot be undone."
        confirmLabel="Clear Conversation"
        danger
        onConfirm={handleClearChat}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

