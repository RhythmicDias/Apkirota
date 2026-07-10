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
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, selectActiveSession, SUPPORTED_MODELS } from "./store/useAppStore";
import { KeyRotator } from "./lib/KeyRotator";
import { sendMessage, uploadFileToGemini } from "./lib/geminiClient";
import type { ChatPart } from "./lib/geminiClient";
import { processFile, getPreviewUrl } from "./lib/fileProcessor";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "early bird";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night owl";
}

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
    className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all gap-0.5"
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
  uploadProgress?: number;
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
  const modelConfigs    = useAppStore((s) => s.modelConfigs);
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
  const updateMessageText = useAppStore((s) => s.updateMessageText);
  const updateMessageMetadata = useAppStore((s) => s.updateMessageMetadata);
  const removeSubsequentMessages = useAppStore((s) => s.removeSubsequentMessages);
  const skills = useAppStore((s) => s.skills);

  const [text, setText]               = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver]   = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [localError, setLocalError]   = useState<string | null>(null);
  const [isDockVisible, setIsDockVisible] = useState(true);

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
    setIsAttaching(true);
    for (const file of Array.from(files)) {
      try {
        const requiresFileApi = file.type.startsWith("audio/") || file.type.startsWith("video/") || file.type === "application/pdf" || file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|mp4|webm|pdf|doc|docx|rtf|xls|xlsx|ppt|pptx)$/i);
        if (requiresFileApi) {
          setAttachments((prev) => [...prev, { file, previewUrl: null, parts: [], uploadProgress: 0 }]);
          
          const rotator = new KeyRotator(useAppStore.getState().apiKeys);
          rotator.setCurrentIndex(useAppStore.getState().rotationIndex);
          const entry = useAppStore.getState().mode === "unlimited" ? rotator.getNextKey() : rotator.getActiveKey();
          if (!entry) throw new Error("No API key available for upload.");
          const rawKeyValue = await invoke<string>("load_api_key", { keyId: entry.id });
          
          const { fileUri, mimeType } = await uploadFileToGemini(file, rawKeyValue, (prog) => {
            setAttachments((prev) => prev.map(a => a.file === file ? { ...a, uploadProgress: prog } : a));
          });
          
          setAttachments((prev) => prev.map(a => a.file === file ? { ...a, uploadProgress: 100, parts: [{ fileData: { mimeType, fileUri }, uploadKeyId: entry.id }] } : a));
        } else {
          const parts = await processFile(file);
          setAttachments((prev) => [...prev, { file, previewUrl: getPreviewUrl(file), parts }]);
        }
      } catch (e) { 
        console.error(e); 
        setLocalError(e instanceof Error ? `Attachment failed: ${e.message}` : "Failed to attach file.");
        setAttachments((prev) => prev.filter(a => a.file !== file));
      }
    }
    setIsAttaching(false);
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
      const modelConfig = modelConfigs[selectedModel];
      const initialStoreSession = useAppStore.getState().sessions.find(s => s.id === currentSessionId);
      const skill = initialStoreSession?.skillId ? skills.find(s => s.id === initialStoreSession.skillId) : undefined;
      const systemPrompt = skill?.systemPrompt;
      const startTime = Date.now();
      const response = await sendMessage({ model: selectedModel, history, userParts, rotator, mode, modelConfig, systemPrompt });
      const latencyMs = Date.now() - startTime;
      setRotationIndex(rotator.getCurrentIndex());
      const storeSession = useAppStore.getState().sessions.find(s => s.id === currentSessionId);
      const userMsgIndex = storeSession ? storeSession.messages.length - 1 : -1;
      if (userMsgIndex >= 0) {
        updateMessageMetadata(currentSessionId, userMsgIndex, { 
          modelName: selectedModel,
          apiKeyName: response.usedKeyName,
          ...(response.usage ? { usage: { promptTokens: response.usage.promptTokens } } : {})
        });
      }
      appendMessage(currentSessionId, { 
        role: "model", 
        parts: [{ text: response.text }],
        modelName: selectedModel,
        apiKeyName: response.usedKeyName,
        usage: { completionTokens: response.usage?.completionTokens, totalTokens: response.usage?.totalTokens, latencyMs }
      });
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

  const handleNewChat = () => { 
    createSession(); 
    setLocalError(null); 
    setText("");
    setAttachments([]);
  };

  const messages = activeSession?.messages ?? [];
  const hasChat  = messages.length > 0;
  const canSend  = (text.trim().length > 0 || attachments.length > 0) && !isLoading && attachments.every(a => a.uploadProgress === undefined || a.uploadProgress === 100);

  const modelLabel = (m: string) =>
    m === "gemini-3.5-flash" ? "Gemini 3.5 Flash"
    : m === "gemini-3.1-flash-lite" ? "Gemini 3.1 Flash Lite"
    : m === "gemini-2.5-flash-lite" ? "Gemini 2.5 Flash-Lite"
    : m === "gemini-2.5-flash" ? "Gemini 2.5 Flash"
    : m === "gemini-2.0-flash-lite" ? "Gemini 2.0 Flash-Lite"
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
                {getTimeBasedGreeting()}
              </span>
            </h1>

            {/* ── Input card ── */}
            <div
              className="w-full fade-in-delay-1"
              style={{ maxWidth: "760px", marginBottom: "40px" }}
            >
              {/* Attachment strip */}
              {attachments.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {attachments.map((att, i) => (
                    <div key={i} style={{ border: "1px solid var(--border-color)", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt="" style={{ height: "56px", width: "56px", objectFit: "cover" }} />
                      ) : (
                        <div style={{ height: "56px", width: "96px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--input-bg)", position: "relative" }}>
                          {att.uploadProgress !== undefined && att.uploadProgress < 100 && (
                            <div style={{ position: "absolute", bottom: 0, left: 0, height: "4px", background: "var(--primary)", width: `${att.uploadProgress}%`, transition: "width 0.2s" }} />
                          )}
                          <Icon name="description" size={18} />
                          <p style={{ fontSize: "9px", color: "var(--text-color-muted)", marginTop: "2px", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                            {att.uploadProgress !== undefined && att.uploadProgress < 100 ? `${att.uploadProgress}%` : att.file.name}
                          </p>
                        </div>
                      )}
                      <button onClick={() => removeAttachment(i)}
                        style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", cursor: "pointer" }}>
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

                {localError && (
                  <div style={{ marginTop: "12px", padding: "12px", background: "rgba(186, 26, 26, 0.1)", borderRadius: "8px", border: "1px solid rgba(186, 26, 26, 0.2)" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#ba1a1a", fontFamily: "'Crimson Pro', serif" }}>
                      {localError}
                    </p>
                  </div>
                )}

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
                  <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: "16px", fontWeight: 500, letterSpacing: "0.01em", color: "var(--text-color)" }}>
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
          <div className="flex-1 relative overflow-hidden">
            {/* Messages */}
            <div className="absolute inset-0 overflow-y-auto px-6 pt-6" style={{ paddingBottom: isDockVisible ? "220px" : "140px" }}>
              <div style={{ maxWidth: "760px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.map((msg, i) => {
                  const isLast = i === messages.length - 1;
                  const nextMsg = messages[i + 1];
                  const hasErr = isLast && msg.role === "user" && localError !== null;
                  
                  const handleEditMessage = async (newText: string) => {
                    if (!activeSessionId) return;
                    updateMessageText(activeSessionId, i, newText);
                    removeSubsequentMessages(activeSessionId, i);
                    
                    setLoading(true);
                    setLocalError(null);
                    try {
                      const updatedSession = useAppStore.getState().sessions.find((s) => s.id === activeSessionId);
                      const userMsg = updatedSession?.messages[i];
                      if (!userMsg) return;
                      const userParts = userMsg.parts;
                      const history = (updatedSession?.messages.slice(0, i) ?? []).slice(-20);
                      
                      const rotator  = new KeyRotator(apiKeys);
                      rotator.setCurrentIndex(rotationIndex);
                      const modelConfig = modelConfigs[selectedModel];
                      const skill = updatedSession?.skillId ? skills.find(s => s.id === updatedSession.skillId) : undefined;
                      const systemPrompt = skill?.systemPrompt;
                      const startTime = Date.now();
                      const response = await sendMessage({ model: selectedModel, history, userParts, rotator, mode, modelConfig, systemPrompt });
                      const latencyMs = Date.now() - startTime;
                      setRotationIndex(rotator.getCurrentIndex());
                      updateMessageMetadata(activeSessionId, i, { 
                        modelName: selectedModel,
                        apiKeyName: response.usedKeyName,
                        ...(response.usage ? { usage: { promptTokens: response.usage.promptTokens } } : {})
                      });
                      appendMessage(activeSessionId, { 
                        role: "model", 
                        parts: [{ text: response.text }],
                        modelName: selectedModel,
                        apiKeyName: response.usedKeyName,
                        usage: { completionTokens: response.usage?.completionTokens, totalTokens: response.usage?.totalTokens, latencyMs }
                      });
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

                  const handleResendMessage = async () => {
                    if (!activeSessionId) return;
                    removeSubsequentMessages(activeSessionId, i);
                    
                    setLoading(true);
                    setLocalError(null);
                    try {
                      const updatedSession = useAppStore.getState().sessions.find((s) => s.id === activeSessionId);
                      const userMsg = updatedSession?.messages[i];
                      if (!userMsg) return;
                      const userParts = userMsg.parts;
                      const history = (updatedSession?.messages.slice(0, i) ?? []).slice(-20);
                      
                      const rotator  = new KeyRotator(apiKeys);
                      rotator.setCurrentIndex(rotationIndex);
                      const modelConfig = modelConfigs[selectedModel];
                      const skill = updatedSession?.skillId ? skills.find(s => s.id === updatedSession.skillId) : undefined;
                      const systemPrompt = skill?.systemPrompt;
                      const startTime = Date.now();
                      const response = await sendMessage({ model: selectedModel, history, userParts, rotator, mode, modelConfig, systemPrompt });
                      const latencyMs = Date.now() - startTime;
                      setRotationIndex(rotator.getCurrentIndex());
                      updateMessageMetadata(activeSessionId, i, { 
                        modelName: selectedModel,
                        apiKeyName: response.usedKeyName,
                        ...(response.usage ? { usage: { promptTokens: response.usage.promptTokens } } : {})
                      });
                      appendMessage(activeSessionId, { 
                        role: "model", 
                        parts: [{ text: response.text }],
                        modelName: selectedModel,
                        apiKeyName: response.usedKeyName,
                        usage: { completionTokens: response.usage?.completionTokens, totalTokens: response.usage?.totalTokens, latencyMs }
                      });
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

                  return (
                    <ChatBubble
                      key={i}
                      message={msg}
                      isLastMessage={isLast || (msg.role === "user" && !nextMsg)}
                      hasError={hasErr}
                      onEdit={msg.role === "user" ? handleEditMessage : undefined}
                      onResend={msg.role === "user" ? handleResendMessage : undefined}
                    />
                  );
                })}

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
            <div className="absolute bottom-0 left-0 right-0 px-6 pointer-events-none flex flex-col justify-end"
                 style={{
                   paddingBottom: isDockVisible ? "80px" : "24px",
                   paddingTop: "20px",
                   zIndex: 10,
                   transition: "padding-bottom 0.5s ease"
                 }}>
              <div className="pointer-events-auto" style={{ maxWidth: "760px", margin: "0 auto", width: "100%" }}>
              {/* Attachment strip */}
              {attachments.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {attachments.map((att, i) => (
                    <div key={i} style={{ border: "1px solid var(--border-color)", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt="" style={{ height: "56px", width: "56px", objectFit: "cover" }} />
                      ) : (
                        <div style={{ height: "56px", width: "96px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--input-bg)", position: "relative" }}>
                          {att.uploadProgress !== undefined && att.uploadProgress < 100 && (
                            <div style={{ position: "absolute", bottom: 0, left: 0, height: "4px", background: "var(--primary)", width: `${att.uploadProgress}%`, transition: "width 0.2s" }} />
                          )}
                          <Icon name="description" size={18} />
                          <p style={{ fontSize: "9px", color: "var(--text-color-muted)", marginTop: "2px", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                            {att.uploadProgress !== undefined && att.uploadProgress < 100 ? `${att.uploadProgress}%` : att.file.name}
                          </p>
                        </div>
                      )}
                      <button onClick={() => removeAttachment(i)}
                        style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", cursor: "pointer" }}>
                        <Icon name="close" size={12} className="" style={{ color: "white" } as React.CSSProperties} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="input-card" style={{ padding: "12px 20px 12px 20px" }}>
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
                <div className="flex items-center justify-between" style={{ marginTop: "8px" }}>
                  <button onClick={() => fileInputRef.current?.click()}
                    disabled={isAttaching}
                    className={`flex items-center justify-center rounded-full transition-colors ${isAttaching ? "animate-pulse" : ""}`}
                    style={{ width: "38px", height: "38px", border: "1px solid var(--border-color)", color: isAttaching ? "var(--primary)" : "var(--text-color-muted)", background: "transparent" }}
                    onMouseEnter={(e) => { if(!isAttaching) e.currentTarget.style.background = "var(--input-bg)" }}
                    onMouseLeave={(e) => { if(!isAttaching) e.currentTarget.style.background = "transparent" }}
                  >
                    {isAttaching ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Icon name="add" size={20} />
                    )}
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
        accept="image/png,image/jpeg,image/webp,text/plain,text/csv,.txt,.csv,audio/*,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,.doc,.rtf"
        className="hidden"
        onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
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

      {/* Expand Dock Button */}
      <button
        onClick={() => setIsDockVisible(true)}
        className="fixed z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-500"
        style={{
          bottom: "20px", left: isDockVisible ? "-60px" : "20px",
          width: "48px", height: "48px", background: "var(--bento-bg)", border: "1px solid var(--border-color)",
          color: "var(--text-color)", opacity: isDockVisible ? 0 : 1, backdropFilter: "blur(8px)", cursor: "pointer"
        }}
      >
        <Icon name="chevron_right" size={28} />
      </button>

      {/* ════════════════════════════════════════════════
          FLOATING BOTTOM DOCK
      ════════════════════════════════════════════════ */}
      <nav
        className="fixed flex items-center floating-dock rounded-2xl shadow-2xl z-40 transition-all duration-500"
        style={{
          bottom: "20px",
          left: "50%",
          transform: isDockVisible ? "translateX(-50%)" : "translateX(-150vw)",
          opacity: isDockVisible ? 1 : 0,
          pointerEvents: isDockVisible ? "auto" : "none",
          padding: "6px 12px",
          gap: "4px",
        }}
      >
        <button
          onClick={() => setIsDockVisible(false)}
          className="absolute flex items-center justify-center rounded-full shadow transition-colors"
          style={{
            top: "-8px", right: "-8px", width: "22px", height: "22px",
            background: "var(--bg-color)", border: "1px solid var(--border-color)",
            color: "var(--text-color-muted)", cursor: "pointer", zIndex: 10
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-color-muted)")}
        >
          <Icon name="close" size={14} />
        </button>
        <DockItem icon="chat"          label="CHAT"  active={currentView === "chat"} filled onClick={() => { setView("chat"); }} />
        <DockItem icon="add"           label="NEW"         onClick={() => { setView("chat"); handleNewChat(); }} />
        <DockItem icon="folder"        label="HISTORY"     onClick={() => setView("history")} />
        <DockItem icon="deployed_code" label="AGENTS"      onClick={() => setView("skills")} />

        <div style={{ width: "1px", height: "20px", background: "rgba(213,205,197,0.45)", margin: "0 8px" }} />

        {/* User avatar */}
        <div
          className="flex items-center justify-center rounded-full font-bold cursor-pointer select-none"
          style={{
            width: "36px", height: "36px",
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
          style={{ width: "36px", height: "36px", color: "var(--text-color-muted)", background: "transparent" }}
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
