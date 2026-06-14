import { useState } from "react";
import VideoPanel from "./video-panel.tsx";
import { useSettingsPanel } from "./settings-panel.tsx";
import { Settings } from "lucide-react";

const NEON = ["#ff1717", "#ff7817", "#f6ff47", "#00db58", "#2008ff", "#b908ff"];
const CAMS = [
  {
    id: "CAM-01",
    label: "North Gate",
    loc: "Sector A · 41.40N 2.16E",
    url: "ws://127.0.0.1:8000/regular",
    type: "regular",
  },
  {
    id: "CAM-02",
    label: "Atrium Lobby",
    loc: "Sector B · L1",
    url: "ws://127.0.0.1:8000/canny",
    type: "canny",
  },
  {
    id: "CAM-03",
    label: "Loading Bay",
    loc: "Sector C · L0",
    url: "ws://127.0.0.1:8000/motion",
    type: "motion",
  },
  {
    id: "CAM-04",
    label: "Rooftop Pad",
    loc: "Sector D · R7",
    url: "ws://127.0.0.1:8000/regular",
    type: "regular",
  },
  {
    id: "CAM-05",
    label: "East Corridor",
    loc: "Sector E · L3",
    url: "ws://127.0.0.1:8000/regular",
    type: "regular",
  },
  {
    id: "CAM-06",
    label: "Server Vault",
    loc: "Sector F · B2",
    url: "ws://127.0.0.1:8000/regular",
    type: "regular",
  },
];
const SETTINGS: Record<
  string,
  {
    key: string;
    label: string;
    min: number;
    max: number;
    default: number;
    step: number;
  }[]
> = {
  canny: [
    {
      key: "threshold1",
      label: "Lower threshold",
      min: 0,
      max: 255,
      default: 100,
      step: 1,
    },
    {
      key: "threshold2",
      label: "Upper threshold",
      min: 0,
      max: 255,
      default: 200,
      step: 1,
    },
  ],
  motion: [
    {
      key: "varThreshold",
      label: "Sensitivity",
      min: 10,
      max: 200,
      default: 50,
      step: 1,
    },
    {
      key: "history",
      label: "History frames",
      min: 50,
      max: 500,
      default: 500,
      step: 10,
    },
    {
      key: "dilateIter",
      label: "Dilate iterations",
      min: 0,
      max: 5,
      default: 2,
      step: 1,
    },
  ],
  regular: [],
};

type Config = Record<string, Record<string, number>>;

function buildDefaultConfig(): Config {
  const config: Config = {};
  CAMS.forEach((c, i) => {
    config[i] = {};
    (SETTINGS[c.type] ?? []).forEach((s) => {
      config[i][s.key] = s.default;
    });
  });
  return config;
}

export function CameraGrid() {
  const [activePanel, setActivePanel] = useState<number | null>(null);
  const [config, setConfig] = useState<Config>(buildDefaultConfig);
  const { open } = useSettingsPanel();

  const togglePanel = (i: number) =>
    setActivePanel((prev) => (prev === i ? null : i));

  const updateConfig = (camIdx: number, key: string, val: number) =>
    setConfig((prev) => ({
      ...prev,
      [camIdx]: { ...prev[camIdx], [key]: val },
    }));

  const activeCam = activePanel !== null ? CAMS[activePanel] : null;
  const activeSettings = activeCam ? (SETTINGS[activeCam.type] ?? []) : [];

  return (
    <div className="flex gap-4 transition-all duration-300">
      <div style={{ gridTemplateColumns: activePanel !== null ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))" }}
  className="grid gap-5 md:gap-6 transition-all duration-300 flex-1 min-w-0">
        {CAMS.map((c, i) => {
          const color = NEON[i % NEON.length];
          return (
            <div
              key={c.id}
              className="group relative rounded-2xl bg-card transition-transform hover:-translate-y-0.5"
              style={{
                border: `1px solid ${color}`,
                boxShadow: `0 0 0 1px ${color}33 inset, 0 0 18px -4px ${color}, 0 0 40px -16px ${color}`,
              }}
            >
              <div className="relative aspect-16/10 overflow-hidden rounded-2xl">
                <VideoPanel url={c.url} />
                <div
                  className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 3px)",
                  }}
                />
                <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between font-mono text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className="live-dot inline-block h-2 w-2 rounded-full"
                      style={{
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                    <span className="px-2 py-0.5 rounded bg-black/55 text-white tracking-widest">
                      {c.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-black/55 text-white/90 tracking-wider">
                      REC · 1080p
                    </span>
                    <button
                      type="button"
                      onClick={() => open(c.id, c.type)}
                      aria-label={`${c.id} settings`}
                      className="grid place-items-center h-6 w-6 rounded bg-black/55 text-white/90 hover:text-white hover:bg-black/75 transition-colors"
                      style={{ boxShadow: `0 0 8px -2px ${color}` }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between font-mono text-[11px] bg-linear-to-t from-black/70 to-transparent">
                  <div className="text-white">
                    <div className="text-sm font-semibold tracking-tight">
                      {c.label}
                    </div>
                    <div className="text-white/70">{c.loc}</div>
                  </div>
                  <div className="text-white/80">
                    {new Date().toLocaleTimeString([], { hour12: false })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
