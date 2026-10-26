"use client";

// The builder's small pieces: square hairline controls that turn green under
// the pointer, a segmented switch whose block slides to the chosen option,
// and a hook that measures a box so the charts draw at its real size.

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const label = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export const panel = "border border-border bg-panel";

export const input =
  "h-8 w-full border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground outline-none transition-colors duration-200 hover:border-muted-foreground focus:border-up disabled:opacity-50";

export function IconButton({
  label: text,
  onClick,
  children,
  pressed,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center border border-border bg-background text-muted-foreground transition-[color,border-color,background-color,transform] duration-200 ease-[var(--ease)] hover:-translate-y-px hover:border-up hover:text-up active:translate-y-0 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35 aria-pressed:border-up aria-pressed:text-up",
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/** Two to four options side by side; a dark block slides under the chosen one. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label: text,
  disabled,
  compact,
  narrow,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  /** Icons only, the label as a tooltip. */
  compact?: boolean;
  /** Labels hidden while the nearest container is narrow (icons stay). */
  narrow?: boolean;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="group"
      aria-label={text}
      className={cn("relative grid border border-border bg-background", disabled && "opacity-50")}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-foreground transition-transform duration-300 ease-[var(--ease)]"
        style={{ width: `${100 / options.length}%`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            aria-label={compact || narrow ? o.label : undefined}
            title={compact || narrow ? o.label : undefined}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex h-8 min-w-0 items-center justify-center gap-1.5 px-2 text-xs text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-2 focus-visible:ring-up focus-visible:ring-inset disabled:pointer-events-none aria-pressed:text-background aria-pressed:hover:text-background",
              compact && "px-3",
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
            {!compact && <span className={cn("truncate", narrow && "@max-lg:hidden")}>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** A titled box of the stage: a small uppercase title, optional actions on the right. */
export function Panel({
  title,
  icon: Icon,
  actions,
  className,
  bodyClassName,
  flush,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** No padding around the body: for a table that scrolls under a sticky header. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn(panel, "flex min-h-0 min-w-0 flex-col", className)}>
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        {Icon && <Icon className="size-3.5 text-muted-foreground" aria-hidden />}
        <h3 className={cn(label, "truncate")}>{title}</h3>
        {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("min-h-0 flex-1", !flush && "p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

/** The content size of a box, kept current as it resizes. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (Math.abs(s.width - width) < 0.5 && Math.abs(s.height - height) < 0.5 ? s : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
