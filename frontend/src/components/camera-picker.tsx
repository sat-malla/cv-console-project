import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCameraSource } from "@/contexts/camera-source-context";
import { Webcam, RefreshCw, Check } from "lucide-react";

export function CameraPickerButton() {
  const [open, setOpen] = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const { cameras, activeIndex, isLoading, refreshCameras, selectCamera, disconnectCamera } =
    useCameraSource();

  const activeCamera = cameras.find((c) => c.index === activeIndex);

  const handleSelect = async (index: number) => {
    setPendingIndex(activeIndex);
    setOpen(false);
  };

  const handleConfirm = async () => {
    if (pendingIndex === null) return;
    await selectCamera(pendingIndex);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 font-mono text-xs text-foreground hover:bg-accent transition-colors"
      >
        <Webcam className="h-4 w-4" />
        {activeCamera ? activeCamera.name : "No camera"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Select camera source</DialogTitle>
          <DialogDescription>This camera will feed all 6 processing views.</DialogDescription>

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
            {cameras.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No cameras found. Connect a camera and refresh.
              </p>
            )}

            {cameras.map((cam) => {
              const isPending = cam.index === pendingIndex;
              return (
                <label
                  key={cam.index}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                    isPending ? "border-blue-500 bg-blue-500/10" : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="camera-select"
                    checked={isPending}
                    onChange={() => setPendingIndex(cam.index)}
                    className="accent-blue-500"
                  />
                  <span className="font-mono text-xs">{cam.name}</span>
                </label>
              );
            })}
          </div>
          <button
            onClick={handleConfirm}
            disabled={pendingIndex === null}
            className="mt-4 w-full py-2 rounded-md bg-blue-500 hover:bg-blue-600 disabled:bg-accent disabled:cursor-not-allowed text-white text-xs font-mono font-semibold transition-colors"
          >
            Select camera
          </button>
          {activeIndex !== null && (
            <button
              onClick={() => {
                disconnectCamera();
                setPendingIndex(null);
                setOpen(false);
              }}
              className="mt-4 w-full py-2 rounded-md border border-border text-muted-foreground hover:bg-accent text-xs font-mono transition-colors"
            >
              Disconnect camera
            </button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
