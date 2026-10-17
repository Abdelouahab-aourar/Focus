import { useState, useEffect, useRef } from "react";
import { WILAYAS, PrayerTimes, Commune } from "@/data/prayers";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Volume2, VolumeX } from "lucide-react";

interface PrayerTimesViewProps {
  selectedWilayaName: string;
  selectedCommuneId: string;
  mutedPrayers: Record<string, boolean>;
  onLocationChange: (wilayaName: string, communeId: string) => void;
  onTogglePrayer: (prayer: keyof PrayerTimes) => void;
  isAlarmPlaying: boolean;
  onStopAlarm: () => void;
  onPrayerStarted: (prayer: keyof PrayerTimes) => void;
}

const INITIAL_PRAYER_TIMES: PrayerTimes = {
  Fajr: "Undefined",
  Dhuhr: "Undefined",
  Asr: "Undefined",
  Maghrib: "Undefined",
  Isha: "Undefined",
};

export function PrayerTimesView({
  selectedWilayaName,
  selectedCommuneId,
  mutedPrayers,
  onLocationChange,
  onTogglePrayer,
  isAlarmPlaying,
  onStopAlarm,
  onPrayerStarted,
}: PrayerTimesViewProps) {
  const currentWilaya =
    WILAYAS.find((w) => w.name === selectedWilayaName) || WILAYAS[0];

  const currentCommune: Commune | undefined =
    currentWilaya?.communes.find((c) => c.id === selectedCommuneId) ||
    currentWilaya?.communes[0];

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>(INITIAL_PRAYER_TIMES);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const playedPrayersRef = useRef(new Set<string>());

  useEffect(() => {
    if (!currentCommune) return;

    const { latitude: lat, longitude: lng } = currentCommune;

    if (!lat || !lng) {
      setPrayerTimes(INITIAL_PRAYER_TIMES);
      return;
    }

    const controller = new AbortController();

    async function fetchPrayerTimes() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://ummahapi.com/api/prayer-times?lat=${lat}&lng=${lng}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        const times = data.data?.prayer_times;

        setPrayerTimes({
          Fajr: times.fajr ?? "Undefined",
          Dhuhr: times.dhuhr ?? "Undefined",
          Asr: times.asr ?? "Undefined",
          Maghrib: times.maghrib ?? "Undefined",
          Isha: times.isha ?? "Undefined",
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch prayer times:", err);
          setError("Failed to load times");
        }
      } finally {
        setLoading(false);
      }
    }

    void fetchPrayerTimes();

    return () => {
      controller.abort();
    };
  }, [currentCommune]);

  useEffect(() => {
    const checkPrayerTime = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const dayKey = now.toISOString().slice(0, 10);

      (Object.keys(prayerTimes) as Array<keyof PrayerTimes>).forEach((prayer) => {
        const prayerTime = prayerTimes[prayer].match(/\b\d{1,2}:\d{2}\b/)?.[0];
        if (!prayerTime || prayerTime.padStart(5, "0") !== currentTime || mutedPrayers[prayer]) return;

        const playedKey = `${dayKey}:${selectedCommuneId}:${prayer}`;
        if (playedPrayersRef.current.has(playedKey)) return;
        playedPrayersRef.current.add(playedKey);

        onPrayerStarted(prayer);
      });
    };

    checkPrayerTime();
    const interval = window.setInterval(checkPrayerTime, 1000);
    return () => window.clearInterval(interval);
  }, [mutedPrayers, onPrayerStarted, prayerTimes, selectedCommuneId]);

  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wName = e.target.value;
    const newWilaya = WILAYAS.find((w) => w.name === wName);
    if (newWilaya && newWilaya.communes.length > 0) {
      onLocationChange(wName, newWilaya.communes[0].id);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-1 pb-2 pt-1 text-white">
      {/* Location Selectors */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-[#16161c] p-3.5">
        <div className="flex items-center justify-between text-white/60">
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span className="text-xs font-medium uppercase tracking-wider">
              Location
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Wilaya Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-white/40">Wilaya</label>
            <select
              value={selectedWilayaName}
              onChange={handleWilayaChange}
              className="h-9 w-full rounded-lg border border-white/12 bg-[#1f1f27] px-2 text-xs text-white outline-none focus:border-white/30"
            >
              {WILAYAS.map((w) => (
                <option key={w.name} value={w.name} className="bg-[#1f1f27]">
                  {w.id} - {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Commune Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-white/40">Commune</label>
            <select
              value={selectedCommuneId}
              onChange={(e) => onLocationChange(selectedWilayaName, e.target.value)}
              className="h-9 w-full rounded-lg border border-white/12 bg-[#1f1f27] px-2 text-xs text-white outline-none focus:border-white/30"
            >
              {currentWilaya?.communes.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1f1f27]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs text-white/50">
          <Loader2 size={14} className="animate-spin" />
          <span>Updating prayer times...</span>
        </div>
      )}

      {error && (
        <div className="text-center text-xs text-red-400/80">{error}</div>
      )}

      {isAlarmPlaying && (
        <Button
          variant="destructive"
          onClick={onStopAlarm}
          className="self-center rounded-full border-red-500/20 bg-red-500/10 px-4 text-red-100 hover:bg-red-500/20 hover:text-white"
        >
          <VolumeX size={16} />
          Stop sound
        </Button>
      )}

      {/* Prayer Times List */}
      <div className="flex flex-col gap-2">
        {(Object.keys(prayerTimes) as Array<keyof PrayerTimes>).map((prayer) => (
          <div
            key={prayer}
            className="flex items-center justify-between rounded-2xl border border-white/6 bg-[#16161c] px-4 py-3"
          >
            <span className="text-sm font-medium text-white/85">{prayer}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-[#f2a541]">
                {prayerTimes[prayer]}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={mutedPrayers[prayer] ? `Unmute ${prayer}` : `Mute ${prayer}`}
                title={mutedPrayers[prayer] ? "Unmute" : "Mute"}
                onClick={() => onTogglePrayer(prayer)}
                className="rounded-full border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
              >
                {mutedPrayers[prayer] ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}