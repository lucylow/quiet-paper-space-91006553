import { useMemo, useState } from "react";
import { classifyTask } from "@/lib/scientific-ai";

export function TaskRouter() {
  const [q, setQ] = useState("Is there a planet transiting this star?");
  const result = useMemo(() => classifyTask(q), [q]);

  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">AI Task Router</h2>
      <p className="text-sm text-muted-foreground">
        Ask a science question and see which specialized model and tools it would route to.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. forecast the orbit, analyze the equation..."
        className="mt-4 w-full rounded-xl border bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <div className="mt-4 flex flex-wrap gap-3 text-sm [&>span]:rounded-full [&>span]:border [&>span]:px-3 [&>span]:py-1">
        <span>Task: <b>{result.task}</b></span>
        <span>Domain: <b>{result.domain}</b></span>
        <span className="text-primary">Model: <b>{result.tool}</b></span>
        <span>Confidence: <b>{(result.confidence * 100).toFixed(0)}%</b></span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Workflow: {result.flow}</p>
      {result.matchedKeywords.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Matched signals: {result.matchedKeywords.join(", ")}
        </p>
      )}
      {result.alternatives.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Also considered: {result.alternatives.map((a) => `${a.tool} (${a.task})`).join(" · ")}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Demonstration mode — routing is rule-based, no live model calls.
      </p>
    </section>
  );
}
