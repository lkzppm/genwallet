// The mark: a dollar sign drawn as a DNA double helix. Its two strands are
// the letter's two strokes: the S, and the stem it winds around (green),
// joined by rungs (red). The S passes over the stem at the top and bottom
// crossings and under it in the middle, so the pair twists. Same drawing as
// src/app/icon.svg, which is the paper version; here the S takes the text
// colour, so it is black on paper and light at night.

const RUNGS = "M15.10 9.00H10.56M15.10 10.80H9.55M15.10 12.60H9.74M15.10 14.20H10.93M15.10 22.60H10.37M16.90 17.80H21.07M16.90 19.40H22.26M16.90 21.20H22.45M16.90 23.00H21.44M16.90 9.40H21.63";
const STEM = "M16 1.6V30.4";
/** The stretch of stem that passes in front of the S at the middle crossing. */
const STEM_FRONT = "M16 14V18";
const S = "M22.53 9.19 L22.36 9.00 L22.18 8.81 L21.98 8.63 L21.77 8.46 L21.55 8.29 L21.31 8.13 L21.06 7.97 L20.80 7.83 L20.54 7.69 L20.26 7.56 L19.97 7.43 L19.67 7.32 L19.36 7.21 L19.05 7.12 L18.73 7.03 L18.41 6.96 L18.08 6.89 L17.74 6.83 L17.40 6.78 L17.06 6.75 L16.71 6.72 L16.37 6.71 L16.02 6.70 L15.67 6.70 L15.33 6.72 L14.98 6.74 L14.64 6.78 L14.30 6.83 L13.96 6.88 L13.63 6.95 L13.31 7.02 L12.98 7.11 L12.67 7.20 L12.36 7.31 L12.07 7.42 L11.78 7.54 L11.50 7.67 L11.23 7.81 L10.97 7.96 L10.72 8.11 L10.48 8.27 L10.25 8.44 L10.04 8.61 L9.84 8.79 L9.66 8.98 L9.49 9.17 L9.33 9.37 L9.18 9.57 L9.06 9.77 L8.94 9.98 L8.85 10.19 L8.77 10.41 L8.70 10.63 L8.65 10.84 L8.62 11.06 L8.60 11.28 L8.60 11.50 L8.62 11.72 L8.65 11.94 L8.70 12.16 L8.76 12.38 L8.84 12.59 L8.94 12.81 L9.05 13.01 L9.18 13.22 L9.32 13.42 L9.48 13.62 L9.65 13.81 L9.83 14.00 L10.03 14.18 L10.24 14.35 L10.47 14.52 L10.70 14.68 L10.95 14.84 L11.21 14.98 L11.48 15.12 L11.76 15.25 L12.05 15.37 L12.35 15.49 L12.65 15.59 L12.97 15.69 L13.29 15.77 L13.61 15.85 L13.94 15.91 L14.28 15.97 L14.62 16.02 L14.96 16.05 L15.31 16.08 L15.65 16.09 L16.00 16.10 L16.35 15.91 L16.69 15.92 L17.04 15.95 L17.38 15.98 L17.72 16.03 L18.06 16.09 L18.39 16.15 L18.71 16.23 L19.03 16.31 L19.35 16.41 L19.65 16.51 L19.95 16.63 L20.24 16.75 L20.52 16.88 L20.79 17.02 L21.05 17.16 L21.30 17.32 L21.53 17.48 L21.76 17.65 L21.97 17.82 L22.17 18.00 L22.35 18.19 L22.52 18.38 L22.68 18.58 L22.82 18.78 L22.95 18.99 L23.06 19.19 L23.16 19.41 L23.24 19.62 L23.30 19.84 L23.35 20.06 L23.38 20.28 L23.40 20.50 L23.40 20.72 L23.38 20.94 L23.35 21.16 L23.30 21.37 L23.23 21.59 L23.15 21.81 L23.06 22.02 L22.94 22.23 L22.82 22.43 L22.67 22.63 L22.51 22.83 L22.34 23.02 L22.16 23.21 L21.96 23.39 L21.75 23.56 L21.52 23.73 L21.28 23.89 L21.03 24.04 L20.77 24.19 L20.50 24.33 L20.22 24.46 L19.93 24.58 L19.64 24.69 L19.33 24.80 L19.02 24.89 L18.69 24.98 L18.37 25.05 L18.04 25.12 L17.70 25.17 L17.36 25.22 L17.02 25.26 L16.67 25.28 L16.33 25.30 L15.98 25.30 L15.63 25.29 L15.29 25.28 L14.94 25.25 L14.60 25.22 L14.26 25.17 L13.92 25.11 L13.59 25.04 L13.27 24.97 L12.95 24.88 L12.64 24.79 L12.33 24.68 L12.03 24.57 L11.74 24.44 L11.46 24.31 L11.20 24.17 L10.94 24.03 L10.69 23.87 L10.45 23.71 L10.23 23.54 L10.02 23.37 L9.82 23.19 L9.64 23.00 L9.47 22.81";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={RUNGS} stroke="var(--down)" strokeWidth={1.35} />
      <path d={STEM} stroke="var(--up)" strokeWidth={1.9} />
      <path d={S} stroke="var(--background)" strokeWidth={4.3} />
      <path d={S} stroke="var(--foreground)" strokeWidth={2.4} />
      <path d={STEM_FRONT} stroke="var(--background)" strokeWidth={3.8} />
      <path d={STEM_FRONT} stroke="var(--up)" strokeWidth={1.9} />
    </svg>
  );
}
