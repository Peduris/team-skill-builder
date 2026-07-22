import "server-only";
import type { UploadCategory } from "./types";

const TEXT_EXT = new Set(["md", "txt", "csv", "json", "yaml", "yml"]);

export function extForName(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function categoryForName(name: string, fallback: UploadCategory): UploadCategory {
  const ext = extForName(name);
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "zip"].includes(ext)) {
    return "assets";
  }
  return fallback;
}

/** Extract readable text from an uploaded file buffer. Returns "" for binary/unsupported. */
export async function extractText(name: string, buffer: Buffer): Promise<string> {
  const ext = extForName(name);
  try {
    if (TEXT_EXT.has(ext)) {
      return buffer.toString("utf8").slice(0, 100_000);
    }
    if (ext === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        return (result.text || "").slice(0, 100_000);
      } finally {
        await parser.destroy();
      }
    }
    if (ext === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || "").slice(0, 100_000);
    }
  } catch (err) {
    console.error(`[extract] failed for ${name}:`, (err as Error).message);
  }
  return "";
}
