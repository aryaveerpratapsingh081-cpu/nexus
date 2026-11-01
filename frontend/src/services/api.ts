import {
  SystemStats,
  OllamaStatus,
  FileItem,
  DocumentReadResult,
  DocumentSummaryResult,
  RegisteredAppItem,
  TaskItem,
  ChatMessage,
  ToolCallLog,
  AllSettings,
  ApprovedDirectory,
  VoiceStatus,
  VoiceChatResponse
} from '../types';

const API_BASE = 'http://127.0.0.1:8005/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // use default
      }
      throw new ApiError(errorMsg, res.status);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError((err as Error).message || 'Failed to connect to backend server', 0);
  }
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; app_name: string; version: string; database: string }>('/health'),

  // System
  getSystemStats: () => request<SystemStats>('/system/stats'),

  // Ollama
  getOllamaStatus: () => request<OllamaStatus>('/ollama/status'),

  // Chat
  sendChatMessage: (message: string, sessionId: string = 'default', model?: string) =>
    request<{
      response: string;
      thinking?: string | null;
      model_used: string;
      tool_executions: ToolCallLog[];
      session_id: string;
    }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId, model }),
    }),

  getChatMessages: (sessionId: string = 'default') =>
    request<{ messages: ChatMessage[] }>(`/chat/messages?session_id=${sessionId}`),

  clearChatMessages: (sessionId: string = 'default') =>
    request<{ message: string }>(`/chat/messages?session_id=${sessionId}`, {
      method: 'DELETE',
    }),

  // Files
  searchFiles: (query: string, extension?: string, directory?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (extension) params.append('extension', extension);
    if (directory) params.append('directory', directory);
    return request<{ results: FileItem[]; total_found: number; searched_directories: string[] }>(
      `/files/search?${params.toString()}`
    );
  },

  readDocument: (path: string) =>
    request<DocumentReadResult>('/files/read', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  summarizeDocument: (path: string, model?: string) =>
    request<DocumentSummaryResult>('/files/summarize', {
      method: 'POST',
      body: JSON.stringify({ path, model }),
    }),

  createFolder: (parentDirectory: string, folderName: string) =>
    request<{ success: boolean; created_path: string; message: string }>('/files/create-folder', {
      method: 'POST',
      body: JSON.stringify({ parent_directory: parentDirectory, folder_name: folderName }),
    }),

  // Applications
  getApplications: (query?: string) => {
    const params = query ? `?query=${encodeURIComponent(query)}` : '';
    return request<RegisteredAppItem[]>(`/applications${params}`);
  },

  registerApplication: (data: { name: string; executable_path: string; arguments?: string; category?: string; icon?: string }) =>
    request<RegisteredAppItem>('/applications/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  launchApplication: (appId: string, args?: string) =>
    request<{ success: boolean; app_id: string; app_name: string; pid?: number; message: string }>('/applications/launch', {
      method: 'POST',
      body: JSON.stringify({ app_id: appId, arguments: args }),
    }),

  deleteApplication: (appId: string) =>
    request<{ success: boolean; message: string }>(`/applications/${appId}`, {
      method: 'DELETE',
    }),

  // Tasks
  getTasks: (status?: string, search?: string, page: number = 1, pageSize: number = 20) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    return request<{ tasks: TaskItem[]; total: number; page: number; page_size: number }>(`/tasks?${params.toString()}`);
  },

  clearTasks: () =>
    request<{ deleted_count: number; message: string }>('/tasks', {
      method: 'DELETE',
    }),

  // Settings
  getSettings: () => request<AllSettings>('/settings'),

  updateSettings: (data: Partial<{ ollama_endpoint: string; selected_model: string; system_monitor_refresh_interval: number; max_file_size_mb: number }>) =>
    request<{ success: boolean; message: string }>('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addApprovedDirectory: (path: string, alias: string) =>
    request<ApprovedDirectory>('/settings/directories', {
      method: 'POST',
      body: JSON.stringify({ path, alias }),
    }),

  removeApprovedDirectory: (id: number) =>
    request<{ success: boolean; message: string }>(`/settings/directories/${id}`, {
      method: 'DELETE',
    }),

  // Voice (Kashish Assistant)
  getVoiceStatus: () => request<VoiceStatus>('/voice/status'),

  synthesizeSpeech: (text: string, rate: number = 175) =>
    request<{ success: boolean; audio_base64?: string; duration_seconds?: number; character_count: number; error?: string }>('/voice/speak', {
      method: 'POST',
      body: JSON.stringify({ text, rate }),
    }),

  transcribeAudio: async (audioBlob: Blob, filename?: string) => {
    const formData = new FormData();
    const defaultName = audioBlob.type.includes('webm') ? 'recording.webm' : 'recording.wav';
    formData.append('file', audioBlob, filename || defaultName);
    const res = await fetch(`${API_BASE}/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Transcription failed with status ${res.status}`);
    }
    return (await res.json()) as { text: string; language: string; success: boolean; error?: string };
  },

  sendVoiceTurn: async (audioBlob: Blob | null, text: string | null, sessionId: string = 'default') => {
    const formData = new FormData();
    if (audioBlob) {
      const filename = audioBlob.type.includes('webm') ? 'voice_command.webm' : 'voice_command.wav';
      formData.append('audio_file', audioBlob, filename);
    }
    if (text) {
      formData.append('message', text);
    }
    formData.append('session_id', sessionId);

    const res = await fetch(`${API_BASE}/voice/chat`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Voice turn failed with status ${res.status}`);
    }
    return (await res.json()) as VoiceChatResponse;
  },

  stopVoice: () =>
    request<{ status: string; message: string }>('/voice/stop', {
      method: 'POST',
    }),
};
