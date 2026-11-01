export type PageId = 
  | 'home' 
  | 'kashish'
  | 'assistant' 
  | 'files' 
  | 'apps' 
  | 'system' 
  | 'tasks' 
  | 'settings';

export type VoiceAssistantState = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'TRANSCRIBING' 
  | 'THINKING' 
  | 'SPEAKING' 
  | 'ERROR';

export interface VoiceStatus {
  stt_available: boolean;
  stt_engine: string;
  stt_model: string;
  tts_available: boolean;
  tts_engine: string;
  current_voice: string;
  speech_rate: number;
  error_message?: string | null;
}

export interface VoiceChatResponse {
  transcript: string;
  response: string;
  audio_base64?: string | null;
  tool_executions: ToolCallLog[];
  session_id: string;
  thinking?: string | null;
}

export interface CpuStats {
  usage_percent: number;
  core_count: number;
  logical_core_count: number;
  frequency_mhz: number | null;
}

export interface MemoryStats {
  total_bytes: number;
  available_bytes: number;
  used_bytes: number;
  usage_percent: number;
  total_gb: number;
  available_gb: number;
  used_gb: number;
}

export interface DiskStats {
  device: string;
  mountpoint: string;
  fstype: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
  total_gb: number;
  free_gb: number;
}

export interface SystemStats {
  timestamp: string;
  cpu: CpuStats;
  memory: MemoryStats;
  disks: DiskStats[];
  platform: string;
  uptime_seconds: number;
}

export interface OllamaModel {
  name: string;
  size_bytes?: number;
  size_formatted?: string;
  modified_at?: string;
  details?: Record<string, unknown>;
}

export interface OllamaStatus {
  is_available: boolean;
  endpoint: string;
  model_count: number;
  models: OllamaModel[];
  default_model: string;
  selected_model: string;
  is_selected_model_available: boolean;
  error_message?: string | null;
  troubleshooting_guide?: string | null;
}

export interface FileItem {
  name: string;
  path: string;
  size_bytes: number;
  size_formatted: string;
  extension: string;
  is_directory: boolean;
  modified_at: string;
  modified_formatted: string;
  readable: boolean;
}

export interface DocumentReadResult {
  path: string;
  filename: string;
  file_type: string;
  page_count: number | null;
  character_count: number;
  content: string;
  is_truncated: boolean;
  is_scanned_pdf: boolean;
  warning?: string | null;
}

export interface DocumentSummaryResult {
  path: string;
  filename: string;
  summary: string;
  model_used: string;
  chunks_processed: number;
  character_count: number;
}

export interface RegisteredAppItem {
  id: string;
  name: string;
  executable_path: string;
  arguments?: string | null;
  category: string;
  icon: string;
  is_builtin: boolean;
  is_available: boolean;
}

export interface TaskItem {
  id: number;
  timestamp: string;
  user_request: string;
  tool_name?: string | null;
  tool_arguments?: string | null;
  status: 'success' | 'failed' | 'pending' | 'rejected' | string;
  summary: string;
  error_details?: string | null;
  duration_ms?: number | null;
}

export interface ToolCallLog {
  tool_name: string;
  arguments: Record<string, unknown>;
  status: 'success' | 'failed';
  result?: unknown;
  error?: string | null;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string | null;
  tool_calls?: ToolCallLog[] | null;
  timestamp: string;
  isPending?: boolean;
}

export interface ApprovedDirectory {
  id: number;
  path: string;
  alias: string;
  is_default: boolean;
}

export interface AllSettings {
  ollama_endpoint: string;
  selected_model: string;
  system_monitor_refresh_interval: number;
  max_file_size_mb: number;
  approved_directories: ApprovedDirectory[];
}
