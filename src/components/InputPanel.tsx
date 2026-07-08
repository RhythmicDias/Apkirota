/**
 * InputPanel.tsx — Claude-style centered input card.
 * Props control whether it renders in "welcome" (centered) or "chat" (bottom) mode.
 */

import React, { useRef, useState, useCallback } from "react";
import { processFile, getPreviewUrl } from "../lib/fileProcessor";
import type { ChatPart } from "../lib/geminiClient";
import { useAppStore, SUPPORTED_MODELS } from "../store/useAppStore";

interface AttachedFile {
  file: File;
  previewUrl: string | null;
  parts: ChatPart[];
}

interface InputPanelProps {
  onSend: (text: string, attachments: ChatPart[]) => void;
  disabled?: boolean;
  /** "welcome" = large centered card; "chat" = compact bottom bar */
  variant?: "welcome" | "chat";
}

const InputPanel: React.FC<InputPanelProps> = ({
  onSend,
  disabled,
  variant = "chat",
}) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedModel = useAppStore((s) => s.selectedModel);
  const setModel = useAppStore((s) => s.setModel);

  const handleAttach = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      try {
        const parts = await processFile(file);
        const previewUrl = getPreviewUrl(file);
        setAttachments((prev) => [...prev, { file, previewUrl, parts }]);
      } catch (err) {
        console.error("Failed to process file:", err);
      }
    }
  }, []);

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments.flatMap((a) => a.parts));
    setText("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 180) + "px"; }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleAttach(e.dataTransfer.files);
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled;
  const isWelcome = variant === "welcome";

  return (
    <div
      className={`relative ${isWelcome ? "w-full max-w-2xl mx-auto" : "px-4 pb-4 pt-2"}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Attachment thumbnails */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {attachments.map((att, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-[#5483B3]/25">
              {att.previewUrl ? (
                <img src={att.previewUrl} className="h-14 w-14 object-cover" alt={att.file.name} />
              ) : (
                <div className="h-14 w-20 bg-[#052659] flex flex-col items-center justify-center p-2">
                  <svg className="w-5 h-5 text-[#7DA0CA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[9px] text-[#7DA0CA] mt-1 truncate w-full text-center">{att.file.name}</p>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#021024]/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
              >
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input card */}
      <div className={`input-card ${isDragOver ? "border-[#5483B3]/60" : ""}`}>
        {/* Textarea row */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              isWelcome
                ? "How can I help you today?"
                : disabled
                ? "Waiting for response..."
                : "Message Apkirota… (Ctrl+Enter)"
            }
            rows={1}
            className={`w-full bg-transparent resize-none text-[#C1E8FF] placeholder-[#7DA0CA]/40 focus:outline-none leading-relaxed disabled:opacity-40 ${
              isWelcome ? "text-[14.5px] min-h-[28px] max-h-[160px]" : "text-sm min-h-[22px] max-h-[180px]"
            }`}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          {/* Left: attach button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[#7DA0CA]/60 hover:text-[#C1E8FF] hover:bg-[#5483B3]/15 transition-all"
              title="Attach file"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,text/plain,text/csv,.txt,.csv"
              className="hidden"
              onChange={(e) => e.target.files && handleAttach(e.target.files)}
            />
          </div>

          {/* Right: model selector + send */}
          <div className="flex items-center gap-2">
            {/* Model selector */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setModel(e.target.value as typeof selectedModel)}
                className="appearance-none pl-2.5 pr-6 py-1 rounded-lg bg-transparent border border-[#5483B3]/20 text-[#7DA0CA] text-[11.5px] focus:outline-none cursor-pointer hover:border-[#5483B3]/40 transition-colors"
              >
                {SUPPORTED_MODELS.map((m) => (
                  <option key={m} value={m} className="bg-[#021024] text-[#C1E8FF]">
                    {m.replace("gemini-", "").replace("-", " ")}
                  </option>
                ))}
              </select>
              <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-[#7DA0CA]/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                canSend
                  ? "bg-gradient-to-br from-[#5483B3] to-[#C1E8FF] text-[#021024] shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                  : "bg-[#5483B3]/10 text-[#7DA0CA]/25 cursor-not-allowed"
              }`}
              title="Send (Ctrl+Enter)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Drag hint overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#5483B3] bg-[#021024]/75 pointer-events-none">
          <p className="text-[#C1E8FF] font-medium text-sm">Drop files here</p>
        </div>
      )}
    </div>
  );
};

export default InputPanel;
