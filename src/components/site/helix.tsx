import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/* A strip of double helix, the mark's motif along an edge: two strands that
   cross every half turn and the rungs between them, in the mark's colours
   (the S's strand, the stem's green, red rungs). Each layer is one turn
   drawn as an SVG mask that repeats along the strip, filled with a theme
   colour, so the helix follows the theme and any length; sliding the masks
   by one turn makes it flow. At rest it is grey; inside a hovered `group`
   it takes its colours. */

/** One turn of the helix, in pixels along the strip, and the strip's width. */
const TURN = 36;
const WIDTH = 14;
const AMPLITUDE = 5;

function strand(sign: 1 | -1): string {
  const points: string[] = [];
  for (let i = 0; i <= 28; i++) {
    const x = (i / 28) * TURN;
    const y = WIDTH / 2 + sign * AMPLITUDE * Math.sin((2 * Math.PI * x) / TURN);
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${points.join("L")}`;
}

function rungs(): string {
  // Three rungs per half turn, none where the strands cross.
  return [0.12, 0.25, 0.38, 0.62, 0.75, 0.88]
    .map((at) => {
      const x = at * TURN;
      const dy = AMPLITUDE * Math.sin((2 * Math.PI * x) / TURN) * 0.82;
      return `M${x.toFixed(2)} ${(WIDTH / 2 - dy).toFixed(2)}V${(WIDTH / 2 + dy).toFixed(2)}`;
    })
    .join("");
}

/** A data URI of one turn, horizontal or turned on its side. */
function turn(d: string, width: number, vertical: boolean): string {
  const [w, h] = vertical ? [WIDTH, TURN] : [TURN, WIDTH];
  const g = vertical ? `<g transform="matrix(0 1 1 0 0 0)">` : "<g>";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${g}<path d="${d}" fill="none" stroke="#000" stroke-width="${width}" stroke-linecap="round"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const LAYERS = (vertical: boolean) => [
  { mask: turn(rungs(), 1.1, vertical), rest: "bg-border", lit: "group-hover:bg-down" },
  { mask: turn(strand(-1), 1.5, vertical), rest: "bg-muted-foreground/45", lit: "group-hover:bg-up" },
  { mask: turn(strand(1), 1.5, vertical), rest: "bg-muted-foreground/70", lit: "group-hover:bg-foreground" },
];

const HORIZONTAL = LAYERS(false);
const VERTICAL = LAYERS(true);

export function Helix({ vertical = false, className }: { vertical?: boolean; className?: string }) {
  const layers = vertical ? VERTICAL : HORIZONTAL;
  return (
    <span aria-hidden className={cn("pointer-events-none relative block", vertical ? "w-3.5" : "h-3.5", className)}>
      {layers.map((layer, i) => (
        <span
          key={i}
          className={cn(
            "absolute inset-0 transition-colors duration-500 ease-[var(--ease)]",
            vertical ? "animate-[helix-flow-y_7s_linear_infinite]" : "animate-[helix-flow-x_7s_linear_infinite]",
            layer.rest,
            layer.lit,
          )}
          style={
            {
              maskImage: layer.mask,
              WebkitMaskImage: layer.mask,
              maskRepeat: vertical ? "repeat-y" : "repeat-x",
              WebkitMaskRepeat: vertical ? "repeat-y" : "repeat-x",
              "--helix-turn": `${TURN}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
