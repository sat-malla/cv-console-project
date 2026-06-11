import camImg from "@/assets/camera-placeholder.jpg";
import VideoPanel from "./video-panel.tsx";

const NEON = ["#ff1717", "#ff7817", "#f6ff47", "#00db58", "#2008ff", "#b908ff"];
const CAMS = [
  { id: "CAM-01", label: "North Gate", loc: "Sector A · 41.40N 2.16E" },
  { id: "CAM-02", label: "Atrium Lobby", loc: "Sector B · L1" },
  { id: "CAM-03", label: "Loading Bay", loc: "Sector C · L0" },
  { id: "CAM-04", label: "Rooftop Pad", loc: "Sector D · R7" },
  { id: "CAM-05", label: "East Corridor", loc: "Sector E · L3" },
  { id: "CAM-06", label: "Server Vault", loc: "Sector F · B2" },
];

export function CameraGrid() {
  return (
    <div className="grid gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {CAMS.map((c, i) => {
        const color = NEON[i % NEON.length];
        return (
          <div
            key={c.id}
            className="group relative rounded-2xl overflow-hidden bg-card transition-transform hover:-translate-y-0.5"
            style={{
              border: `1px solid ${color}`,
              boxShadow: `0 0 0 1px ${color}33 inset, 0 0 18px -4px ${color}, 0 0 40px -16px ${color}`,
            }}
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <VideoPanel url="ws://127.0.0.1:8000/video" />
              <div
                className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 3px)" }}
              />
              <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="live-dot inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                  <span className="px-2 py-0.5 rounded bg-black/55 text-white tracking-widest">{c.id}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-black/55 text-white/90 tracking-wider">REC · 1080p</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between font-mono text-[11px] bg-gradient-to-t from-black/70 to-transparent">
                <div className="text-white">
                  <div className="text-sm font-semibold tracking-tight">{c.label}</div>
                  <div className="text-white/70">{c.loc}</div>
                </div>
                <div className="text-white/80">{new Date().toLocaleTimeString([], { hour12: false })}</div>
              </div>
              {[
                "top-2 left-2 border-t border-l",
                "top-2 right-2 border-t border-r",
                "bottom-2 left-2 border-b border-l",
                "bottom-2 right-2 border-b border-r",
              ].map((cls) => (
                <span key={cls} className={`absolute h-4 w-4 ${cls}`} style={{ borderColor: color }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
