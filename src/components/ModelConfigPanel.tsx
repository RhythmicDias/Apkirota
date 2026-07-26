import React, { useState } from "react";
import { useAppStore, ModelConfig, selectAvailableModels } from "../store/useAppStore";

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
    if (!newModelInput.trim()) return;
    addCustomModel(newModelInput.trim());
    setModel(newModelInput.trim());
    setNewModelInput("");
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
      {/* Active Model Selection Card */}
      <div style={{ padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0" }}>Active Model</h3>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>
            Select the default Gemini model used for conversation generations.
          </p>
        </div>
        <select
          value={selectedModel}
          onChange={(e) => setModel(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)",
            background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none",
            width: "100%", cursor: "pointer"
          }}
        >
          {availableModels.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Custom Model Addition Card */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "20px", background: "var(--input-bg)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-color)", margin: "0 0 2px 0", display: "flex", alignItems: "center", gap: "6px" }}>
            Add Custom Gemini Model
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>
            Register new or experimental Gemini model endpoints to your selection list.
          </p>
        </div>
        <form onSubmit={handleAddCustomModel} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="e.g. gemini-3.5-pro or gemini-experimental"
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
              opacity: newModelInput.trim() ? 1 : 0.5
            }}
          >
            Add Model
          </button>
        </form>
        {customModels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
            {customModels.map((cm) => (
              <span key={cm} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "16px", background: "var(--bg-color)", border: "1px solid var(--border-color)", fontSize: "12px", color: "var(--text-color)" }}>
                {cm}
                <button type="button" onClick={() => removeCustomModel(cm)} style={{ border: "none", background: "none", color: "#ba1a1a", cursor: "pointer", display: "flex", padding: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>close</span>
                </button>
              </span>
            ))}
          </div>
        )}
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
            Enable or disable extended Gemini model integrations.
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
          <p style={{ fontSize: "13px", color: "var(--text-color-muted)", margin: 0 }}>Fine-tune safety barriers and response constraints.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-color-muted)" }}>MEDIA RESOLUTION</label>
            <select
              value={config.advanced.mediaResolution}
              onChange={(e) => updateAdvanced("mediaResolution", e.target.value)}
              style={{
                padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none"
              }}
            >
              <option value="Low">Low</option>
              <option value="Default">Default</option>
              <option value="High">High</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-color)" }}>Safety settings</span>
            <select
              value={config.advanced.safetySettings}
              onChange={(e) => updateAdvanced("safetySettings", e.target.value)}
              style={{
                padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none"
              }}
            >
              <option value="Block None">Block None</option>
              <option value="Block Some">Block Some</option>
              <option value="Block Most">Block Most</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-color)", width: "140px" }}>Add stop sequence</span>
            <input
              type="text"
              placeholder="Add stop..."
              value={config.advanced.stopSequences}
              onChange={(e) => updateAdvanced("stopSequences", e.target.value)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-color)", width: "140px" }}>Output length</span>
            <input
              type="number"
              value={config.advanced.outputLength}
              onChange={(e) => updateAdvanced("outputLength", Number(e.target.value))}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelConfigPanel;
