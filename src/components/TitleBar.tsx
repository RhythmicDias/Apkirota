import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const TitleBar: React.FC = () => {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between select-none"
      style={{
        height: "36px",
        background: "var(--bg-color)",
        color: "var(--text-color-muted)",
        display: "flex",
        userSelect: "none",
        flexShrink: 0,
        position: "relative",
        zIndex: 9999,
      }}
    >
      {/* Title */}
      <div 
        data-tauri-drag-region 
        className="flex items-center pl-4 text-xs font-medium w-full h-full"
        style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em" }}
      >
        ApKiRota
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full flex-shrink-0">
        <button
          className="h-full px-4 flex items-center justify-center transition-colors"
          style={{ cursor: "default" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          onClick={() => getCurrentWindow().minimize()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>minimize</span>
        </button>
        <button
          className="h-full px-4 flex items-center justify-center transition-colors"
          style={{ cursor: "default" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          onClick={() => getCurrentWindow().toggleMaximize()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>crop_square</span>
        </button>
        <button
          className="h-full px-4 flex items-center justify-center transition-colors"
          style={{ cursor: "default" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e81123";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-color-muted)";
          }}
          onClick={() => getCurrentWindow().close()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
