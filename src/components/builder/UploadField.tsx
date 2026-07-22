"use client";

import { useRef, useState } from "react";
import { Upload, File as FileIcon, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Feedback";
import type { UploadCategory, UploadedResource } from "@/lib/types";

const CATEGORY_LABEL: Record<UploadCategory, string> = {
  examples: "Example / anti-example",
  checklists: "Checklist / template",
  assets: "Asset (image, logo, zip)",
};

export function UploadField({
  categories,
  resources,
  onAdd,
  onRemove,
}: {
  categories: UploadCategory[];
  resources: UploadedResource[];
  onAdd: (resources: UploadedResource[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<UploadCategory>(categories[0] ?? "examples");
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    setRejected([]);
    try {
      const fd = new FormData();
      fd.set("category", category);
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      if (data.resources?.length) onAdd(data.resources as UploadedResource[]);
      if (data.rejected?.length) setRejected(data.rejected);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {categories.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor="upload-category">Category</Label>
            <Select
              id="upload-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as UploadCategory)}
              className="w-56"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>
        )}
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          loading={busy}
          type="button"
        >
          <Upload className="size-4" aria-hidden />
          Upload files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-label="Upload files"
          onChange={(e) => handleFiles(e.target.files)}
          accept=".md,.txt,.csv,.json,.yaml,.yml,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp,.svg,.ico,.zip"
        />
        <span className="text-xs text-muted">
          md, txt, pdf, docx, csv, images, zip. Secrets are auto-detected and blocked.
        </span>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {rejected.length > 0 && (
        <Notice tone="warn" title="Some files were not added">
          <ul className="mt-1 space-y-1">
            {rejected.map((r) => (
              <li key={r.name} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <strong>{r.name}</strong>: {r.reason}
                </span>
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {resources.length > 0 && (
        <ul className="space-y-1.5">
          {resources.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileIcon className="size-4 shrink-0 text-muted" aria-hidden />
                <code className="truncate font-mono text-xs text-ink">{r.relativePath}</code>
                <span className="shrink-0 text-xs text-muted">
                  {(r.sizeBytes / 1024).toFixed(0)} KB
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                className="text-muted hover:text-danger"
                aria-label={`Remove ${r.name}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
