import * as React from "react";
import { cn } from "@/lib/cn";

export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-muted">{label}</p>}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type NoticeTone = "info" | "warn" | "danger" | "ok";

const noticeTones: Record<NoticeTone, string> = {
  info: "bg-brand-wash text-brand-ink border-brand/20",
  warn: "bg-warn/10 text-ink border-warn/30",
  danger: "bg-danger-wash text-ink border-danger/30",
  ok: "bg-ok/10 text-ink border-ok/30",
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border px-3.5 py-3 text-sm", noticeTones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1")}>{children}</div>}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CharCount({ value, max }: { value: number; max: number }) {
  const over = value > max;
  const near = value > max * 0.9;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        over ? "text-danger font-semibold" : near ? "text-warn" : "text-muted",
      )}
    >
      {value}/{max}
    </span>
  );
}
