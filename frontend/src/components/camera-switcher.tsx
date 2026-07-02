import { useState } from "react";
import { useCameraSessions } from "@/contexts/camera-sessions-context";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function CameraSwitcher() {
  const { sessions, activeSession, switchToNext, switchToPrev, removeSession } = useCameraSessions();
  const [confirm, setConfirm] = useState(false);

  if (sessions.length === 0) return null;

  const handleConfirmDisc = async () => {
    if (activeSession) {
      await removeSession(activeSession.sessionId);
    }
    setConfirm(false);
  };

  return (
    <>
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
            onClick={() => setConfirm(true)}
            className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors ml-1"
            aria-label="Disconnect this camera"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Disconnect {activeSession?.cameraName}?</DialogTitle>
          <DialogDescription>
            This will close the camera session and permanently delete any saved filter settings for this camera. This can't be undone.
          </DialogDescription>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent text-xs font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDisc}
              className="flex-1 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-mono font-semibold transition-colors"
            >
              Disconnect
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
