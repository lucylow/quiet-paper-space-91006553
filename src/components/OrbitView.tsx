const ORBIT_PATH = "M100,90 A260,55 0 1,1 620,90 A260,55 0 1,1 100,90";

export function OrbitView({ period, radius }: { period: number; radius: number }) {
  return (
    <svg viewBox="0 0 720 180" className="mt-4 w-full" aria-label="Live orbit view">
      <defs>
        <radialGradient id="star">
          <stop offset="0%" stopColor="var(--chart-4)" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={ORBIT_PATH} fill="none" stroke="var(--border)" strokeDasharray="3 5" />
      <circle cx="360" cy="90" r="60" fill="url(#star)" />
      <circle cx="360" cy="90" r="26" fill="var(--chart-4)" />
      <circle r={4 + radius * 60} fill="var(--primary)">
        <animateMotion dur={`${period * 1.5}s`} repeatCount="indefinite" path={ORBIT_PATH} />
      </circle>
    </svg>
  );
}
