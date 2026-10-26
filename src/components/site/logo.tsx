// The mark: a dollar sign whose stem is a DNA double helix, one strand per
// colour of the map (green peaks, red pits), the S knocked out of it in the
// page colour. Same drawing as src/app/icon.svg, coloured from the theme.

const RUNGS = "M15.17 3.08H16.83M13.42 5.23H18.58M14.51 7.38H17.49M13.61 11.69H18.39M13.98 13.85H18.02M13.98 18.15H18.02M13.61 20.31H18.39M14.51 24.62H17.49M13.42 26.77H18.58M15.17 28.92H16.83";
const DOWN_STRAND = "M16.00 2.00 L15.27 2.50 L14.57 3.00 L13.94 3.50 L13.42 4.00 L13.03 4.50 L12.78 5.00 L12.70 5.50 L12.78 6.00 L13.03 6.50 L13.42 7.00 L13.94 7.50 L14.57 8.00 L15.27 8.50 L16.00 9.00 L16.73 9.50 L17.43 10.00 L18.06 10.50 L18.58 11.00 L18.97 11.50 L19.22 12.00 L19.30 12.50 L19.22 13.00 L18.97 13.50 L18.58 14.00 L18.06 14.50 L17.43 15.00 L16.73 15.50 L16.00 16.00 L15.27 16.50 L14.57 17.00 L13.94 17.50 L13.42 18.00 L13.03 18.50 L12.78 19.00 L12.70 19.50 L12.78 20.00 L13.03 20.50 L13.42 21.00 L13.94 21.50 L14.57 22.00 L15.27 22.50 L16.00 23.00 L16.73 23.50 L17.43 24.00 L18.06 24.50 L18.58 25.00 L18.97 25.50 L19.22 26.00 L19.30 26.50 L19.22 27.00 L18.97 27.50 L18.58 28.00 L18.06 28.50 L17.43 29.00 L16.73 29.50 L16.00 30.00";
const UP_STRAND = "M16.00 2.00 L16.73 2.50 L17.43 3.00 L18.06 3.50 L18.58 4.00 L18.97 4.50 L19.22 5.00 L19.30 5.50 L19.22 6.00 L18.97 6.50 L18.58 7.00 L18.06 7.50 L17.43 8.00 L16.73 8.50 L16.00 9.00 L15.27 9.50 L14.57 10.00 L13.94 10.50 L13.42 11.00 L13.03 11.50 L12.78 12.00 L12.70 12.50 L12.78 13.00 L13.03 13.50 L13.42 14.00 L13.94 14.50 L14.57 15.00 L15.27 15.50 L16.00 16.00 L16.73 16.50 L17.43 17.00 L18.06 17.50 L18.58 18.00 L18.97 18.50 L19.22 19.00 L19.30 19.50 L19.22 20.00 L18.97 20.50 L18.58 21.00 L18.06 21.50 L17.43 22.00 L16.73 22.50 L16.00 23.00 L15.27 23.50 L14.57 24.00 L13.94 24.50 L13.42 25.00 L13.03 25.50 L12.78 26.00 L12.70 26.50 L12.78 27.00 L13.03 27.50 L13.42 28.00 L13.94 28.50 L14.57 29.00 L15.27 29.50 L16.00 30.00";
const S = "M22 10C21 8 18.8 7 16 7C12.5 7 10 8.8 10 11.5C10 14.3 12.8 15.2 16 16C19.2 16.8 22.2 17.8 22.2 20.6C22.2 23.4 19.5 25 16 25C13 25 10.8 24 9.8 22";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={RUNGS} stroke="var(--muted-foreground)" strokeWidth={1.1} opacity={0.7} />
      <path d={DOWN_STRAND} stroke="var(--down)" strokeWidth={1.7} />
      <path d={UP_STRAND} stroke="var(--up)" strokeWidth={1.7} />
      <path d={S} stroke="var(--background)" strokeWidth={4.4} />
      <path d={S} stroke="var(--foreground)" strokeWidth={2.6} />
    </svg>
  );
}
