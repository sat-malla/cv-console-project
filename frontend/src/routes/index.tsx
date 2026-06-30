import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Activity, Aperture, Camera, Layers, Shield, Zap, Radio, Cpu, Disc } from "lucide-react";
import camImg from "@/assets/camera-placeholder.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRISM-VISION · Local CV Console" },
      { name: "description", content: "A six-view computer vision console running entirely on your machine. Edge detection, object detection, depth, and motion tracking, live." },
      { property: "og:title", content: "PRISM-VISION · Local CV Console" },
      { property: "og:description", content: "A six-view computer vision console running entirely on your machine. Edge detection, object detection, depth, and motion tracking, live." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="relative">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(14,107,168,0.25), transparent 70%), radial-gradient(40% 30% at 80% 30%, rgba(166,225,250,0.18), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-400 px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1 font-mono text-[11px] tracking-[0.25em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0e6ba8] live-dot" />
              RUNS LOCALLY · NO CLOUD
            </div>
            <h1 className="mt-5 text-5xl md:text-7xl font-bold tracking-tight leading-[1.02]">
              One camera.
              <br />
              <span className="rainbow-text">Six perspectives.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              PRISM-VISION takes a single live feed and runs it through six independent vision
              pipelines at once — edges, motion, objects, depth, and feature tracking — side by
              side, tunable in real time, recorded on demand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                target="_blank"
                className="group inline-flex items-center gap-2 rounded-md brand-gradient text-white px-5 py-3 text-sm font-semibold shadow-lg hover:scale-[1.02] transition-transform"
              >
                Open Camera Panel
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 backdrop-blur px-5 py-3 text-sm font-semibold hover:bg-accent transition-colors"
              >
                Learn more
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { v: "6", l: "VIEWS PER CAM" },
                { v: "MPS", l: "M-SERIES GPU" },
                { v: "LOCAL", l: "NO UPLOAD" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-border bg-card/50 backdrop-blur px-3 py-3">
                  <div className="text-2xl font-bold tracking-tight rainbow-text">{s.v}</div>
                  <div className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              {VIEW_LABELS.map((label, i) => (
                <div
                  key={label}
                  className="camera-frame rounded-xl overflow-hidden relative aspect-[16/10]"
                  style={{ transform: `translateY(${i % 2 === 0 ? "-8px" : "8px"})` }}
                >
                  <img
                    src={camImg}
                    alt={`${label} preview`}
                    className="h-full w-full object-cover"
                    style={{ filter: `hue-rotate(${i * 60}deg) saturate(1.1) contrast(1.05)` }}
                  />
                  <div
                    className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
                    style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 3px)" }}
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px] tracking-widest">
                    CAM-0{i + 1}
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#a6e1fa] live-dot" />
                    LIVE
                  </div>
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-4 -right-4 rounded-xl border border-border bg-card/90 backdrop-blur px-4 py-3 shadow-2xl max-w-[260px]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full brand-gradient grid place-items-center text-white">
                  <Disc className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-mono text-muted-foreground">RECORDING</div>
                  <div className="text-sm font-semibold">CAM-04 · YOLO</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-snug">
                Exporting as .mp4 — each selected view saves as its own file.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-400 px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-xs font-mono tracking-[0.3em] text-muted-foreground">// THE SIX VIEWS</div>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            Classical CV and deep learning, <span className="rainbow-text">side by side.</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every panel reads from the same live frame and runs its own independent pipeline —
            tune any of them without touching the others.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border bg-card/60 backdrop-blur p-6 hover:-translate-y-1 transition-transform"
              style={{ boxShadow: "0 6px 24px -16px rgba(10,36,114,0.4)" }}
            >
              <div className="h-10 w-10 rounded-lg grid place-items-center brand-gradient text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold tracking-tight">{f.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-400 px-6 py-20 border-t border-border">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-12 items-center">
          <div>
            <div className="text-xs font-mono tracking-[0.3em] text-muted-foreground">// HOW IT WORKS</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              One frame, <span className="rainbow-text">six pipelines</span>.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Connect a camera, and the console fans that single feed out into six independent
              WebSocket streams — each one processed, tuned, and rendered on its own.
            </p>
            <div className="mt-6 space-y-3">
              {STEPS.map((s, i) => (
                <div key={s.t} className="flex gap-4">
                  <div className="font-mono text-xs text-muted-foreground tracking-widest pt-1 w-8">0{i + 1}</div>
                  <div>
                    <div className="font-semibold">{s.t}</div>
                    <div className="text-sm text-muted-foreground">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6">
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground tracking-widest">
              <span>// PIPELINE</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0e6ba8] live-dot" />
                STREAMING
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {LOG.map((l, i) => (
                <div key={i} className="font-mono text-xs flex gap-3">
                  <span className="text-muted-foreground tabular-nums">{l.t}</span>
                  <span className="text-[#0e6ba8]">{l.tag}</span>
                  <span className="text-foreground/80">{l.msg}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { i: Radio, l: "SOURCE", v: "1 camera" },
                { i: Cpu, l: "VIEWS", v: "6 active" },
                { i: Activity, l: "DEVICE", v: "Apple MPS" },
              ].map((p) => (
                <div key={p.l} className="rounded-lg border border-border bg-background/50 p-3">
                  <p.i className="h-4 w-4 text-[#0e6ba8]" />
                  <div className="mt-2 text-[10px] font-mono tracking-widest text-muted-foreground">{p.l}</div>
                  <div className="text-sm font-semibold">{p.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-400 px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl brand-gradient px-8 md:px-16 py-16 text-white text-center">
          <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
            style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.2) 0 1px, transparent 1px 4px)" }}
          />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Connect a camera. See everything.</h2>
          <p className="mt-3 text-white/80 max-w-xl mx-auto">
            Open the panel, pick a source, and switch any of the six views on or off as you go.
          </p>
          <Link
            to="/"
            target="_blank"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-white text-[#00072d] px-6 py-3 text-sm font-bold hover:scale-[1.02] transition-transform"
          >
            Open Camera Panel
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

const VIEW_LABELS = ["Regular", "Canny", "Motion", "YOLO"];

const FEATURES = [
  { icon: Camera, title: "Six synchronized views", desc: "Regular, Canny edges, motion segmentation, YOLO detection, optical flow, and MiDaS depth — all from one feed." },
  { icon: Aperture, title: "Live-tunable per view", desc: "Adjust thresholds, sensitivity, color, and more with sliders that update the stream instantly, no reconnect." },
  { icon: Layers, title: "Multi-camera sessions", desc: "Connect more than one camera and switch between full six-view consoles, each with its own saved settings." },
  { icon: Disc, title: "Record any view", desc: "Capture one or several panels at once and export as WebM, MP4, or MOV." },
  { icon: Shield, title: "Nothing leaves your machine", desc: "Every frame is captured, processed, and rendered locally — no cloud round-trip." },
  { icon: Zap, title: "Apple Silicon accelerated", desc: "YOLO and MiDaS inference run on MPS, tuned to stay real-time on a single GPU." },
];

const STEPS = [
  { t: "Connect", d: "Pick a camera from what's available — built-in, Continuity Camera, or Camo." },
  { t: "Process", d: "The same frame is split into six pipelines: classical CV and deep learning side by side." },
  { t: "Tune & capture", d: "Adjust any view live, then record one, several, or all six to export." },
];

const LOG = [
  { t: "00:42.118", tag: "CAPTURE", msg: "frame received · 1280x720" },
  { t: "00:42.121", tag: "CANNY  ", msg: "edges computed · thresholds 100/200" },
  { t: "00:42.124", tag: "YOLO   ", msg: "detect: person×1, laptop×1" },
  { t: "00:42.131", tag: "MIDAS  ", msg: "depth map · colormap INFERNO" },
  { t: "00:42.160", tag: "RENDER ", msg: "6/6 panels updated" },
];