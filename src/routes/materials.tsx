import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DiscoveryLab, ElectronicStructure, MDLab, MaterialRegistry, MaterialsDashboard, PropertyPredictor, StructureExplorer, ThermoLab } from "@/components/MaterialsLab";

export const Route = createFileRoute("/materials")({
  head: () => ({
    meta: [
      { title: "Materials Intelligence Center — W.O.O.H.O.O." },
      { name: "description", content: "Crystal structures, crystal graphs, ML property prediction, band structures, molecular dynamics, phase stability and AI material discovery." },
      { property: "og:title", content: "Materials Intelligence Center" },
      { property: "og:description", content: "AI-powered computational materials science in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const [runs, setRuns] = useState<string[]>([]);
  const log = (s: string) => setRuns((r) => [`${new Date().toLocaleTimeString()} · ${s}`, ...r].slice(0, 30));
  return (
    <main className="min-h-screen bg-cosmos text-foreground px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-primary">← Discovery Engine</Link>
        <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-glow">Materials Intelligence Center</h1>
        <p className="mt-3 text-muted-foreground">Explore atomic structures, predict material properties with uncertainty, simulate atoms in motion, probe electronic bands and phase stability, and generate new candidate materials.</p>
        <MaterialsDashboard runs={runs} />
        <StructureExplorer log={log} />
        <PropertyPredictor log={log} />
        <ElectronicStructure />
        <MDLab log={log} />
        <ThermoLab />
        <DiscoveryLab log={log} />
        <MaterialRegistry />
      </div>
    </main>
  );
}
