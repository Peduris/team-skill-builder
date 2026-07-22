import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { extractText, categoryForName, extForName } from "@/lib/extract";
import { scanForSecrets } from "@/lib/secret-scan";
import { slugify } from "@/lib/slug";
import type { UploadCategory, UploadedResource } from "@/lib/types";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "md", "txt", "csv", "json", "yaml", "yml",
  "pdf", "docx",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "zip",
]);

export async function POST(request: Request) {
  const maxBytes = env.maxUploadMb * 1024 * 1024;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const fallback = ((form.get("category") as string) || "examples") as UploadCategory;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  const resources: UploadedResource[] = [];
  const rejected: { name: string; reason: string }[] = [];
  let total = 0;

  for (const file of files) {
    const ext = extForName(file.name);
    if (!ALLOWED.has(ext)) {
      rejected.push({ name: file.name, reason: `Unsupported file type (.${ext}).` });
      continue;
    }
    if (file.size > maxBytes) {
      rejected.push({ name: file.name, reason: `Exceeds ${env.maxUploadMb} MB limit.` });
      continue;
    }
    total += file.size;
    if (total > maxBytes * 5) {
      rejected.push({ name: file.name, reason: "Total upload size limit reached." });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(file.name, buffer);
    const secrets = scanForSecrets(text);
    if (secrets.length > 0) {
      rejected.push({
        name: file.name,
        reason: `Contains possible secrets (${secrets.map((s) => s.kind).join(", ")}). Remove them and re-upload.`,
      });
      continue;
    }

    const category = categoryForName(file.name, fallback);
    const safeBase = slugify(file.name.replace(/\.[^.]+$/, "")) || "file";
    const relativePath = `${category}/${safeBase}.${ext}`;

    resources.push({
      id: crypto.randomUUID(),
      name: file.name,
      category,
      sizeBytes: file.size,
      mime: file.type || "application/octet-stream",
      text,
      contentBase64: buffer.toString("base64"),
      relativePath,
    });
  }

  return NextResponse.json({ resources, rejected });
}
