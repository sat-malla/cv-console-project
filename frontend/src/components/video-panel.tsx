import { useRef, useEffect } from "react";
import { useRecording } from "@/contexts/recording-context";

interface VideoPanelProps {
  url: string;
  camId: string;
  onSocket?: (ws: WebSocket) => void;
  skipRecording?: boolean
}

export default function VideoPanel({ url, camId, onSocket, skipRecording }: VideoPanelProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { registerCanvas } = useRecording();

  useEffect(() => {
    if (canvasRef.current && !skipRecording) {
      registerCanvas(camId, canvasRef.current);
    }
  }, [camId, skipRecording]);

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.binaryType = "blob";
    ws.onopen = () => onSocket?.(ws);

    ws.onmessage = (event: MessageEvent<Blob>) => {
      const objectUrl = URL.createObjectURL(event.data);
      const img = imgRef.current;
      const canvas = canvasRef.current;
      if (!img || !canvas) return;

      URL.revokeObjectURL(img.src);
      img.src = objectUrl;

      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            console.log(
              "Canvas resized mid-stream:",
              canvas.width,
              canvas.height,
              "->",
              img.naturalWidth,
              img.naturalHeight,
            );
          }
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
        }
      };
    };

    ws.onerror = (err) => console.log("Error: ", err);

    return () => ws.close();
  }, [url]);

  return (
    <>
      <img ref={imgRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}
