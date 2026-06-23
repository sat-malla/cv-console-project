import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type CameraDevice = { name: string; index: number };

type Ctx = {
  cameras: CameraDevice[];
  activeIndex: number | null;
  isLoading: boolean;
  refreshCameras: () => Promise<void>;
  selectCamera: (index: number) => Promise<void>;
  disconnectCamera: () => Promise<void>;
};

const CameraSourceCtx = createContext<Ctx | null>(null);

export function CameraSourceProvider({ children }: { children: ReactNode }) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCameras = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/cameras");
      const data = await res.json();
      setCameras(data.cameras ?? []);
    } catch (e) {
      console.error("Failed to fetch cameras:", e);
      setCameras([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectCamera = async (index: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/select-camera?index=${index}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActiveIndex(index);
      } else {
        console.error("Failed to select camera:", data.error);
      }
    } catch (e) {
      console.error("select-camera request failed:", e);
    }
  };

  const disconnectCamera = async () => {
    try {
      await fetch("http://127.0.0.1:8000/disconnect-camera", { method: "POST" });
      setActiveIndex(null);
    } catch (e) {
      console.error("disconnect-camera request failed:", e);
    }
  };

  useEffect(() => {
    refreshCameras();
  }, []);

  return (
    <CameraSourceCtx.Provider value={{ cameras, activeIndex, isLoading, refreshCameras, selectCamera, disconnectCamera }}>
      {children}
    </CameraSourceCtx.Provider>
  );
}

export function useCameraSource() {
  const ctx = useContext(CameraSourceCtx);
  if (!ctx) throw new Error("useCameraSource must be used within CameraSourceProvider");
  return ctx;
}