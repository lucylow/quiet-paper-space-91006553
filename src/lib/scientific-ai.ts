/**
 * Scientific AI Core — shared intelligence layer for W.O.O.H.O.O.
 *
 * Implements the model abstraction and task-routing contracts from
 * Master Development Prompt 04. Routing is currently rule-based
 * (demonstration mode); the interfaces are provider-agnostic so a live
 * backend adapter can be plugged in without changing consumers.
 */

export type ScientificTask =
  | "scientific_question"
  | "data_analysis"
  | "image_analysis"
  | "time_series_analysis"
  | "prediction"
  | "equation_analysis"
  | "physical_simulation"
  | "research_assistance";

export interface ScientificAIRequest {
  task: ScientificTask;
  domain: string;
  inputs: Record<string, unknown>;
  datasetId?: string;
  modelId?: string;
  experimentId?: string;
  responseMode?: "explorer" | "research" | "developer";
}

export interface ScientificAIResponse {
  requestId: string;
  status: "completed" | "processing" | "failed";
  modelId?: string;
  modelVersion?: string;
  answer?: string;
  predictions?: Record<string, unknown>;
  confidence?: number;
  uncertainty?: Record<string, unknown>;
  evidence?: Array<{ source: string; reference?: string }>;
  limitations?: string[];
}

export interface ModelCard {
  id: string;
  version: string;
  family: string;
  modalities: string[];
  disciplines: string[];
  inputSchema: string;
  outputSchema: string;
  license: string;
  status: "demo" | "planned";
  limitations: string;
}

/** Compatibility registry — every model declares what it can and cannot do. */
export const MODEL_REGISTRY: ModelCard[] = [
  {
    id: "transit-detector",
    version: "0.4.0-demo",
    family: "Temporal CNN (planned)",
    modalities: ["time-series"],
    disciplines: ["astrophysics", "exoplanets"],
    inputSchema: "{ time: number[], flux: number[] }",
    outputSchema: "{ dips: number[], depth: number, snr: number, period: number | null }",
    license: "MIT",
    status: "demo",
    limitations: "Threshold-based dip finder; no stellar-variability rejection yet.",
  },
  {
    id: "orbit-integrator",
    version: "0.2.0-demo",
    family: "Numerical integrator",
    modalities: ["simulation"],
    disciplines: ["orbital mechanics"],
    inputSchema: "{ periodDays: number, planetStarRadius: number }",
    outputSchema: "{ trajectory: [x, y][] }",
    license: "MIT",
    status: "demo",
    limitations: "Circular two-body approximation; no relativity, no n-body.",
  },
  {
    id: "pinn-lab",
    version: "0.1.0-demo",
    family: "Physics-informed network (simulated)",
    modalities: ["time-series", "simulation"],
    disciplines: ["computational physics"],
    inputSchema: "{ physicsWeight: number, epochs: number }",
    outputSchema: "{ prediction: number[], mse: number }",
    license: "MIT",
    status: "demo",
    limitations: "Closed-form stand-in for training; illustrates physics-weight effect only.",
  },
  {
    id: "math-engine",
    version: "1.0.0",
    family: "Expression parser + numerical methods",
    modalities: ["equations"],
    disciplines: ["mathematics", "all"],
    inputSchema: "{ expression: string, variable: 'x' }",
    outputSchema: "{ value: number, derivative: number }",
    license: "MIT",
    status: "demo",
    limitations: "Numerical differentiation; no symbolic simplification or units yet.",
  },
  {
    id: "task-router",
    version: "1.1.0",
    family: "Weighted keyword classifier",
    modalities: ["text"],
    disciplines: ["all"],
    inputSchema: "{ query: string }",
    outputSchema: "{ task, tool, flow, confidence, alternatives }",
    license: "MIT",
    status: "demo",
    limitations: "Rule-based scoring; a learned classifier is planned.",
  },
];

interface RouteRule {
  re: RegExp;
  weight: number;
  task: ScientificTask;
  domain: string;
  tool: string;
  flow: string;
}

const RULES: RouteRule[] = [
  { re: /transit|exoplanet|light[- ]curve/i, weight: 3, task: "time_series_analysis", domain: "astrophysics", tool: "Light-curve detector (Transit Lab)", flow: "Data AI → time-series encoder → transit scorer" },
  { re: /planet|star|stellar/i, weight: 2, task: "time_series_analysis", domain: "astrophysics", tool: "Light-curve detector (Transit Lab)", flow: "Data AI → time-series encoder → transit scorer" },
  { re: /orbit|kepler|trajectory/i, weight: 3, task: "physical_simulation", domain: "orbital mechanics", tool: "Orbit integrator (numerical)", flow: "Reasoning AI → physics engine → state tracker" },
  { re: /gravity|gravitational|force/i, weight: 2, task: "physical_simulation", domain: "classical mechanics", tool: "Orbit integrator (numerical)", flow: "Reasoning AI → physics engine → state tracker" },
  { re: /quantum|qubit|circuit/i, weight: 3, task: "physical_simulation", domain: "quantum mechanics", tool: "Quantum simulator", flow: "Model AI → state-vector simulator" },
  { re: /equation|derivative|integral|solve|simplify/i, weight: 3, task: "equation_analysis", domain: "mathematics", tool: "Math engine (symbolic/numeric)", flow: "Reasoning AI → validated math tools" },
  { re: /forecast|predict|estimate|regression/i, weight: 3, task: "prediction", domain: "machine learning", tool: "Regression + uncertainty model", flow: "Predictive AI → forecaster → confidence bands" },
  { re: /image|galaxy|lens|segmentation/i, weight: 3, task: "image_analysis", domain: "cosmology", tool: "Vision encoder (CNN/ViT)", flow: "Data AI → image encoder → classifier" },
  { re: /anomal|outlier|spike|drift/i, weight: 3, task: "data_analysis", domain: "statistics", tool: "Anomaly detector", flow: "Data AI → statistics → threshold scorer" },
  { re: /dataset|csv|data quality|schema/i, weight: 2, task: "data_analysis", domain: "data engineering", tool: "Dataset inspector", flow: "Data AI → schema validation → quality report" },
  { re: /paper|literature|citation|research/i, weight: 2, task: "research_assistance", domain: "literature", tool: "Scientific assistant (general LLM)", flow: "Reasoning AI → literature retrieval" },
];

export interface TaskClassification {
  task: ScientificTask;
  domain: string;
  tool: string;
  flow: string;
  /** 0–1: share of the winning rule's score over total matched score. */
  confidence: number;
  matchedKeywords: string[];
  alternatives: Array<{ task: ScientificTask; tool: string; score: number }>;
}

const FALLBACK: Omit<TaskClassification, "confidence" | "matchedKeywords" | "alternatives"> = {
  task: "research_assistance",
  domain: "general",
  tool: "Scientific assistant (general LLM)",
  flow: "Reasoning AI → literature retrieval",
};

/**
 * Weighted keyword classifier. Every matching rule contributes its weight to
 * its (task, tool) bucket; the highest-scoring bucket wins and the rest are
 * surfaced as alternatives so the UI can show *why* a route was chosen.
 */
export function classifyTask(query: string): TaskClassification {
  const scores = new Map<string, { task: ScientificTask; domain: string; tool: string; flow: string; score: number }>();
  const matchedKeywords: string[] = [];

  for (const rule of RULES) {
    const match = query.match(rule.re);
    if (!match) continue;
    matchedKeywords.push(match[0].toLowerCase());
    const key = `${rule.task}::${rule.tool}`;
    const entry = scores.get(key) ?? { task: rule.task, domain: rule.domain, tool: rule.tool, flow: rule.flow, score: 0 };
    entry.score += rule.weight;
    scores.set(key, entry);
  }

  if (scores.size === 0) {
    return { ...FALLBACK, confidence: 0, matchedKeywords: [], alternatives: [] };
  }

  const ranked = [...scores.values()].sort((a, b) => b.score - a.score);
  const total = ranked.reduce((sum, r) => sum + r.score, 0);
  const winner = ranked[0]!;

  return {
    task: winner.task,
    domain: winner.domain,
    tool: winner.tool,
    flow: winner.flow,
    confidence: winner.score / total,
    matchedKeywords,
    alternatives: ranked.slice(1, 4).map((r) => ({ task: r.task, tool: r.tool, score: r.score })),
  };
}
