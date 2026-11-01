import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FolderPlus, 
  FileText, 
  File, 
  FileCode, 
  Sparkles, 
  Eye, 
  Folder, 
  Loader2, 
  AlertCircle, 
  Check, 
  Copy, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { FileItem, DocumentReadResult, DocumentSummaryResult, ApprovedDirectory } from '../types';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';

export const SmartFilesPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedExt, setSelectedExt] = useState<string>('all');
  const [selectedDir, setSelectedDir] = useState<string>('');
  const [approvedDirs, setApprovedDirs] = useState<ApprovedDirectory[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read Modal state
  const [readModalOpen, setReadModalOpen] = useState(false);
  const [readLoading, setReadLoading] = useState(false);
  const [readDoc, setReadDoc] = useState<DocumentReadResult | null>(null);

  // Summarize Modal state
  const [summarizeModalOpen, setSummarizeModalOpen] = useState(false);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<DocumentSummaryResult | null>(null);

  // Create Folder state
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [parentFolder, setParentFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderLoading, setCreateFolderLoading] = useState(false);
  const [createFolderStatus, setCreateFolderStatus] = useState<string | null>(null);

  // Copied path feedback
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Fetch approved directories
  const fetchSettingsAndDirs = async () => {
    try {
      const res = await api.getSettings();
      setApprovedDirs(res.approved_directories || []);
      if (res.approved_directories.length > 0 && !selectedDir) {
        setParentFolder(res.approved_directories[0].path);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchSettingsAndDirs();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const ext = selectedExt === 'all' ? undefined : selectedExt;
      const dir = selectedDir || undefined;
      const res = await api.searchFiles(query, ext, dir);
      setFiles(res.results || []);
      setTotalFound(res.total_found || 0);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to search files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial search on mount
  useEffect(() => {
    handleSearch();
  }, [selectedExt, selectedDir]);

  const handleRead = async (path: string) => {
    setReadModalOpen(true);
    setReadLoading(true);
    setReadDoc(null);
    try {
      const res = await api.readDocument(path);
      setReadDoc(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to read document');
      setReadModalOpen(false);
    } finally {
      setReadLoading(false);
    }
  };

  const handleSummarize = async (path: string) => {
    setSummarizeModalOpen(true);
    setSummarizeLoading(true);
    setSummaryResult(null);
    try {
      const res = await api.summarizeDocument(path);
      setSummaryResult(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to summarize document');
      setSummarizeModalOpen(false);
    } finally {
      setSummarizeLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentFolder || !newFolderName.trim()) return;

    setCreateFolderLoading(true);
    setCreateFolderStatus(null);
    try {
      const res = await api.createFolder(parentFolder, newFolderName.trim());
      if (res.success) {
        setCreateFolderStatus(`Created: ${res.created_path}`);
        setNewFolderName('');
        handleSearch(); // Refresh files
        setTimeout(() => setCreateFolderModalOpen(false), 1200);
      } else {
        setCreateFolderStatus(`Error: ${res.message}`);
      }
    } catch (err: unknown) {
      setCreateFolderStatus(`Error: ${(err as Error).message}`);
    } finally {
      setCreateFolderLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getFileIcon = (ext: string) => {
    if (ext === '.pdf') return <FileText className="w-4 h-4 text-rose-400" />;
    if (['.py', '.js', '.ts', '.tsx', '.json', '.html', '.css'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-cyan-400" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Search and Filter Controls */}
      <Card className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search filenames by keyword (e.g., 'report', 'assignment', 'config')..."
              className="w-full bg-nexus-950 border border-nexus-700/80 focus:border-violet-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Directory Picker */}
          <select
            value={selectedDir}
            onChange={(e) => setSelectedDir(e.target.value)}
            className="bg-nexus-950 border border-nexus-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-violet-500"
          >
            <option value="">All Approved Directories</option>
            {approvedDirs.map((d) => (
              <option key={d.id} value={d.path}>
                {d.alias} ({d.path})
              </option>
            ))}
          </select>

          {/* Create Folder Button */}
          <button
            onClick={() => setCreateFolderModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-nexus-850 hover:bg-nexus-800 border border-nexus-700 text-xs font-semibold text-slate-200 transition-colors flex items-center space-x-1.5"
          >
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            <span>New Folder</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors flex items-center space-x-1.5 shadow-md shadow-violet-900/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Search</span>
          </button>
        </div>

        {/* Extension Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-nexus-800 text-xs text-slate-400">
          <span className="text-slate-500">Extensions:</span>
          {[
            { id: 'all', label: 'All Files' },
            { id: '.pdf', label: 'PDF Documents' },
            { id: '.txt', label: 'Text (.txt)' },
            { id: '.md', label: 'Markdown (.md)' },
            { id: '.py', label: 'Python (.py)' },
            { id: '.json', label: 'JSON' },
          ].map((ext) => (
            <button
              key={ext.id}
              onClick={() => setSelectedExt(ext.id)}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                selectedExt === ext.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-nexus-950 text-slate-400 hover:text-slate-200 border border-nexus-800'
              }`}
            >
              {ext.label}
            </button>
          ))}
          <span className="ml-auto text-slate-500 font-mono">
            {totalFound} file(s) indexed
          </span>
        </div>
      </Card>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/80 text-rose-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-violet-400" />
            <p className="text-xs">Scanning approved directories...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FolderOpen className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300">No files found</h3>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              No matching files found in your configured approved locations.
              Try adjusting your search terms or verify directories in Settings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-nexus-800 bg-nexus-950/70 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Modified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nexus-800">
                {files.map((file, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-nexus-850/50 transition-colors group text-slate-300"
                  >
                    <td className="py-3 px-4 font-medium flex items-center space-x-2.5 text-slate-100">
                      {getFileIcon(file.extension)}
                      <span className="truncate max-w-xs md:max-w-md" title={file.path}>
                        {file.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {file.extension.toUpperCase().replace('.', '') || 'FILE'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {file.size_formatted}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {file.modified_formatted}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {/* Copy path */}
                      <button
                        onClick={() => copyToClipboard(file.path)}
                        className="p-1.5 rounded-lg bg-nexus-850 hover:bg-nexus-750 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy full path"
                      >
                        {copiedPath === file.path ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Read Document */}
                      <button
                        onClick={() => handleRead(file.path)}
                        className="px-2.5 py-1 rounded-lg bg-nexus-800 hover:bg-nexus-700 text-slate-200 transition-colors font-medium inline-flex items-center space-x-1"
                        title="Inspect document text"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        <span>Read</span>
                      </button>

                      {/* Summarize Document */}
                      <button
                        onClick={() => handleSummarize(file.path)}
                        className="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-800/60 transition-colors font-medium inline-flex items-center space-x-1"
                        title="Generate AI summary with local Ollama"
                      >
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        <span>Summarize</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Read Document Modal */}
      <Modal
        isOpen={readModalOpen}
        onClose={() => setReadModalOpen(false)}
        title={readDoc ? `Document: ${readDoc.filename}` : 'Reading Document...'}
        maxWidth="max-w-3xl"
      >
        {readLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-violet-400" />
            <p className="text-xs">Extracting text safely via PyMuPDF...</p>
          </div>
        ) : readDoc ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs bg-nexus-950 p-3 rounded-xl border border-nexus-800">
              <span><strong>Type:</strong> {readDoc.file_type}</span>
              {readDoc.page_count !== null && (
                <span><strong>Pages:</strong> {readDoc.page_count}</span>
              )}
              <span><strong>Characters:</strong> {readDoc.character_count.toLocaleString()}</span>
              {readDoc.is_scanned_pdf && (
                <Badge variant="amber">Scanned PDF</Badge>
              )}
            </div>

            {readDoc.warning && (
              <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{readDoc.warning}</span>
              </div>
            )}

            <div className="p-4 bg-nexus-950 rounded-xl border border-nexus-800 text-xs font-mono text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
              {readDoc.content || 'No text extracted.'}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setReadModalOpen(false);
                  handleSummarize(readDoc.path);
                }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Summary</span>
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Summarize Document Modal */}
      <Modal
        isOpen={summarizeModalOpen}
        onClose={() => setSummarizeModalOpen(false)}
        title={summaryResult ? `Summary: ${summaryResult.filename}` : 'Generating AI Summary...'}
        maxWidth="max-w-3xl"
      >
        {summarizeLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-violet-400" />
            <p className="text-xs">Local Ollama model is analyzing document structure...</p>
          </div>
        ) : summaryResult ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs bg-nexus-950 p-3 rounded-xl border border-nexus-800">
              <span><strong>Model:</strong> {summaryResult.model_used}</span>
              <span><strong>Chunks:</strong> {summaryResult.chunks_processed}</span>
              <span><strong>Source Size:</strong> {summaryResult.character_count.toLocaleString()} chars</span>
            </div>

            <div className="p-5 bg-nexus-950 rounded-xl border border-nexus-800 text-sm text-slate-200 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
              {summaryResult.summary}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={createFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        title="Create Safe Directory"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <p className="text-xs text-slate-400">
            Create a subfolder inside an approved directory. Path traversal and special characters are forbidden.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Parent Directory
            </label>
            <select
              value={parentFolder}
              onChange={(e) => setParentFolder(e.target.value)}
              className="w-full bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200"
            >
              {approvedDirs.map((d) => (
                <option key={d.id} value={d.path}>
                  {d.alias} ({d.path})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              New Folder Name
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Project_Drafts"
              className="w-full bg-nexus-950 border border-nexus-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
              required
            />
          </div>

          {createFolderStatus && (
            <div className="text-xs p-2.5 bg-nexus-950 rounded border border-nexus-800 text-slate-300">
              {createFolderStatus}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateFolderModalOpen(false)}
              className="px-4 py-2 text-xs bg-nexus-800 hover:bg-nexus-700 rounded-lg text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFolderLoading || !newFolderName.trim()}
              className="px-4 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {createFolderLoading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

