import { Play, Pause, RotateCcw, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimerViewProps {
  secondsLeft: number;
  totalSeconds: number;
  activeModeLabel: string;
  activeModeColor: string;
  isRunning: boolean;
  isAlarmPlaying: boolean;
  onStartPause: () => void;
  onReset: () => void;
  onStopAlarm: () => void;
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerView({
  secondsLeft,
  totalSeconds,
  activeModeLabel,
  activeModeColor,
  isRunning,
  isAlarmPlaying,
  onStartPause,
  onReset,
  onStopAlarm,
}: TimerViewProps) {
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = circumference * (1 - progress);

  return (
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
            stroke={activeModeColor}
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
            {activeModeLabel.toUpperCase()}
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-center gap-5">
        <Button
          variant="outline"
          size="icon"
          aria-label="Reset"
          onClick={onReset}
          className="h-12 w-12 rounded-full border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw size={20} />
        </Button>
        <Button
          size="icon"
          aria-label={isRunning ? "Pause" : "Start"}
          onClick={onStartPause}
          className="h-18 w-18 rounded-full border-none text-[#16161c] hover:opacity-90"
          style={{
            backgroundColor: activeModeColor,
            boxShadow: `0 0 0 6px ${activeModeColor}22`,
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
              onClick={onStopAlarm}
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
  );
}