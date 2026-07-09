import React from "react";
import { useAppStore, ModelConfig, SUPPORTED_MODELS, GeminiModel } from "../store/useAppStore";

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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-color)", margin: 0 }}>Active Model</h3>
        <select
          value={selectedModel}
          onChange={(e) => setModel(e.target.value as GeminiModel)}
          style={{
            padding: "12px", borderRadius: "12px", border: "1px solid var(--border-color)",
            background: "var(--input-bg)", color: "var(--text-color)", fontSize: "14px", outline: "none",
            width: "100%"
          }}
        >
          {SUPPORTED_MODELS.map((m) => (
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
