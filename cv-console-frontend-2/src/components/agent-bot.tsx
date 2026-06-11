import { Bot, X } from "lucide-react";
import { useState } from "react";

export function AgentBot() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-72 rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-4 shadow-2xl"
          style={{ boxShadow: "0 0 30px -6px #b908ff66, 0 0 60px -20px #ff08d666" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">PRISM Agent</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI co-pilot coming online soon. I'll help you query feeds, flag anomalies, and summarize events.
          </p>
          <div className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-xs font-mono text-muted-foreground">
            chat · offline
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open agent"
        className="relative h-14 w-14 rounded-full grid place-items-center text-white transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #2008ff, #b908ff 50%, #ff08d6)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.2) inset, 0 0 24px -2px #b908ff, 0 0 60px -10px #ff08d6",
        }}
      >
        <Bot className="h-6 w-6" />
      </button>
    </div>
  );
}
