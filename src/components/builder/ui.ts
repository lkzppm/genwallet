// Shared class strings: square buttons with hairline borders, a colour
// transition on hover and a small press on click.

const base =
  "inline-flex h-9 items-center justify-center gap-2 border px-4 text-sm transition-[color,background-color,border-color,transform] duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

export const button = {
  primary: `${base} border-up text-up hover:bg-up hover:text-background`,
  secondary: `${base} border-border text-muted-foreground hover:border-foreground hover:text-foreground`,
  danger: `${base} border-down text-down hover:bg-down hover:text-background`,
};

/** A segment of a two- or three-way switch; `aria-pressed` marks the chosen one. */
export const segment =
  "h-8 flex-1 px-2 text-xs transition-[color,background-color,transform] duration-200 ease-out active:scale-[0.97] text-muted-foreground hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background";

export const panel = "border border-border bg-panel backdrop-blur-[2px]";

export const label = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground";
