import React from "react";
import { useAppStore } from "../store/useAppStore";

const Icon = ({
  name,
  className = "",
  size = 20,
  style,
}: {
  name: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) => (
  <span className={`material-symbols-outlined ${className}`} style={{ fontSize: `${size}px`, ...style }}>
    {name}
  </span>
);

const HistoryView: React.FC = () => {
  const sessions = useAppStore((s) => s.sessions);
  const selectSession = useAppStore((s) => s.selectSession);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const clearAllSessions = useAppStore((s) => s.clearAllSessions);
  const setView = useAppStore((s) => s.setView);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "768px",
        margin: "0 auto",
        padding: "32px 24px",
        overflowY: "auto",
        fontFamily: "'Crimson Pro', serif",
      }}
      className="fade-in"
    >
      {/* Back navigation & Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          onClick={() => setView("chat")}
          style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            color: "var(--text-color-muted)",
            background: "var(--input-bg)",
            cursor: "pointer",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--border-color)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--input-bg)"; }}
        >
          <Icon name="arrow_back" size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-color)", margin: 0, lineHeight: 1.2 }}>Chat History</h2>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: "2px 0 0 0" }}>Browse, reopen, or manage past conversation sessions</p>
        </div>
      </div>

      {/* History List Card Enclosure */}
      <div
        style={{
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
          background: "var(--input-bg)",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0" }}>
              Stored Sessions ({sessions.length})
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>
              Click any conversation to reload its messages and history context.
            </p>
          </div>
          {sessions.length > 0 && (
            <button
              onClick={() => { if (confirm("Clear all session history?")) clearAllSessions(); }}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', monospace",
                border: "1px solid rgba(186,26,26,0.25)",
                color: "#ba1a1a",
                background: "transparent",
                cursor: "pointer"
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", borderRadius: "12px", border: "1px dashed var(--border-color)", background: "var(--bg-color)" }}>
            <p style={{ color: "var(--text-color-muted)", fontSize: "14px", margin: 0, fontStyle: "italic" }}>No chat history available.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-color)",
                  gap: "12px"
                }}
              >
                <div
                  style={{ flex: 1, minWidth: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}
                  onClick={() => {
                    selectSession(session.id);
                    setView("chat");
                  }}
                >
                  <Icon name="chat_bubble_outline" size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-color)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {session.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-color-muted)", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                      {new Date(session.createdAt).toLocaleDateString()} • {session.messages.length} messages
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteSession(session.id)}
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-color-muted)",
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(186,26,26,0.1)"; e.currentTarget.style.color = "#ba1a1a"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-color-muted)"; }}
                  title="Delete Chat"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
