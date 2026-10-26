import { clock, draw, effect, frameLoop, init, surface } from "vgpu";
import terrainShader from "./terrain.wgsl";
import dotsShader from "./dots.wgsl";
import { Landscape, POPULATION } from "./landscape";

export interface TerrainOptions {
  canvas: HTMLCanvasElement;
  onError?: (error: unknown) => void;
  /** Called after every generation, for captions that count sessions. */
  onTick?: (landscape: Landscape) => void;
}

type Rgba = [number, number, number, number];

interface Palette {
  up: Rgba;
  down: Rgba;
  background: Rgba;
  foreground: Rgba;
}

/** What the dark theme holds, for a page whose stylesheet has not arrived yet. */
const DEFAULT_COLORS = { up: "#2bd576", down: "#ff4d5e", background: "#08090a", foreground: "#e9ebee" };
/** Fraction of the remaining distance the pointer lamp covers per frame at 60 fps. */
const POINTER_EASE_PER_FRAME = 0.15;
/** Contour lines per unit of height, and their width in CSS pixels. */
const LEVELS = 9;
const LINE_CSS = 1;
const DOT_RADIUS_CSS = 2.8;

function hexToRgb(hex: string): Rgba {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [((value >> 16) & 0xff) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255, 1];
}

/** The theme's colours, from the page's custom properties (kept as six-digit hex in both themes). */
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return hexToRgb(/^#[0-9a-f]{6}$/i.test(value) ? value : fallback);
  };
  return {
    up: color("--up", DEFAULT_COLORS.up),
    down: color("--down", DEFAULT_COLORS.down),
    background: color("--background", DEFAULT_COLORS.background),
    foreground: color("--foreground", DEFAULT_COLORS.foreground),
  };
}

/**
 * Draws the moving fitness landscape and its population on `canvas` (vgpu:
 * one fullscreen effect for the map, one instanced draw for the dots) and
 * runs the demo GA on the CPU. Clicks anywhere on the page drop immigrants
 * where they land. Returns the function that stops everything.
 */
export function mountTerrain(options: TerrainOptions): () => void {
  let disposed = false;
  let cleanup: (() => void) | undefined;

  (async () => {
    const gpu = await init();
    if (disposed) return gpu.dispose();
    const canvasSurface = surface(gpu, options.canvas, { dpr: [1, 2] });
    const landscape = new Landscape();
    const time = clock(gpu);

    let palette = readPalette();
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    const pointer = { x: 0, y: 0, inside: false };
    const eased: [number, number] = [-1, -1];
    const toUv = (x: number, y: number): [number, number] => {
      const rect = options.canvas.getBoundingClientRect();
      return [(x - rect.left) / Math.max(1, rect.width), (y - rect.top) / Math.max(1, rect.height)];
    };
    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onDown = (event: PointerEvent) => {
      // Clicks on links and buttons are for them, not for the map.
      if ((event.target as Element | null)?.closest("a, button, input, select, textarea, [role=button]")) return;
      const [x, y] = toUv(event.clientX, event.clientY);
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) landscape.immigrate(x, y);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    const bumpArray = () => landscape.bumps().map((b): Rgba => [b.x, b.y, b.s, b.a]);
    const dotArray = () =>
      landscape.dots.map((d, i): Rgba => [d.x, d.y, d.alpha, i === landscape.champion ? 1 : 0]);

    const map = effect(gpu, terrainShader, {
      label: "terrain",
      set: {
        params: {
          texel: canvasSurface.texelSize,
          pointer: [-1, -1],
          aspect: 16 / 9,
          levels: LEVELS,
          line: LINE_CSS,
          intensity: 1,
          up: palette.up,
          down: palette.down,
          background: palette.background,
          foreground: palette.foreground,
          bumps: bumpArray(),
        },
      },
    });
    const dots = draw(gpu, {
      shader: dotsShader,
      label: "terrain-dots",
      vertices: 6,
      instances: POPULATION,
      blend: "alpha",
      set: {
        params: {
          texel: canvasSurface.texelSize,
          radius: DOT_RADIUS_CSS,
          intensity: 1,
          dot_color: palette.foreground,
          champion: palette.up,
          dots: dotArray(),
        },
      },
    });
    await map.compile({ colors: [canvasSurface.format] });
    await dots.compile({ colors: [canvasSurface.format] });
    if (disposed) {
      canvasSurface.dispose();
      return gpu.dispose();
    }

    let lastGeneration = -1;
    const loop = frameLoop(gpu, (frame) => {
      if (document.hidden) return;
      const width = options.canvas.clientWidth;
      const height = options.canvas.clientHeight;
      if (width === 0 || height === 0) return;
      // A tab coming back from the background reports one huge delta.
      const dt = Math.min(0.1, Math.max(0, time.deltaTime));
      landscape.aspect = width / height;
      landscape.step(dt);
      if (landscape.generation !== lastGeneration) {
        lastGeneration = landscape.generation;
        options.onTick?.(landscape);
      }

      const ease = 1 - Math.pow(1 - POINTER_EASE_PER_FRAME, dt * 60);
      if (pointer.inside) {
        const [x, y] = toUv(pointer.x, pointer.y);
        if (eased[0] < 0) [eased[0], eased[1]] = [x, y];
        eased[0] += (x - eased[0]) * ease;
        eased[1] += (y - eased[1]) * ease;
      } else {
        [eased[0], eased[1]] = [-1, -1];
      }

      const dpr = canvasSurface.dpr;
      map.set({
        params: {
          texel: canvasSurface.texelSize,
          pointer: [eased[0], eased[1]],
          aspect: landscape.aspect,
          levels: LEVELS,
          line: Math.max(1, LINE_CSS * dpr),
          intensity: 1,
          up: palette.up,
          down: palette.down,
          background: palette.background,
          foreground: palette.foreground,
          bumps: bumpArray(),
        },
      });
      dots.set({
        params: {
          texel: canvasSurface.texelSize,
          radius: DOT_RADIUS_CSS * dpr,
          intensity: 1,
          dot_color: palette.foreground,
          champion: palette.up,
          dots: dotArray(),
        },
      });
      frame.pass({ target: canvasSurface }, (pass) => {
        pass.draw(map);
        pass.draw(dots);
      });
    });

    cleanup = () => {
      loop.stop();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      canvasSurface.dispose();
      gpu.dispose();
    };
  })().catch((error) => {
    if (!disposed) options.onError?.(error);
  });

  return () => {
    disposed = true;
    cleanup?.();
  };
}

