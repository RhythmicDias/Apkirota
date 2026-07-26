import React, { useState } from "react";
import { useAppStore, ModelConfig, selectAvailableModels, SUPPORTED_MODELS } from "../store/useAppStore";

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: "36px", height: "20px", borderRadius: "10px",
      background: checked ? "var(--primary)" : "var(--border-color)",
      position: "relative", border: "none", cursor: "pointer",
      transition: "background 0.2s"
    }}
  >
    <div
      style={{
        width: "16px", height: "16px", borderRadius: "50%",
        background: "var(--bg-color)", position: "absolute", top: "2px",
        left: checked ? "18px" : "2px", transition: "left 0.2s"
      }}
    />
  </button>
);

export const ModelConfigPanel: React.FC = () => {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setModel = useAppStore((s) => s.setModel);
  const modelConfigs = useAppStore((s) => s.modelConfigs);
  const updateModelConfig = useAppStore((s) => s.updateModelConfig);
  const availableModels = useAppStore(selectAvailableModels);
  const customModels = useAppStore((s) => s.customModels);
  const addCustomModel = useAppStore((s) => s.addCustomModel);
  const removeCustomModel = useAppStore((s) => s.removeCustomModel);

  const [newModelInput, setNewModelInput] = useState("");

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newModelInput.trim();
    if (!trimmed) return;
    addCustomModel(trimmed);
    setModel(trimmed);
    setNewModelInput("");
  };

  const handleRemoveModel = (modelName: string) => {
    if (confirm(`Remove custom model "${modelName}"?`)) {
      removeCustomModel(modelName);
      if (selectedModel === modelName) {
        setModel(SUPPORTED_MODELS[0]);
      }
    }
  };

  const config = modelConfigs[selectedModel] || {
    systemInstructions: "",
    thinkingLevel: "Medium",
    tools: {
      structuredOutputs: false,
      codeExecution: false,
      functionCalling: false,
      groundingGoogleSearch: false,
      groundingGoogleMaps: false,
      urlContext: false,
    },
    advanced: {
      mediaResolution: "Default",
      safetySettings: "Block Some",
      stopSequences: "",
      outputLength: 8192,
    },
  };

  const updateTool = (key: keyof ModelConfig["tools"], value: boolean) => {
    updateModelConfig(selectedModel, { tools: { ...config.tools, [key]: value } });
  };

  const updateAdvanced = (key: keyof ModelConfig["advanced"], value: any) => {
    updateModelConfig(selectedModel, { advanced: { ...config.advanced, [key]: value } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "40px" }} className="fade-in">
      
      {/* Add New Custom Model Card Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0" }}>
            Add New Model Endpoint
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>
            Register new or custom Gemini model identifiers (e.g. newly released models or experimental endpoints).
          </p>
        </div>
        <form onSubmit={handleAddCustomModel} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="e.g. gemini-3.5-pro or gemini-experimental-0301"
            value={newModelInput}
            onChange={(e) => setNewModelInput(e.target.value)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
              background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={!newModelInput.trim()}
            style={{
              padding: "8px 16px", background: "var(--primary)", color: "white", borderRadius: "8px",
              fontSize: "13px", fontWeight: 600, border: "none", cursor: newModelInput.trim() ? "pointer" : "not-allowed",
              opacity: newModelInput.trim() ? 1 : 0.5, display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
            Add Model
          </button>
        </form>
      </div>

      {/* Available Models Cards Gallery */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0" }}>
            Available Model Cards ({availableModels.length})
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>
            Select a model card to configure its specific tools, reasoning level, and system parameters below.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", marginTop: "4px" }}>
          {availableModels.map((m) => {
            const isSelected = selectedModel === m;
            const isCustom = customModels.includes(m);
            const mConfig = modelConfigs[m];
            const activeToolCount = mConfig ? Object.values(mConfig.tools).filter(Boolean).length : 0;

            return (
              <div
                key={m}
                onClick={() => setModel(m)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                  background: isSelected ? "var(--input-bg)" : "var(--bg-color)",
                  cursor: "pointer",
                  transition: "all 0.15s ease-in-out",
                  position: "relative",
                  boxShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.08)" : "none"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: "4px", background: isCustom ? "rgba(177,98,77,0.15)" : "var(--input-bg)", color: isCustom ? "var(--primary)" : "var(--text-color-muted)", border: "1px solid var(--border-color)", fontWeight: 600 }}>
                      {isCustom ? "CUSTOM" : "BUILT-IN"}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: "4px", background: "var(--primary)", color: "white", fontWeight: 700 }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-color)", margin: "4px 0", wordBreak: "break-word" }}>
                    {m}
                  </h4>
                  <p style={{ fontSize: "11px", color: "var(--text-color-muted)", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                    {activeToolCount > 0 ? `${activeToolCount} tools active` : "Standard capabilities"}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "11px", color: isSelected ? "var(--primary)" : "var(--text-color-muted)", fontWeight: 500 }}>
                    {isSelected ? "Currently Selected" : "Click to Select"}
                  </span>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveModel(m); }}
                      style={{ border: "none", background: "transparent", color: "#ba1a1a", cursor: "pointer", display: "flex", padding: "2px" }}
                      title="Retire/Delete custom model"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Model Indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "12px", background: "var(--input-bg)", border: "1px solid var(--border-color)" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--primary)" }}>tune</span>
        <span style={{ fontSize: "14px", color: "var(--text-color)" }}>
          Configuring settings for active model: <strong style={{ color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace" }}>{selectedModel}</strong>
        </span>
      </div>

      {/* System Instructions & Thinking Level Card */}
      <div style={{ padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0" }}>System Instructions & Tone</h3>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>
            Provide custom instructions or target persona guidance for response formatting.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>SYSTEM INSTRUCTIONS</label>
          <textarea
            value={config.systemInstructions}
            onChange={(e) => updateModelConfig(selectedModel, { systemInstructions: e.target.value })}
            placeholder="Optional instructions for tone, format, or knowledge boundaries..."
            rows={3}
            style={{
              padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
              background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none",
              resize: "vertical", width: "100%", fontFamily: "inherit"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-color)", margin: "0 0 2px 0" }}>Thinking Level</h4>
            <p style={{ fontSize: "12px", color: "var(--text-color-muted)", margin: 0 }}>Reasoning depth allocation for model execution</p>
          </div>
          <select
            value={config.thinkingLevel}
            onChange={(e) => updateModelConfig(selectedModel, { thinkingLevel: e.target.value as any })}
            style={{
              padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
              background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none"
            }}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      {/* Capabilities & Tools Card */}
      <div style={{ padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0" }}>Tools & Capabilities</h3>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>
            Enable or disable extended Gemini model integrations for <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedModel}</strong>.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { label: "Structured outputs", key: "structuredOutputs" },
            { label: "Code execution", key: "codeExecution" },
            { label: "Function calling", key: "functionCalling" },
            { label: "Grounding (Google Search)", key: "groundingGoogleSearch" },
            { label: "Grounding (Google Maps)", key: "groundingGoogleMaps" },
            { label: "URL context", key: "urlContext" },
          ].map((tool) => (
            <div key={tool.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-color)" }}>
              <span style={{ fontSize: "13px", color: "var(--text-color)", fontWeight: 500 }}>{tool.label}</span>
              <Toggle
                checked={config.tools[tool.key as keyof ModelConfig["tools"]]}
                onChange={(v) => updateTool(tool.key as keyof ModelConfig["tools"], v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Settings Card */}
      <div style={{ padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0" }}>Advanced Parameters</h3>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>Fine-tune safety barriers and response constraints for <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedModel}</strong>.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>MEDIA RESOLUTION</label>
            <select
              value={config.advanced.mediaResolution}
              onChange={(e) => updateAdvanced("mediaResolution", e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none"
              }}
            >
              <option value="Low">Low</option>
              <option value="Default">Default</option>
              <option value="High">High</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>SAFETY SETTINGS</label>
            <select
              value={config.advanced.safetySettings}
              onChange={(e) => updateAdvanced("safetySettings", e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none"
              }}
            >
              <option value="Block None">Block None</option>
              <option value="Block Some">Block Some</option>
              <option value="Block Most">Block Most</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>STOP SEQUENCE</label>
            <input
              type="text"
              placeholder="e.g. END_TOKEN"
              value={config.advanced.stopSequences}
              onChange={(e) => updateAdvanced("stopSequences", e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>MAX OUTPUT LENGTH</label>
            <input
              type="number"
              value={config.advanced.outputLength}
              onChange={(e) => updateAdvanced("outputLength", Number(e.target.value))}
              style={{
                padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
