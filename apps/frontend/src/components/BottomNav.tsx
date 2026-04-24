import type { AppTab } from "@/app/page";
import { AppIcon } from "./Icon";

const navItems: Array<{
  id: AppTab;
  label: string;
  icon: "lobby" | "assets" | "map" | "events" | "profile";
}> = [
  { id: "lobby", label: "Лобби", icon: "lobby" },
  { id: "assets", label: "Активы", icon: "assets" },
  { id: "map", label: "Карта", icon: "map" },
  { id: "events", label: "События", icon: "events" },
  { id: "profile", label: "Профиль", icon: "profile" }
];

export function BottomNav({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item ${active === item.id ? "active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon">
            <AppIcon name={item.icon} size={20} tone={active === item.id ? "lime" : "muted"} />
          </span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}
