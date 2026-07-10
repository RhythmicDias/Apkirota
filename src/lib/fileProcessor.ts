/**
 * fileProcessor.ts
 * Handles local file reading and conversion for Gemini multimodal payloads.
 */

import type { ChatPart } from "./geminiClient";

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

const AUDIO_TYPES: Record<string, string> = {
  "audio/wav": "audio/wav",
  "audio/mp3": "audio/mp3",
  "audio/mpeg": "audio/mpeg",
  "audio/aac": "audio/aac",
  "audio/ogg": "audio/ogg",
  "audio/flac": "audio/flac",
  "audio/m4a": "audio/mp4",
  "audio/mp4": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/webm": "audio/webm",
};

const TEXT_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
]);

export async function mediaFileToPart(file: File): Promise<ChatPart> {
  return new Promise((resolve, reject) => {
    if (!IMAGE_TYPES[file.type] && !AUDIO_TYPES[file.type] && !file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|mp4|webm)$/i)) {
      reject(new Error(`Unsupported media type: ${file.type || file.name}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      let mime = file.type;
      if (!mime) {
        if (file.name.endsWith(".mp3")) mime = "audio/mp3";
        else if (file.name.endsWith(".wav")) mime = "audio/wav";
        else if (file.name.endsWith(".m4a")) mime = "audio/mp4";
        else mime = "application/octet-stream";
      }
      resolve({ inlineData: { mimeType: mime, data: base64 } });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Convert a plain-text or CSV file to a text ChatPart. */
export async function textFileToPart(file: File): Promise<ChatPart> {
  return new Promise((resolve, reject) => {
    if (!TEXT_TYPES.has(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".csv")) {
      reject(new Error(`Unsupported text type: ${file.type}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      resolve({ text: `--- Attached file: ${file.name} ---\n\n${content}` });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function processFile(file: File): Promise<ChatPart[]> {
  if (IMAGE_TYPES[file.type] || AUDIO_TYPES[file.type] || file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|mp4|webm)$/i)) {
    return [await mediaFileToPart(file)];
  }
  if (TEXT_TYPES.has(file.type) || file.name.match(/\.(txt|csv|md|json|ts|js|jsx|tsx|css|html)$/i)) {
    return [await textFileToPart(file)];
  }
  // Fallback: treat as raw binary → base64 inline data
  return [await mediaFileToPart(file).catch((e) => { throw e; })];
}

/** Thumbnail URL for preview strip (images only). */
export function getPreviewUrl(file: File): string | null {
  if (IMAGE_TYPES[file.type]) return URL.createObjectURL(file);
  return null;
}
