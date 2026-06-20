import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRecording } from "../contexts/recording-context";
import { Circle, Square } from "lucide-react";

const CAM_LIST = [
  { id: "CAM-01", label: "Regular" },
  { id: "CAM-02", label: "Canny - Edge Detection" },
  { id: "CAM-03", label: "MOG2 - Motion Detection" },
  { id: "CAM-04", label: "YOLO26 - Object Detection" },
  { id: "CAM-05", label: "SFM - Feature Point Tracking" },
  { id: "CAM-06", label: "Stereo Vision - Depth Tracking" },
];

export function RecordButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { isAnyRecording, startRecording, stopRecording } = useRecording();

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleStart = () => {
    if (selected.length === 0) return;
    startRecording(selected);
    setOpen(false);
  };

  if (isAnyRecording) {
    return (
      <button
        onClick={stopRecording}
        className="flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-1.5 font-mono text-xs text-red-400 hover:bg-red-500/20 transition-colors"
      >
        <Square className="h-3 w-3 fill-current" />
        Stop recording
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 font-mono text-xs text-foreground hover:bg-accent transition-colors"
        style={{
          borderColor: "#ef4444",
          boxShadow: "0 0 0 1px #ef444433 inset, 0 0 12px -2px #ef4444, 0 0 24px -8px #ef4444",
        }}
      >
        <Circle className="h-4 w-4 fill-current text-red-500" />
        Record
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Select cameras to record</DialogTitle>
          <DialogDescription>
            Each selected camera will be saved as its own .webm file when you stop recording.
          </DialogDescription>

          <div className="flex flex-col gap-2 mt-2">
            {CAM_LIST.map((cam) => (
              <label
                key={cam.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(cam.id)}
                  onChange={() => toggle(cam.id)}
                  className="accent-red-500"
                />
                <span className="font-mono text-xs">
                  {cam.id} · {cam.label}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={selected.length === 0}
            className="mt-4 w-full py-2 rounded-md bg-red-500 hover:bg-red-600 disabled:bg-accent disabled:cursor-not-allowed text-white font-mono text-xs font-semibold transition-colors"
          >
            Start recording {selected.length > 0 && `(${selected.length})`}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
