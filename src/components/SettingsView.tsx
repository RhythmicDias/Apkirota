/**
 * SettingsView.tsx — Design-system aligned in-window settings screen.
 * Replaces the settings modal with two tabs: "Configure API" and "Privacy".
 * Securely writes/deletes API keys directly to/from the OS Keyring.
 */

import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { testKey } from "../lib/geminiClient";
import type { KeyStatus } from "../lib/KeyRotator";
import { invoke } from "@tauri-apps/api/core";
import { ModelConfigPanel } from "./ModelConfigPanel";

const STATUS_CFG: Record<KeyStatus, { label: string; color: string; dot: string }> = {
  unchecked:      { label: "Unchecked",    color: "#8a817a",  dot: "#8a817a" },
  valid:          { label: "Valid",        color: "#344e40",  dot: "#6b8a7a" },
  invalid:        { label: "Invalid",      color: "#ba1a1a",  dot: "#ba1a1a" },
  "rate-limited": { label: "Rate Limited", color: "#7a5c00",  dot: "#c9a227" },
};

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

const SettingsView: React.FC = () => {
  const apiKeys           = useAppStore((s) => s.apiKeys);
  const addApiKey         = useAppStore((s) => s.addApiKey);
  const removeApiKey      = useAppStore((s) => s.removeApiKey);
  const updateKeyName     = useAppStore((s) => s.updateKeyName);
  const updateKeyStatus   = useAppStore((s) => s.updateKeyStatus);
  const reorderApiKeys    = useAppStore((s) => s.reorderApiKeys);
  const historyEnabled    = useAppStore((s) => s.historyEnabled);
  const setHistoryEnabled = useAppStore((s) => s.setHistoryEnabled);
  const sessions          = useAppStore((s) => s.sessions);
  const clearAllSessions  = useAppStore((s) => s.clearAllSessions);
  const selectedModel     = useAppStore((s) => s.selectedModel);
  const setView           = useAppStore((s) => s.setView);
  const usageRecords      = useAppStore((s) => s.usageRecords);
  const clearUsageRecords = useAppStore((s) => s.clearUsageRecords);

  // Form states
  const [newName, setNewName]         = useState("");
  const [newKey, setNewKey]           = useState("");
  const [testing, setTesting]         = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab]     = useState<"api" | "model" | "privacy" | "usage">("api");
  const [formError, setFormError]     = useState<string | null>(null);

  // Edit states for existing keys
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState("");
  const [editKey, setEditKey]         = useState("");

  const handleAddKey = async () => {
    setFormError(null);
    const trimmedName = newName.trim();
    const trimmedKey  = newKey.trim();

    if (!trimmedName || !trimmedKey) {
      setFormError("Both Key Name and API Key are required.");
      return;
    }

    try {
      // 1. Save metadata to Zustand store (generates UUID)
      const id = addApiKey(trimmedName);

      // 2. Save actual value securely to OS Keyring
      await invoke("save_api_key", { keyId: id, keyValue: trimmedKey });

      // Reset form
      setNewName("");
      setNewKey("");
    } catch (err) {
      setFormError(`Failed to save key securely: ${err}`);
    }
  };

  const handleUpdateKey = async (id: string) => {
    setFormError(null);
    const trimmedName = editName.trim();
    const trimmedKey  = editKey.trim();

    if (!trimmedName) {
      setFormError("Key name cannot be empty.");
      return;
    }

    try {
      // Update nickname in store
      updateKeyName(id, trimmedName);

      // Update key in OS keyring if a new key value was provided
      if (trimmedKey) {
        await invoke("save_api_key", { keyId: id, keyValue: trimmedKey });
      }

      setEditingId(null);
      setEditName("");
      setEditKey("");
      updateKeyStatus(id, "unchecked");
    } catch (err) {
      setFormError(`Failed to update key securely: ${err}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditKey("");
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditKey(""); // Keep blank unless updating
  };

  const handleTestKey = async (id: string) => {
    setTesting((p) => new Set([...p, id]));
    try {
      // Load actual key securely from keyring dynamically into RAM
      const rawKey = await invoke<string>("load_api_key", { keyId: id });
      if (!rawKey) {
        updateKeyStatus(id, "invalid");
        return;
      }

      const result = await testKey(rawKey, selectedModel);
      updateKeyStatus(id, result);
    } catch (err) {
      console.error(err);
      updateKeyStatus(id, "invalid");
    } finally {
      setTesting((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `apkirota-history-${Date.now()}.json` });
    a.click(); URL.revokeObjectURL(url);
  };

  const handleExportMd = () => {
    let md = "# Apkirota Chat Export\n\n";
    for (const s of sessions) {
      md += `## ${s.title}\n\n`;
      for (const m of s.messages) {
        md += `**${m.role === "user" ? "You" : "Assistant"}**:\n\n${m.parts.find((p) => p.text)?.text ?? ""}\n\n---\n\n`;
      }
    }
    const blob = new Blob([md], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `apkirota-history-${Date.now()}.md` });
    a.click(); URL.revokeObjectURL(url);
  };

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
      {/* Back navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button
          onClick={() => setView("chat")}
          style={{
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            border: "1px solid var(--border-color)",
            color: "var(--text-color-muted)",
            background: "transparent",
            cursor: "pointer",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--input-bg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-color)", margin: 0, lineHeight: 1 }}>Settings</h2>
          <p style={{ fontSize: "14px", color: "var(--text-color-muted)", margin: "4px 0 0 0" }}>Manage application configurations and API credentials</p>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "32px", borderBottom: "1px solid var(--border-color)", paddingBottom: "1px" }}>
        <button
          onClick={() => setActiveTab("api")}
          style={{
            padding: "10px 20px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            letterSpacing: "0.02em",
            fontWeight: 500,
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: activeTab === "api" ? "var(--primary)" : "var(--text-color-muted)",
            position: "relative"
          }}
        >
          Configure API
          {activeTab === "api" && (
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "2px", background: "var(--primary)" }} />
          )}
        </button>
        <button
          onClick={() => setActiveTab("model")}
          style={{
            padding: "10px 20px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            letterSpacing: "0.02em",
            fontWeight: 500,
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: activeTab === "model" ? "var(--primary)" : "var(--text-color-muted)",
            position: "relative"
          }}
        >
          Model Settings
          {activeTab === "model" && (
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "2px", background: "var(--primary)" }} />
          )}
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          style={{
            padding: "10px 20px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            letterSpacing: "0.02em",
            fontWeight: 500,
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: activeTab === "privacy" ? "var(--primary)" : "var(--text-color-muted)",
            position: "relative"
          }}
        >
          Privacy
          {activeTab === "privacy" && (
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "2px", background: "var(--primary)" }} />
          )}
        </button>
        <button
          onClick={() => setActiveTab("usage")}
          style={{
            padding: "10px 20px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            letterSpacing: "0.02em",
            fontWeight: 500,
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: activeTab === "usage" ? "var(--primary)" : "var(--text-color-muted)",
            position: "relative"
          }}
        >
          Usage
          {activeTab === "usage" && (
            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "2px", background: "var(--primary)" }} />
          )}
        </button>
      </div>

      {formError && (
        <div
          style={{
            marginBottom: "24px",
            padding: "12px 16px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(249,218,214,0.85)",
            border: "1px solid rgba(186,26,26,0.20)",
          }}
        >
          <Icon name="error" style={{ color: "#ba1a1a" }} />
          <p style={{ flex: 1, fontSize: "15px", color: "#ba1a1a", margin: 0 }}>{formError}</p>
        </div>
      )}

      {/* Tab Contents */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
        {activeTab === "api" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Add new key container */}
            <div className="input-card" style={{ padding: "24px", borderRadius: "2rem" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 16px 0" }}>
                Add Gemini API Key
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>
                      KEY NAME / NICKNAME
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. My Free Key"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "12px",
                        border: "1px solid var(--border-color)",
                        background: "var(--input-bg)",
                        color: "var(--text-color)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>
                      GEMINI API KEY
                    </label>
                    <input
                      type="password"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="AIzaSy..."
                      style={{
                        padding: "8px 16px",
                        borderRadius: "12px",
                        border: "1px solid var(--border-color)",
                        background: "var(--input-bg)",
                        color: "var(--text-color)",
                        fontSize: "14px",
                        fontFamily: "monospace",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
                  <button
                    onClick={handleAddKey}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "9999px",
                      fontWeight: 600,
                      fontSize: "14px",
                      background: "var(--primary)",
                      color: "white",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    Save to Secure Keyring
                  </button>
                </div>
              </div>
            </div>

            {/* Keys list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-color)", margin: 0 }}>
                Configured Key Identifiers ({apiKeys.length})
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-color-muted)", fontStyle: "italic", margin: 0 }}>
                API keys are stored securely using your operating system's built-in credential manager (Windows Credential Manager / macOS Keychain). They are loaded directly into transient RAM only when executing prompts.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                {apiKeys.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", borderRadius: "16px", border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
                    <p style={{ color: "var(--text-color-muted)", fontSize: "16px", margin: 0 }}>No keys configured yet.</p>
                  </div>
                ) : (
                  apiKeys.map((key, idx) => {
                    const isCooldownOver = key.cooldownUntil && Date.now() > key.cooldownUntil;
                    const displayStatus = (key.status === "rate-limited" && isCooldownOver) ? "unchecked" : key.status;
                    const cfg = STATUS_CFG[displayStatus];
                    const isT = testing.has(key.id);
                    const isEditing = editingId === key.id;

                    return (
                      <div
                        key={key.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          padding: "16px",
                          borderRadius: "16px",
                          border: "1px solid var(--border-color)",
                          background: "var(--input-bg)",
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>
                                  EDIT NICKNAME
                                </label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "14px" }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>
                                  REWRITE API KEY (LEAVE BLANK TO KEEP)
                                </label>
                                <input
                                  type="password"
                                  value={editKey}
                                  onChange={(e) => setEditKey(e.target.value)}
                                  style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)", color: "var(--text-color)", fontSize: "14px" }}
                                />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button onClick={handleCancelEdit}
                                style={{ padding: "6px 16px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-color-muted)", cursor: "pointer" }}>
                                Cancel
                              </button>
                              <button onClick={() => handleUpdateKey(key.id)}
                                style={{ padding: "6px 16px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600, border: "none", background: "var(--primary)", color: "white", cursor: "pointer" }}>
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--text-color-muted)", width: "20px" }}>
                                {idx + 1}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-color)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {key.name}
                                </p>
                                <p style={{ fontSize: "11px", color: "var(--text-color-muted)", fontFamily: "'JetBrains Mono', monospace", margin: "2px 0 0 0" }}>
                                  ID: {key.id}
                                </p>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                              {/* Status badge */}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "9999px", background: "var(--bg-color)", border: "1px solid var(--border-color)" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "9999px", background: cfg.dot }} />
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: cfg.color, fontWeight: 500 }}>
                                  {cfg.label}
                                </span>
                              </div>

                              {/* Test */}
                              <button
                                onClick={() => handleTestKey(key.id)}
                                disabled={isT}
                                style={{ padding: "4px 12px", borderRadius: "8px", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", border: "1px solid var(--border-color)", color: "var(--text-color-muted)", background: "transparent", cursor: isT ? "not-allowed" : "pointer", opacity: isT ? 0.4 : 1 }}
                              >
                                {isT ? "Testing…" : "Test"}
                              </button>

                              {/* Move Up */}
                              <button
                                onClick={() => idx > 0 && reorderApiKeys(idx, idx - 1)}
                                disabled={idx === 0}
                                style={{
                                  background: "transparent", border: "none", cursor: idx === 0 ? "default" : "pointer",
                                  color: idx === 0 ? "var(--border-color)" : "var(--text-color-muted)",
                                  display: "flex", alignItems: "center", justifyContent: "center"
                                }}
                                title="Move Up"
                              >
                                <Icon name="keyboard_arrow_up" size={20} />
                              </button>

                              {/* Move Down */}
                              <button
                                onClick={() => idx < apiKeys.length - 1 && reorderApiKeys(idx, idx + 1)}
                                disabled={idx === apiKeys.length - 1}
                                style={{
                                  background: "transparent", border: "none", cursor: idx === apiKeys.length - 1 ? "default" : "pointer",
                                  color: idx === apiKeys.length - 1 ? "var(--border-color)" : "var(--text-color-muted)",
                                  display: "flex", alignItems: "center", justifyContent: "center"
                                }}
                                title="Move Down"
                              >
                                <Icon name="keyboard_arrow_down" size={20} />
                              </button>

                              <div style={{ width: "1px", height: "16px", background: "var(--border-color)", margin: "0 4px" }} />

                              {/* Edit */}
                              <button
                                onClick={() => startEditing(key.id, key.name)}
                                style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", background: "transparent", border: "none", color: "var(--text-color-muted)", cursor: "pointer" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--input-bg)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                <Icon name="edit" size={18} />
                              </button>

                              {/* Remove */}
                              <button
                                onClick={() => { if (confirm(`Remove key "${key.name}"?`)) removeApiKey(key.id); }}
                                style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", background: "transparent", border: "none", color: "var(--text-color-muted)", cursor: "pointer" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(186,26,26,0.1)"; e.currentTarget.style.color = "#ba1a1a"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-color-muted)"; }}
                              >
                                <Icon name="delete" size={18} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "model" && (
          <div className="fade-in">
            <ModelConfigPanel />
          </div>
        )}

        {activeTab === "privacy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* History toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px", borderRadius: "16px", border: "1px solid var(--border-color)", background: "var(--input-bg)" }}>
              <div>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 4px 0" }}>Save Chat History</p>
                <p style={{ fontSize: "14px", color: "var(--text-color-muted)", margin: 0 }}>Store conversation sessions locally on this device</p>
              </div>
              <button
                onClick={() => setHistoryEnabled(!historyEnabled)}
                style={{ position: "relative", width: "48px", height: "24px", borderRadius: "9999px", background: historyEnabled ? "var(--primary)" : "var(--secondary)", border: "none", cursor: "pointer", transition: "background 0.3s" }}
              >
                <span
                  style={{ position: "absolute", top: "4px", left: historyEnabled ? "28px" : "4px", width: "16px", height: "16px", background: "white", borderRadius: "9999px", transition: "left 0.3s" }}
                />
              </button>
            </div>

            {/* Export */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", borderRadius: "16px", border: "1px solid var(--border-color)", background: "var(--input-bg)" }}>
              <div>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 4px 0" }}>Export Chat Data</p>
                <p style={{ fontSize: "14px", color: "var(--text-color-muted)", margin: 0 }}>Download chat histories for backups or porting</p>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text-color)", margin: 0 }}>{sessions.length} sessions stored</p>
              <div style={{ display: "flex", gap: "12px" }}>
                {["JSON", "Markdown"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={fmt === "JSON" ? handleExportJSON : handleExportMd}
                    disabled={sessions.length === 0}
                    style={{ flex: 1, padding: "10px", borderRadius: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", border: "1px solid var(--border-color)", color: "var(--text-color)", background: "var(--bg-color)", cursor: sessions.length === 0 ? "not-allowed" : "pointer", opacity: sessions.length === 0 ? 0.4 : 1 }}
                  >
                    Export {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear history */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", borderRadius: "16px", border: "1px solid rgba(186,26,26,0.15)", background: "rgba(249,218,214,0.20)" }}>
              <div>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#ba1a1a", margin: "0 0 4px 0" }}>Danger Zone</p>
                <p style={{ fontSize: "14px", color: "#ba1a1a", opacity: 0.85, margin: 0 }}>Irreversibly delete all chat histories from this device</p>
              </div>
              <button
                onClick={() => { if (confirm("Delete all history? This cannot be undone.")) clearAllSessions(); }}
                style={{ width: "100%", padding: "10px", borderRadius: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", border: "1px solid rgba(186,26,26,0.25)", color: "#ba1a1a", background: "rgba(249,218,214,0.40)", cursor: "pointer" }}
              >
                Clear All History
              </button>
            </div>
          </div>
        )}

        {activeTab === "usage" && (() => {
          const totals = usageRecords.reduce(
            (acc, r) => {
              acc.prompt += r.promptTokens;
              acc.completion += r.completionTokens;
              acc.total += r.totalTokens;
              return acc;
            },
            { prompt: 0, completion: 0, total: 0 }
          );

          const modelStats = usageRecords.reduce((acc, r) => {
            if (!acc[r.model]) acc[r.model] = { prompt: 0, completion: 0, total: 0 };
            acc[r.model].prompt += r.promptTokens;
            acc[r.model].completion += r.completionTokens;
            acc[r.model].total += r.totalTokens;
            return acc;
          }, {} as Record<string, { prompt: number; completion: number; total: number }>);

          const keyStats = usageRecords.reduce((acc, r) => {
            const keyLabel = r.apiKeyName || "Unnamed Key";
            if (!acc[keyLabel]) acc[keyLabel] = { prompt: 0, completion: 0, total: 0 };
            acc[keyLabel].prompt += r.promptTokens;
            acc[keyLabel].completion += r.completionTokens;
            acc[keyLabel].total += r.totalTokens;
            return acc;
          }, {} as Record<string, { prompt: number; completion: number; total: number }>);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                {[
                  { label: "PROMPT TOKENS", value: totals.prompt, icon: "arrow_upward" },
                  { label: "COMPLETION TOKENS", value: totals.completion, icon: "arrow_downward" },
                  { label: "TOTAL TOKENS", value: totals.total, icon: "toll" },
                ].map((card) => (
                  <div key={card.label} className="input-card" style={{ padding: "20px", borderRadius: "1.5rem", display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--tertiary-fixed)", color: "var(--tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{card.icon}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>{card.label}</div>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-color)", marginTop: "4px" }}>{card.value.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Model Breakdown */}
              <div className="input-card" style={{ padding: "24px", borderRadius: "2rem" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 16px 0" }}>Usage by Model</h3>
                {Object.keys(modelStats).length === 0 ? (
                  <p style={{ fontStyle: "italic", color: "var(--text-color-muted)", margin: 0 }}>No model usage recorded yet.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)" }}>Model</th>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>Prompt</th>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>Completion</th>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(modelStats).map(([model, s]) => (
                        <tr key={model} style={{ borderBottom: "1px solid rgba(213,205,197,0.15)" }}>
                          <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--text-color)" }}>{model}</td>
                          <td style={{ padding: "12px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>{s.prompt.toLocaleString()}</td>
                          <td style={{ padding: "12px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>{s.completion.toLocaleString()}</td>
                          <td style={{ padding: "12px 8px", color: "var(--primary)", fontWeight: 700, textAlign: "right" }}>{s.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* API Key Breakdown */}
              <div className="input-card" style={{ padding: "24px", borderRadius: "2rem" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 16px 0" }}>Usage by API Key</h3>
                {Object.keys(keyStats).length === 0 ? (
                  <p style={{ fontStyle: "italic", color: "var(--text-color-muted)", margin: 0 }}>No API key usage recorded yet.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)" }}>API Key</th>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>Prompt</th>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>Completion</th>
                        <th style={{ padding: "10px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(keyStats).map(([keyName, s]) => (
                        <tr key={keyName} style={{ borderBottom: "1px solid rgba(213,205,197,0.15)" }}>
                          <td style={{ padding: "12px 8px", fontWeight: 600, color: "var(--text-color)" }}>{keyName}</td>
                          <td style={{ padding: "12px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>{s.prompt.toLocaleString()}</td>
                          <td style={{ padding: "12px 8px", color: "var(--text-color-muted)", textAlign: "right" }}>{s.completion.toLocaleString()}</td>
                          <td style={{ padding: "12px 8px", color: "var(--primary)", fontWeight: 700, textAlign: "right" }}>{s.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Reset Usage */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "20px", borderRadius: "16px", border: "1px solid rgba(186,26,26,0.15)", background: "rgba(249,218,214,0.20)" }}>
                <div>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: "#ba1a1a", margin: "0 0 4px 0" }}>Danger Zone</p>
                  <p style={{ fontSize: "14px", color: "#ba1a1a", opacity: 0.85, margin: 0 }}>Reset all token usage records. This cannot be undone.</p>
                </div>
                <button
                  onClick={() => { if (confirm("Clear all token usage records?")) clearUsageRecords(); }}
                  style={{ width: "100%", padding: "10px", borderRadius: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", border: "1px solid rgba(186,26,26,0.25)", color: "#ba1a1a", background: "rgba(249,218,214,0.40)", cursor: "pointer" }}
                >
                  Reset Usage Stats
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SettingsView;
