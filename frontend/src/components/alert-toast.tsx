import { ShieldAlert, X } from "lucide-react";
import { useAlerts } from "@/contexts/alert-context";

export function AlertToast() {
  const { activeAlert, dismissAlert } = useAlerts();

  if (!activeAlert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className="flex items-center gap-3 rounded-xl border px-4 py-3 bg-card/95 backdrop-blur-xl shadow-2xl max-w-md"
        style={{
          borderColor: "#ef4444",
          boxShadow: "0 0 0 1px #ef444433 inset, 0 0 20px -4px #ef4444, 0 0 40px -12px #ef4444",
        }}
      >
        <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[9px] tracking-widest uppercase text-red-400 mb-0.5">
            URGENT: Safety Alert
          </div>
          <p className="text-xs text-foreground leading-snug">{activeAlert.message}</p>
        </div>
        <button
          onClick={dismissAlert}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}