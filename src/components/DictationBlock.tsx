"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Mic, MicOff, Send } from "lucide-react";

export type DictationBlockProps = {
  label?: string;
  description?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  disabled?: boolean;
  minRows?: number;
};

export function DictationBlock({
  label = "Voice-enabled composer",
  description,
  placeholder,
  value,
  onChange,
  onSubmit,
  submitLabel = "Post",
  disabled = false,
  minRows = 3,
}: DictationBlockProps) {
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "error" | "unsupported">("idle");
  const [voiceStatusText, setVoiceStatusText] = useState("Mic ready. Tap to dictate.");
  const recognitionRef = useRef<any>(null);

  const startDictation = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("unsupported");
      setVoiceStatusText("Speech recognition not supported in this browser.");
      return;
    }

    const recognition: any = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setListening(true);
      setVoiceStatus("listening");
      setVoiceStatusText("Listening — press mic to stop.");
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (!transcript) continue;
        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += `${transcript} `;
        }
      }

      if (finalTranscript) {
        const cleaned = finalTranscript.trim();
        onChange(value ? `${value} ${cleaned}` : cleaned);
        setVoiceStatusText(`Captured: "${cleaned}"`);
      } else if (interimTranscript) {
        setVoiceStatusText(`Listening... ${interimTranscript.trim()}`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      setVoiceStatus("idle");
      setVoiceStatusText("Mic stopped.");
    };
    recognition.onerror = () => {
      setListening(false);
      setVoiceStatus("error");
      setVoiceStatusText("Mic issue — try again.");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopDictation = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setVoiceStatus("idle");
    setVoiceStatusText("Mic stopped.");
  };

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!onSubmit) return;
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  const micActive = listening;
  const statusTone =
    voiceStatus === "listening"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/40"
      : voiceStatus === "error"
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/40"
      : voiceStatus === "unsupported"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/40"
      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

  const canSubmit = !!onSubmit && !!value.trim() && !disabled;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <button
          type="button"
          onClick={micActive ? stopDictation : startDictation}
          aria-pressed={micActive}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
            micActive
              ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/40"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {micActive ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
          Voice
        </button>
      </div>

      <textarea
        className={`w-full resize-none rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
          micActive ? "border-emerald-300 ring-2 ring-emerald-200 dark:border-emerald-500/60 dark:ring-emerald-500/40" : "border-slate-300"
        }`}
        rows={minRows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={label}
        placeholder={placeholder}
        disabled={disabled}
      />

      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone}`} aria-live="polite">
          {voiceStatus === "listening" ? "Listening" : voiceStatusText}
        </span>
        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            <Send className="h-4 w-4" aria-hidden />
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
