import * as React from "react";
import { cn } from "@/lib/cn";

let idCounter = 0;
function useId(prefix: string) {
  const [id] = React.useState(() => `${prefix}-${++idCounter}`);
  return id;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-medium text-ink", className)} {...props} />
  );
}

interface FieldProps {
  label: string;
  help?: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: (id: string) => React.ReactNode;
}

export function Field({ label, help, required, error, hint, children }: FieldProps) {
  const id = useId("field");
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </Label>
        {hint}
      </div>
      {help && <p className="text-sm text-muted measure">{help}</p>}
      {children(id)}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-brand outline-none";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputBase, "h-10", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputBase, "min-h-24 resize-y leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputBase, "h-10 pr-8", className)} {...props} />;
}
