"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Landscape } from "./landscape";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const noop = () => {};
const subscribeNever = () => noop;

function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export interface TerrainStatus {
  session: number;
  generation: number;
}

/**
 * The page background: the fitness landscape of the demo GA as a contour map,
 * red pits and green peaks, with its population climbing it and the
 * landscape moving every session (WebGPU via vgpu). Without WebGPU, or for a
 * visitor who asked for reduced motion, one still frame drawn on a 2D canvas.
 * Decorative: `aria-hidden`, and clicks on controls never reach it.
 */
export function TerrainField({
  onStatus,
  className = "pointer-events-none absolute inset-0 overflow-hidden",
}: {
  onStatus?: (status: TerrainStatus) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasWebGpu = useSyncExternalStore(subscribeNever, () => "gpu" in navigator, () => true);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  const [failed, setFailed] = useState(false);
  const still = !hasWebGpu || reducedMotion || failed;

  const statusRef = useRef(onStatus);
  useEffect(() => {
    statusRef.current = onStatus;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || still) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    import("./terrain").then(({ mountTerrain }) => {
      if (cancelled) return;
      dispose = mountTerrain({
        canvas,
        onError: (error) => {
          console.warn("[terrain] WebGPU failed, drawing a still frame", error);
          setFailed(true);
        },
        onTick: (l) => statusRef.current?.({ session: l.session, generation: l.generation }),
      });
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [still]);

  return (
    <div className={className} aria-hidden>
      {still ? <StillTerrain /> : <canvas ref={canvasRef} className="block h-full w-full" />}
    </div>
  );
}

function cssHex(style: CSSStyleDeclaration, name: string, fallback: string): [number, number, number] {
  const value = style.getPropertyValue(name).trim();
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** The same map as the shader, computed once on the CPU at half resolution. */
function StillTerrain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      const scale = 2;
      const width = Math.max(1, Math.round(canvas.clientWidth / scale));
      const height = Math.max(1, Math.round(canvas.clientHeight / scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const style = getComputedStyle(document.documentElement);
      const up = cssHex(style, "--up", "#2bd576");
      const down = cssHex(style, "--down", "#ff4d5e");
      const bg = cssHex(style, "--background", "#08090a");
      const fg = cssHex(style, "--foreground", "#e9ebee");
      const landscape = new Landscape();
      landscape.aspect = width / height;
      const bumps = landscape.bumps();
      const levels = 9;
      const field = new Float32Array(width * height);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) field[y * width + x] = landscape.height(x / width, y / height, bumps) * levels;
      const image = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          const v = field[i];
          const gx = (field[i + (x < width - 1 ? 1 : 0)] - field[i - (x > 0 ? 1 : 0)]) / 2;
          const gy = (field[i + (y < height - 1 ? width : 0)] - field[i - (y > 0 ? width : 0)]) / 2;
          const fw = Math.max(1e-4, Math.abs(gx) + Math.abs(gy));
          const dist = Math.abs(((v + 0.5) % 1 + 1) % 1 - 0.5) / fw;
          const onLine = Math.max(0, Math.min(1, 1 - (dist - 0.25) / 1));
          const t = Math.tanh(v / levels * 1.3);
          const k = Math.abs(t) * Math.abs(t) * (3 - 2 * Math.abs(t));
          const side = t >= 0 ? up : down;
          const alpha = onLine * (0.16 + 0.22 * k);
          const wash = 0.055 * k;
          for (let c = 0; c < 3; c++) {
            const plain = bg[c] + (fg[c] - bg[c]) * 0.4;
            const color = plain + (side[c] - plain) * k;
            let out = bg[c] + (color - bg[c]) * wash;
            out += (color - out) * alpha;
            image.data[i * 4 + c] = out;
          }
          image.data[i * 4 + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    };
    paint();
    const observer = new MutationObserver(paint);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", paint);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", paint);
    };
  }, []);
  return <canvas ref={ref} className="block h-full w-full" />;
}
