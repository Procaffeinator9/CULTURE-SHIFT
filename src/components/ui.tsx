import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LineKind } from "@/lib/culture/types";

export function PageHeader({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="font-mono text-xs tracking-widest text-lime uppercase">{kicker}</p>
      <h1 className="mt-2 font-serif text-4xl text-fg md:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base text-muted">{lede}</p>
    </header>
  );
}

const buttonStyles = {
  primary: "bg-lime text-ink hover:bg-fg",
  ghost: "border border-line bg-transparent text-fg hover:border-lime",
  violet: "border border-line bg-transparent text-violet hover:border-violet",
  warn: "border border-warn bg-transparent text-warn",
} as const;

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium transition-shadow duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

const tagStyles: Record<LineKind | "calculated" | "simulated" | "assumption", string> = {
  hypothesis: "text-violet",
  context: "text-muted",
  supplied: "text-lime",
  missing: "text-warn",
  calculated: "text-lime",
  simulated: "text-warn",
  assumption: "text-violet",
};

export function Tag({
  kind,
  children,
}: {
  kind: LineKind | "calculated" | "simulated" | "assumption";
  children: ReactNode;
}) {
  return (
    <span className={cn("font-mono text-xs tracking-widest uppercase", tagStyles[kind])}>{children}</span>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("border border-line bg-panel p-5", className)}>{children}</section>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-xs tracking-widest text-muted uppercase">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const fieldClass =
  "min-h-11 w-full border border-line bg-panel-2 px-3 text-sm text-fg placeholder:text-muted";

export function Meter({ value }: { value: number | null }) {
  if (value == null) return <span className="font-mono text-xs text-muted">Not scored</span>;
  const width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1 flex-1 bg-panel-2" aria-hidden="true">
        <div className="h-1 bg-lime" style={{ width }} />
      </div>
      <span className="w-10 text-right font-mono text-xs text-fg tabular-nums">{(value * 100).toFixed(0)}</span>
    </div>
  );
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
