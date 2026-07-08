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

const TEXT_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
]);

/** Convert a File to a base64 inlineData ChatPart for Gemini's multimodal API. */
export async function imageFileToPart(file: File): Promise<ChatPart> {
  return new Promise((resolve, reject) => {
    if (!IMAGE_TYPES[file.type]) {
      reject(new Error(`Unsupported image type: ${file.type}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve({ inlineData: { mimeType: file.type, data: base64 } });
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

/** Dispatch a File to the appropriate processor and return a ChatPart array. */
export async function processFile(file: File): Promise<ChatPart[]> {
  if (IMAGE_TYPES[file.type]) {
    return [await imageFileToPart(file)];
  }
  if (TEXT_TYPES.has(file.type) || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
    return [await textFileToPart(file)];
  }
  // Fallback: treat as raw binary → base64 inline data
  return [await imageFileToPart(file).catch(() => ({ text: `[Unsupported file: ${file.name}]` }))];
}

/** Thumbnail URL for preview strip (images only). */
export function getPreviewUrl(file: File): string | null {
  if (IMAGE_TYPES[file.type]) return URL.createObjectURL(file);
  return null;
}
