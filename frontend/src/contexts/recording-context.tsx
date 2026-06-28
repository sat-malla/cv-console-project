import { createContext, useContext, useRef, useState, type ReactNode } from "react";

type RecordingState = Record<string, boolean>;

type Ctx = {
  recordingState: RecordingState;
  isAnyRecording: boolean;
  isDownloading: boolean;
  registerCanvas: (camId: string, canvas: HTMLCanvasElement) => void;
  startRecording: (camIds: string[], format: "webm" | "mp4" | "mov") => void;
  stopRecording: () => void;
};

const RecordingCtx = createContext<Ctx | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [recordingState, setRecordingState] = useState<RecordingState>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement>>({});
  const recorders = useRef<Record<string, MediaRecorder>>({});
  const chunks = useRef<Record<string, Blob[]>>({});
  const exportFormatRef = useRef<"webm" | "mp4" | "mov">("webm");
  const pendingDownloads = useRef(0);

  const registerCanvas = (camId: string, canvas: HTMLCanvasElement) => {
    canvasRefs.current[camId] = canvas;
  };

  const startRecording = (camIds: string[], format: "webm" | "mp4" | "mov") => {
    exportFormatRef.current = format;
    const newState: RecordingState = {};

    camIds.forEach((camId) => {
      const canvas = canvasRefs.current[camId];
      if (!canvas) return;

      const stream = canvas.captureStream(30); // 30 fps
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      chunks.current[camId] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current[camId].push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks.current[camId], { type: "video/webm" });
        const format = exportFormatRef.current;
        if (format === "webm") {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${camId}_${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            pendingDownloads.current -= 1;
            if (pendingDownloads.current <= 0) {
                setIsDownloading(false);
            }
            return;
        }

        try {
            const formData = new FormData();
            formData.append("file", blob, `${camId}.webm`);

            const response = await fetch(`http://127.0.0.1:8000/convert?format=${format}`, {
                method: "POST",
                body: formData,
            });

            const convertedBlob = await response.blob();
            const url = URL.createObjectURL(convertedBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${camId}_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Conversion/download failed:", e);
        } finally {
            pendingDownloads.current -= 1;
          if (pendingDownloads.current <= 0) setIsDownloading(false);
        }
      };

      recorder.start();
      recorders.current[camId] = recorder;
      newState[camId] = true;
    });

    setRecordingState(newState);
  };

  const stopRecording = () => {
    const activeCamIds = Object.keys(recorders.current);
    pendingDownloads.current = activeCamIds.length;
    setIsDownloading(true); 

    Object.values(recorders.current).forEach((r) => r.stop());
    recorders.current = {};
    setRecordingState({});
  };

  const isAnyRecording = Object.values(recordingState).some(Boolean);

  return (
    <RecordingCtx.Provider value={{ recordingState, isAnyRecording, isDownloading, registerCanvas, startRecording, stopRecording }}>
      {children}
    </RecordingCtx.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingCtx);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}