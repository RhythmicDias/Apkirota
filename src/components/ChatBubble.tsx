import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ChatMessage } from "../lib/geminiClient";

interface ChatBubbleProps {
  message: ChatMessage;
  onEdit?: (newText: string) => void;
  onResend?: () => void;
  isLastMessage: boolean;
  hasError?: boolean;
}

const Icon = ({ name, style, size = 16 }: { name: string; style?: React.CSSProperties; size?: number }) => (
  <span className="material-symbols-outlined" style={{ fontSize: `${size}px`, ...style }}>{name}</span>
);

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onEdit, onResend, isLastMessage, hasError }) => {
  const isUser = message.role === "user";
  const text   = message.parts.find((p) => p.text)?.text ?? "";
  const images = message.parts.filter((p) => p.inlineData);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit && editText.trim() !== "" && editText !== text) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  };

  if (isUser) {
    return (
      <div className="fade-in" style={{ display: "flex", justifyContent: "flex-end", padding: "6px 0", width: "100%" }}>
        <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          {images.map((part, i) => (
            <img
              key={i}
              src={`data:${part.inlineData!.mimeType};base64,${part.inlineData!.data}`}
              alt="attachment"
              style={{ maxHeight: "208px", borderRadius: "1rem", border: "1px solid rgba(177, 98, 77, 0.15)", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
            />
          ))}
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", minWidth: "300px" }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "16px",
                  border: "1px solid var(--primary)",
                  background: "var(--input-bg)",
                  color: "var(--text-color)",
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: "17px",
                  outline: "none",
                  resize: "vertical"
                }}
                rows={3}
              />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-color-muted)", cursor: "pointer", background: "transparent" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{ padding: "6px 12px", background: "var(--primary)", border: "none", borderRadius: "8px", color: "white", cursor: "pointer" }}
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <>
              {text && (
                <div
                  className="bubble-user"
                  style={{
                    padding: "14px 20px",
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: "17px",
                    lineHeight: "26px",
                    color: "var(--text-color)",
                  }}
                >
                  {text}
                </div>
              )}
              {/* Actions row */}
              <div style={{ display: "flex", gap: "12px", opacity: 0.5, transition: "opacity 0.2s", width: "100%", alignItems: "center" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}>
                {message.usage?.promptTokens !== undefined && (
                  <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)", marginRight: "auto" }}>
                    Input Tokens: {message.usage.promptTokens}
                  </span>
                )}
                <button onClick={handleCopy} title="Copy" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-color-muted)" }}>
                  <Icon name={copied ? "check" : "content_copy"} size={16} />
                </button>
                {onEdit && (
                  <button onClick={() => { setIsEditing(true); setEditText(text); }} title="Edit" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-color-muted)" }}>
                    <Icon name="edit" size={16} />
                  </button>
                )}
                {onResend && (isLastMessage || hasError) && (
                  <button onClick={onResend} title="Resend" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-color-muted)" }}>
                    <Icon name="refresh" size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // AI bubble
  return (
    <div className="fade-in" style={{ display: "flex", justifyContent: "flex-start", padding: "6px 0", gap: "12px", width: "100%" }}>
      {/* AI avatar */}
      <div
        style={{
          width: "32px", height: "32px", borderRadius: "9999px",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: "4px", background: "var(--tertiary-fixed)",
          color: "var(--tertiary)"
        }}
      >
        <Icon name="spa" size={16} />
      </div>

      {/* Content wrapper */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: "17px",
            lineHeight: "28px",
            color: "var(--text-color)",
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isInline = !match && !String(children).includes("\n");
                return isInline ? (
                  <code
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "13px",
                      background: "rgba(107,138,122,0.10)",
                      border: "1px solid rgba(107,138,122,0.20)",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      color: "#344e40",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <SyntaxHighlighter
                    style={oneLight}
                    language={match ? match[1] : "text"}
                    PreTag="div"
                    customStyle={{
                      borderRadius: "1rem",
                      border: "1px solid rgba(213,205,197,0.40)",
                      fontSize: "13px",
                      margin: "8px 0",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                );
              },
              a({ children, href }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#6b8a7a", textDecoration: "underline", textUnderlineOffset: "3px" }}
                  >
                    {children}
                  </a>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-3 rounded-xl border border-[#d5cdc5]/40">
                    <table className="min-w-full text-sm">{children}</table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th
                    style={{
                      background: "#f0ede8",
                      padding: "8px 16px",
                      textAlign: "left",
                      borderBottom: "1px solid rgba(213,205,197,0.40)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#6e6761",
                    }}
                  >
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td style={{ padding: "8px 16px", borderBottom: "1px solid rgba(213,205,197,0.20)", color: "var(--text-color)" }}>
                    {children}
                  </td>
                );
              },
            }}
          >
            {text}
          </ReactMarkdown>
        </div>

        {/* Actions row */}
        <div style={{ display: "flex", gap: "12px", opacity: 0.5, transition: "opacity 0.2s", marginTop: "2px", alignItems: "center" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}>
          {message.usage?.completionTokens !== undefined && (
            <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)", marginRight: "auto" }}>
              Output: {message.usage.completionTokens} | Total: {message.usage.totalTokens}
            </span>
          )}
          <button onClick={handleCopy} title="Copy" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-color-muted)" }}>
            <Icon name={copied ? "check" : "content_copy"} size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
