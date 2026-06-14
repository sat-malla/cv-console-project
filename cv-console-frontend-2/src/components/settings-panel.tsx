import { createContext, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type Ctx = {
  openCam: string | null;
  open: (id: string) => void;
  close: () => void;
};

const SettingsPanelCtx = createContext<Ctx | null>(null);

export function SettingsPanelProvider({ children }: { children: ReactNode }) {
  const [openCam, setOpenCam] = useState<string | null>(null);
  return (
    <SettingsPanelCtx.Provider
      value={{ openCam, open: (id) => setOpenCam(id), close: () => setOpenCam(null) }}
    >
      {children}
    </SettingsPanelCtx.Provider>
  );
}

export function useSettingsPanel() {
  const ctx = useContext(SettingsPanelCtx);
  if (!ctx) throw new Error("useSettingsPanel must be used within SettingsPanelProvider");
  return ctx;
}

export function SettingsSidePanel() {
  const { openCam, close } = useSettingsPanel();
  if (!openCam) return null;
  return (
    <aside
      className="w-full sm:w-90 shrink-0 border-l border-border bg-card flex flex-col pr-6"
      aria-label={`${openCam} settings`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="font-mono text-xs tracking-[0.3em] text-muted-foreground">
          {openCam} · SETTINGS
        </div>
        <button
          onClick={close}
          className="rounded-md p-1.5 hover:bg-accent transition-colors"
          aria-label="Close settings panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4" />
    </aside>
  );
}
