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
  const setView = useAppStore((s) => s.setView);

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{
        width: "100%",
        maxWidth: "768px",
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      {/* Header */}
      <div className="flex items-center" style={{ marginBottom: "32px", gap: "16px" }}>
        <button
          onClick={() => setView("chat")}
          className="flex items-center justify-center rounded-full transition-colors"
          style={{ width: "40px", height: "40px", color: "var(--text-color-muted)", background: "var(--input-bg)", border: "1px solid var(--border-color)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-color)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: "28px", fontWeight: 600, color: "var(--text-color)", margin: 0 }}>
          Chat History
        </h2>
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-color-muted)", marginTop: "40px", fontStyle: "italic" }}>
          No chat history available.
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: "12px" }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between transition-colors"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                padding: "8px 16px",
              }}
            >
              <div 
                className="flex-1 cursor-pointer flex items-center"
                style={{ gap: "16px", overflow: "hidden", paddingRight: "16px" }}
                onClick={() => {
                  selectSession(session.id);
                  setView("chat");
                }}
              >
                <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: "16px", fontWeight: 600, color: "var(--text-color)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: "1" }}>
                  {session.title}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-color-muted)", whiteSpace: "nowrap" }}>
                  {new Date(session.createdAt).toLocaleString()} • {session.messages.length} msgs
                </div>
              </div>
              <button
                onClick={() => deleteSession(session.id)}
                className="flex items-center justify-center rounded-full transition-colors"
                style={{ width: "36px", height: "36px", color: "#ba1a1a", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(186, 26, 26, 0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                title="Delete Chat"
              >
                <Icon name="delete" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
