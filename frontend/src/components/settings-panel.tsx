import { createContext, useContext, useState, type ReactNode } from "react";
import { Settings, SquareTerminal, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LiveTimestamp } from "./camera-grid";
import VideoPanel from "./video-panel";

type SettingParam = {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
};

export const SETTINGS: Record<string, SettingParam[]> = {
  regular: [
    { key: "brightness", label: "Brightness", min: -100, max: 100, default: 0, step: 1 },
    { key: "contrast", label: "Contrast", min: 0.3, max: 3.0, default: 1.0, step: 0.1 },
    { key: "temperature", label: "Temperature", min: -100, max: 100, default: 0, step: 1 },
    { key: "tint", label: "Tint", min: -100, max: 100, default: 0, step: 1 },
    { key: "exposure", label: "Exposure", min: -100, max: 100, default: 0, step: 1 },
    { key: "hue", label: "Hue", min: 0, max: 179, default: 0, step: 1 },
  ],
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

type OpenCam = { id: string; type: string; label: string; url: string } | null;

type Ctx = {
  openCam: OpenCam;
  allValues: Record<string, Record<string, number>>;
  ws: WebSocket | null;
  open: (id: string, type: string, label: string, url: string, ws: WebSocket) => void;
  close: () => void;
  update: (key: string, val: number) => void;
  reset: () => void;
};

const SettingsPanelCtx = createContext<Ctx | null>(null);

export function SettingsPanelProvider({ children }: { children: ReactNode }) {
  const [openCam, setOpenCam] = useState<OpenCam>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [allValues, setAllValues] = useState<Record<string, Record<string, number>>>({});

  const open = (id: string, type: string, label: string, url: string, socket: WebSocket) => {
    if (!allValues[id]) {
      const defaults: Record<string, number> = {};
      (SETTINGS[type] ?? []).forEach((s) => {
        defaults[s.key] = s.default;
      });
      setAllValues((prev) => ({ ...prev, [id]: defaults }));
    }
    setOpenCam({ id, type, label, url });
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

  const reset = () => {
    if (!openCam) return;
    const defaults: Record<string, number> = {};
    (SETTINGS[openCam.type] ?? []).forEach((s) => {
      defaults[s.key] = s.default;
    });
    setAllValues((prev) => ({ ...prev, [openCam.id]: defaults }));
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(defaults));
    }
  };

  return (
    <SettingsPanelCtx.Provider value={{ openCam, allValues, ws, open, close, update, reset }}>
      {children}
      <CameraModal />
    </SettingsPanelCtx.Provider>
  );
}

export function useSettingsPanel() {
  const ctx = useContext(SettingsPanelCtx);
  if (!ctx) throw new Error("useSettingsPanel must be used within SettingsPanelProvider");
  return ctx;
}

function CameraModal() {
  const { openCam, allValues, close, update, reset } = useSettingsPanel();
  const isOpen = !!openCam;
  const values = allValues[openCam?.id ?? ""] ?? {};
  const params = openCam ? (SETTINGS[openCam.type] ?? []) : [];
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-6xl w-[95vw] h-[80vh] p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">{openCam?.id ?? "Camera"} controls</DialogTitle>
        <DialogDescription className="sr-only">
          Expanded camera view with adjustable detection and image parameters.
        </DialogDescription>
        {openCam && (
          <div className="flex flex-col md:flex-row max-h-[85vh]">
            <div className="flex-1 bg-black relative">
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[11px] tracking-widest">
                {openCam.id} · {openCam.label}
              </div>
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[11px] tracking-widest">
                <div className="text-white/80">
                    <LiveTimestamp />
                  </div>
              </div>
              <VideoPanel url={openCam.url} />
            </div>

            <div className="w-full md:w-95 shrink-0 border-t md:border-t-0 md:border-l border-border bg-card flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                <div className="flex items-center justify-between gap-3 m-3 mb-1">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="settings">
                      <Settings className="h-5.5 w-6.5" />
                    </TabsTrigger>
                    <TabsTrigger value="terminal">
                      <SquareTerminal className="h-5.5 w-6.5" />
                    </TabsTrigger>
                    <TabsTrigger value="information">
                      <Info className="h-5.5 w-6.5" />
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
                  <TabsContent value="settings" className="mt-2">
                    {params.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No parameters for this view.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {params.map((s) => (
                          <div key={s.key}>
                            <div className="flex justify-between items-center mb-2">
                              <label className="font-mono text-xs text-muted-foreground">
                                {s.label}
                              </label>
                              <div className="flex items-center gap-2">
                                {s.key === "hue" && (
                                  <div
                                    className="w-3 h-3 rounded-full border border-white/20"
                                    style={{ background: `hsl(${values[s.key]}, 100%, 50%)` }}
                                  />
                                )}
                                <span className="font-mono text-xs font-semibold text-foreground">
                                  {values[s.key]}
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min={s.min}
                              max={s.max}
                              step={s.step}
                              value={values[s.key]}
                              onChange={(e) => update(s.key, Number(e.target.value))}
                              className={
                                s.key === "hue"
                                  ? "w-full appearance-none cursor-pointer"
                                  : "w-full accent-white"
                              }
                              style={
                                s.key === "hue"
                                  ? {
                                      background:
                                        "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                                      borderRadius: "9999px",
                                      height: "8px",
                                      outline: "none",
                                      border: "none",
                                    }
                                  : undefined
                              }
                            />
                            <div className="flex justify-between mt-1">
                              <span className="font-mono text-[9px] text-muted-foreground">
                                {s.min}
                              </span>
                              <span className="font-mono text-[9px] text-muted-foreground">
                                {s.max}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="terminal" className="mt-2" />
                  <TabsContent value="information" className="mt-2">
                    <div className="flex flex-col gap-3">
                      <h1 className="font-bold" style={{ fontSize: "20px" }}>Information</h1>
                      <p>
                        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
                        doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
                        veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
                        ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
                        consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque
                        porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur,
                        adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et
                        dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis
                        nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid
                        ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea
                        voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem
                        eum fugiat quo voluptas nulla pariatur?
                      </p>
                    </div>
                  </TabsContent>
                </div>
                {activeTab === "settings" && params.length > 0 && (
                  <div className="border-t border-border px-4 py-3 shrink-0">
                    <button
                      onClick={reset}
                      className="w-full px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded text-xs font-mono font-semibold transition-colors"
                    >
                      Reset to defaults
                    </button>
                  </div>
                )}
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
