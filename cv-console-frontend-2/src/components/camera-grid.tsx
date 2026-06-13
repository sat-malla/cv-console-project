import { useState } from "react";
import VideoPanel from "./video-panel.tsx";
import SettingsPanel from "./settings-panel.tsx";

export type Cam = {
  id: string;
  label: string;
  loc: string;
  url: string;
  type: string;
};

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
              className="group relative rounded-2xl overflow-hidden bg-card transition-transform hover:-translate-y-0.5"
              style={{
                border: `1px solid ${color}`,
                boxShadow: `0 0 0 1px ${color}33 inset, 0 0 18px -4px ${color}, 0 0 40px -16px ${color}`,
              }}
            >
              <div className="relative aspect-16/10 overflow-hidden">
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
                      onClick={() => togglePanel(i)}
                      className={`flex items-center justify-center w-6 h-6 rounded bg-black/55 border transition-colors ${
                        activePanel === i
                          ? "border-white/40 text-white"
                          : "border-white/10 text-white/50 hover:text-white hover:border-white/30"
                      }`}
                      aria-label={`Settings for ${c.id}`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
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

                {[
                  "top-2 left-2 border-t border-l",
                  "top-2 right-2 border-t border-r",
                  "bottom-2 left-2 border-b border-l",
                  "bottom-2 right-2 border-b border-r",
                ].map((cls) => (
                  <span
                    key={cls}
                    className={`absolute h-4 w-4 ${cls}`}
                    style={{ borderColor: color }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {activePanel !== null && activePanel && (
          <div className="w-72 shrink-0">
            <SettingsPanel
              activeCam={activeCam}
              activePanel={activePanel}
              activeSettings={activeSettings}
              config={config}
              setActivePanel={setActivePanel}
              updateConfig={updateConfig}
            />
          </div>
        )}
    </div>
  );
}
