/**
 * geminiClient.ts
 * Wrapper around the Gemini REST API with retry + key-rotation + secure OS Keyring support.
 */

import { invoke } from "@tauri-apps/api/core";
import { KeyRotator } from "./KeyRotator";
import type { ModelConfig } from "../store/useAppStore";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_RETRIES = 3;

export type ChatRole = "user" | "model";

export interface ChatPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface ChatMessage {
  role: ChatRole;
  parts: ChatPart[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface SendMessageOptions {
  model: string;
  history: ChatMessage[];
  userParts: ChatPart[];
  rotator: KeyRotator;
  mode: "normal" | "unlimited";
  systemPrompt?: string;
  modelConfig?: ModelConfig;
}

export interface GeminiResponse {
  text: string;
  usedKeyName: string;
  usedKeyId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Build the request body for the Gemini generateContent endpoint. */
function buildPayload(
  history: ChatMessage[],
  userParts: ChatPart[],
  systemPrompt?: string,
  modelConfig?: ModelConfig
) {
  const tools: any[] = [];
  if (modelConfig?.tools?.codeExecution) {
    tools.push({ code_execution: {} });
  }
  if (modelConfig?.tools?.groundingGoogleSearch) {
    tools.push({ googleSearch: {} });
  }
  // Optional: implement functionCalling if needed, or structuredOutputs
  
  const finalSystemPrompt = modelConfig?.systemInstructions || systemPrompt;
  
  const stopSequences = modelConfig?.advanced?.stopSequences
    ? modelConfig.advanced.stopSequences.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  let safetySettings: any[] | undefined = undefined;
  if (modelConfig?.advanced?.safetySettings === "Block None") {
    safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ];
  }

  return {
    ...(finalSystemPrompt
      ? { systemInstruction: { parts: [{ text: finalSystemPrompt }] } }
      : {}),
    contents: [
      ...history.map(msg => ({ role: msg.role, parts: msg.parts })),
      { role: "user", parts: userParts },
    ],
    ...(tools.length > 0 ? { tools } : {}),
    ...(safetySettings ? { safetySettings } : {}),
    generationConfig: {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens: modelConfig?.advanced?.outputLength || 8192,
      ...(stopSequences && stopSequences.length > 0 ? { stopSequences } : {}),
    },
  };
}

/** Send a message to Gemini with automatic retry on rate-limits. */
export async function sendMessage(
  opts: SendMessageOptions
): Promise<GeminiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const entry =
      opts.mode === "unlimited"
        ? opts.rotator.getNextKey()
        : opts.rotator.getActiveKey();

    if (!entry) {
      throw new Error(
        "No active API keys available. Please add or configure your keys in Settings."
      );
    }

    // Load actual key string securely from OS Keyring
    let rawKeyValue = "";
    try {
      rawKeyValue = await invoke<string>("load_api_key", { keyId: entry.id });
    } catch (e) {
      opts.rotator.reportInvalid(entry.id);
      lastError = new Error(`Failed to load key from secure storage: ${e}`);
      continue;
    }

    if (!rawKeyValue || rawKeyValue.trim() === "") {
      opts.rotator.reportInvalid(entry.id);
      lastError = new Error(`API key "${entry.name}" is empty or not configured in OS storage.`);
      continue;
    }

    const url = `${GEMINI_BASE}/${opts.model}:generateContent?key=${rawKeyValue}`;
    const body = buildPayload(opts.history, opts.userParts, opts.systemPrompt, opts.modelConfig);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        let errText = "";
        try {
          const raw = await res.text();
          try { errText = JSON.parse(raw)?.error?.message || raw; } catch(e) { errText = raw; }
        } catch (e) { errText = "Unknown API error"; }
        opts.rotator.reportRateLimit(entry.id);
        lastError = new Error(`Key "${entry.name}" rate-limited (attempt ${attempt + 1}/${MAX_RETRIES}). Details: ${errText}`);
        continue; // retry with next key
      }

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        let errText = "";
        try {
          const raw = await res.text();
          try { errText = JSON.parse(raw)?.error?.message || raw; } catch(e) { errText = raw; }
        } catch (e) { errText = "Unknown API error"; }
        opts.rotator.reportInvalid(entry.id);
        lastError = new Error(`Key "${entry.name}" is invalid or unauthorized (attempt ${attempt + 1}/${MAX_RETRIES}). Details: ${errText}`);
        continue;
      }

      if (!res.ok) {
        let errText = "";
        try {
          const raw = await res.text();
          try { errText = JSON.parse(raw)?.error?.message || raw; } catch(e) { errText = raw; }
        } catch (e) {}
        throw new Error(`Gemini API error ${res.status}: ${errText || res.statusText}`);
      }

      const json = await res.json();
      const text: string =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      const promptTokens = json?.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = json?.usageMetadata?.candidatesTokenCount ?? 0;
      const totalTokens = json?.usageMetadata?.totalTokenCount ?? 0;

      opts.rotator.reportValid(entry.id);
      return {
        text,
        usedKeyName: entry.name,
        usedKeyId: entry.id,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Gemini API error")) throw err;
      lastError = err as Error;
    }
  }

  throw lastError ?? new Error("Failed to get a response after max retries.");
}

/** Send a lightweight test prompt to verify a key is valid. */
export async function testKey(
  apiKey: string,
  model = "gemini-2.5-flash"
): Promise<"valid" | "invalid" | "rate-limited"> {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hi" }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });

    if (res.status === 429) return "rate-limited";
    if (res.status === 400 || res.status === 401 || res.status === 403) return "invalid";
    if (res.ok) return "valid";
    return "invalid";
  } catch {
    return "invalid";
  }
}
