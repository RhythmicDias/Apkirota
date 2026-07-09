/**
 * App.tsx — Design-faithful implementation with all layout flaws fixed:
 *  ✅ No duplicate window controls (use native Tauri title bar)
 *  ✅ Input card properly centered with horizontal padding
 *  ✅ Proper vertical spacing between all elements
 *  ✅ Spa icon correct size
 *  ✅ Content vertically centered in viewport
 *  ✅ Floating dock fully visible
 *  ✅ Send button never clipped
 */

import React, { useEffect, useRef, useState } from "react";
import ChatBubble from "./components/ChatBubble";
import SettingsView from "./components/SettingsView";
import HistoryView from "./components/HistoryView";
import SkillsView from "./components/SkillsView";
import { useAppStore, selectActiveSession, SUPPORTED_MODELS } from "./store/useAppStore";
import { KeyRotator } from "./lib/KeyRotator";
import { sendMessage } from "./lib/geminiClient";
import type { ChatPart } from "./lib/geminiClient";
import { processFile, getPreviewUrl } from "./lib/fileProcessor";

// ─── Icon helper ───────────────────────────────────────────
const Icon = ({
  name,
  className = "",
  filled = false,
  thin = false,
  size = 22,
  style: extraStyle,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  thin?: boolean;
  size?: number;
  style?: React.CSSProperties;
}) => (
  <span
    className={`material-symbols-outlined select-none ${className}`}
    style={{
      fontSize: `${size}px`,
      fontVariationSettings: filled
        ? "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24"
        : thin
        ? "'FILL' 0, 'wght' 100, 'GRAD' 0, 'opsz' 24"
        : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
      color: "inherit",
      ...extraStyle,
    }}
  >
    {name}
  </span>
);

// ─── Bento chips ───────────────────────────────────────────
const CHIPS = [
  { icon: "school",      label: "Learn" },
  { icon: "edit",        label: "Write" },
  { icon: "code_blocks", label: "Code" },
  { icon: "coffee",      label: "Life stuff" },
  { icon: "lightbulb",   label: "News Today" },
];

// ─── Dock item ─────────────────────────────────────────────
const DockItem: React.FC<{
  icon: string;
  label: string;
  active?: boolean;
  filled?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, filled, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all gap-0.5"
    style={{
      background: active ? "rgba(177,98,77,0.10)" : "transparent",
      color: active ? "#b1624d" : "#6e6761",
    }}
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = "rgba(243,240,236,0.80)";
        (e.currentTarget as HTMLElement).style.color = "#b1624d";
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "#6e6761";
      }
    }}
  >
    <Icon name={icon} filled={filled} size={22} />
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 500, letterSpacing: "0.05em", marginTop: "2px" }}>
      {label}
    </span>
  </button>
);

// ─── Attachment type ───────────────────────────────────────
interface AttachedFile {
  file: File;
  previewUrl: string | null;
  parts: ChatPart[];
}

// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
const App: React.FC = () => {
  const createSession   = useAppStore((s) => s.createSession);
  const activeSession   = useAppStore(selectActiveSession);
  const appendMessage   = useAppStore((s) => s.appendMessage);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const mode            = useAppStore((s) => s.mode);
  const setMode         = useAppStore((s) => s.setMode);
  const apiKeys         = useAppStore((s) => s.apiKeys);
  const selectedModel   = useAppStore((s) => s.selectedModel);
  const setModel        = useAppStore((s) => s.setModel);
  const isLoading       = useAppStore((s) => s.isLoading);
  const setLoading      = useAppStore((s) => s.setLoading);
  const currentView     = useAppStore((s) => s.currentView);
  const setView         = useAppStore((s) => s.setView);
  const theme           = useAppStore((s) => s.theme);
  const toggleTheme     = useAppStore((s) => s.toggleTheme);
  const recordUsage     = useAppStore((s) => s.recordUsage);
  const rotationIndex   = useAppStore((s) => s.rotationIndex);
  const setRotationIndex = useAppStore((s) => s.setRotationIndex);
  const clearSessionMessages = useAppStore((s) => s.clearSessionMessages);

  const [text, setText]               = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver]   = useState(false);
  const [localError, setLocalError]   = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEnd  = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (e: any) => { console.error("Speech recognition error:", e); setIsRecording(false); };
      
      recognition.onresult = (e: any) => {
        let finalSegment = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalSegment += e.results[i][0].transcript;
          }
        }
        if (finalSegment) {
          setText((prev) => prev + (prev && !prev.endsWith(" ") ? " " : "") + finalSegment);
        }
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setLocalError("Speech recognition is not supported in this browser environment.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const welcomeInputRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef    = useRef<HTMLTextAreaElement>(null);

  // Sync theme
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Auto-resize textareas dynamically
  useEffect(() => {
    const wRef = welcomeInputRef.current;
    if (wRef) {
      wRef.style.height = "auto";
      wRef.style.height = `${wRef.scrollHeight}px`;
    }
  }, [text, currentView]);

  useEffect(() => {
    const cRef = chatInputRef.current;
    if (cRef) {
      cRef.style.height = "auto";
      cRef.style.height = `${cRef.scrollHeight}px`;
    }
  }, [text, currentView]);

  useEffect(() => { if (!activeSessionId) createSession(); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [activeSession?.messages.length]);

  const handleAttach = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      try {
        const parts = await processFile(file);
        setAttachments((prev) => [...prev, { file, previewUrl: getPreviewUrl(file), parts }]);
      } catch (e) { console.error(e); }
    }
  };

  const removeAttachment = (i: number) => {
    setAttachments((prev) => {
      const r = prev[i];
      if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleSend = async (prefill?: string) => {
    const msg = (prefill ?? text).trim();
    if (!msg && attachments.length === 0) return;
    
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = createSession();
    }

    if (msg.toLowerCase() === "/clear") {
      clearSessionMessages(currentSessionId);
      appendMessage(currentSessionId, { role: "model", parts: [{ text: "Memory cleared. How can I help you today?" }] });
      setText("");
      setAttachments([]);
      return;
    }

    setLocalError(null);

    const userParts: ChatPart[] = [
      ...attachments.flatMap((a) => a.parts),
      ...(msg ? [{ text: msg }] : []),
    ];
    appendMessage(currentSessionId, { role: "user", parts: userParts });
    setText("");
    setAttachments([]);
    setLoading(true);

    try {
      const rotator  = new KeyRotator(apiKeys);
      rotator.setCurrentIndex(rotationIndex);
      const history  = (activeSession?.messages ?? []).slice(-20);
      const response = await sendMessage({ model: selectedModel, history, userParts, rotator, mode });
      setRotationIndex(rotator.getCurrentIndex());
      appendMessage(currentSessionId, { role: "model", parts: [{ text: response.text }] });
      if (response.usage) {
        recordUsage({
          apiKeyId: response.usedKeyId,
          apiKeyName: response.usedKeyName,
          model: selectedModel,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        });
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => { createSession(); setLocalError(null); };

  const messages = activeSession?.messages ?? [];
  const hasChat  = messages.length > 0;
  const canSend  = (text.trim().length > 0 || attachments.length > 0) && !isLoading;

  const modelLabel = (m: string) =>
    m === "antigravity-preview-05-2026" ? "Antigravity"
    : m === "gemini-3.5-flash" ? "Gemini 3.5 Flash"
    : m === "gemini-3.1-flash-lite" ? "Gemini 3.1 Flash Lite"
    : m === "gemini-2.5-flash-lite" ? "Gemini 2.5 Flash-Lite"
    : m === "gemini-2.5-flash" ? "Gemini 2.5 Flash"
    : m === "gemini-2.0-flash-lite" ? "Gemini 2.0 Flash-Lite"
    : m === "gemma-4-31b-it" ? "Gemma 4 31B"
    : m === "gemma-4-26b-a4b-it" ? "Gemma 4 26B"
    : m === "gemini-robotics-er-1.6-preview" ? "Gemini Robotics-ER 1.6 Preview"
    : m;

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{
        backgroundColor: "var(--bg-color)",
        backgroundImage: "var(--bg-image)",
        color: "var(--text-color)",
        fontFamily: "'Crimson Pro', Georgia, serif",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) handleAttach(e.dataTransfer.files); }}
    >

      {/* ════════════════════════════════════════════════
          HEADER — logo + mode toggle only (no fake window controls)
      ════════════════════════════════════════════════ */}
      <header
        className="flex-shrink-0 flex items-center justify-between"
        style={{
          borderBottom: "1px solid rgba(213,205,197,0.25)",
          paddingLeft: "40px",
          paddingRight: "40px",
          height: "80px",
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: "26px",
            fontWeight: 700,
            fontStyle: "italic",
            color: "var(--primary)",
            letterSpacing: "-0.01em",
          }}
        >
          ApKiRota
        </span>

        {/* Normal / Unlimited mode switcher */}
        {currentView === "chat" && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--switcher-bg)",
              border: "1px solid var(--switcher-border)",
              borderRadius: "9999px",
              padding: "4px",
            }}
          >
            {mode === "normal" ? (
              <>
                <button
                  className="shadow-sm glow-unlimited"
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "var(--switcher-btn-color)",
                    background: "var(--switcher-btn-bg)",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "5px 16px",
                    cursor: "default",
                    lineHeight: "1",
                  }}
                >
                  Normal
                </button>
                <span style={{ color: "var(--switcher-border)", margin: "0 6px", userSelect: "none", fontSize: "12px" }}>|</span>
                <button
                  onClick={() => setMode("unlimited")}
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    color: "var(--text-color-muted)",
                    background: "transparent",
                    border: "none",
                    padding: "5px 16px",
                    cursor: "pointer",
                    lineHeight: "1",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-color-muted)"; }}
                >
                  Unlimited
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setMode("normal")}
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    color: "var(--text-color-muted)",
                    background: "transparent",
                    border: "none",
                    padding: "5px 16px",
                    cursor: "pointer",
                    lineHeight: "1",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-color-muted)"; }}
                >
                  Normal
                </button>
                <span style={{ color: "var(--switcher-border)", margin: "0 6px", userSelect: "none", fontSize: "12px" }}>|</span>
                <button
                  className="shadow-sm glow-unlimited"
                  style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "var(--switcher-btn-color)",
                    background: "var(--switcher-btn-bg)",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "5px 16px",
                    cursor: "default",
                    lineHeight: "1",
                  }}
                >
                  Unlimited
                </button>
              </>
            )}
          </div>
        )}

        {/* Right side: Light/Dark Mode toggler */}
        <div className="flex items-center gap-3" style={{ width: "100px", justifyContent: "flex-end" }}>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-color-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tertiary-fixed)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            title={theme === "light" ? "Switch to Night mode" : "Switch to Day mode"}
          >
            <Icon name={theme === "light" ? "light_mode" : "dark_mode"} className="text-[20px]" />
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto flex flex-col" style={{ paddingBottom: "120px" }}>
        {currentView === "settings" ? (
          <SettingsView />
        ) : currentView === "history" ? (
          <HistoryView />
        ) : currentView === "skills" ? (
          <SkillsView />
        ) : (
          <>
            {/* Error toast */}
            {localError && (
              <div
                className="mx-auto mt-4 w-full max-w-2xl px-6 py-3 rounded-2xl flex items-center gap-3"
                style={{ background: "rgba(249,218,214,0.80)", border: "1px solid rgba(186,26,26,0.20)" }}
              >
                <Icon name="error" size={18} className="" style={{ color: "#ba1a1a" } as React.CSSProperties} />
                <p style={{ flex: 1, fontSize: "15px", color: "#ba1a1a" }}>{localError}</p>
                <button onClick={() => setLocalError(null)} style={{ color: "#ba1a1a", opacity: 0.6 }}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}

            {!hasChat ? (
          /* ──────────────────────────────────────────
             WELCOME VIEW — vertically centered
          ────────────────────────────────────────── */
          <div
            className="flex-1 flex flex-col items-center justify-center px-8 fade-in"
            style={{ minHeight: "100%" }}
          >
            {/* Spa / leaf icon */}
            <div style={{ color: "#6b8a7a", marginBottom: "24px" }}>
              <Icon
                name="spa"
                thin
                size={72}
                className="illustrative-icon"
              />
            </div>

            {/* Greeting headline */}
            <h1
              className="text-center fade-in-delay-1"
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.04em",
                color: "#433e3a",
                marginBottom: "40px",
              }}
            >
              Hello,{" "}
              <span style={{ fontStyle: "italic", fontWeight: 300, color: "#6b8a7a" }}>
                night owl
              </span>
            </h1>

            {/* ── Input card ── */}
            <div
              className="w-full fade-in-delay-1"
              style={{ maxWidth: "760px", marginBottom: "40px" }}
            >
              {/* Attachment strip */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(213,205,197,0.50)" }}>
                      {att.previewUrl ? (
                        <img src={att.previewUrl} className="h-14 w-14 object-cover" alt="" />
                      ) : (
                        <div className="h-14 w-24 flex flex-col items-center justify-center" style={{ background: "#f3f0ec" }}>
                          <Icon name="description" size={18} />
                          <p style={{ fontSize: "9px", color: "#8a817a", marginTop: "2px" }}>{att.file.name}</p>
                        </div>
                      )}
                      <button onClick={() => removeAttachment(i)}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.45)" }}>
                        <Icon name="close" size={12} className="" style={{ color: "white" } as React.CSSProperties} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="input-card"
                style={{ padding: "36px 40px 28px 40px" }}
              >
                {/* Textarea */}
                <textarea
                  ref={welcomeInputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="How can I help you today?"
                  rows={1}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: "20px",
                    lineHeight: "30px",
                    fontStyle: "italic",
                    color: "var(--text-color)",
                    caretColor: "var(--primary)",
                  }}
                />

                {/* Toolbar */}
                <div className="flex items-center justify-between" style={{ marginTop: "28px" }}>
                  {/* Left: attach */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center rounded-full transition-colors"
                    title="Attach file"
                    style={{
                      width: "44px", height: "44px",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-color-muted)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Icon name="add" size={22} />
                  </button>

                  {/* Right: model + mic + send */}
                  <div className="flex items-center" style={{ gap: "16px" }}>
                    {/* Model selector */}
                    <div
                      className="relative flex items-center rounded-full cursor-pointer transition-colors"
                      style={{
                        padding: "8px 20px 8px 16px",
                        background: "var(--bg-color)",
                        border: "1px solid var(--border-color)",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-color)")}
                    >
                      <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: "15px", fontWeight: 500, color: "var(--text-color-muted)", whiteSpace: "nowrap" }}>
                        {modelLabel(selectedModel)}
                      </span>
                      <select
                        value={selectedModel}
                        onChange={(e) => setModel(e.target.value as typeof selectedModel)}
                        style={{
                          position: "absolute", inset: 0, opacity: 0, cursor: "pointer",
                          width: "100%", height: "100%",
                        }}
                      >
                        {SUPPORTED_MODELS.map((m) => (
                          <option key={m} value={m}>{modelLabel(m)}</option>
                        ))}
                      </select>
                      <Icon name="expand_more" size={16} style={{ color: "var(--text-color-muted)" } as React.CSSProperties} />
                    </div>

                    {/* Mic */}
                    <button
                      onClick={toggleRecording}
                      className="flex items-center justify-center rounded-full transition-colors"
                      style={{ width: "44px", height: "44px", border: "1px solid var(--border-color)", color: isRecording ? "var(--primary)" : "var(--text-color-muted)", background: isRecording ? "var(--glow-color)" : "transparent" }}
                      onMouseEnter={(e) => { if(!isRecording) e.currentTarget.style.background = "var(--input-bg)"; }}
                      onMouseLeave={(e) => { if(!isRecording) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon name={isRecording ? "mic" : "mic_none"} size={22} />
                    </button>

                    {/* Send */}
                    <button
                      onClick={() => handleSend()}
                      disabled={!canSend}
                      className="flex items-center justify-center rounded-full transition-all"
                      style={{
                        width: "48px", height: "48px",
                        background: canSend ? "#b1624d" : "rgba(177,98,77,0.28)",
                        color: "white",
                        boxShadow: canSend ? "0 4px 16px rgba(177,98,77,0.30)" : "none",
                        cursor: canSend ? "pointer" : "not-allowed",
                        transform: "scale(1)",
                        transition: "all 0.18s",
                      }}
                      onMouseEnter={(e) => { if (canSend) (e.currentTarget as HTMLElement).style.transform = "scale(1.08)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                    >
                      <Icon name="send" filled size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bento chips ── */}
            <div className="flex flex-wrap justify-center fade-in-delay-2" style={{ gap: "16px", maxWidth: "760px" }}>
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSend(chip.label)}
                  className="bento-card flex items-center group"
                  style={{ padding: "12px 24px", gap: "12px" }}
                >
                  <Icon
                    name={chip.icon}
                    size={22}
                    className="illustrative-icon"
                    style={{ transition: "transform 0.2s" } as React.CSSProperties}
                  />
                  <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: "16px", fontWeight: 500, letterSpacing: "0.01em", color: "#433e3a" }}>
                    {chip.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ──────────────────────────────────────────
             ACTIVE CHAT VIEW
          ────────────────────────────────────────── */
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div style={{ maxWidth: "860px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}

                {isLoading && (
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "8px 0" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "4px", background: "var(--tertiary-fixed)", color: "var(--tertiary)" }}>
                      <Icon name="spa" thin size={16} />
                    </div>
                    <div className="bubble-ai" style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {[0,1,2].map((j) => (
                          <span key={j} className="animate-bounce"
                            style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "rgba(138,129,122,0.40)", animationDelay: `${j * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>
            </div>

            {/* Chat input */}
            <div className="flex-shrink-0 px-6 pb-4" style={{ maxWidth: "860px", margin: "0 auto", width: "100%" }}>
              <div className="input-card" style={{ padding: "20px 28px 16px 28px" }}>
                <textarea
                  ref={chatInputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="Continue the conversation…"
                  rows={1}
                  style={{
                    width: "100%", background: "transparent", border: "none", outline: "none", resize: "none",
                    fontFamily: "'Crimson Pro', serif", fontSize: "17px", fontStyle: "italic",
                    lineHeight: "26px", color: "var(--text-color)", caretColor: "var(--primary)",
                  }}
                />
                <div className="flex items-center justify-between" style={{ marginTop: "12px" }}>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center rounded-full transition-colors"
                    style={{ width: "38px", height: "38px", border: "1px solid var(--border-color)", color: "var(--text-color-muted)", background: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Icon name="add" size={20} />
                  </button>
                  <div className="flex items-center" style={{ gap: "12px" }}>
                    <div className="relative flex items-center rounded-full" style={{ padding: "6px 16px 6px 12px", background: "var(--bg-color)", border: "1px solid var(--border-color)", gap: "6px" }}>
                      <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: "13px", fontWeight: 500, color: "var(--text-color-muted)", whiteSpace: "nowrap" }}>{modelLabel(selectedModel)}</span>
                      <select value={selectedModel} onChange={(e) => setModel(e.target.value as typeof selectedModel)}
                        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}>
                        {SUPPORTED_MODELS.map((m) => <option key={m} value={m}>{modelLabel(m)}</option>)}
                      </select>
                      <Icon name="expand_more" size={14} />
                    </div>
                    <button onClick={toggleRecording} className="flex items-center justify-center rounded-full transition-colors"
                      style={{ width: "38px", height: "38px", border: "1px solid var(--border-color)", color: isRecording ? "var(--primary)" : "var(--text-color-muted)", background: isRecording ? "var(--glow-color)" : "transparent" }}
                      onMouseEnter={(e) => { if(!isRecording) e.currentTarget.style.background = "var(--input-bg)"; }}
                      onMouseLeave={(e) => { if(!isRecording) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon name={isRecording ? "mic" : "mic_none"} size={20} />
                    </button>
                    <button onClick={() => handleSend()} disabled={!canSend}
                      className="flex items-center justify-center rounded-full transition-all"
                      style={{ width: "40px", height: "40px", background: canSend ? "#b1624d" : "rgba(177,98,77,0.25)", color: "white", cursor: canSend ? "pointer" : "not-allowed" }}
                    >
                      <Icon name="send" filled size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,text/plain,text/csv,.txt,.csv"
        className="hidden"
        onChange={(e) => e.target.files && handleAttach(e.target.files)}
      />

      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: "rgba(248,245,241,0.75)" }}>
          <div className="flex flex-col items-center gap-3 px-10 py-7 rounded-3xl" style={{ border: "2px dashed #b1624d", background: "rgba(255,255,255,0.80)" }}>
            <Icon name="cloud_upload" size={40} style={{ color: "#b1624d" } as React.CSSProperties} />
            <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: "18px", color: "#b1624d", fontWeight: 600 }}>Drop files here</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          FLOATING BOTTOM DOCK
      ════════════════════════════════════════════════ */}
      <nav
        className="fixed flex items-center floating-dock rounded-2xl shadow-2xl z-40"
        style={{
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "8px",
          gap: "4px",
        }}
      >
        <DockItem icon="chat"          label="CHAT"  active={currentView === "chat"} filled onClick={() => { setView("chat"); }} />
        <DockItem icon="add"           label="NEW"         onClick={() => { setView("chat"); handleNewChat(); }} />
        <DockItem icon="folder"        label="HISTORY"     onClick={() => setView("history")} />
        <DockItem icon="deployed_code" label="AGENTS"      onClick={() => setView("skills")} />

        <div style={{ width: "1px", height: "28px", background: "rgba(213,205,197,0.45)", margin: "0 8px" }} />

        {/* User avatar */}
        <div
          className="flex items-center justify-center rounded-full font-bold cursor-pointer select-none"
          style={{
            width: "40px", height: "40px",
            background: "#d9e5dd",
            color: "#1a2c24",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
          }}
        >
          S
        </div>

        {/* Settings */}
        <button
          onClick={() => setView("settings")}
          className="flex items-center justify-center rounded-full transition-colors"
          style={{ width: "40px", height: "40px", color: "var(--text-color-muted)", background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Icon name="settings" size={22} />
        </button>
      </nav>
    </div>
  );
};

export default App;
