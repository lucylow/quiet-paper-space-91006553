import { createFileRoute, Link } from "@tanstack/react-router";
import { TransitLab } from "@/components/TransitLab";
import { TaskRouter } from "@/components/TaskRouter";
import { MathLab } from "@/components/MathLab";
import { PinnLab } from "@/components/PinnLab";
import { ModelRegistry } from "@/components/ModelRegistry";
import { PhysicsSimLab } from "@/components/PhysicsSimLab";
import { QuantumLab } from "@/components/QuantumLab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "W.O.O.H.O.O. Discovery Engine — Explore Beyond the Known" },
      { name: "description", content: "AI-powered exoplanet transit discovery and light-curve analysis." },
      { property: "og:title", content: "W.O.O.H.O.O. Discovery Engine" },
      { property: "og:description", content: "Machine Learning Meets the Universe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-cosmos text-foreground px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm tracking-[0.3em] text-primary">WHERE ONLY OUR HEROES ORBIT OUTWARD</p>
        <h1 className="mt-3 text-4xl sm:text-6xl font-bold tracking-tight text-glow">W.O.O.H.O.O. Discovery Engine</h1>
        <p className="mt-3 text-muted-foreground">
          Explore Beyond the Known. Simulate a stellar light curve and detect planetary transits.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/data" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Open Data Intelligence Center →
          </Link>
          <Link to="/cosmology" className="inline-flex rounded-md border px-4 py-2 text-sm font-medium">
            Cosmology Intelligence Lab →
          </Link>
          <Link to="/particles" className="inline-flex rounded-md border px-4 py-2 text-sm font-medium">
            Particle Physics Center →
          </Link>
          <Link to="/materials" className="inline-flex rounded-md border px-4 py-2 text-sm font-medium">
            Materials Intelligence →
          </Link>
          <Link to="/plasma" className="inline-flex rounded-md border px-4 py-2 text-sm font-medium">
            Plasma & Fusion →
          </Link>
        </div>


        <TransitLab />
        <TaskRouter />
        <MathLab />
        <PinnLab />
        <PhysicsSimLab />
        <QuantumLab />
        <ModelRegistry />
      </div>
    </main>
  );
}
