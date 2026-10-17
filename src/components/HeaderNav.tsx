import { Button } from "@/components/ui/button";
import { Settings2, Clock, X } from "lucide-react";

export type ActiveTab = "timer" | "settings" | "prayer";

interface HeaderNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  modes: readonly { key: string; label: string; color: string }[];
  currentMode: string;
  onSelectMode: (key: any) => void;
}

export function HeaderNav({
  activeTab,
  setActiveTab,
  modes,
  currentMode,
  onSelectMode,
}: HeaderNavProps) {
  const toggleTab = (target: "settings" | "prayer") => {
    setActiveTab(activeTab === target ? "timer" : target);
  };

  return (
    <div className="mb-7 flex items-center gap-2">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-1 gap-1 rounded-full bg-[#16161c] p-1">
        {modes.map((m) => {
          const isActive = m.key === currentMode && activeTab === "timer";
          return (
            <Button
              key={m.key}
              onClick={() => {
                setActiveTab("timer");
                onSelectMode(m.key);
              }}
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

      {/* Prayer Page Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        aria-label="Prayer Times"
        onClick={() => toggleTab("prayer")}
        className={`h-9.5 w-9.5 shrink-0 rounded-full border-white/10 text-white/70 hover:bg-white/10 hover:text-white ${activeTab === "prayer" ? "bg-white/15 text-white" : "bg-transparent"
          }`}
      >
        {activeTab === "prayer" ? <X size={18} /> : <Clock size={18} />}
      </Button>

      {/* Settings Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        aria-label="Settings"
        onClick={() => toggleTab("settings")}
        className={`h-9.5 w-9.5 shrink-0 rounded-full border-white/10 text-white/70 hover:bg-white/10 hover:text-white ${activeTab === "settings" ? "bg-white/15 text-white" : "bg-transparent"
          }`}
      >
        {activeTab === "settings" ? <X size={18} /> : <Settings2 size={18} />}
      </Button>
    </div>
  );
}