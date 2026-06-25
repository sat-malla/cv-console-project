import { useCameraSessions } from "@/contexts/camera-sessions-context";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function CameraSwitcher() {
  const { sessions, activeSession, switchToNext, switchToPrev, removeSession } = useCameraSessions();

  if (sessions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 font-mono text-xs">
      <button
        onClick={switchToPrev}
        disabled={sessions.length <= 1}
        className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous camera"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="px-2 text-foreground min-w-25 text-center truncate">
        {activeSession?.cameraName ?? "No camera"}
      </span>

      <button
        onClick={switchToNext}
        disabled={sessions.length <= 1}
        className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next camera"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {activeSession && (
        <button
          onClick={() => removeSession(activeSession.sessionId)}
          className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors ml-1"
          aria-label="Disconnect this camera"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}