import { useRef, useEffect } from "react";
import { useRecording } from "@/contexts/recording-context";

interface VideoPanelProps {
  url: string;
  camId: string;
  onSocket?: (ws: WebSocket) => void;
  skipRecording?: boolean;
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

          // Timestamp
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, "0");
          const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
          const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          const timestamp = `${dateStr} ${timeStr}`;

          ctx.font = "16px monospace";
          const textWidth = ctx.measureText(timestamp).width;
          const padding = 8;
          const x = canvas.width - textWidth - padding * 2 - 8;
          const y = canvas.height - 28;

          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(x, y, textWidth + padding * 2, 22);
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillText(timestamp, x + padding, y + 16);

          ctx.font = "14px monospace";
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(8, 8, ctx.measureText(camId).width + 16, 22);
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillText(camId, 16, 24);
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
