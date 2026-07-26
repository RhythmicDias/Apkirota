/**
 * useAppStore.ts
 * Central Zustand store for Apkirota — manages API keys, sessions, mode, and settings.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import type { ApiKeyEntry, KeyStatus } from "../lib/KeyRotator";
import type { ChatMessage } from "../lib/geminiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppMode = "normal" | "unlimited";

export const SUPPORTED_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-robotics-er-1.6-preview",
] as const;

export type GeminiModel = (typeof SUPPORTED_MODELS)[number];

const extractTitle = (message: ChatMessage): string => {
  const text = message.parts.find(p => p.text && p.text.trim().length > 0)?.text;
  if (text) return text.substring(0, 30);
  const fileMime = message.parts.find(p => p.fileData)?.fileData?.mimeType || message.parts.find(p => p.inlineData)?.inlineData?.mimeType;
  if (fileMime) return `[${fileMime.split('/')[0]} attached]`;
  return "New Chat";
};

export interface ModelConfig {
  systemInstructions: string;
  thinkingLevel: "Low" | "Medium" | "High";
  tools: {
    structuredOutputs: boolean;
    codeExecution: boolean;
    functionCalling: boolean;
    groundingGoogleSearch: boolean;
    groundingGoogleMaps: boolean;
    urlContext: boolean;
  };
  advanced: {
    mediaResolution: "Low" | "Default" | "High";
    safetySettings: string;
    stopSequences: string;
    outputLength: number;
  };
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
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

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  skillId?: string;
}

export interface Skill {
  id: string;
  name: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_SKILLS: Skill[] = [
  {
    id: "skill-docx-assistant",
    name: "DOCX Assistant",
    systemPrompt: "You are an expert document generator and DOCX assistant. Format, write, and structure documents, reports, templates, and clinical letters with clean headings, tables, bullet points, and professional formatting ready for export to Word (.docx).",
    createdAt: 1720600000000,
    updatedAt: 1720600000000,
  },
  {
    id: "skill-appointment-list-maker",
    name: "Appointment List Maker",
    systemPrompt: "You are a clinical scheduling and appointment list assistant. Organize, format, and parse patient schedules, clinic appointments, consultation times, and follow-up lists into clean, structured tables with dates, times, patient details, and action items.",
    createdAt: 1720600000000,
    updatedAt: 1720600000000,
  },
  {
    id: "default-code-architect",
    name: "Code Architect",
    systemPrompt: "You are an expert software engineer and code architect. Provide clean, modular, efficient code solutions following SOLID principles.",
    createdAt: 1721860000000,
    updatedAt: 1721860000000,
  },
  {
    id: "default-medical-summarizer",
    name: "Pediatric & Medical Summarizer",
    systemPrompt: "You are a clinical documentation assistant. Summarize medical information concisely with high precision, clear headings, and evidence-based clinical context.",
    createdAt: 1721860000000,
    updatedAt: 1721860000000,
  },
  {
    id: "default-creative-writer",
    name: "Creative Content Specialist",
    systemPrompt: "You are an engaging creative writer. Craft polished, compelling content tailored to the audience's tone and requirements.",
    createdAt: 1721860000000,
    updatedAt: 1721860000000,
  },
];

export interface UsageRecord {
  id: string;
  apiKeyId: string;
  apiKeyName: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
}

interface AppState {
  // API Keys
  apiKeys: ApiKeyEntry[];
  addApiKey: (name: string) => string;
  removeApiKey: (id: string) => void;
  updateKeyStatus: (id: string, status: KeyStatus) => void;
  updateKeyName: (id: string, name: string) => void;
  reorderApiKeys: (startIndex: number, endIndex: number) => void;

  // Mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Models
  modelConfigs: Record<string, ModelConfig>;
  updateModelConfig: (model: string, config: Partial<ModelConfig>) => void;
  customModels: string[];
  addCustomModel: (model: string) => void;
  removeCustomModel: (model: string) => void;

  // Selected Model
  selectedModel: string;
  setModel: (model: string) => void;

  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  createSession: (skillId?: string) => string;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  appendMessage: (sessionId: string, message: ChatMessage) => void;
  renameSession: (id: string, title: string) => void;
  clearAllSessions: () => void;
  clearSessionMessages: (id: string) => void;
  updateMessageText: (sessionId: string, messageIndex: number, text: string) => void;
  updateMessageMetadata: (sessionId: string, messageIndex: number, metadata: Partial<ChatMessage>) => void;
  removeSubsequentMessages: (sessionId: string, fromIndex: number) => void;

  // Skills
  skills: Skill[];
  createSkill: (name: string, systemPrompt: string) => void;
  updateSkill: (id: string, name: string, systemPrompt: string) => void;
  deleteSkill: (id: string) => void;

  // Usage
  usageRecords: UsageRecord[];
  recordUsage: (record: Omit<UsageRecord, "id" | "timestamp">) => void;
  clearUsageRecords: () => void;

  // Settings
  historyEnabled: boolean;
  setHistoryEnabled: (enabled: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  rotationIndex: number;
  setRotationIndex: (idx: number) => void;

  // UI state (not persisted)
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentView: "chat" | "settings" | "history" | "skills";
  setView: (view: "chat" | "settings" | "history" | "skills") => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ── API Keys ──────────────────────────────────────────────────────────
      apiKeys: [],
      addApiKey: (name) => {
        const id = uuidv4();
        set((s) => ({
          apiKeys: [
            ...s.apiKeys,
            { id, name, status: "unchecked" as KeyStatus },
          ],
        }));
        return id;
      },
      removeApiKey: (id) => {
        invoke("delete_api_key", { keyId: id }).catch((e) => console.error(e));
        set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) }));
      },
      updateKeyStatus: (id, status) =>
        set((s) => ({
          apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, status } : k)),
        })),
      updateKeyName: (id, name) =>
        set((s) => ({
          apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, name } : k)),
        })),
      reorderApiKeys: (startIndex, endIndex) =>
        set((s) => {
          const result = Array.from(s.apiKeys);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return { apiKeys: result };
        }),

      // ── Mode ──────────────────────────────────────────────────────────────
      mode: "normal",
      setMode: (mode) => set({ mode }),

      // ── Models ────────────────────────────────────────────────────────────
      modelConfigs: {},
      updateModelConfig: (model, config) =>
        set((s) => ({
          modelConfigs: {
            ...s.modelConfigs,
            [model]: {
              ...(s.modelConfigs[model] || DEFAULT_MODEL_CONFIG),
              ...config,
            },
          },
        })),
      customModels: [],
      addCustomModel: (model) => {
        const trimmed = model.trim();
        if (!trimmed) return;
        set((s) => ({
          customModels: s.customModels.includes(trimmed) ? s.customModels : [...s.customModels, trimmed],
        }));
      },
      removeCustomModel: (model) =>
        set((s) => ({
          customModels: s.customModels.filter((m) => m !== model),
        })),
      selectedModel: "gemini-2.5-flash",
      setModel: (model) => set({ selectedModel: model }),

      // ── Sessions ──────────────────────────────────────────────────────────
      sessions: [],
      activeSessionId: null,

      createSession: (skillId?: string) => {
        const id = uuidv4();
        const session: ChatSession = {
          id,
          title: "New Chat",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          ...(skillId ? { skillId } : {})
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      deleteSession: (id) =>
        set((s) => {
          const remaining = s.sessions.filter((sess) => sess.id !== id);
          return {
            sessions: remaining,
            activeSessionId:
              s.activeSessionId === id
                ? (remaining[0]?.id ?? null)
                : s.activeSessionId,
          };
        }),

      selectSession: (id) => set({ activeSessionId: id }),

      appendMessage: (sessionId, message) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: [...sess.messages, message],
                  updatedAt: Date.now(),
                  // Auto-title from first user message
                  title:
                    sess.messages.length === 0 && message.role === "user"
                      ? extractTitle(message).slice(0, 40)
                      : sess.title,
                }
              : sess
          ),
        })),

      renameSession: (id, title) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, title } : sess
          ),
        })),

      clearAllSessions: () => set({ sessions: [], activeSessionId: null }),

      clearSessionMessages: (id) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, messages: [], updatedAt: Date.now() } : sess
          ),
        })),

      updateMessageText: (sessionId, messageIndex, newText) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.map((msg, idx) =>
                    idx === messageIndex
                      ? {
                          ...msg,
                          parts: msg.parts.map((p) =>
                            p.text !== undefined ? { ...p, text: newText } : p
                          ),
                        }
                      : msg
                  ),
                  updatedAt: Date.now(),
                }
              : sess
          ),
        })),

      updateMessageMetadata: (sessionId, messageIndex, metadata) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.map((msg, idx) =>
                    idx === messageIndex
                      ? { 
                          ...msg, 
                          ...metadata,
                          usage: { ...msg.usage, ...metadata.usage }
                        }
                      : msg
                  ),
                  updatedAt: Date.now(),
                }
              : sess
          ),
        })),

      removeSubsequentMessages: (sessionId, messageIndex) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.slice(0, messageIndex + 1),
                  updatedAt: Date.now(),
                }
              : sess
          ),
        })),

      // ── Skills ────────────────────────────────────────────────────────────
      skills: DEFAULT_SKILLS,
      createSkill: (name, systemPrompt) => {
        const id = uuidv4();
        const now = Date.now();
        set((s) => ({
          skills: [...s.skills, { id, name, systemPrompt, createdAt: now, updatedAt: now }],
        }));
      },
      updateSkill: (id, name, systemPrompt) => {
        set((s) => ({
          skills: s.skills.map((skill) =>
            skill.id === id ? { ...skill, name, systemPrompt, updatedAt: Date.now() } : skill
          ),
        }));
      },
      deleteSkill: (id) => {
        set((s) => ({ skills: s.skills.filter((skill) => skill.id !== id) }));
      },

      // ── Usage ─────────────────────────────────────────────────────────────
      usageRecords: [],
      recordUsage: (record) => {
        const id = uuidv4();
        const timestamp = Date.now();
        set((s) => ({
          usageRecords: [...s.usageRecords, { ...record, id, timestamp }],
        }));
      },
      clearUsageRecords: () => set({ usageRecords: [] }),

      // ── Settings ──────────────────────────────────────────────────────────
      historyEnabled: true,
      setHistoryEnabled: (enabled) => set({ historyEnabled: enabled }),
      theme: "light",
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      rotationIndex: 0,
      setRotationIndex: (rotationIndex) => set({ rotationIndex }),

      // ── UI State (not persisted — reset each launch) ───────────────────────
      isSidebarOpen: true,
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      currentView: "chat",
      setView: (view) => set({ currentView: view }),
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: "apkirota-storage",
      merge: (persistedState: any, currentState) => {
        try {
          const merged = { ...currentState, ...(persistedState as object) };
          const existingSkills = Array.isArray(merged.skills) ? merged.skills : [];
          const existingNames = new Set(
            existingSkills
              .filter((s) => s && typeof s.name === "string")
              .map((s: Skill) => s.name.toLowerCase())
          );
          const existingIds = new Set(
            existingSkills
              .filter((s) => s && typeof s.id === "string")
              .map((s: Skill) => s.id)
          );

          const skillsToKeep = [...existingSkills];
          for (const defSkill of DEFAULT_SKILLS) {
            if (!existingNames.has(defSkill.name.toLowerCase()) && !existingIds.has(defSkill.id)) {
              skillsToKeep.push(defSkill);
            }
          }
          merged.skills = skillsToKeep;
          if (!merged.selectedModel || typeof merged.selectedModel !== "string") {
            merged.selectedModel = "gemini-2.5-flash";
          }
          return merged;
        } catch (err) {
          console.error("Storage rehydration merge error:", err);
          return currentState;
        }
      },
      partialize: (state) => {
        // Strip Base64 inlineData from messages before persisting to disk.
        // This prevents large files (images, audio) from leaking as plaintext.
        const sanitizeSessions = (sessions: ChatSession[]): ChatSession[] =>
          sessions.map((session) => ({
            ...session,
            messages: session.messages.map((msg) => ({
              ...msg,
              parts: msg.parts.map((part) => {
                if (part.inlineData?.data) {
                  return {
                    ...part,
                    inlineData: {
                      mimeType: part.inlineData.mimeType,
                      data: "[stripped]", // placeholder — actual data is in-memory only
                    },
                  };
                }
                return part;
              }),
            })),
          }));

        return {
          apiKeys: state.apiKeys,
          mode: state.mode,
          selectedModel: state.selectedModel,
          sessions: state.historyEnabled ? sanitizeSessions(state.sessions) : [],
          activeSessionId: state.historyEnabled ? state.activeSessionId : null,
          skills: state.skills,
          customModels: state.customModels || [],
          historyEnabled: state.historyEnabled,
          theme: state.theme,
          usageRecords: state.usageRecords,
          rotationIndex: state.rotationIndex,
          modelConfigs: state.modelConfigs,
        };
      },
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

let cachedCustomModels: string[] | undefined;
let cachedAvailableModels: string[] = [...SUPPORTED_MODELS];

export const selectAvailableModels = (s: AppState): string[] => {
  if (s.customModels !== cachedCustomModels) {
    cachedCustomModels = s.customModels;
    cachedAvailableModels = [
      ...SUPPORTED_MODELS,
      ...(s.customModels || []),
    ];
  }
  return cachedAvailableModels;
};

export const selectActiveSession = (s: AppState): ChatSession | null =>
  s.sessions.find((sess) => sess.id === s.activeSessionId) ?? null;

export const selectHealthyKeyCount = (s: AppState): number => {
  const now = Date.now();
  return s.apiKeys.filter(
    (k) =>
      k.status !== "invalid" &&
      (k.status !== "rate-limited" || (k.cooldownUntil ?? 0) < now)
  ).length;
};
