import { MODEL_REGISTRY } from "@/lib/scientific-ai";

export function ModelRegistry() {
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Model Registry</h2>
      <p className="text-sm text-muted-foreground">
        Every model declares its modalities, disciplines, schemas and known limitations.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {MODEL_REGISTRY.map((m) => (
          <article key={m.id} className="rounded-xl border p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{m.id}</h3>
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                v{m.version} · {m.status}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{m.family}</p>
            <dl className="mt-3 space-y-1 text-xs">
              <div><dt className="inline font-medium">Modalities: </dt><dd className="inline text-muted-foreground">{m.modalities.join(", ")}</dd></div>
              <div><dt className="inline font-medium">Disciplines: </dt><dd className="inline text-muted-foreground">{m.disciplines.join(", ")}</dd></div>
              <div><dt className="inline font-medium">In: </dt><dd className="inline font-mono text-muted-foreground">{m.inputSchema}</dd></div>
              <div><dt className="inline font-medium">Out: </dt><dd className="inline font-mono text-muted-foreground">{m.outputSchema}</dd></div>
              <div><dt className="inline font-medium">Limitations: </dt><dd className="inline text-muted-foreground">{m.limitations}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
