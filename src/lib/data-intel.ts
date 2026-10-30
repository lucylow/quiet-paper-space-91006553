// Scientific Data Intelligence core: pipelines, sources, datasets, quality, cross-matching.
// All demo records are synthetic and flagged `synthetic: true`.

export const PIPELINE_STAGES = [
  "Source registration",
  "Authentication",
  "Data retrieval",
  "File inspection",
  "Metadata extraction",
  "Schema validation",
  "Quality evaluation",
  "Transformation",
  "Version creation",
  "Storage",
  "Indexing",
  "AI availability",
  "Experiment integration",
] as const;

export type PipelineState =
  | "Draft" | "Configured" | "Validating" | "Queued" | "Running"
  | "Completed" | "Failed" | "Cancelled" | "Archived";

export interface Pipeline {
  id: string;
  sourceId: string;
  datasetId: string;
  config: { failAtStage?: number | undefined };
  state: PipelineState;
  stage: number; // index into PIPELINE_STAGES
  logs: string[];
  error?: string | undefined;
  volumeMB: number;
  startedAt?: number;
  completedAt?: number | undefined;
  outputs: string[];
  attempts: number;
}

const ACTIVE: PipelineState[] = ["Validating", "Queued", "Running"];

export function canCancel(p: Pipeline) { return ACTIVE.includes(p.state); }
export function canRetry(p: Pipeline) { return p.state === "Failed" || p.state === "Cancelled"; }
export function canArchive(p: Pipeline) { return ["Completed", "Failed", "Cancelled"].includes(p.state); }

const log = (p: Pipeline, msg: string, now: number): Pipeline => ({
  ...p, logs: [...p.logs, `[${new Date(now).toISOString().slice(11, 19)}] ${msg}`],
});

/** Advance a pipeline by one step of its lifecycle. Pure. */
export function step(p: Pipeline, now = Date.now()): Pipeline {
  switch (p.state) {
    case "Draft": return log({ ...p, state: "Configured" }, "Configuration saved", now);
    case "Configured": return log({ ...p, state: "Validating" }, "Validating source & config", now);
    case "Validating": return log({ ...p, state: "Queued" }, "Validation passed, queued", now);
    case "Queued":
      return log({ ...p, state: "Running", stage: 0, startedAt: now, error: undefined }, `Started: ${PIPELINE_STAGES[0]}`, now);
    case "Running": {
      if (p.config.failAtStage === p.stage && p.attempts === 0) {
        const err = `Stage "${PIPELINE_STAGES[p.stage]}" failed`;
        return log({ ...p, state: "Failed", error: err, completedAt: now }, err, now);
      }
      const next = p.stage + 1;
      if (next >= PIPELINE_STAGES.length) {
        return log({ ...p, state: "Completed", completedAt: now, outputs: [`lake://datasets/${p.datasetId}/v${p.attempts + 1}`] }, "Pipeline completed", now);
      }
      return log({ ...p, stage: next }, `Stage: ${PIPELINE_STAGES[next]}`, now);
    }
    default: return p;
  }
}

export function cancel(p: Pipeline, now = Date.now()): Pipeline {
  if (!canCancel(p)) return p;
  return log({ ...p, state: "Cancelled", completedAt: now }, "Cancelled by user", now);
}
export function retry(p: Pipeline, now = Date.now()): Pipeline {
  if (!canRetry(p)) return p;
  return log({ ...p, state: "Queued", attempts: p.attempts + 1, error: undefined, completedAt: undefined }, `Retry #${p.attempts + 1}`, now);
}
export function archive(p: Pipeline, now = Date.now()): Pipeline {
  if (!canArchive(p)) return p;
  return log({ ...p, state: "Archived" }, "Archived", now);
}

// ---------- Sources & datasets ----------
export interface DataSource {
  id: string; name: string; kind: "Astronomy API" | "Research API" | "File Upload" | "Simulation";
  auth: boolean; status: "Connected" | "Degraded" | "Offline"; synthetic: boolean;
}
export interface Dataset {
  id: string; name: string; sourceId: string; observations: number;
  quality: number; trainingReady: boolean; updatedAt: number; synthetic: boolean;
}

// ---------- Quality ----------
export interface ColumnRule { name: string; min?: number; max?: number; unit?: string }
export interface QualityReport { completeness: number; validity: number; score: number; issues: string[] }

/** Score 0–100: average of completeness (non-null) and validity (within range). */
export function qualityScore(rows: Record<string, number | null>[], rules: ColumnRule[]): QualityReport {
  let cells = 0, present = 0, valid = 0;
  const issues: string[] = [];
  for (const r of rules) {
    let miss = 0, bad = 0;
    for (const row of rows) {
      cells++;
      const v = row[r.name];
      if (v === null || v === undefined || Number.isNaN(v)) { miss++; continue; }
      present++;
      if ((r.min !== undefined && v < r.min) || (r.max !== undefined && v > r.max)) bad++; else valid++;
    }
    if (miss) issues.push(`${r.name}: ${miss} missing`);
    if (bad) issues.push(`${r.name}: ${bad} out of range${r.unit ? ` (${r.unit})` : ""}`);
  }
  const completeness = cells ? present / cells : 0;
  const validity = present ? valid / present : 0;
  return { completeness, validity, score: Math.round(((completeness + validity) / 2) * 100), issues };
}

// ---------- Cross-matching ----------
export interface CatalogObject { id: string; ra: number; dec: number } // degrees

/** Great-circle separation in arcseconds (haversine). */
export function angularSeparationArcsec(a: CatalogObject, b: CatalogObject): number {
  const r = Math.PI / 180;
  const dDec = (b.dec - a.dec) * r, dRa = (b.ra - a.ra) * r;
  const h = Math.sin(dDec / 2) ** 2 + Math.cos(a.dec * r) * Math.cos(b.dec * r) * Math.sin(dRa / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h))) * 180 / Math.PI) * 3600;
}

export interface Match { a: string; b: string | null; sepArcsec: number | null }

/** Nearest-neighbour match of each object in A to B within `radiusArcsec`. */
export function crossMatch(A: CatalogObject[], B: CatalogObject[], radiusArcsec: number): Match[] {
  return A.map((a) => {
    let best: CatalogObject | null = null, bestSep = Infinity;
    for (const b of B) {
      const s = angularSeparationArcsec(a, b);
      if (s < bestSep) { bestSep = s; best = b; }
    }
    return best && bestSep <= radiusArcsec
      ? { a: a.id, b: best.id, sepArcsec: bestSep }
      : { a: a.id, b: null, sepArcsec: null };
  });
}

// ---------- Demo seed ----------
export const DEMO_SOURCES: DataSource[] = [
  { id: "src-mast", name: "MAST (TESS/Kepler) — demo", kind: "Astronomy API", auth: false, status: "Connected", synthetic: true },
  { id: "src-gaia", name: "Gaia DR3 — demo", kind: "Astronomy API", auth: false, status: "Connected", synthetic: true },
  { id: "src-nea", name: "NASA Exoplanet Archive — demo", kind: "Research API", auth: false, status: "Degraded", synthetic: true },
  { id: "src-sim", name: "Physics Sim Studio", kind: "Simulation", auth: false, status: "Connected", synthetic: true },
  { id: "src-up", name: "User uploads", kind: "File Upload", auth: true, status: "Connected", synthetic: true },
];

export function demoDatasets(now = Date.now()): Dataset[] {
  return [
    { id: "ds-tess-s42", name: "TESS Sector 42 light curves", sourceId: "src-mast", observations: 1_284_000, quality: 94, trainingReady: true, updatedAt: now - 3_600_000, synthetic: true },
    { id: "ds-gaia-cone", name: "Gaia cone · Kepler field", sourceId: "src-gaia", observations: 412_530, quality: 88, trainingReady: true, updatedAt: now - 86_400_000, synthetic: true },
    { id: "ds-nea-ps", name: "Confirmed planets table", sourceId: "src-nea", observations: 5_600, quality: 71, trainingReady: false, updatedAt: now - 7 * 86_400_000, synthetic: true },
    { id: "ds-sim-nbody", name: "N-body orbit runs", sourceId: "src-sim", observations: 90_000, quality: 99, trainingReady: true, updatedAt: now - 600_000, synthetic: true },
    { id: "ds-up-spec", name: "Uploaded spectra batch", sourceId: "src-up", observations: 2_310, quality: 58, trainingReady: false, updatedAt: now - 2 * 86_400_000, synthetic: true },
  ];
}

export function newPipeline(id: string, sourceId: string, datasetId: string, failAtStage?: number): Pipeline {
  return { id, sourceId, datasetId, config: { failAtStage }, state: "Draft", stage: 0, logs: [], volumeMB: Math.round(50 + Math.random() * 950), outputs: [], attempts: 0 };
}
