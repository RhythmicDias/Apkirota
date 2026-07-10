# Apkirota 🌌

<img src="app-icon.svg" width="120" align="right" alt="Apkirota Icon" />

**Unlimited Gemini API desktop client powered by secure, local sequential key rotation.**

> A premium local-first LLM workspace built with Tauri + React, designed to maximize the utility of free Gemini API keys through intelligent round-robin rotation.

---

## ✨ Key Features

- 🔄 **Sequential API Key Rotation** — Pool up to 20+ free-tier Gemini keys and rotate them automatically, so you effectively never hit a rate limit
- 🎛️ **Dual-Mode Operation** — Toggle between **Normal** (single active key) and **Unlimited** (full round-robin rotation) with an animated glowing switch
- 🌌 **Deep Space Dark Theme** — Premium UI with a custom navy & ice-blue palette, glassmorphism panels, and smooth micro-animations
- 📂 **Multi-Format Upload Handler** — Drag-and-drop images (PNG, JPEG, WEBP), plain text, and CSV files into the chat with full multimodal Gemini support
- 🔒 **Local-First Privacy** — API keys and chat history live exclusively on your device; nothing is ever sent to a third-party server
- 💬 **Markdown & Code Highlighting** — Full GFM Markdown rendering with Prism syntax highlighting for code blocks
- 📤 **Export Chat History** — Save your sessions as JSON or Markdown at any time

---

## 🚀 Installation & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (stable)
- WebView2 (Windows — usually pre-installed)

### Steps

```bash
# Step 1: Clone the repository
git clone https://github.com/RhythmicDias/Apkirota.git
cd Apkirota

# Step 2: Install dependencies
npm install

# Step 3: Launch in development mode
npm run tauri dev
```

---

## ⚙️ How It Works — Routing & Rotation

Apkirota uses a sophisticated rotation engine to distribute your API requests based on your selected mode:

### 1. Normal Mode (Single Active Key)
In Normal mode, the app simply uses the **first healthy key** in your list. 
- If a rate limit is hit, that key goes on a 60-second cooldown, and the app temporarily falls back to the next key.
- If you pause for 2-3 minutes (allowing the cooldown to expire), the app immediately routes back through the primary key on your next request.

### 2. Unlimited Mode (Round-Robin)
In Unlimited mode, the app uses strict **sequential round-robin** rotation to balance the load equally across all your accounts.
- The app maintains a global index pointer that remembers exactly which key it used last. 
- Even if you pause for several minutes or hours, the app remembers where it left off and routes your next message through the *next* key in the sequence, not starting over from the top.

```text
User sends message M1 → Key A (index 0) → index becomes 1
User sends message M2 → Key B (index 1) → index becomes 2
User sends message M3 → Key C (index 2) → index becomes 3
User sends message M4 → Key A (index 0) → wraps back to 0
```

**Graceful Failure Handling (Both Modes):**
1. Key returns `429 Rate Limited` → marked as rate-limited (60s cooldown) → skipped automatically
2. Key returns `400/401/403 Invalid` → marked as invalid → skipped permanently until manually fixed
3. Retries up to **3 times** across different keys before surfacing an error dialog

---

## 🎨 Color Palette

| Token | Hex | Role |
|---|---|---|
| Deep Space Navy | `#021024` | App background |
| Abyssal Blue | `#052659` | Sidebar, cards |
| Steel Blue Accent | `#5483B3` | Buttons, toggles |
| Ice-Faded Blue | `#7DA0CA` | Secondary labels |
| Glacial Ice White | `#C1E8FF` | Headings, user bubbles |

---

## 🏗️ Project Structure

```
Apkirota/
├── src-tauri/         # Rust backend (Tauri)
├── src/
│   ├── components/    # UI components (Sidebar, ChatBubble, etc.)
│   ├── lib/           # KeyRotator, Gemini client, file processor
│   ├── store/         # Zustand global state
│   ├── styles/        # Global CSS + Tailwind theme
│   └── __tests__/     # Vitest unit tests
├── index.html
├── package.json
└── PROJECT.md
```

---

## 📄 License

MIT © [RhythmicDias](https://github.com/RhythmicDias)
