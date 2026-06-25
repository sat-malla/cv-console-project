import { createContext, useContext, useState, type ReactNode } from "react";

type CameraSession = {
  sessionId: string;
  cameraIndex: number;
  cameraName: string;
};

type Ctx = {
  sessions: CameraSession[];
  activeSessionId: string | null;
  activeSession: CameraSession | null;
  addSession: (index: number, name: string) => Promise<{ success: boolean; error?: string }>;
  removeSession: (sessionId: string) => Promise<void>;
  switchToNext: () => void;
  switchToPrev: () => void;
  switchToSession: (sessionId: string) => void;
};

const CameraSessionsCtx = createContext<Ctx | null>(null);

export function CameraSessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<CameraSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const addSession = async (index: number, name: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/sessions?index=${index}&name=${encodeURIComponent(name)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        const newSession: CameraSession = { sessionId: data.session_id, cameraIndex: index, cameraName: name };
        setSessions((prev) => [...prev, newSession]);
        setActiveSessionId(data.session_id);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  const removeSession = async (sessionId: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/sessions/${sessionId}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.sessionId !== sessionId);
      if (sessionId === activeSessionId) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].sessionId : null);
      }
      return filtered;
    });
  };

  const switchToSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const switchToNext = () => {
    if (sessions.length === 0) return;
    const currentIdx = sessions.findIndex((s) => s.sessionId === activeSessionId);
    const nextIdx = (currentIdx + 1) % sessions.length;
    setActiveSessionId(sessions[nextIdx].sessionId);
  };

  const switchToPrev = () => {
    if (sessions.length === 0) return;
    const currentIdx = sessions.findIndex((s) => s.sessionId === activeSessionId);
    const prevIdx = (currentIdx - 1 + sessions.length) % sessions.length;
    setActiveSessionId(sessions[prevIdx].sessionId);
  };

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) ?? null;

  return (
    <CameraSessionsCtx.Provider
      value={{ sessions, activeSessionId, activeSession, addSession, removeSession, switchToNext, switchToPrev, switchToSession }}
    >
      {children}
    </CameraSessionsCtx.Provider>
  );
}

export function useCameraSessions() {
  const ctx = useContext(CameraSessionsCtx);
  if (!ctx) throw new Error("useCameraSessions must be used within CameraSessionsProvider");
  return ctx;
}