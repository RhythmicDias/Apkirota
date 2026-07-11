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
  fileData?: { mimeType: string; fileUri: string };
  uploadKeyId?: string;
}

export interface ChatMessage {
  role: ChatRole;
  parts: ChatPart[];
  modelName?: string;
  apiKeyName?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
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
  // Include the local DOCX generation tool
  tools.push({
    functionDeclarations: [
      {
        name: "create_docx_file",
        description: "Generate and save a .docx document to the user's computer. Use this when the user asks you to create a Word document.",
        parameters: {
          type: "OBJECT",
          properties: {
            filename: { type: "STRING", description: "The suggested filename, ending in .docx" },
            content: { type: "STRING", description: "The raw text content to put into the document" }
          },
          required: ["filename", "content"]
        }
      }
    ]
  });
  const finalSystemPrompt = systemPrompt || modelConfig?.systemInstructions;
  
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

  const sanitizeParts = (parts: ChatPart[]) => parts.map(({ uploadKeyId, ...rest }) => rest);

  return {
    ...(finalSystemPrompt
      ? { systemInstruction: { parts: [{ text: finalSystemPrompt }] } }
      : {}),
    contents: [
      ...history.map(msg => ({ role: msg.role, parts: sanitizeParts(msg.parts) })),
      { role: "user", parts: sanitizeParts(userParts) },
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
    const requiredKeyId = opts.userParts.find(p => p.uploadKeyId)?.uploadKeyId 
                       || opts.history.flatMap(m => m.parts).find(p => p.uploadKeyId)?.uploadKeyId;

    const entry = requiredKeyId 
      ? opts.rotator.getKeyById(requiredKeyId)
      : (opts.mode === "unlimited"
          ? opts.rotator.getNextKey()
          : opts.rotator.getActiveKey());

    if (requiredKeyId && !entry) {
      throw new Error(
        "The API key used to upload files in this conversation is missing or invalid. Please start a new chat."
      );
    }

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

    const url = `${GEMINI_BASE}/${opts.model}:generateContent`;
    const body = buildPayload(opts.history, opts.userParts, opts.systemPrompt, opts.modelConfig);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": rawKeyValue },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        let errText = "";
        try {
          const json = await res.json();
          if (json.error && json.error.message) errText = json.error.message;
        } catch (e) {}
        opts.rotator.reportRateLimit(entry.id, 60_000);
        lastError = new Error(`Rate limit exceeded for key "${entry.name}". ${errText}`);
        if (requiredKeyId) {
          throw new Error(`Rate limit exceeded for key "${entry.name}". This conversation is locked to this key because of file attachments. Please wait before retrying.`);
        }
        continue;
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
      const parts = json?.candidates?.[0]?.content?.parts ?? [];
      let text: string = parts.find((p: any) => p.text)?.text ?? "";

      const functionCallPart = parts.find((p: any) => p.functionCall);
      if (functionCallPart) {
        const call = functionCallPart.functionCall;
        if (call.name === "create_docx_file") {
          try {
            const { Document, Packer, Paragraph, TextRun } = await import("docx");
            const { save } = await import("@tauri-apps/plugin-dialog");
            const { writeFile } = await import("@tauri-apps/plugin-fs");

            const doc = new Document({
              sections: [{
                properties: {},
                children: call.args.content.split("\n").map((line: string) => new Paragraph({ children: [new TextRun(line)] }))
              }]
            });

            const blob = await Packer.toBlob(doc);
            const buffer = await blob.arrayBuffer();

            const filePath = await save({
              filters: [{ name: "Word Document", extensions: ["docx"] }],
              defaultPath: (() => {
                // Sanitize AI-controlled filename: strip path separators and traversal
                let name = (call.args.filename || "document.docx")
                  .replace(/[/\\]/g, "_")       // strip path separators
                  .replace(/\.\./g, "_")          // strip directory traversal
                  .replace(/[<>:"|?*]/g, "_")    // strip Windows-illegal chars
                  .trim();
                if (!name.toLowerCase().endsWith(".docx")) name += ".docx";
                return name;
              })()
            });

            if (filePath) {
              await writeFile(filePath, new Uint8Array(buffer));
              text += `\n\n✅ **Success!** I generated the document and you saved it to \`${filePath}\`.`;
            } else {
              text += `\n\n❌ **Cancelled:** You cancelled saving the document.`;
            }
          } catch (e: any) {
            console.error(e);
            text += `\n\n❌ **Error:** Failed to generate document. ${e?.message || String(e)}`;
          }
        }
      }

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
  const url = `${GEMINI_BASE}/${model}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
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

/** 
 * Upload a file using Gemini File API (resumable upload) to track progress.
 * Returns the file URI and MIME type.
 */
export function uploadFileToGemini(
  file: File,
  apiKey: string,
  onProgress?: (percent: number) => void
): Promise<{ fileUri: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart`;
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    
    const boundary = "------UploadBoundary" + Math.random().toString(36).substring(2);
    xhr.setRequestHeader("Content-Type", "multipart/related; boundary=" + boundary);
    xhr.setRequestHeader("x-goog-api-key", apiKey);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({ fileUri: response.file.uri, mimeType: response.file.mimeType });
        } catch(err) {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        let errText = xhr.responseText;
        try {
          const json = JSON.parse(xhr.responseText);
          if (json.error && json.error.message) errText = json.error.message;
        } catch(e) {}
        reject(new Error(`Upload failed: ${errText}`));
      }
    };
    
    xhr.onerror = () => reject(new Error("Upload failed due to network/CORS error."));
    
    const metadata = JSON.stringify({ file: { display_name: file.name } });
    
    const preBlob = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`
    ]);
    const postBlob = new Blob([`\r\n--${boundary}--\r\n`]);
    
    const body = new Blob([preBlob, file, postBlob]);
    
    xhr.send(body);
  });
}
