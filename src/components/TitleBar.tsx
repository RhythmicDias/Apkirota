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
        WebkitAppRegion: "drag" as any,
      }}
    >
      {/* Title */}
      <div 
        data-tauri-drag-region
        className="flex items-center gap-4 w-full h-full"
        style={{ paddingLeft: "24px", cursor: "default", WebkitAppRegion: "drag" as any }}
      >
        <span 
          className="material-symbols-outlined" 
          style={{ fontSize: "18px", color: "var(--primary)", pointerEvents: "none" }}
        >
          spa
        </span>
        <span
          style={{ 
            fontFamily: "'Crimson Pro', serif", 
            fontSize: "16px", 
            fontWeight: 600, 
            letterSpacing: "0.02em",
            pointerEvents: "none"
          }}
        >
          ApKiRota
        </span>
      </div>

      {/* Window Controls */}
      <div 
        className="flex items-center h-full flex-shrink-0 gap-4 pr-3"
        style={{ WebkitAppRegion: "no-drag" as any }}
      >
        <button
          className="h-full px-4 flex items-center justify-center transition-colors rounded-md my-1"
          style={{ cursor: "default", width: "46px" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          onClick={() => getCurrentWindow().minimize()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px", pointerEvents: "none" }}>minimize</span>
        </button>
        <button
          className="h-full px-4 flex items-center justify-center transition-colors rounded-md my-1"
          style={{ cursor: "default", width: "46px" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--input-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          onClick={async () => {
            const win = getCurrentWindow();
            const isMax = await win.isMaximized();
            if (isMax) {
              await win.unmaximize();
            } else {
              await win.maximize();
            }
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px", pointerEvents: "none" }}>crop_square</span>
        </button>
        <button
          className="h-full px-4 flex items-center justify-center transition-colors rounded-md my-1"
          style={{ cursor: "default", width: "46px" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e81123";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-color-muted)";
          }}
          onClick={async () => {
            const win = getCurrentWindow();
            await win.close();
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px", pointerEvents: "none" }}>close</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
