import { useRef, useState, useEffect } from "react";
import VideoPanel from "./video-panel.tsx";
import { useSettingsPanel } from "./settings-panel.tsx";
import { SquareArrowOutUpRight } from "lucide-react";
import { useRecording } from "@/contexts/recording-context.tsx";
import { useCameraSessions } from "@/contexts/camera-sessions-context.tsx";

const CAMS = [
  {
    id: "CAM-01",
    label: "Regular",
    url: "ws://127.0.0.1:8000/regular",
    type: "regular",
  },
  {
    id: "CAM-02",
    label: "Canny - Edge Detection",
    url: "ws://127.0.0.1:8000/canny",
    type: "canny",
  },
  {
    id: "CAM-03",
    label: "MOG2 - Motion Detection",
    url: "ws://127.0.0.1:8000/motion",
    type: "motion",
  },
  {
    id: "CAM-04",
    label: "YOLO26 - Object Detection",
    url: "ws://127.0.0.1:8000/yolo",
    type: "yolo",
  },
  {
    id: "CAM-05",
    label: "SFM - Feature Point Tracking",
    url: "ws://127.0.0.1:8000/sfm",
    type: "sfm",
  },
  {
    id: "CAM-06",
    label: "Stereo Vision - Depth Tracking",
    url: "ws://127.0.0.1:8000/stvis",
    type: "stvis",
  },
];

export function LiveTimestamp() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <span>
      {date} {time}
    </span>
  );
}

export function CameraGrid() {
  const { open } = useSettingsPanel();
  const { recordingState } = useRecording();
  const { activeSession } = useCameraSessions();
  const socketRefs = useRef<Record<string, WebSocket>>({});

  const CAMERAS = activeSession
    ? CAMS.map((c) => ({
        ...c,
        url: `ws://127.0.0.1:8000/session/${activeSession.sessionId}/${c.type}`,
      }))
    : [];

  return (
    <div className="flex gap-4 transition-all duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 transition-all duration-300 min-w-0 w-full">
        {CAMS.map((c, i) => {
          const isRecording = recordingState[c.id];
          const camUrl = activeSession ? `ws://127.0.0.1:8000/session/${activeSession.sessionId}/${c.type}` : null;

          return (
            <div
              key={c.id}
              className="group relative overflow-hidden camera-frame hover:camera-frame-hover transition-transform hover:-translate-y-0.5"
            >
              <div className="relative aspect-16/10 overflow-hidden">
                {!activeSession || !camUrl ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-2">
                    <span className="font-mono text-xs text-white/40">No camera selected</span>
                  </div>
                ) : (
                  <VideoPanel
                    key={camUrl}
                    url={camUrl}
                    camId={c.id}
                    onSocket={(ws) => {
                      socketRefs.current[c.id] = ws;
                    }}
                  />
                )}
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
                      className="px-2 py-0.5 rounded bg-black/55 text-white tracking-widest"
                      style={
                        isRecording
                          ? {
                              border: "1px solid #ef4444",
                              boxShadow:
                                "0 0 0 1px #ef444433 inset, 0 0 8px -1px #ef4444, 0 0 16px -4px #ef4444",
                            }
                          : undefined
                      }
                    >
                      {c.id}
                    </span>
                    {isRecording && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => open(c.id, c.type, c.label, c.url, socketRefs.current[c.id])}
                      aria-label={`${c.id} settings`}
                      className="grid place-items-center h-6 w-6 rounded bg-black/55 text-white/90 hover:text-white hover:bg-black/75 transition-colors"
                    >
                      <SquareArrowOutUpRight className="h-3.5 w-4.5" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between font-mono text-[11px] bg-linear-to-t from-black/70 to-transparent">
                  <div className="text-white">
                    <div className="bg-black text-sm font-semibold tracking-tight p-1 rounded">
                      {c.label}
                    </div>
                  </div>
                  <div className="text-white/80">
                    <LiveTimestamp />
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
