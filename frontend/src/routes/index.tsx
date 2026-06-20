import { createFileRoute } from "@tanstack/react-router";
import { CameraGrid } from "@/components/camera-grid";
import { Activity, Cpu, Radio } from "lucide-react";
import { RecordButton } from "@/components/record-modal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Camera Views · PRISM-VISION" },
      { name: "description", content: "Live six-feed camera grid for the PRISM-VISION computer vision console." },
      { property: "og:title", content: "Camera Views · PRISM-VISION" },
      { property: "og:description", content: "Live six-feed camera grid for the PRISM-VISION computer vision console." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
   <div className="min-h-screen w-full flex flex-col">
      <div className="px-6 py-8 flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-mono tracking-[0.3em] text-muted-foreground">// LIVE CONSOLE</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">
            Camera <span className="rainbow-text">Views</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Six synchronized feeds · real-time computer vision telemetry</p>
        </div>
        <RecordButton />
      </div>

      <div className="flex-1 pl-6 pr-0 overflow-visible">
        <CameraGrid />
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5"
      style={{ boxShadow: `0 0 12px -6px ${color}` }}
    >
      <span style={{ color }}>{icon}</span>
      <span className="text-muted-foreground tracking-widest">{label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}
