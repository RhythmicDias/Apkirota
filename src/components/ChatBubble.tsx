/**
 * ChatBubble.tsx — Warm design-palette chat bubbles.
 * User: soft terracotta glass. AI: white frosted glass with sage left border.
 */

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ChatMessage } from "../lib/geminiClient";

interface ChatBubbleProps {
  message: ChatMessage;
}

const Icon = ({ name }: { name: string }) => (
  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{name}</span>
);

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === "user";
  const text   = message.parts.find((p) => p.text)?.text ?? "";
  const images = message.parts.filter((p) => p.inlineData);

  if (isUser) {
    return (
      <div className="flex justify-end py-1 fade-in">
        <div className="max-w-[72%] flex flex-col items-end gap-2">
          {images.map((part, i) => (
            <img
              key={i}
              src={`data:${part.inlineData!.mimeType};base64,${part.inlineData!.data}`}
              className="max-h-52 rounded-2xl border border-[#b1624d]/15 shadow-sm"
              alt="attachment"
            />
          ))}
          {text && (
            <div
              className="bubble-user px-5 py-3.5"
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: "17px",
                lineHeight: "26px",
                color: "#433e3a",
              }}
            >
              {text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // AI bubble
  return (
    <div className="flex justify-start py-1 gap-3 fade-in">
      {/* AI avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
        style={{ background: "#d9e5dd" }}
      >
        <Icon name="spa" />
      </div>

      {/* Content */}
      <div
        className="bubble-ai max-w-[80%] px-5 py-4"
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: "17px",
          lineHeight: "26px",
          color: "#433e3a",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match;
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
                  }}
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <SyntaxHighlighter
                  style={oneLight}
                  language={match[1]}
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
                <td style={{ padding: "8px 16px", borderBottom: "1px solid rgba(213,205,197,0.20)", color: "#433e3a" }}>
                  {children}
                </td>
              );
            },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatBubble;
