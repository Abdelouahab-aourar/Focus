import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Settings2, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import "./App.css";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

let permissionGranted = await isPermissionGranted();

if (!permissionGranted) {
  const permission = await requestPermission();
  permissionGranted = permission === 'granted';
}

const MODES = [
  { key: "focus", label: "Focus", color: "#f2a541" },
  { key: "break", label: "Break", color: "#2bb3a3" },
  { key: "rest", label: "Rest", color: "#8a7fd1" },
] as const;

type ModeKey = (typeof MODES)[number]["key"];

const DEFAULT_DURATIONS: Record<ModeKey, number> = {
  focus: 90 * 60,
  break: 5 * 60,
  rest: 30 * 60,
};

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function App() {
  const [durations, setDurations] = useState(DEFAULT_DURATIONS);
  const [mode, setMode] = useState<ModeKey>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("focus.soundMuted") === "true";
  });
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeMode = MODES.find((m) => m.key === mode)!;
  const totalSeconds = durations[mode];
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const stopAlarmSound = useCallback(() => {
    const alarmAudio = alarmAudioRef.current;
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
    setIsAlarmPlaying(false);
  }, []);

  const playAlarmSound = useCallback(async () => {
    if (isSoundMuted) {
      return;
    }

    if (!alarmAudioRef.current) {
      alarmAudioRef.current = new Audio("/sounds/notification_sound.m4a");
      alarmAudioRef.current.preload = "auto";
      alarmAudioRef.current.loop = true;
    }

    const alarmAudio = alarmAudioRef.current;
    alarmAudio.pause();
    alarmAudio.currentTime = 0;

    try {
      await alarmAudio.play();
      setIsAlarmPlaying(true);
    } catch {
      setIsAlarmPlaying(false);
    }
  }, [isSoundMuted]);

  useEffect(() => {
    window.localStorage.setItem("focus.soundMuted", String(isSoundMuted));
    if (isSoundMuted) {
      stopAlarmSound();
    }
  }, [isSoundMuted, stopAlarmSound]);

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
            void sendNotification({ title: 'Focus', body: `${activeMode.label.charAt(0).toUpperCase() + activeMode.label.slice(1)} time is over!` });
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

  const getDurationParts = (total: number) => ({
    minutes: Math.floor(total / 60),
    seconds: total % 60,
  });

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#16161c] p-6 font-sans">
      <Card className="relative w-full max-w-105 overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#1f1f27] p-1 shadow-none">
        <CardContent className="relative p-6 pt-6">
          <div >
            <div className="mb-7 flex items-center gap-2">
              <div className="flex flex-1 gap-1 rounded-full bg-[#16161c] p-1">
                {MODES.map((m) => {
                  const isActive = m.key === mode;
                  return (
                    <Button
                      key={m.key}
                      onClick={() => switchMode(m.key)}
                      variant="ghost"
                      className="flex-1 rounded-full px-0 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-white/5"
                      style={{
                        color: isActive ? "#16161c" : "rgba(255,255,255,0.55)",
                        backgroundColor: isActive ? m.color : "transparent",
                      }}
                    >
                      {m.label}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Settings"
                onClick={() => setShowSettings((s) => !s)}
                className={`h-9.5 w-9.5 shrink-0 rounded-full border-white/10 text-white/70 hover:bg-white/10 hover:text-white ${showSettings ? "bg-white/8" : "bg-transparent"}`}
              >
                {showSettings ? <X size={18} /> : <Settings2 size={18} />}
              </Button>
            </div>

            {showSettings ? (
              <div className="flex flex-col gap-4 px-1 pb-2 pt-1">
                <p className="m-0 text-[13px] text-white/45">Set each mode in minutes and seconds.</p>
                {MODES.map((m) => (
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
                        value={getDurationParts(durations[m.key]).minutes}
                        onChange={(e) =>
                          updateDuration(m.key, Number(e.target.value), getDurationParts(durations[m.key]).seconds)
                        }
                        className="h-9 w-14 rounded-lg border-white/12 bg-[#16161c] text-center text-sm text-white focus-visible:ring-1 focus-visible:ring-white/30"
                      />
                      <span className="text-[13px] text-white/40">min</span>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={getDurationParts(durations[m.key]).seconds}
                        onChange={(e) =>
                          updateDuration(m.key, getDurationParts(durations[m.key]).minutes, Number(e.target.value))
                        }
                        className="h-9 w-14 rounded-lg border-white/12 bg-[#16161c] text-center text-sm text-white focus-visible:ring-1 focus-visible:ring-white/30"
                      />
                      <span className="text-[13px] text-white/40">sec</span>
                    </div>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/6 bg-[#16161c] p-3">
                  <span className="text-sm font-medium text-white/85">Sound</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSoundMuted((muted) => !muted)}
                    className="shrink-0 rounded-full border-white/10 bg-transparent px-3 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {isSoundMuted ? "Unmute" : "Mute"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="my-2 mb-7 flex justify-center">
                  <svg width={260} height={260} viewBox="0 0 260 260">
                    <circle
                      cx={130}
                      cy={130}
                      r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={12}
                    />
                    <circle
                      cx={130}
                      cy={130}
                      r={radius}
                      fill="none"
                      stroke={activeMode.color}
                      strokeWidth={12}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 130 130)"
                      className="transition-[stroke-dashoffset] duration-900 ease-linear"
                    />
                    <text
                      x={130}
                      y={124}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={36}
                      fontWeight={700}
                      fontFamily="'JetBrains Mono', monospace"
                    >
                      {formatTime(secondsLeft)}
                    </text>
                    <text
                      x={130}
                      y={152}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.4)"
                      fontSize={12}
                      fontFamily="'Manrope', sans-serif"
                      letterSpacing="1.5"
                    >
                      {activeMode.label.toUpperCase()}
                    </text>
                  </svg>
                </div>

                <div className="flex items-center justify-center gap-5">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Reset"
                    onClick={handleReset}
                    className="h-12 w-12 rounded-full border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <RotateCcw size={20} />
                  </Button>
                  <Button
                    size="icon"
                    aria-label={isRunning ? "Pause" : "Start"}
                    onClick={handleStartPause}
                    className="h-18 w-18 rounded-full border-none text-[#16161c] hover:opacity-90"
                    style={{
                      backgroundColor: activeMode.color,
                      boxShadow: `0 0 0 6px ${activeMode.color}22`,
                    }}
                  >
                    {isRunning ? (
                      <Pause size={28} fill="#16161c" />
                    ) : (
                      <Play size={28} fill="#16161c" className="ml-0.75" />
                    )}
                  </Button>
                  <div className="flex h-12 items-center justify-end">
                    {isAlarmPlaying ? (
                      <Button
                        variant="destructive"
                        onClick={stopAlarmSound}
                        className="group flex h-12 w-12 items-center justify-start gap-2 overflow-hidden rounded-full border-red-500/20 bg-red-500/10 px-3 text-red-100 transition-[width,background-color,color] duration-200 hover:w-33 hover:bg-red-500/20 hover:text-white"
                      >
                        <VolumeX size={18} />
                        <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          Stop sound
                        </span>
                      </Button>
                    ) : (
                      <div className="w-12" />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}