import { useRef, useEffect } from "react";

interface VideoPanelProps {
  url: string;
}


export default function VideoPanel({ url }: VideoPanelProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.binaryType = "blob";

    ws.onmessage = (event: MessageEvent<Blob>) => {
      const objectUrl = URL.createObjectURL(event.data);
      if (imgRef.current) {
        URL.revokeObjectURL(imgRef.current.src);
        imgRef.current.src = objectUrl;
      }
    };

    ws.onerror = (err) => console.log("Error: ", err);

    return () => ws.close();
  }, [url])

  return (
    <img 
      ref={imgRef}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  )
}
