import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DisruptionLab, FusionLab, MHDLab, OrbitLab, PICLab, PlasmaDashboard, PlasmaState, WavesLab } from "@/components/PlasmaLab";

export const Route = createFileRoute("/plasma")({
  head: () => ({
    meta: [
      { title: "Plasma & Fusion Intelligence Center — W.O.O.H.O.O." },
      { name: "description", content: "Plasma parameters, particle orbits, MHD shocks, kinetic PIC, turbulence spectra, fusion power balance and disruption prediction." },
      { property: "og:title", content: "Plasma & Fusion Intelligence Center" },
      { property: "og:description", content: "Simulate plasmas and fusion reactors in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlasmaPage,
});

function PlasmaPage() {
  const [runs, setRuns] = useState<string[]>([]);
  const log = (s: string) => setRuns((r) => [`${new Date().toLocaleTimeString()} · ${s}`, ...r].slice(0, 30));
  return (
    <main className="min-h-screen bg-cosmos text-foreground px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-primary">← Discovery Engine</Link>
        <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-glow">Plasma & Fusion Intelligence Center</h1>
        <p className="mt-3 text-muted-foreground">Explore plasma scales, trace charged particles, run magnetohydrodynamic and kinetic simulations, analyze turbulence, test fusion reactor scenarios and predict disruptions.</p>
        <PlasmaDashboard runs={runs} />
        <PlasmaState />
        <OrbitLab />
        <MHDLab log={log} />
        <PICLab log={log} />
        <WavesLab />
        <FusionLab log={log} />
        <DisruptionLab />
      </div>
    </main>
  );
}
