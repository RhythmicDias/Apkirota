/**
 * Sidebar.tsx — Claude-style minimal sidebar.
 * Tabs at top, plain text nav links, user footer.
 */

import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";

interface SidebarProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewChat, onOpenSettings }) => {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const selectSession = useAppStore((s) => s.selectSession);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const mode = useAppStore((s) => s.mode);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "keys">("chat");

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <aside className="flex flex-col h-full w-[240px] shrink-0 border-r border-[#7DA0CA]/10 bg-[#021024]">

      {/* ── Top tabs (Chat | Keys) ── */}
      <div className="flex items-center gap-1 px-3 pt-4 pb-2">
        <button
          onClick={() => setActiveTab("chat")}
          className={`sidebar-tab ${activeTab === "chat" ? "active" : ""}`}
        >
          {/* Chat bubble icon */}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>
        <button
          onClick={() => { setActiveTab("keys"); onOpenSettings(); }}
          className={`sidebar-tab ${activeTab === "keys" ? "active" : ""}`}
        >
          {/* Key icon */}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Keys
        </button>
      </div>

      {/* ── Nav links ── */}
      <nav className="px-2 pt-1 space-y-0.5">
        <button onClick={onNewChat} className="sidebar-link w-full text-left">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
        <button className="sidebar-link w-full text-left opacity-50 cursor-not-allowed" disabled>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Projects
        </button>
        <button onClick={onOpenSettings} className="sidebar-link w-full text-left">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </nav>

      {/* ── Divider ── */}
      <div className="mx-3 my-3 border-t border-[#7DA0CA]/8" />

      {/* ── Search ── */}
      <div className="px-3 mb-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#7DA0CA]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="w-full pl-7 pr-3 py-1.5 bg-transparent border border-[#7DA0CA]/10 rounded-lg text-[#C1E8FF]/70 text-xs placeholder-[#7DA0CA]/30 focus:outline-none focus:border-[#5483B3]/30 transition-colors"
          />
        </div>
      </div>

      {/* ── Session list ── */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[#7DA0CA]/25 text-xs py-6">No chats yet</p>
        ) : (
          filtered.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`group sidebar-link cursor-pointer ${isActive ? "active" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{session.title}</p>
                  <p className="text-[10px] text-[#7DA0CA]/35 mt-0.5">{formatDate(session.updatedAt)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 rounded transition-all"
                  title="Delete"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer (user / mode) ── */}
      <div className="px-3 py-4 border-t border-[#7DA0CA]/8 space-y-2">
        {/* Mode badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] ${
          mode === "unlimited"
            ? "text-[#C1E8FF] bg-[#5483B3]/12 border border-[#5483B3]/25"
            : "text-[#7DA0CA]/60"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${mode === "unlimited" ? "bg-[#C1E8FF] animate-pulse" : "bg-[#7DA0CA]/40"}`} />
          {mode === "unlimited" ? "Unlimited rotation active" : "Normal mode"}
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5483B3] to-[#C1E8FF] flex items-center justify-center shrink-0">
            <span className="text-[#021024] font-bold text-[10px]">Ak</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#C1E8FF] font-medium truncate">Apkirota</p>
            <p className="text-[10px] text-[#7DA0CA]/40">Local · Free</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
