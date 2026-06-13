import type { Cam } from "./camera-grid";

interface SettingParam {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
}

interface SettingsPanelProps {
  activeCam: Cam | null;
  activePanel: number;
  activeSettings: SettingParam[];
  config: Record<number, Record<string, number>>;
  setActivePanel: (val: number | null) => void;
  updateConfig: (camIdx: number, key: string, val: number) => void;
}

export default function SettingsPanel({ 
    activeCam, 
    activePanel,
    activeSettings, 
    config,
    setActivePanel,
    updateConfig
}: SettingsPanelProps) {
    if (!activeCam) return null;
    return (
        <div className="w-64 shrink-0 rounded-2xl bg-card border border-white/10 p-4 font-mono text-[11px] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/40 tracking-widest uppercase text-[9px] mb-0.5">Panel settings</div>
              <div className="text-white font-semibold tracking-wide">
                {activeCam.id} · {activeCam.type.charAt(0).toUpperCase() + activeCam.type.slice(1)}
              </div>
            </div>
            <button
              onClick={() => setActivePanel(null)}
              className="w-6 h-6 flex items-center justify-center rounded border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>

          {activeSettings.length === 0 ? (
            <p className="text-white/30 italic">No parameters for this view.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {activeSettings.map(s => (
                <div key={s.key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/60">{s.label}</span>
                    <span className="text-white font-semibold">{config[activePanel][s.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={config[activePanel][s.key]}
                    onChange={e => updateConfig(activePanel, s.key, Number(e.target.value))}
                    className="w-full accent-white"
                  />
                  <div className="flex justify-between text-white/20 text-[9px] mt-0.5">
                    <span>{s.min}</span><span>{s.max}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => console.log("Apply:", activeCam.id, config[activePanel])}
            className="mt-auto w-full py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors uppercase tracking-widest text-[10px]"
          >
            Apply changes
          </button>
        </div>
    )
}