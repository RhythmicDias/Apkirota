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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }} className="fade-in">
      {/* Custom Model Addition Card */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "var(--input-bg)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-color)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary)" }}>add_circle</span>
          Add Custom Gemini Model
        </h3>
        <form onSubmit={handleAddCustomModel} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="e.g. gemini-3.5-pro or gemini-experimental"
            value={newModelInput}
            onChange={(e) => setNewModelInput(e.target.value)}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)",
              background: "var(--bg-color)", color: "var(--text-color)", fontSize: "13px", outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={!newModelInput.trim()}
            style={{
              padding: "10px 16px", background: "var(--primary)", color: "white", borderRadius: "8px",
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

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-color)", margin: 0 }}>Active Model</h3>
        <select
          value={selectedModel}
          onChange={(e) => setModel(e.target.value)}
          style={{
            padding: "12px", borderRadius: "12px", border: "1px solid var(--border-color)",
            background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none",
            width: "100%"
          }}
        >
          {availableModels.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <p style={{ fontSize: "12px", color: "var(--text-color-muted)", margin: 0 }}>
          Configuration changes below apply automatically to the selected model.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-color)", margin: 0 }}>System instructions</h3>
        <textarea
          value={config.systemInstructions}
          onChange={(e) => updateModelConfig(selectedModel, { systemInstructions: e.target.value })}
          placeholder="Optional tone and style instructions for the model"
          rows={3}
          style={{
            padding: "12px", borderRadius: "12px", border: "1px solid var(--border-color)",
            background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none",
            resize: "vertical", width: "100%", fontFamily: "inherit"
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-color)", margin: 0 }}>Thinking level</h3>
        <select
          value={config.thinkingLevel}
          onChange={(e) => updateModelConfig(selectedModel, { thinkingLevel: e.target.value as any })}
          style={{
            padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)",
            background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none"
          }}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-color)", margin: "0 0 16px 0" }}>Tools</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { label: "Structured outputs", key: "structuredOutputs" },
            { label: "Code execution", key: "codeExecution" },
            { label: "Function calling", key: "functionCalling" },
            { label: "Grounding with Google Search", key: "groundingGoogleSearch" },
            { label: "Grounding with Google Maps", key: "groundingGoogleMaps" },
            { label: "URL context", key: "urlContext" },
          ].map((tool) => (
            <div key={tool.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "var(--text-color)" }}>{tool.label}</span>
              <Toggle
                checked={config.tools[tool.key as keyof ModelConfig["tools"]]}
                onChange={(v) => updateTool(tool.key as keyof ModelConfig["tools"], v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-color)", margin: "0 0 16px 0" }}>Advanced settings</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-color)" }}>Media resolution</span>
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
