import { useState, useRef, useEffect } from "react";
import VideoPanel from "./video-panel.tsx";
import { useSettingsPanel } from "./settings-panel.tsx";
import { Settings } from "lucide-react";

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
    url: "ws://127.0.0.1:8000/yolo",
    type: "yolo",
  },
  {
    id: "CAM-05",
    label: "East Corridor",
    loc: "Sector E · L3",
    url: "ws://127.0.0.1:8000/sfm",
    type: "sfm",
  },
  {
    id: "CAM-06",
    label: "Server Vault",
    loc: "Sector F · B2",
    url: "ws://127.0.0.1:8000/stvis",
    type: "stvis",
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
  regular: [
    { key: "brightness", label: "Brightness", min: -100, max: 100, default: 0, step: 1 },
    { key: "contrast", label: "Contrast", min: 0.3, max: 3.0, default: 1.0, step: 0.1 },
    { key: "temperature", label: "Temperature", min: -100, max: 100, default: 0, step: 1 },
    { key: "tint", label: "Tint", min: -100, max: 100, default: 0, step: 1 },
    { key: "exposure", label: "Exposure", min: -100, max: 100, default: 0, step: 1 },
    { key: "hue", label: "Hue", min: 0, max: 179, default: 0, step: 1 },
  ],
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
  yolo: [
    {
      key: "conf_threshold",
      label: "Confidence Threshold",
      min: 0.1,
      max: 0.95,
      default: 0.4,
      step: 0.05,
    },
    {
      key: "box_thickness",
      label: "Box Thickness",
      min: 1,
      max: 6,
      default: 2,
      step: 1,
    },
    {
      key: "max_detections",
      label: "Max Detections",
      min: 1,
      max: 50,
      default: 20,
      step: 1,
    },
  ],
  sfm: [
    { key: "maxCorners", label: "Max feature points", min: 10, max: 500, default: 150, step: 10 },
    { key: "qualityLevel", label: "Corner quality", min: 0.1, max: 0.9, default: 0.3, step: 0.05 },
    { key: "minDistance", label: "Min point distance", min: 1, max: 30, default: 7, step: 1 },
    { key: "arrowScale", label: "Arrow scale", min: 0.5, max: 5.0, default: 1.0, step: 0.1 },
    { key: "pointSize", label: "Point size", min: 1, max: 10, default: 3, step: 1 },
    { key: "hue", label: "Arrow color", min: 0, max: 360, default: 0, step: 1 },
  ],
  stvis: [
    { key: "colormap", label: "Color map", min: 0, max: 20, default: 8, step: 1 },
    { key: "contrast", label: "Depth contrast", min: 0.5, max: 3.0, default: 1.0, step: 0.1 },
    { key: "invert", label: "Invert depth", min: 0, max: 1, default: 0, step: 1 },
    { key: "smoothing", label: "Smoothing", min: 0, max: 15, default: 0, step: 1 },
  ],
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
  const socketRefs = useRef<Record<string, WebSocket>>({});

  const activeCam = activePanel !== null ? CAMS[activePanel] : null;
  const activeSettings = activeCam ? (SETTINGS[activeCam.type] ?? []) : [];

  return (
    <div className="flex gap-4 transition-all duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 transition-all duration-300 min-w-0 w-full">
        {CAMS.map((c, i) => {
          return (
            <div
              key={c.id}
              className="group relative overflow-hidden camera-frame hover:camera-frame-hover transition-transform hover:-translate-y-0.5"
            >
              <div className="relative aspect-16/10 overflow-hidden">
                <VideoPanel
                  url={c.url}
                  onSocket={(ws) => {
                    socketRefs.current[c.id] = ws;
                  }}
                />
                <div
                  className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.15) 0 1px, transparent 1px 3px)",
                  }}
                />
                <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between font-mono text-[11px]">
                  <div className="flex items-center gap-2">
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
                      onClick={() => open(c.id, c.type, socketRefs.current[c.id])}
                      aria-label={`${c.id} settings`}
                      className="grid place-items-center h-6 w-6 rounded bg-black/55 text-white/90 hover:text-white hover:bg-black/75 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between font-mono text-[11px] bg-linear-to-t from-black/70 to-transparent">
                  <div className="text-white">
                    <div className="text-sm font-semibold tracking-tight">{c.label}</div>
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
