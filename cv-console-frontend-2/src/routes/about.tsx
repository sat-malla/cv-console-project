import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · PRISM-VISION" },
      { name: "description", content: "About the PRISM-VISION computer vision console — purpose, capabilities, and roadmap." },
      { property: "og:title", content: "About · PRISM-VISION" },
      { property: "og:description", content: "About the PRISM-VISION computer vision console — purpose, capabilities, and roadmap." },
    ],
  }),
  component: About,
});

const COLORS = ["#ff1717", "#ff7817", "#f6ff47", "#00db58", "#2008ff", "#b908ff", "#ff08d6"];

function About() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-xs font-mono tracking-[0.3em] text-muted-foreground">// ABOUT</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-1">
        Built for <span className="rainbow-text">operators</span>.
      </h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        PRISM-VISION is a multi-feed computer vision console designed to keep humans and AI agents
        in the loop together. Six synchronized camera views, an embedded AI co-pilot, and a clean
        operator UI — so you can see everything, act fast, and never miss the signal in the noise.
      </p>

      <div className="mt-10 grid sm:grid-cols-2 gap-4">
        {[
          { t: "Synchronized Feeds", d: "Up to six live views in a unified grid with timestamping and per-camera telemetry." },
          { t: "AI Co-Pilot", d: "An embedded agent (coming soon) to summarize events, flag anomalies, and answer questions." },
          { t: "Low Latency", d: "Streaming pipeline tuned for sub-50ms glass-to-glass on commodity hardware." },
          { t: "Operator First", d: "Keyboard-friendly, dark by default, and designed to fade into the background." },
        ].map((f, i) => (
          <div
            key={f.t}
            className="rounded-xl border border-border bg-card p-4"
            style={{ boxShadow: `0 0 18px -10px ${COLORS[i % COLORS.length]}` }}
          >
            <div className="text-xs font-mono tracking-widest" style={{ color: COLORS[i % COLORS.length] }}>0{i + 1}</div>
            <div className="mt-1 font-semibold">{f.t}</div>
            <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
