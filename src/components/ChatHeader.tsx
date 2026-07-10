/**
 * ChatHeader.tsx — Minimal Claude-style header for the active chat view.
 * Mode toggle, model selector, key health indicator.
 */

import React from "react";
import { useAppStore, SUPPORTED_MODELS, selectHealthyKeyCount, selectActiveSession } from "../store/useAppStore";

const ChatHeader: React.FC = () => {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setModel = useAppStore((s) => s.setModel);
  const totalKeys = useAppStore((s) => s.apiKeys.length);
  const healthyKeys = useAppStore(selectHealthyKeyCount);
  const activeSession = useAppStore(selectActiveSession);
  const skills = useAppStore((s) => s.skills);
  const activeSkill = activeSession?.skillId ? skills.find(s => s.id === activeSession.skillId) : null;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#7DA0CA]/8 shrink-0">

      {/* Left: mode toggle */}
      <div className="flex items-center gap-2.5">
        <span className={`text-xs transition-colors duration-200 ${mode === "normal" ? "text-[#C1E8FF]/80" : "text-[#7DA0CA]/40"}`}>
          Normal
        </span>

        <button
          onClick={() => setMode(mode === "normal" ? "unlimited" : "normal")}
          role="switch"
          aria-checked={mode === "unlimited"}
          className={`relative inline-flex w-12 h-6 rounded-full border transition-all duration-300 focus:outline-none ${
            mode === "unlimited"
              ? "bg-gradient-to-r from-[#5483B3] to-[#C1E8FF] border-transparent glow-animate"
              : "bg-[#052659] border-[#5483B3]/25"
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${mode === "unlimited" ? "translate-x-6" : "translate-x-0"}`} />
        </button>

        <span className={`text-xs transition-colors duration-200 ${mode === "unlimited" ? "text-[#C1E8FF]/80" : "text-[#7DA0CA]/40"}`}>
          Unlimited
        </span>

        {mode === "unlimited" && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#C1E8FF]/10 text-[#C1E8FF]/80 border border-[#C1E8FF]/20">
            rotating
          </span>
        )}
        {activeSkill && (
          <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--primary)] text-white flex items-center gap-1 shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>robot_2</span>
            {activeSkill.name}
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
            onChange={(e) => setModel(e.target.value as typeof selectedModel)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-[#052659]/60 border border-[#5483B3]/20 text-[#C1E8FF]/70 text-[11.5px] focus:outline-none cursor-pointer hover:border-[#5483B3]/40 transition-colors"
          >
            {SUPPORTED_MODELS.map((m) => (
              <option key={m} value={m} className="bg-[#021024]">{m}</option>
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
