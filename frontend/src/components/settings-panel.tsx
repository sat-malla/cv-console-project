import { createContext, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type SettingParam = {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
};

export const SETTINGS: Record<string, SettingParam[]> = {
  regular: [],
  canny: [
    { key: "threshold1", label: "Lower threshold", min: 0, max: 255, default: 100, step: 1 },
    { key: "threshold2", label: "Upper threshold", min: 0, max: 255, default: 200, step: 1 },
  ],
  motion: [
    { key: "varThreshold", label: "Sensitivity", min: 10, max: 200, default: 50, step: 1 },
    { key: "history", label: "History frames", min: 50, max: 500, default: 500, step: 10 },
    { key: "dilateIter", label: "Dilate iterations", min: 0, max: 5, default: 2, step: 1 },
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
};

type OpenCam = { id: string; type: string } | null;

type Ctx = {
  openCam: OpenCam;
  allValues: Record<string, Record<string, number>>;
  ws: WebSocket | null;
  open: (id: string, type: string, ws: WebSocket) => void;
  close: () => void;
  update: (key: string, val: number) => void;
};

const SettingsPanelCtx = createContext<Ctx | null>(null);

export function SettingsPanelProvider({ children }: { children: ReactNode }) {
  const [openCam, setOpenCam] = useState<OpenCam>(null);
  const [values, setValues] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("cv-config");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [allValues, setAllValues] = useState<Record<string, Record<string, number>>>({});

  const open = (id: string, type: string, socket: WebSocket) => {
    if (!allValues[id]) {
      const defaults: Record<string, number> = {};
      (SETTINGS[type] ?? []).forEach((s) => {
        defaults[s.key] = s.default;
      });
      setAllValues((prev) => ({ ...prev, [id]: defaults }));
    }
    setOpenCam({ id, type });
    setWs(socket);
  };

  const close = () => {
    setOpenCam(null);
    setWs(null);
  };

  const update = (key: string, val: number) => {
    if (!openCam) return;
    const newVals = { ...allValues[openCam.id], [key]: val };
    setAllValues((prev) => ({ ...prev, [openCam.id]: newVals }));
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(newVals));
    }
  };

  return (
    <SettingsPanelCtx.Provider value={{ openCam, allValues, ws, open, close, update }}>
      {children}
    </SettingsPanelCtx.Provider>
  );
}

export function useSettingsPanel() {
  const ctx = useContext(SettingsPanelCtx);
  if (!ctx) throw new Error("useSettingsPanel must be used within SettingsPanelProvider");
  return ctx;
}

export function SettingsSidePanel() {
  const { openCam, allValues, ws, close, update } = useSettingsPanel();
  const values = allValues[openCam?.id ?? ""] ?? {};
  if (!openCam) return null;

  const params = SETTINGS[openCam.type] ?? [];
  return (
    <aside
      className="w-72 h-250 shrink-0 border-l border-border bg-card flex flex-col"
      aria-label={`${openCam.id} settings`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground uppercase mb-0.5">
            Panel settings
          </div>
          <div className="font-mono text-xs font-semibold text-foreground">
            {openCam.id} · {openCam.type.charAt(0).toUpperCase() + openCam.type.slice(1)}
          </div>
        </div>
        <button
          onClick={close}
          className="rounded-md p-1.5 hover:bg-accent transition-colors"
          aria-label="Close settings panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {params.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No parameters for this view.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {params.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-mono text-xs text-muted-foreground">{s.label}</label>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {values[s.key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={values[s.key]}
                  onChange={(e) => update(s.key, Number(e.target.value))}
                  className="w-full accent-white"
                />
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-[9px] text-muted-foreground">{s.min}</span>
                  <span className="font-mono text-[9px] text-muted-foreground">{s.max}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
