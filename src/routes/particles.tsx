import { createFileRoute, Link } from "@tanstack/react-router";
import { AnomalyQueue, EventExplorer, MassSpectrum, ParticleDashboard, StandardModelExplorer, useParticleDataset } from "@/components/ParticleLab";

export const Route = createFileRoute("/particles")({
  head: () => ({
    meta: [
      { title: "Particle Physics Intelligence Center — W.O.O.H.O.O." },
      { name: "description", content: "Collision event reconstruction, particle identification, jet clustering, mass spectra and rare event detection." },
      { property: "og:title", content: "Particle Physics Intelligence Center" },
      { property: "og:description", content: "Reconstruct collisions and hunt for rare events in a simulated particle detector." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParticlesPage,
});

function ParticlesPage() {
  const data = useParticleDataset();
  return (
    <main className="min-h-screen bg-cosmos text-foreground px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-primary">← Discovery Engine</Link>
        <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-glow">Particle Physics Intelligence Center</h1>
        <p className="mt-3 text-muted-foreground">Reconstruct proton–proton collisions, identify particles, rediscover the Z and Higgs bosons, and hunt for anomalies. All events are simulated and clearly labeled.</p>
        <ParticleDashboard data={data} />
        <EventExplorer />
        <MassSpectrum data={data} />
        <AnomalyQueue data={data} />
        <StandardModelExplorer />
      </div>
    </main>
  );
}
