import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Wrench, 
  Eye, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TaskItem } from '../types';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';

export const TaskHistoryPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Detail Modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks(
        statusFilter === 'all' ? undefined : statusFilter,
        search || undefined,
        page,
        15
      );
      setTasks(res.tasks || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, statusFilter, search]);

  const handleClearHistory = async () => {
    try {
      await api.clearTasks();
      setShowClearConfirm(false);
      setPage(1);
      fetchTasks();
    } catch (err) {
      console.error('Failed to clear tasks:', err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search task logs by prompt or tool..."
            className="w-full bg-nexus-900 border border-nexus-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500"
          />
        </div>

        {/* Status filters & Clear */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-1.5 bg-nexus-900 p-1 rounded-xl border border-nexus-800 text-xs">
            {['all', 'success', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {tasks.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Task table / cards */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-violet-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-base font-semibold text-slate-200">No task records found</h3>
            <p className="text-xs text-slate-500">
              Operations executed by the AI Assistant or tools will be audited and displayed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-nexus-800 bg-nexus-950/70 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User Request</th>
                  <th className="py-3 px-4">Tool</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-800">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-nexus-850/50 transition-colors text-slate-300">
                    <td className="py-3 px-4">
                      {task.status === 'success' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-400 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(task.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate" title={task.user_request}>
                      {task.user_request}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {task.tool_name ? (
                        <span className="px-2 py-0.5 rounded bg-nexus-950 border border-nexus-800 text-slate-300">
                          {task.tool_name}
                        </span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {task.duration_ms ? `${task.duration_ms} ms` : '--'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-2.5 py-1 rounded-lg bg-nexus-800 hover:bg-nexus-700 text-slate-200 transition-colors inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-violet-400" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {total > 15 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-nexus-800 bg-nexus-950/40 text-xs text-slate-400">
            <span>
              Page {page} of {totalPages} ({total} total records)
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded bg-nexus-850 hover:bg-nexus-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded bg-nexus-850 hover:bg-nexus-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={`Task Execution Record #${selectedTask?.id || ''}`}
        maxWidth="max-w-xl"
      >
        {selectedTask && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-nexus-950 rounded-xl border border-nexus-800 space-y-1.5 font-mono">
              <div><strong className="text-slate-400 font-sans">Timestamp:</strong> {new Date(selectedTask.timestamp).toISOString()}</div>
              <div><strong className="text-slate-400 font-sans">Status:</strong> <span className={selectedTask.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>{selectedTask.status.toUpperCase()}</span></div>
              <div><strong className="text-slate-400 font-sans">Tool:</strong> {selectedTask.tool_name || 'N/A'}</div>
              <div><strong className="text-slate-400 font-sans">Duration:</strong> {selectedTask.duration_ms ? `${selectedTask.duration_ms} ms` : 'N/A'}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                User Request
              </div>
              <div className="p-3 bg-nexus-950 rounded-xl border border-nexus-800 text-slate-200">
                {selectedTask.user_request}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                Summary
              </div>
              <div className="p-3 bg-nexus-950 rounded-xl border border-nexus-800 text-slate-200 leading-relaxed">
                {selectedTask.summary}
              </div>
            </div>

            {selectedTask.tool_arguments && (
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                  Arguments
                </div>
                <pre className="p-3 bg-nexus-950 rounded-xl border border-nexus-800 text-slate-300 font-mono overflow-x-auto text-[11px]">
                  {selectedTask.tool_arguments}
                </pre>
              </div>
            )}

            {selectedTask.error_details && (
              <div>
                <div className="text-[10px] uppercase font-semibold text-rose-400 tracking-wider mb-1">
                  Error Details
                </div>
                <pre className="p-3 bg-rose-950/30 rounded-xl border border-rose-900/60 text-rose-300 font-mono overflow-x-auto text-[11px]">
                  {selectedTask.error_details}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Clear Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearConfirm}
        title="Clear All Task Records?"
        message="This will permanently delete all task history records stored in SQLite. Are you sure you wish to proceed?"
        confirmLabel="Clear All Records"
        danger
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

