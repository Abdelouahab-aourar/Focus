import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { HeaderNav, ActiveTab } from "@/components/HeaderNav";
import { TimerView } from "@/components/TimerView";
import { SettingsView } from "@/components/SettingsView";
import { PrayerTimesView } from "@/components/PrayerTimesView";
import { WILAYAS } from "@/data/prayers";
import "./App.css";

let permissionGranted = false;
if (typeof window !== "undefined") {
  void isPermissionGranted().then(async (granted) => {
    permissionGranted = granted;
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }
  });
}

const MODES = [
  { key: "focus", label: "Focus", color: "#f2a541" },
  { key: "break", label: "Break", color: "#2bb3a3" },
  { key: "rest", label: "Rest", color: "#8a7fd1" },
] as const;

type ModeKey = (typeof MODES)[number]["key"];
type DurationPrefs = Record<ModeKey, number>;
type PrayerPrefs = {
  wilayaName: string;
  communeId: string;
  mutedPrayers: Record<string, boolean>;
};

type UserPrefs = {
  durations: DurationPrefs;
  isSoundMuted: boolean;
  prayerPrefs: PrayerPrefs;
};

const DEFAULT_DURATIONS: DurationPrefs = {
  focus: 60,
  break: 60,
  rest: 60,
};

const defaultWilaya = WILAYAS[4];
const DEFAULT_PRAYER_PREFS: PrayerPrefs = {
  wilayaName: defaultWilaya?.name ?? "Batna",
  communeId: defaultWilaya?.communes[0]?.id ?? "",
  mutedPrayers: {},
};

function isTauriRuntime() {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

function sanitizeDurations(input: Partial<DurationPrefs> | undefined): DurationPrefs {
  const sanitize = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(1, Math.min(180 * 60, Math.round(parsed)));
  };

  return {
    focus: sanitize(input?.focus, DEFAULT_DURATIONS.focus),
    break: sanitize(input?.break, DEFAULT_DURATIONS.break),
    rest: sanitize(input?.rest, DEFAULT_DURATIONS.rest),
  };
}

export default function App() {
  const [durations, setDurations] = useState(DEFAULT_DURATIONS);
  const [mode, setMode] = useState<ModeKey>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("timer");

  const [savePrefsToFile, setSavePrefsToFile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("focus.savePrefsToFile") === "true";
  });

  const [isSoundMuted, setIsSoundMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("focus.soundMuted") === "true";
  });
  const [prayerPrefs, setPrayerPrefs] = useState(DEFAULT_PRAYER_PREFS);

  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [prefsFileStatus, setPrefsFileStatus] = useState<"idle" | "saved" | "error" | "unsupported">("idle");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const initialPrefsLoadHandledRef = useRef(false);

  const activeMode = MODES.find((m) => m.key === mode)!;
  const totalSeconds = durations[mode];

  const stopAlarmSound = useCallback(() => {
    const alarmAudio = alarmAudioRef.current;
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
    setIsAlarmPlaying(false);
  }, []);

  const savePrefsToDataFile = useCallback(async (prefs: UserPrefs) => {
    if (!isTauriRuntime()) {
      setPrefsFileStatus("unsupported");
      return;
    }

    try {
      await invoke("save_user_prefs", { prefs });
      setPrefsFileStatus("saved");
    } catch {
      setPrefsFileStatus("error");
    }
  }, []);

  const playAlarmSound = useCallback(async (
    soundPath = "/sounds/notification_sound.m4a",
    loop = true
  ) => {
    if (isSoundMuted) return;

    if (!alarmAudioRef.current) {
      alarmAudioRef.current = new Audio();
      alarmAudioRef.current.preload = "auto";
    }

    const alarmAudio = alarmAudioRef.current;
    alarmAudio.pause();
    alarmAudio.src = soundPath;
    alarmAudio.currentTime = 0;
    alarmAudio.loop = loop;
    alarmAudio.onended = loop ? null : () => setIsAlarmPlaying(false);

    try {
      await alarmAudio.play();
      setIsAlarmPlaying(true);
    } catch {
      setIsAlarmPlaying(false);
    }
  }, [isSoundMuted]);

  const handlePrayerStarted = useCallback(
    (prayer: string) => {
      if (permissionGranted) {
        void sendNotification({
          title: "Prayer",
          body: `${prayer} Time.`,
        });
      }
      if (!isSoundMuted) {
        void playAlarmSound("/sounds/adhan.m4a", false);
      }
    },
    [isSoundMuted, playAlarmSound]
  );

  useEffect(() => {
    window.localStorage.setItem("focus.soundMuted", String(isSoundMuted));
    if (isSoundMuted) stopAlarmSound();
  }, [isSoundMuted, stopAlarmSound]);

  useEffect(() => {
    window.localStorage.setItem("focus.savePrefsToFile", String(savePrefsToFile));
  }, [savePrefsToFile]);

  useEffect(() => {
    if (initialPrefsLoadHandledRef.current || !savePrefsToFile) return;
    initialPrefsLoadHandledRef.current = true;

    if (!isTauriRuntime()) {
      setPrefsFileStatus("unsupported");
      return;
    }

    void (async () => {
      try {
        const loaded = await invoke<Partial<UserPrefs> | null>("load_user_prefs");
        if (loaded) {
          const nextDurations = sanitizeDurations(loaded.durations);
          setDurations(nextDurations);
          setIsSoundMuted(Boolean(loaded.isSoundMuted));
          if (loaded.prayerPrefs) {
            const wilaya = WILAYAS.find((item) => item.name === loaded.prayerPrefs?.wilayaName) ?? defaultWilaya;
            const communeId = wilaya?.communes.some((commune) => commune.id === loaded.prayerPrefs?.communeId)
              ? loaded.prayerPrefs.communeId!
              : wilaya?.communes[0]?.id ?? "";
            setPrayerPrefs({
              wilayaName: wilaya?.name ?? DEFAULT_PRAYER_PREFS.wilayaName,
              communeId,
              mutedPrayers: loaded.prayerPrefs.mutedPrayers ?? {},
            });
          }
          setSecondsLeft((currentSeconds) => {
            if (isRunning) return currentSeconds;
            const bounded = Math.min(currentSeconds, nextDurations[mode]);
            return Math.max(1, bounded);
          });
        }
      } catch {
        setPrefsFileStatus("error");
      }
    })();
  }, [isRunning, mode, savePrefsToFile]);

  useEffect(() => {
    if (!savePrefsToFile) return;

    void savePrefsToDataFile({
      durations,
      isSoundMuted,
      prayerPrefs,
    });
  }, [durations, isSoundMuted, prayerPrefs, savePrefsToDataFile, savePrefsToFile]);

  useEffect(() => {
    return () => {
      stopAlarmSound();
    };
  }, [stopAlarmSound]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsRunning(false);
          if (permissionGranted) {
            void sendNotification({
              title: "Focus",
              body: `${activeMode.label.charAt(0).toUpperCase() + activeMode.label.slice(1)} time is over!`,
            });
            void playAlarmSound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, activeMode, playAlarmSound]);

  const switchMode = useCallback(
    (key: ModeKey) => {
      setIsRunning(false);
      stopAlarmSound();
      setMode(key);
      setSecondsLeft(durations[key]);
    },
    [durations, stopAlarmSound]
  );

  const handleStartPause = () => {
    if (secondsLeft === 0) {
      stopAlarmSound();
      setSecondsLeft(durations[mode]);
    }
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    setIsRunning(false);
    stopAlarmSound();
    setSecondsLeft(durations[mode]);
  };

  const updateDuration = (key: ModeKey, minutes: number, seconds: number) => {
    const clampedMinutes = Math.max(0, Math.min(180, Math.round(minutes) || 0));
    const clampedSeconds = Math.max(0, Math.min(59, Math.round(seconds) || 0));
    const nextDuration = Math.max(1, clampedMinutes * 60 + clampedSeconds);

    setDurations((prev) => ({ ...prev, [key]: nextDuration }));
    if (key === mode && !isRunning) {
      setSecondsLeft(nextDuration);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#16161c] p-6 font-sans">
      <Card className="relative w-full max-w-105 overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#1f1f27] p-1 shadow-none">
        <CardContent className="relative p-6 pt-6">
          <div>
            <HeaderNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              modes={MODES}
              currentMode={mode}
              onSelectMode={switchMode}
            />

            {activeTab === "settings" && (
              <SettingsView
                modes={MODES}
                durations={durations}
                isSoundMuted={isSoundMuted}
                savePrefsToFile={savePrefsToFile}
                prefsFileStatus={prefsFileStatus}
                onUpdateDuration={updateDuration}
                onToggleSound={() => setIsSoundMuted((s) => !s)}
                onToggleSavePrefs={() => setSavePrefsToFile((s) => !s)}
              />
            )}

            <div className={activeTab === "prayer" ? "" : "hidden"}>
              <PrayerTimesView
                selectedWilayaName={prayerPrefs.wilayaName}
                selectedCommuneId={prayerPrefs.communeId}
                mutedPrayers={prayerPrefs.mutedPrayers}
                onLocationChange={(wilayaName, communeId) =>
                  setPrayerPrefs((prefs) => ({ ...prefs, wilayaName, communeId }))
                }
                onTogglePrayer={(prayer) =>
                  setPrayerPrefs((prefs) => ({
                    ...prefs,
                    mutedPrayers: {
                      ...prefs.mutedPrayers,
                      [prayer]: !prefs.mutedPrayers[prayer],
                    },
                  }))
                }
                isAlarmPlaying={isAlarmPlaying}
                onStopAlarm={stopAlarmSound}
                onPrayerStarted={handlePrayerStarted}
              />
            </div>

            {activeTab === "timer" && (
              <TimerView
                secondsLeft={secondsLeft}
                totalSeconds={totalSeconds}
                activeModeLabel={activeMode.label}
                activeModeColor={activeMode.color}
                isRunning={isRunning}
                isAlarmPlaying={isAlarmPlaying}
                onStartPause={handleStartPause}
                onReset={handleReset}
                onStopAlarm={stopAlarmSound}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}