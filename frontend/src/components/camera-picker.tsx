import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCameraSessions } from "@/contexts/camera-sessions-context";
import { Webcam, RefreshCw, Plus } from "lucide-react";

type AvailableCamera = { name: string; index: number };

export function CameraPickerButton() {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<AvailableCamera[]>([]);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { sessions, addSession } = useCameraSessions();

  const refreshCameras = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/cameras");
      const data = await res.json();
      setAvailable(data.cameras ?? []);
    } catch (e) {
      console.error("Failed to fetch cameras:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) refreshCameras();
  }, [open]);

  const handleAdd = async () => {
    if (pendingIndex === null) return;
    const cam = available.find((c) => c.index === pendingIndex);
    if (!cam) return;

    const alreadyConnected = sessions.some((s) => s.cameraIndex === pendingIndex);
    if (alreadyConnected) {
      alert("This camera is already connected.");
      return;
    }

    const result = await addSession(cam.index, cam.name);
    if (result.success) {
      setOpen(false);
      setPendingIndex(null);
    } else {
      alert(`Failed to connect: ${result.error}`);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 font-mono text-xs text-foreground hover:bg-accent transition-colors"
      >
        <Webcam className="h-4 w-4" />
        Add Camera
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Add a camera</DialogTitle>
          <DialogDescription>
            Connect another camera. Each camera gets its own 6-view console with independent settings.
          </DialogDescription>

          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              Available devices
            </span>
            <button
              onClick={refreshCameras}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {available.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No cameras found.
              </p>
            )}

            {available.map((cam) => {
              const isConnected = sessions.some((s) => s.cameraIndex === cam.index);
              const isPending = cam.index === pendingIndex;
              return (
                <label
                  key={cam.index}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                    isConnected
                      ? "border-border opacity-40 cursor-not-allowed"
                      : isPending
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="camera-select"
                    checked={isPending}
                    disabled={isConnected}
                    onChange={() => setPendingIndex(cam.index)}
                    className="accent-blue-500"
                  />
                  <span className="font-mono text-xs flex-1">{cam.name}</span>
                  {isConnected && <span className="text-[10px] text-muted-foreground">Connected</span>}
                </label>
              );
            })}
          </div>

          <button
            onClick={handleAdd}
            disabled={pendingIndex === null}
            className="mt-4 w-full py-2 rounded-md bg-blue-500 hover:bg-blue-600 disabled:bg-accent disabled:cursor-not-allowed text-white text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Add camera
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
