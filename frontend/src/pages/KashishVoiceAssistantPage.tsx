import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Square, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send, 
  AlertCircle, 
  Loader2, 
  RotateCcw,
  Sliders,
  History,
  Wrench,
  ChevronDown,
  ChevronUp,
  Brain
} from 'lucide-react';
import { VoiceAssistantState, VoiceChatResponse, VoiceStatus, ToolCallLog } from '../types';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ToolExecutionCard } from '../components/chat/ToolExecutionCard';

interface VoiceTurn {
  id: string;
  transcript: string;
  response: string;
  audioBase64?: string | null;
  toolExecutions?: ToolCallLog[];
  timestamp: string;
}

export const KashishVoiceAssistantPage: React.FC = () => {
  const [state, setState] = useState<VoiceAssistantState>('IDLE');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [currentTools, setCurrentTools] = useState<ToolCallLog[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Audio controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(175);
  const [textInput, setTextInput] = useState<string>('');
  const [history, setHistory] = useState<VoiceTurn[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // 1. Fetch Voice Engine Status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getVoiceStatus();
        setVoiceStatus(res);
      } catch (err) {
        console.error('Failed to get voice status:', err);
      }
    };
    fetchStatus();

    // Prepare audio element
    audioElementRef.current = new Audio();
    audioElementRef.current.onended = () => {
      setState('IDLE');
      setAudioLevel(0);
    };
    audioElementRef.current.onerror = () => {
      setState('IDLE');
      setAudioLevel(0);
    };

    return () => {
      stopPlayback();
      stopRecording();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Web Audio Visualizer Loop
  const startVisualizer = (streamOrElement: MediaStream | HTMLAudioElement, isStream: boolean) => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      if (isStream) {
        const source = audioContextRef.current.createMediaStreamSource(streamOrElement as MediaStream);
        source.connect(analyser);
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 128);
        setAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (e) {
      console.warn('Web Audio visualizer could not attach:', e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
  };

  // Stop Kashish Speech Playback
  const stopPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopVisualizer();
    if (state === 'SPEAKING') {
      setState('IDLE');
    }
    api.stopVoice().catch(() => {});
  };

  // Play Kashish's Generated Voice (with robust Blob conversion and SpeechSynthesis fallback)
  const playSpeech = (audioBase64?: string | null, fallbackText?: string) => {
    if (isMuted) {
      setState('IDLE');
      return;
    }

    const speakWithBrowserTTS = (textToSpeak: string) => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const cleanText = textToSpeak.replace(/[*#_`]/g, '').trim();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = (speechRate || 175) / 175;
          const voices = window.speechSynthesis.getVoices();
          const zira = voices.find(
            (v) =>
              v.name.toLowerCase().includes('zira') ||
              v.name.toLowerCase().includes('hazel') ||
              v.name.toLowerCase().includes('female')
          );
          if (zira) utterance.voice = zira;

          utterance.onstart = () => {
            setState('SPEAKING');
            startSpeechPulse();
          };
          utterance.onend = () => {
            setState('IDLE');
            setAudioLevel(0);
          };
          utterance.onerror = () => {
            setState('IDLE');
            setAudioLevel(0);
          };

          window.speechSynthesis.speak(utterance);
        } else {
          setState('IDLE');
        }
      } catch (e) {
        console.warn('Browser TTS fallback error:', e);
        setState('IDLE');
      }
    };

    const startSpeechPulse = () => {
      const pulseLoop = () => {
        const isElementPlaying = audioElementRef.current && !audioElementRef.current.paused;
        const isSynthSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;

        if (isElementPlaying || isSynthSpeaking) {
          const time = Date.now() / 200;
          const simulatedLevel = 0.3 + 0.4 * Math.abs(Math.sin(time) * Math.cos(time * 1.5));
          setAudioLevel(simulatedLevel);
          animationFrameRef.current = requestAnimationFrame(pulseLoop);
        } else {
          setAudioLevel(0);
        }
      };
      pulseLoop();
    };

    try {
      stopPlayback();

      if (audioBase64 && audioBase64.startsWith('data:audio')) {
        setState('SPEAKING');

        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
        }

        audioElementRef.current.onended = () => {
          setState('IDLE');
          setAudioLevel(0);
        };
        audioElementRef.current.onerror = () => {
          if (fallbackText) {
            speakWithBrowserTTS(fallbackText);
          } else {
            setState('IDLE');
            setAudioLevel(0);
          }
        };

        // Convert base64 Data URL to Blob URL to bypass browser length and memory restrictions
        try {
          const parts = audioBase64.split(',');
          const byteString = atob(parts[1]);
          const mimeString = parts[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          const blobUrl = URL.createObjectURL(blob);
          audioElementRef.current.src = blobUrl;
        } catch {
          audioElementRef.current.src = audioBase64;
        }

        audioElementRef.current.playbackRate = 1.0;
        audioElementRef.current
          .play()
          .then(() => {
            startSpeechPulse();
          })
          .catch((err) => {
            console.warn('Audio play failed, falling back to local TTS engine:', err);
            if (fallbackText) {
              speakWithBrowserTTS(fallbackText);
            } else {
              setState('IDLE');
            }
          });
      } else if (fallbackText) {
        speakWithBrowserTTS(fallbackText);
      } else {
        setState('IDLE');
      }
    } catch (err) {
      console.error('Error in playSpeech:', err);
      if (fallbackText) {
        speakWithBrowserTTS(fallbackText);
      } else {
        setState('IDLE');
      }
    }
  };

  // Start Voice Recording (Push-to-Talk)
  const startRecording = async () => {
    stopPlayback();
    setErrorText(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      micStreamRef.current = stream;

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorderOptions = preferredMime ? { mimeType: preferredMime } : undefined;

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopVisualizer();
        // Release tracks
        stream.getTracks().forEach((track) => track.stop());

        const mimeToUse = preferredMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeToUse });
        if (audioBlob.size < 100) {
          setErrorText('No audio captured. Please speak while the orb is glowing.');
          setState('IDLE');
          return;
        }

        await processVoiceInput(audioBlob, null);
      };

      // Collect data in 250ms chunks for smooth recording
      mediaRecorder.start(250);
      setState('LISTENING');
      startVisualizer(stream, true);
    } catch (err: unknown) {
      console.error('Microphone error:', err);
      setErrorText('Microphone permission denied or no audio input device found.');
      setState('ERROR');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setState('TRANSCRIBING');
      mediaRecorderRef.current.stop();
    }
  };

  // Handle Full Voice Turn
  const processVoiceInput = async (audioBlob: Blob | null, textPrompt: string | null) => {
    try {
      setState(audioBlob ? 'TRANSCRIBING' : 'THINKING');
      setErrorText(null);

      // Call backend seamless turn
      const res: VoiceChatResponse = await api.sendVoiceTurn(audioBlob, textPrompt, 'kashish_session');

      setTranscript(res.transcript || (textPrompt || ''));
      setCurrentResponse(res.response || '');
      setCurrentTools(res.tool_executions || []);

      const turn: VoiceTurn = {
        id: Date.now().toString(),
        transcript: res.transcript || (textPrompt || ''),
        response: res.response,
        audioBase64: res.audio_base64,
        toolExecutions: res.tool_executions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHistory((prev) => [turn, ...prev]);

      // Speak back Kashish's response
      if (!isMuted) {
        playSpeech(res.audio_base64, res.response);
      } else {
        setState('IDLE');
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to complete voice request.';
      setErrorText(msg);
      setState('ERROR');
    }
  };

  // Text Input Submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state === 'THINKING' || state === 'TRANSCRIBING') return;
    const prompt = textInput.trim();
    setTextInput('');
    processVoiceInput(null, prompt);
  };

  // State Badge Helpers
  const getStateBadge = () => {
    switch (state) {
      case 'LISTENING':
        return <Badge variant="cyan" size="md">Listening...</Badge>;
      case 'TRANSCRIBING':
        return <Badge variant="violet" size="md">Transcribing Audio (Faster-Whisper)...</Badge>;
      case 'THINKING':
        return <Badge variant="violet" size="md">Kashish is Thinking (qwen3:4b)...</Badge>;
      case 'SPEAKING':
        return <Badge variant="emerald" size="md">Speaking...</Badge>;
      case 'ERROR':
        return <Badge variant="rose" size="md">Error</Badge>;
      case 'IDLE':
      default:
        return <Badge variant="slate" size="md">Ready / Idle</Badge>;
    }
  };

  // Orb Dynamic Styling
  const getOrbScale = () => {
    if (state === 'LISTENING') return 1 + audioLevel * 0.45;
    if (state === 'SPEAKING') return 1 + audioLevel * 0.35;
    if (state === 'THINKING' || state === 'TRANSCRIBING') return 1.08;
    return 1.0;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Identity Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-nexus-900 via-nexus-900 to-violet-950/30 border border-violet-900/40 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-900/40">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans">
                Kashish
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800">
                AI Companion
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Your Personal AI Voice Assistant inside Nexus AI OS
            </p>
          </div>
        </div>

        {/* State Indicator Pill */}
        <div className="flex items-center space-x-3">
          {getStateBadge()}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isMuted
                ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                : 'bg-nexus-850 hover:bg-nexus-800 border-nexus-700 text-slate-300'
            }`}
            title={isMuted ? 'Unmute Kashish' : 'Mute Kashish'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {state === 'SPEAKING' && (
            <button
              onClick={stopPlayback}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors animate-pulse"
              title="Stop speaking immediately"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Speaking</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Orb & Voice Stage */}
      <Card className="flex flex-col items-center justify-center py-12 px-6 relative overflow-hidden bg-gradient-to-b from-nexus-900/90 to-nexus-950 border-nexus-800 shadow-2xl">
        {/* Background ambient lighting */}
        <div 
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{
            background: state === 'LISTENING' 
              ? 'radial-gradient(circle, #06b6d4 0%, transparent 70%)'
              : state === 'SPEAKING'
              ? 'radial-gradient(circle, #8b5cf6 0%, #06b6d4 70%)'
              : state === 'THINKING' || state === 'TRANSCRIBING'
              ? 'radial-gradient(circle, #7c3aed 0%, transparent 70%)'
              : 'radial-gradient(circle, #6d28d9 0%, transparent 70%)'
          }}
        />

        {/* ANIMATED ORB */}
        <div className="relative my-6 flex items-center justify-center">
          {/* Outer glowing ripple ring */}
          <div 
            className={`absolute rounded-full border border-violet-500/30 transition-all duration-200 pointer-events-none ${
              state === 'LISTENING' || state === 'SPEAKING' ? 'opacity-90' : 'opacity-30'
            }`}
            style={{
              width: `${190 * getOrbScale()}px`,
              height: `${190 * getOrbScale()}px`,
              borderColor: state === 'LISTENING' ? '#06b6d4' : '#8b5cf6',
              boxShadow: state === 'LISTENING' 
                ? '0 0 40px rgba(6, 182, 212, 0.4)' 
                : '0 0 45px rgba(139, 92, 246, 0.4)'
            }}
          />

          {/* Secondary rotating accent ring for Thinking/Transcribing */}
          {(state === 'THINKING' || state === 'TRANSCRIBING') && (
            <div className="absolute w-44 h-44 rounded-full border-2 border-t-cyan-400 border-r-violet-500 border-b-transparent border-l-transparent animate-spin" />
          )}

          {/* Core Orb */}
          <div 
            className="w-36 h-36 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-150 cursor-pointer select-none relative z-10"
            style={{
              transform: `scale(${getOrbScale()})`,
              background: state === 'LISTENING'
                ? 'radial-gradient(circle at 35% 35%, #22d3ee 0%, #0891b2 50%, #0b0d14 100%)'
                : state === 'SPEAKING'
                ? 'radial-gradient(circle at 35% 35%, #a78bfa 0%, #7c3aed 50%, #0b0d14 100%)'
                : state === 'THINKING' || state === 'TRANSCRIBING'
                ? 'radial-gradient(circle at 35% 35%, #c084fc 0%, #6366f1 50%, #0b0d14 100%)'
                : 'radial-gradient(circle at 35% 35%, #8b5cf6 0%, #4c1d95 60%, #0b0d14 100%)',
              boxShadow: state === 'LISTENING'
                ? '0 0 35px #06b6d4, inset 0 0 25px rgba(255, 255, 255, 0.3)'
                : '0 0 40px #7c3aed, inset 0 0 25px rgba(255, 255, 255, 0.3)'
            }}
            onClick={state === 'LISTENING' ? stopRecording : startRecording}
          >
            {/* Center icon / state visual */}
            {state === 'LISTENING' ? (
              <Mic className="w-10 h-10 text-white animate-bounce" />
            ) : state === 'THINKING' || state === 'TRANSCRIBING' ? (
              <Brain className="w-10 h-10 text-white animate-pulse" />
            ) : state === 'SPEAKING' ? (
              <Volume2 className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <Mic className="w-9 h-9 text-slate-100/90" />
            )}
          </div>
        </div>

        {/* Action Prompt under Orb */}
        <div className="text-center mt-3 mb-6 z-10">
          <p className="text-sm font-semibold text-slate-200">
            {state === 'LISTENING'
              ? 'Listening to your voice... (Click orb or button to stop)'
              : state === 'TRANSCRIBING'
              ? 'Converting speech via Faster-Whisper...'
              : state === 'THINKING'
              ? 'Kashish is thinking and preparing tools...'
              : state === 'SPEAKING'
              ? 'Kashish is speaking...'
              : 'Click the orb or microphone button to speak'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Say &ldquo;Hey Kashish, check my CPU&rdquo; or &ldquo;Kashish, open Notepad&rdquo;
          </p>
        </div>

        {/* Primary Voice Controls */}
        <div className="flex items-center space-x-3 z-10">
          {state === 'LISTENING' ? (
            <button
              onClick={stopRecording}
              className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-900/40 transition-all scale-105"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Done Speaking</span>
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={state === 'THINKING' || state === 'TRANSCRIBING'}
              className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-violet-900/40 transition-all hover:scale-105"
            >
              <Mic className="w-4 h-4" />
              <span>Push to Talk</span>
            </button>
          )}

          {state === 'SPEAKING' && (
            <button
              onClick={stopPlayback}
              className="px-4 py-3 rounded-2xl bg-nexus-850 hover:bg-nexus-800 text-slate-200 border border-nexus-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-rose-400" />
              <span>Interrupt</span>
            </button>
          )}
        </div>
      </Card>

      {/* Error alert */}
      {errorText && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/80 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorText}</span>
          </div>
          <button
            onClick={() => setErrorText(null)}
            className="text-xs text-rose-400 underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Live Speech Transcript & Kashish Response Cards */}
      {(transcript || currentResponse) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* User Transcript */}
          <Card className="border-cyan-900/40 bg-nexus-900/80">
            <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
              <Mic className="w-3.5 h-3.5" />
              <span>Recognized Speech (You)</span>
            </div>
            <p className="text-sm font-medium text-slate-100 leading-relaxed select-text">
              {transcript || 'Listening...'}
            </p>
          </Card>

          {/* Kashish Response */}
          <Card className="border-violet-900/40 bg-nexus-900/80">
            <div className="flex items-center justify-between text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kashish</span>
              </div>
              {currentResponse && (
                <button
                  onClick={() => {
                    api.synthesizeSpeech(currentResponse).then((r) => {
                      playSpeech(r.audio_base64, currentResponse);
                    }).catch(() => {
                      playSpeech(null, currentResponse);
                    });
                  }}
                  className="text-[10px] text-slate-400 hover:text-violet-300 font-mono transition-colors flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Replay Audio</span>
                </button>
              )}
            </div>
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
              {currentResponse || 'Preparing response...'}
            </div>

            {/* Display tool execution logs if invoked */}
            {currentTools && currentTools.length > 0 && (
              <div className="mt-3 pt-3 border-t border-nexus-800 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Verified System Actions
                </div>
                {currentTools.map((t, idx) => (
                  <ToolExecutionCard key={idx} tool={t} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Fallback Text Input */}
      <Card className="p-3">
        <form onSubmit={handleTextSubmit} className="relative flex items-center">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={state === 'THINKING' || state === 'TRANSCRIBING'}
            placeholder="Or type a question for Kashish (e.g. 'Explain artificial intelligence')..."
            className="w-full bg-nexus-950 border border-nexus-700/80 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 pr-24 text-slate-100 placeholder-slate-500 text-xs outline-none transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || state === 'THINKING'}
            className="absolute right-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 shadow-md shadow-violet-900/30"
          >
            <span>Ask</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </Card>

      {/* Conversation History Drawer */}
      {history.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-nexus-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <History className="w-3.5 h-3.5 text-violet-400" />
              <span>Recent Voice Conversations ({history.length})</span>
            </h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors flex items-center space-x-1"
            >
              <span>{showHistory ? 'Collapse' : 'Expand'}</span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showHistory && (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2 divide-y divide-nexus-800">
              {history.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-cyan-300">You: {item.transcript}</span>
                    <span className="font-mono text-[10px] text-slate-500">{item.timestamp}</span>
                  </div>
                  <p className="text-slate-200 mt-0.5 leading-relaxed">
                    <strong className="text-violet-400 font-medium">Kashish: </strong>
                    {item.response}
                  </p>
                  {item.audioBase64 && (
                    <button
                      onClick={() => playSpeech(item.audioBase64!)}
                      className="inline-flex items-center space-x-1 text-[11px] text-violet-400 hover:text-violet-300 font-mono mt-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Replay Voice</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Voice Subsystem Diagnostics Badge */}
      <div className="p-4 rounded-xl bg-nexus-950 border border-nexus-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div>
          <span className="text-slate-500">STT Engine: </span>
          <span className="text-slate-200">{voiceStatus?.stt_engine || 'Faster-Whisper'}</span>
          <span className="text-slate-600"> ({voiceStatus?.stt_model || 'tiny.en'})</span>
        </div>
        <div>
          <span className="text-slate-500">Voice Synthesis: </span>
          <span className="text-slate-200">{voiceStatus?.tts_engine || 'Windows OneCore SAPI5'}</span>
          <span className="text-slate-600"> ({voiceStatus?.current_voice || 'Microsoft Zira'})</span>
        </div>
        <div className="flex items-center space-x-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local Offline Pipeline Active</span>
        </div>
      </div>
    </div>
  );
};

