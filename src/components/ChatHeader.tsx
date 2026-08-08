/**
 * ChatHeader.tsx — Minimal Claude-style header for the active chat view.
 * Mode toggle, model selector, key health indicator.
 */

import React from "react";
import { useAppStore, selectHealthyKeyCount, selectActiveSession, selectAvailableModels } from "../store/useAppStore";

const ChatHeader: React.FC = () => {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setModel = useAppStore((s) => s.setModel);
  const availableModels = useAppStore(selectAvailableModels);
  const totalKeys = useAppStore((s) => s.apiKeys.length);
  const healthyKeys = useAppStore(selectHealthyKeyCount);
  const activeSession = useAppStore(selectActiveSession);
  const skills = useAppStore((s) => s.skills);
  const activeSkill = activeSession?.skillId ? skills.find(s => s.id === activeSession.skillId) : null;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#7DA0CA]/8 shrink-0">

      {/* Left: mode toggle */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1 p-0.5 bg-[#052659] border border-[#5483B3]/25 rounded-full">
          {(["normal", "unlimited", "pro"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${
                mode === m
                  ? m === "pro"
                    ? "bg-[#d4af37]/20 text-[#d4af37] font-medium"
                    : "bg-gradient-to-r from-[#5483B3] to-[#C1E8FF] text-[#021024] font-medium shadow-sm"
                  : "text-[#7DA0CA]/60 hover:text-[#C1E8FF]/80"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {mode === "unlimited" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#C1E8FF]/10 text-[#C1E8FF]/80 border border-[#C1E8FF]/20">
            rotating
          </span>
        )}
        {mode === "pro" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#d4af37]/10 text-[#d4af37]/80 border border-[#d4af37]/20">
            web search
          </span>
        )}
        {activeSkill && (
          <span className="ml-3 px-4 py-1 rounded-full text-[12px] font-medium bg-[var(--primary)] text-white flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>robot_2</span>
            Chatting with {activeSkill.name}
          </span>
        )}
      </div>

      {/* Right: key health + model */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            healthyKeys === 0 ? "bg-red-400" : healthyKeys < totalKeys ? "bg-yellow-400" : "bg-emerald-400"
          }`} />
          <span className="text-[#7DA0CA]/60 text-[11.5px]">{healthyKeys}/{totalKeys} keys</span>
        </div>

        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setModel(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-[#052659]/60 border border-[#5483B3]/20 text-[#C1E8FF]/70 text-[11.5px] focus:outline-none cursor-pointer hover:border-[#5483B3]/40 transition-colors"
          >
            {availableModels.map((m) => (
              <option key={m} value={m} style={{ background: "var(--bg-color)", color: "var(--text-color)" }}>{m}</option>
            ))}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-[#7DA0CA]/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
