import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface SettingsViewProps {
  modes: readonly { key: string; label: string; color: string }[];
  durations: Record<string, number>;
  isSoundMuted: boolean;
  savePrefsToFile: boolean;
  prefsFileStatus: "idle" | "saved" | "error" | "unsupported";
  onUpdateDuration: (key: any, min: number, sec: number) => void;
  onToggleSound: () => void;
  onToggleSavePrefs: () => void;
}

export function SettingsView({
  modes,
  durations,
  isSoundMuted,
  savePrefsToFile,
  prefsFileStatus,
  onUpdateDuration,
  onToggleSound,
  onToggleSavePrefs,
}: SettingsViewProps) {
  const getDurationParts = (total: number) => ({
    minutes: Math.floor(total / 60),
    seconds: total % 60,
  });

  return (
    <div className="flex flex-col gap-4 px-1 pb-2 pt-1">
      <p className="m-0 text-[13px] text-white/45">Set each mode in minutes and seconds.</p>
      {modes.map((m) => {
        const parts = getDurationParts(durations[m.key] || 0);
        return (
          <div key={m.key} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-sm text-white/85">{m.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={180}
                value={parts.minutes}
                onChange={(e) =>
                  onUpdateDuration(m.key, Number(e.target.value), parts.seconds)
                }
                className="h-9 w-14 rounded-lg border-white/12 bg-[#16161c] text-center text-sm text-white focus-visible:ring-1 focus-visible:ring-white/30"
              />
              <span className="text-[13px] text-white/40">min</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={parts.seconds}
                onChange={(e) =>
                  onUpdateDuration(m.key, parts.minutes, Number(e.target.value))
                }
                className="h-9 w-14 rounded-lg border-white/12 bg-[#16161c] text-center text-sm text-white focus-visible:ring-1 focus-visible:ring-white/30"
              />
              <span className="text-[13px] text-white/40">sec</span>
            </div>
          </div>
        );
      })}

      <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/6 bg-[#16161c] p-3">
        <span className="text-sm font-medium text-white/85">Sound</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSound}
          className="shrink-0 rounded-full border-white/10 bg-transparent px-3 text-white/80 hover:bg-white/10 hover:text-white"
        >
          {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {isSoundMuted ? "Unmute" : "Mute"}
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-[#16161c] p-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/85">Save Prefs To File</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSavePrefs}
          className="shrink-0 rounded-full border-white/10 bg-transparent px-3 text-white/80 hover:bg-white/10 hover:text-white"
        >
          {savePrefsToFile ? "On" : "Off"}
        </Button>
      </div>

      {savePrefsToFile && (
        <p className="m-0 px-1 text-[12px] text-white/45">
          {prefsFileStatus === "saved"
            ? "Preferences saved to data folder."
            : prefsFileStatus === "unsupported"
              ? "File save is only available in the Tauri desktop app."
              : prefsFileStatus === "error"
                ? "Could not save preferences file."
                : "Preferences will be saved automatically."}
        </p>
      )}
    </div>
  );
}