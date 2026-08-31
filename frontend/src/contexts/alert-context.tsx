import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react";
import { useCameraSessions } from "@/contexts/camera-sessions-context";

type AlertEntry = {
  id: number;
  message: string;
  created_at: string;
};

type Ctx = {
  activeAlert: AlertEntry | null;
  dismissAlert: () => void;
};

const AlertCtx = createContext<Ctx | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const { activeSession } = useCameraSessions();
  const [activeAlert, setActiveAlert] = useState<AlertEntry | null>(null);
  const lastSeenFlagId = useRef<number | null>(null);

  useEffect(() => {
    if (!activeSession) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/session/${activeSession.sessionId}/logs?flagged_only=true&limit=1`
        );
        const data = await res.json();
        const latest = data.logs?.[0];

        if (latest && latest.id !== lastSeenFlagId.current) {
          lastSeenFlagId.current = latest.id;
          setActiveAlert(latest);
          setTimeout(() => {
            setActiveAlert((curr) => (curr?.id === latest.id ? null : curr));
          }, 8000);
        }
      } catch (e) {
        console.error("Alert poll failed:", e);
      }
    }, 1000);

    return () => clearInterval(poll);
  }, [activeSession]);

  const dismissAlert = () => setActiveAlert(null);

  return (
    <AlertCtx.Provider value={{ activeAlert, dismissAlert }}>
      {children}
    </AlertCtx.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertCtx);
  if (!ctx) throw new Error("useAlerts must be used within AlertProvider");
  return ctx;
}