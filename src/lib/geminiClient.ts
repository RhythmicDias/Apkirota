/**
 * geminiClient.ts
 * Wrapper around the Gemini REST API with retry + key-rotation + secure OS Keyring support.
 */

import { invoke } from "@tauri-apps/api/core";
import { KeyRotator } from "./KeyRotator";

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
}

export interface SendMessageOptions {
  model: string;
  history: ChatMessage[];
  userParts: ChatPart[];
  rotator: KeyRotator;
  mode: "normal" | "unlimited";
  systemPrompt?: string;
}

export interface GeminiResponse {
  text: string;
  usedKeyName: string;
}

/** Build the request body for the Gemini generateContent endpoint. */
function buildPayload(
  history: ChatMessage[],
  userParts: ChatPart[],
  systemPrompt?: string
) {
  return {
    ...(systemPrompt
      ? { system_instruction: { parts: [{ text: systemPrompt }] } }
      : {}),
    contents: [
      ...history,
      { role: "user", parts: userParts },
    ],
    generationConfig: {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens: 8192,
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
    const body = buildPayload(opts.history, opts.userParts, opts.systemPrompt);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        opts.rotator.reportRateLimit(entry.id);
        lastError = new Error(`Key "${entry.name}" rate-limited (attempt ${attempt + 1}/${MAX_RETRIES})`);
        continue; // retry with next key
      }

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        opts.rotator.reportInvalid(entry.id);
        lastError = new Error(`Key "${entry.name}" is invalid or unauthorized (attempt ${attempt + 1}/${MAX_RETRIES})`);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      const text: string =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      opts.rotator.reportValid(entry.id);
      return { text, usedKeyName: entry.name };
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
