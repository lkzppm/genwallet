"use client";

import { useEffect, useRef } from "react";

/* The background of the landing's second section: a gene pool. A grid of
   small grey squares, one gene each; every few seconds a generation sweeps
   across from the left, and the genes it passes are selected (a small
   pulse) or mutate (they grow and flash green or red, then settle). Under
   the pointer the genes light up; a click sends a ring of mutations out
   from where it landed. Drawn on a 2D canvas, only while the section is on
   screen, and as one still frame for a visitor who asked for less motion.
   Decorative: `aria-hidden`, and clicks on the section's links and buttons
   are left alone. */

/** Pixels between genes, and the resting side of one. */
const PITCH = 22;
const SIDE = 2.6;
/** Seconds between two generations (each crosses the whole width), and a click's ring speed (px/s). */
const PERIOD = 5.5;
const SPEED = 330;
/** Width of the sweeping front, and of a click's ring, in pixels. */
const FRONT = 70;
/** Seconds a mutation stays lit. */
const GLOW = 1.4;
/** How far the pointer's light reaches. */
const LAMP = 150;
/** Share of genes a generation mutates, and a click's ring. */
const MUTATE = 0.08;
const MUTATE_CLICK = 0.35;
/** The grid fades out over this many pixels at the top and the bottom. */
const EDGE = 140;

type Gene = { x: number; y: number; h: number; h2: number; fade: number; lit: number; up: boolean };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** A stable pseudo-random number in [0, 1) for a grid cell. */
function hash(i: number, j: number, salt: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(salt, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rgb(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function GenePool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const st = {
      genes: [] as Gene[],
      width: 0,
      height: 0,
      dpr: 1,
      colors: { grey: "", up: "", down: "", fg: "" },
      pointer: null as { x: number; y: number } | null,
      rings: [] as { x: number; y: number; t: number; salt: number }[],
      frame: 0,
      start: performance.now(),
      visible: false,
    };

    const readColors = () => {
      st.colors = {
        grey: rgb("--muted-foreground", "#8a9199"),
        up: rgb("--up", "#2bd576"),
        down: rgb("--down", "#ff4d5e"),
        fg: rgb("--foreground", "#e9ebee"),
      };
    };

    const layout = () => {
      const { width, height } = section.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const genes: Gene[] = [];
      const cols = Math.ceil(width / PITCH);
      const rows = Math.ceil(height / PITCH);
      const ox = (width - (cols - 1) * PITCH) / 2;
      const oy = (height - (rows - 1) * PITCH) / 2;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const y = oy + j * PITCH;
          const fade = clamp01(Math.min(y, height - y) / EDGE);
          if (fade <= 0) continue;
          genes.push({ x: ox + i * PITCH, y, h: hash(i, j, 1), h2: hash(i, j, 2), fade, lit: -1e9, up: true });
        }
      }
      Object.assign(st, { genes, width, height, dpr });
    };

    const draw = (now: number) => {
      const t = (now - st.start) / 1000;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.width, st.height);

      // The generation sweeping right now: where its front is.
      const generation = Math.floor(t / PERIOD);
      const front = still ? -1e9 : ((t % PERIOD) / PERIOD) * (st.width + 2 * FRONT) - FRONT;
      st.rings = st.rings.filter((r) => t - r.t < 3);

      const { grey, up, down, fg } = st.colors;
      for (const g of st.genes) {
        // The front: every gene pulses as it passes; a few mutate.
        const df = (front - g.x) / FRONT;
        let pulse = df > -1 && df < 1 ? 1 - Math.abs(df) : 0;
        if (pulse > 0.9 && g.h < MUTATE && t - g.lit > GLOW) {
          g.lit = t;
          g.up = hash(Math.round(g.x), generation, 3) < 0.55;
        }
        // A click's ring: the genes it crosses mutate more often.
        for (const r of st.rings) {
          const dr = ((t - r.t) * SPEED - Math.hypot(g.x - r.x, g.y - r.y)) / FRONT;
          if (dr > -1 && dr < 1) {
            pulse = Math.max(pulse, 1 - Math.abs(dr));
            if (Math.abs(dr) < 0.1 && hash(Math.round(g.x), Math.round(g.y), r.salt) < MUTATE_CLICK && t - g.lit > GLOW) {
              g.lit = t;
              g.up = g.h2 < 0.55;
            }
          }
        }
        const lamp = st.pointer ? clamp01(1 - Math.hypot(g.x - st.pointer.x, g.y - st.pointer.y) / LAMP) : 0;
        const glow = still ? (g.h < MUTATE ? 0.6 : 0) : clamp01(1 - (t - g.lit) / GLOW);

        const side = SIDE * (1 + 0.5 * pulse + 0.4 * lamp + 1.1 * glow);
        ctx.globalAlpha = g.fade * Math.min(1, 0.22 + 0.25 * pulse + 0.5 * lamp + 0.75 * glow);
        ctx.fillStyle = glow > 0.02 ? (g.up ? up : down) : lamp > 0.3 ? fg : grey;
        ctx.fillRect(g.x - side / 2, g.y - side / 2, side, side);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      draw(now);
      st.frame = st.visible && !still ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!st.frame && st.visible && !still) st.frame = requestAnimationFrame(loop);
    };

    readColors();
    layout();
    draw(performance.now());

    const resize = new ResizeObserver(() => {
      layout();
      draw(performance.now());
    });
    resize.observe(section);
    const view = new IntersectionObserver(([entry]) => {
      st.visible = entry.isIntersecting;
      wake();
    });
    view.observe(section);
    const theme = new MutationObserver(() => {
      readColors();
      draw(performance.now());
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const local = (event: PointerEvent) => {
      const box = section.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") st.pointer = local(event);
    };
    const onLeave = () => (st.pointer = null);
    const onDown = (event: PointerEvent) => {
      if ((event.target as Element).closest("a, button, input, [role=tab]")) return;
      st.rings.push({ ...local(event), t: (performance.now() - st.start) / 1000, salt: st.rings.length + 7 });
    };
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    section.addEventListener("pointerdown", onDown);

    return () => {
      cancelAnimationFrame(st.frame);
      resize.disconnect();
      view.disconnect();
      theme.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
