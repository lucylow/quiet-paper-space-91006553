import { useMemo, useState } from "react";
import {
  ECAL_R, HCAL_R, LAYERS, MUON_R, SM_KINDS, STANDARD_MODEL, anomalyScore, antiKt, conservationCheck, eventFeatures,
  generateDataset, generateEvent, hitPhi, identify, radiusFromPt, reconstructTracks, referenceStats, trackingEfficiency, truthClass,
  type CollisionEvent, type EventKind,
} from "@/lib/particle-physics";

const Synthetic = () => <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Synthetic demo data</span>;
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-3 text-sm">{label}<div className="font-mono text-lg">{value}</div></div>;
}
function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{title}</h2><Synthetic /></div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {children}
    </section>
  );
}

const COLORS: Record<string, string> = {
  electron: "var(--chart-4)", muon: "var(--destructive)", photon: "var(--chart-5)", pion: "var(--primary)", kaon: "var(--chart-2)", proton: "var(--chart-1)", neutron: "var(--muted-foreground)",
};

/** Transverse (x–y) event display: tracker helices, calorimeter towers, muon hits. */
export function EventDisplay({ ev, showReco }: { ev: CollisionEvent; showReco: boolean }) {
  const S = 120, size = 2 * MUON_R * S + 40, c = size / 2;
  const xy = (r: number, phi: number) => [c + r * S * Math.cos(phi), c - r * S * Math.sin(phi)] as const;
  const tracks = useMemo(() => reconstructTracks(ev.hits), [ev]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-md rounded-lg bg-background/40">
      {[ECAL_R, HCAL_R, MUON_R].map((r) => <circle key={r} cx={c} cy={c} r={r * S} fill="none" stroke="var(--border)" />)}
      {LAYERS.map((r) => <circle key={r} cx={c} cy={c} r={r * S} fill="none" stroke="var(--border)" strokeOpacity={0.4} />)}
      {ev.particles.map((p) => {
        const col = COLORS[p.species];
        const [ex, ey] = xy(ECAL_R + Math.min(0.4, p.ecal / 40), p.phi), [e0x, e0y] = xy(ECAL_R, p.phi);
        const [hx, hy] = xy(HCAL_R + Math.min(0.6, p.hcal / 40), p.phi), [h0x, h0y] = xy(HCAL_R, p.phi);
        let path = "";
        if (p.charge) {
          const R = radiusFromPt(p.pt);
          const pts = Array.from({ length: 40 }, (_, i) => (i / 39) * Math.min(ECAL_R, 2 * R * 0.999));
          path = pts.map((r, i) => { const [x, y] = xy(r, hitPhi(p.phi, p.charge, R, r)); return `${i ? "L" : "M"}${x},${y}`; }).join("");
        } else {
          const [x, y] = xy(ECAL_R, p.phi); path = `M${c},${c}L${x},${y}`;
        }
        return (
          <g key={p.id}>
            <path d={path} fill="none" stroke={col} strokeWidth={1.5} strokeDasharray={p.charge ? undefined : "4 3"} opacity={showReco ? 0.35 : 0.9} />
            {p.ecal > 0.5 && <line x1={e0x} y1={e0y} x2={ex} y2={ey} stroke="var(--chart-4)" strokeWidth={6} />}
            {p.hcal > 0.5 && <line x1={h0x} y1={h0y} x2={hx} y2={hy} stroke="var(--chart-2)" strokeWidth={8} opacity={0.7} />}
            {p.muonHits > 0 && <circle cx={xy(MUON_R, p.phi)[0]} cy={xy(MUON_R, p.phi)[1]} r={5} fill="var(--destructive)" />}
          </g>
        );
      })}
      {showReco && tracks.map((t, i) => (
        <path key={i} d={t.hits.map((h, j) => { const [x, y] = xy(h.r, h.phi); return `${j ? "L" : "M"}${x},${y}`; }).join("")} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />
      ))}
      {ev.hits.map((h) => { const [x, y] = xy(h.r, h.phi); return <circle key={h.id} cx={x} cy={y} r={1.5} fill="var(--foreground)" />; })}
    </svg>
  );
}

export function ParticleDashboard({ data }: { data: CollisionEvent[] }) {
  const s = useMemo(() => {
    let eff = 0, pidOk = 0, pidN = 0;
    data.forEach((ev) => {
      eff += trackingEfficiency(ev, reconstructTracks(ev.hits)).efficiency;
      ev.particles.forEach((p) => { pidN++; if (identify(p).label === truthClass(p.species, p.charge)) pidOk++; });
    });
    return { eff: eff / data.length, pid: pidOk / pidN, hits: data.reduce((a, e) => a + e.hits.length, 0) };
  }, [data]);
  return (
    <Section title="Research Overview" desc="Live metrics computed from the loaded event sample — every number below comes from running the reconstruction and identification models.">
      <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Stat label="Events loaded" value={String(data.length)} />
        <Stat label="Tracker hits" value={s.hits.toLocaleString()} />
        <Stat label="Tracking efficiency" value={`${(s.eff * 100).toFixed(1)}%`} />
        <Stat label="Particle ID accuracy" value={`${(s.pid * 100).toFixed(1)}%`} />
      </div>
    </Section>
  );
}

export function EventExplorer() {
  const [kind, setKind] = useState<EventKind>("Z→μμ");
  const [seed, setSeed] = useState(7);
  const [reco, setReco] = useState(true);
  const ev = useMemo(() => generateEvent(kind, seed), [kind, seed]);
  const tracks = useMemo(() => reconstructTracks(ev.hits), [ev]);
  const eff = trackingEfficiency(ev, tracks);
  const f = eventFeatures(ev);
  const jets = antiKt(ev.particles);
  return (
    <Section title="Collision Event Explorer" desc="Generate a proton–proton collision, reconstruct its charged tracks from detector hits in a 3.8 T magnetic field, and measure momentum from track curvature (pT = 0.3·B·R).">
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[...SM_KINDS, "anomalous" as const].map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-md border px-3 py-1 text-sm ${k === kind ? "bg-primary text-primary-foreground" : ""}`}>{k}</button>
        ))}
        <button onClick={() => setSeed((s) => s + 1)} className="rounded-md border px-3 py-1 text-sm">New event ↻</button>
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={reco} onChange={(e) => setReco(e.target.checked)} /> Show reconstructed tracks</label>
      </div>
      <p className="mt-2 font-mono text-xs text-muted-foreground">{ev.id} · {ev.kind}</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <EventDisplay ev={ev} showReco={reco} />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Tracks found" value={`${tracks.length}`} />
            <Stat label="Efficiency" value={`${(eff.efficiency * 100).toFixed(0)}%`} />
            <Stat label="Leading-pair mass" value={f.leadingMass ? `${f.leadingMass.toFixed(1)} GeV` : "—"} />
            <Stat label="Jets (anti-kT 0.4)" value={String(jets.length)} />
          </div>
          <ul className="space-y-1 text-sm">
            {conservationCheck(ev).map((c) => <li key={c.law}>{c.ok ? "✓" : "⚠"} <b>{c.law}</b> — {c.detail}</li>)}
          </ul>
          <p className="text-xs text-muted-foreground">Legend: solid lines = charged tracks, dashed = neutral, yellow bars = ECAL energy, teal = HCAL energy, red dots = muon chamber hits.</p>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground"><tr><th>True particle</th><th>pT true</th><th>pT reco</th><th>Model says</th><th>Confidence</th></tr></thead>
          <tbody>
            {ev.particles.filter((p) => p.pt > 2).sort((a, b) => b.pt - a.pt).slice(0, 12).map((p) => {
              const t = tracks.find((t) => t.truth === p.id);
              const id = identify(p);
              const ok = id.label === truthClass(p.species, p.charge);
              return (
                <tr key={p.id} className="border-t font-mono">
                  <td style={{ color: COLORS[p.species] }}>{p.species}{p.charge > 0 ? "⁺" : p.charge < 0 ? "⁻" : ""}</td>
                  <td>{p.pt.toFixed(1)}</td><td>{t ? t.pt.toFixed(1) : "—"}</td>
                  <td>{ok ? "✓" : "✗"} {id.label}</td><td>{(id.confidence * 100).toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function MassSpectrum({ data }: { data: CollisionEvent[] }) {
  const bins = 60, max = 150;
  const masses = data.map((e) => eventFeatures(e).leadingMass).filter((m) => m > 0 && m < max);
  const h = Array(bins).fill(0) as number[];
  masses.forEach((m) => { const i = Math.floor((m / max) * bins); h[i] = (h[i] ?? 0) + 1; });
  const top = Math.max(1, ...h);
  return (
    <Section title="Invariant Mass Spectrum" desc="Mass of the two leading leptons or photons in each event. The Z boson (91 GeV) and Higgs boson (125 GeV) appear as peaks — the same way they were discovered.">
      <svg viewBox="0 0 600 200" className="mt-4 w-full rounded-lg bg-background/40">
        {h.map((v, i) => <rect key={i} x={i * 10} y={190 - (v / top) * 175} width={9} height={(v / top) * 175} fill="var(--primary)" />)}
        {[91.19, 125.1].map((m) => <line key={m} x1={(m / max) * 600} x2={(m / max) * 600} y1={0} y2={190} stroke="var(--destructive)" strokeDasharray="3 3" />)}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">0–150 GeV · dashed lines mark the known Z and Higgs masses · {masses.length} events</p>
    </Section>
  );
}

export function AnomalyQueue({ data }: { data: CollisionEvent[] }) {
  const [threshold, setThreshold] = useState(3);
  const ranked = useMemo(() => {
    const ref = referenceStats(data.filter((e) => e.kind !== "anomalous").map(eventFeatures));
    return data.map((e) => ({ e, ...anomalyScore(eventFeatures(e), ref) })).sort((a, b) => b.score - a.score);
  }, [data]);
  const flagged = ranked.filter((r) => r.score >= threshold);
  const tp = flagged.filter((r) => r.e.kind === "anomalous").length;
  const totalAnom = data.filter((e) => e.kind === "anomalous").length;
  return (
    <Section title="Rare Event Review Queue" desc="Events scored against the Standard Model reference sample. Hidden in the data are injected heavy-resonance events (≈750 GeV) — can the detector find them?">
      <label className="mt-4 block text-xs text-muted-foreground">Anomaly threshold (σ): <span className="font-mono text-foreground">{threshold}</span>
        <input type="range" min={1} max={8} step={0.5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full" />
      </label>
      <div className="mt-3 grid gap-3 grid-cols-3">
        <Stat label="Flagged" value={String(flagged.length)} />
        <Stat label="Recall" value={totalAnom ? `${((tp / totalAnom) * 100).toFixed(0)}%` : "—"} />
        <Stat label="Precision" value={flagged.length ? `${((tp / flagged.length) * 100).toFixed(0)}%` : "—"} />
      </div>
      <ul className="mt-4 space-y-1 font-mono text-sm">
        {ranked.slice(0, 8).map((r) => (
          <li key={r.e.id} className="flex justify-between border-t pt-1">
            <span>{r.e.id}</span><span className="text-muted-foreground">driver: {r.driver}</span>
            <span>{r.score.toFixed(1)}σ {r.score >= threshold ? "⚑" : ""}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Ground-truth labels are only used to compute recall and precision; the scorer never sees them.</p>
    </Section>
  );
}

export function StandardModelExplorer() {
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Standard Model Reference</h2>
      <p className="text-sm text-muted-foreground">Measured values (PDG) used by the engine's kinematics.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {STANDARD_MODEL.map((p) => (
          <div key={p.name} className="rounded-xl border p-3 text-sm">
            <div className="flex justify-between"><b>{p.name}</b><span className="font-mono text-primary">{p.sym}</span></div>
            <div className="text-xs text-muted-foreground">{p.type} · {p.mass} · q {p.charge} · spin {p.spin}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function useParticleDataset() {
  return useMemo(() => generateDataset(400, 11, 0.03), []);
}
