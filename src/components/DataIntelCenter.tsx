import { useEffect, useMemo, useState } from "react";
import {
  DEMO_SOURCES, demoDatasets, newPipeline, step, cancel, retry, archive,
  canCancel, canRetry, canArchive, PIPELINE_STAGES, crossMatch, qualityScore,
  type Pipeline, type Dataset, type CatalogObject,
} from "@/lib/data-intel";

const KEY = "woohoo.dataintel.v1";

function load(): { pipelines: Pipeline[]; datasets: Dataset[] } {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* ignore */ }
  return {
    datasets: demoDatasets(),
    pipelines: [
      newPipeline("pl-001", "src-mast", "ds-tess-s42"),
      newPipeline("pl-002", "src-nea", "ds-nea-ps", 6),
      newPipeline("pl-003", "src-gaia", "ds-gaia-cone"),
    ],
  };
}

const stateTone: Record<string, string> = {
  Completed: "text-primary", Failed: "text-destructive", Running: "text-primary",
  Cancelled: "text-muted-foreground", Archived: "text-muted-foreground",
};

export function DataIntelCenter() {
  const [data, setData] = useState<{ pipelines: Pipeline[]; datasets: Dataset[] } | null>(null);
  const [auto, setAuto] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { setData(load()); }, []);
  useEffect(() => { if (data) localStorage.setItem(KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setData((d) => d && { ...d, pipelines: d.pipelines.map((p) => step(p)) }), 900);
    return () => clearInterval(t);
  }, [auto]);

  const upd = (id: string, fn: (p: Pipeline) => Pipeline) =>
    setData((d) => d && { ...d, pipelines: d.pipelines.map((p) => (p.id === id ? fn(p) : p)) });

  if (!data) return <div className="mt-8 h-40 rounded-2xl border panel animate-pulse" />;
  const { pipelines, datasets } = data;
  const active = pipelines.filter((p) => ["Validating", "Queued", "Running"].includes(p.state)).length;
  const failed = pipelines.filter((p) => p.state === "Failed").length;
  const obs = datasets.reduce((s, d) => s + d.observations, 0);

  const metrics = [
    ["Datasets", datasets.length], ["Sources", DEMO_SOURCES.length],
    ["Observations", obs.toLocaleString()], ["Active pipelines", active],
    ["Failed jobs", failed], ["Avg quality", Math.round(datasets.reduce((s, d) => s + d.quality, 0) / datasets.length)],
  ] as const;

  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Demo mode — all sources, datasets and pipelines are synthetic records saved in this browser.
      </p>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map(([k, v]) => (
          <div key={k} className="rounded-xl border panel p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-1 text-2xl font-semibold text-glow">{v}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Pipeline Manager</h2>
          <div className="flex gap-2 text-sm">
            <button className="rounded-md border px-3 py-1" onClick={() => setAuto((a) => !a)}>{auto ? "Pause" : "Resume"}</button>
            <button className="rounded-md bg-primary px-3 py-1 text-primary-foreground" onClick={() => {
              const ds = datasets[Math.floor(Math.random() * datasets.length)]!;
              setData({ ...data, pipelines: [newPipeline(`pl-${String(pipelines.length + 1).padStart(3, "0")}`, ds.sourceId, ds.id, Math.random() < 0.3 ? 7 : undefined), ...pipelines] });
            }}>+ New pipeline</button>
            <button className="rounded-md border px-3 py-1 text-muted-foreground" onClick={() => { localStorage.removeItem(KEY); setData(load()); }}>Reset demo</button>
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          {pipelines.map((p) => {
            const pct = p.state === "Completed" || p.state === "Archived" ? 100 : p.state === "Running" || p.state === "Failed" ? Math.round((p.stage / PIPELINE_STAGES.length) * 100) : 0;
            return (
              <li key={p.id} className="rounded-xl border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button className="text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
                    <span className="font-mono font-semibold">{p.id}</span>
                    <span className="ml-2 text-muted-foreground">{p.datasetId} · {p.volumeMB} MB</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${stateTone[p.state] ?? ""}`}>{p.state}</span>
                    {canCancel(p) && <button className="rounded border px-2 text-xs" onClick={() => upd(p.id, cancel)}>Cancel</button>}
                    {canRetry(p) && <button className="rounded border px-2 text-xs" onClick={() => upd(p.id, retry)}>Retry</button>}
                    {canArchive(p) && <button className="rounded border px-2 text-xs" onClick={() => upd(p.id, archive)}>Archive</button>}
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className={`h-full transition-all ${p.state === "Failed" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.state === "Running" ? `Stage ${p.stage + 1}/${PIPELINE_STAGES.length}: ${PIPELINE_STAGES[p.stage]}` : p.error ?? (p.outputs[0] ? `Output: ${p.outputs[0]}` : "")}
                </div>
                {open === p.id && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">{p.logs.join("\n") || "No logs yet"}</pre>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border panel p-5">
          <h2 className="text-lg font-semibold">Source Registry</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {DEMO_SOURCES.map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span>{s.name}<span className="block text-xs text-muted-foreground">{s.kind}</span></span>
                <span className={s.status === "Connected" ? "text-primary" : "text-destructive"}>{s.status}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border panel p-5">
          <h2 className="text-lg font-semibold">Dataset Intelligence</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[...datasets].sort((a, b) => b.updatedAt - a.updatedAt).map((d) => (
              <li key={d.id} className="flex justify-between gap-2">
                <span>{d.name}<span className="block text-xs text-muted-foreground">{d.observations.toLocaleString()} obs · {d.trainingReady ? "training-ready" : "needs review"}</span></span>
                <span className={d.quality >= 80 ? "text-primary" : "text-destructive"}>Q{d.quality}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <QualityLab />
      <CrossMatchLab />
    </div>
  );
}

function QualityLab() {
  const [text, setText] = useState("mag,period_d\n11.2,3.4\n12.8,\n31,2.1\n9.9,-4\n10.5,7.7");
  const report = useMemo(() => {
    const [head, ...lines] = text.trim().split("\n");
    const cols = (head ?? "").split(",").map((c) => c.trim());
    const rows = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v.trim() === "" ? null : Number(v)])));
    return qualityScore(rows, [{ name: "mag", min: -30, max: 30, unit: "mag" }, { name: "period_d", min: 0, unit: "days" }]);
  }, [text]);
  return (
    <section className="rounded-2xl border panel p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Data Quality Check</h2>
      <p className="text-sm text-muted-foreground">Paste CSV with <code>mag</code> and <code>period_d</code> columns; units and ranges are validated.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <textarea className="h-36 rounded-lg border bg-background p-2 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="text-sm">
          <div className="text-4xl font-semibold text-glow">{report.score}</div>
          <div className="text-muted-foreground">Completeness {(report.completeness * 100).toFixed(0)}% · Validity {(report.validity * 100).toFixed(0)}%</div>
          <ul className="mt-2 list-disc pl-5 text-xs">{report.issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function CrossMatchLab() {
  const [radius, setRadius] = useState(2);
  const A: CatalogObject[] = [
    { id: "TIC-1001", ra: 290.1, dec: 44.5 }, { id: "TIC-1002", ra: 291.4, dec: 42.2 },
    { id: "TIC-1003", ra: 288.9, dec: 46.0 }, { id: "TIC-1004", ra: 292.0, dec: 40.1 },
  ];
  const B: CatalogObject[] = [
    { id: "Gaia-77", ra: 290.1 + 0.4 / 3600, dec: 44.5 }, { id: "Gaia-78", ra: 291.4, dec: 42.2 + 1.5 / 3600 },
    { id: "Gaia-79", ra: 288.9, dec: 46.0 + 4 / 3600 },
  ];
  const matches = crossMatch(A, B, radius);
  return (
    <section className="rounded-2xl border panel p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Catalog Cross-Match</h2>
      <p className="text-sm text-muted-foreground">TESS input catalog ↔ Gaia (demo coordinates). Nearest neighbour within radius.</p>
      <label className="mt-3 flex items-center gap-3 text-sm">
        Radius {radius.toFixed(1)}″
        <input type="range" min={0.5} max={6} step={0.5} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
      </label>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr><th>TIC</th><th>Gaia</th><th>Sep</th></tr></thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.a} className="border-t">
              <td className="py-1 font-mono">{m.a}</td>
              <td className={m.b ? "text-primary" : "text-muted-foreground"}>{m.b ?? "no match"}</td>
              <td>{m.sepArcsec !== null ? `${m.sepArcsec.toFixed(2)}″` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
