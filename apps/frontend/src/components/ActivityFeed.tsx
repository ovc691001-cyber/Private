import type { ActivityItem } from "@/app/page";
import { AppIcon } from "./Icon";

const KIND_ICON: Record<ActivityItem["kind"], "activity" | "quick" | "rating"> = {
  system: "activity",
  market: "quick",
  leaderboard: "rating"
};

const KIND_TONE: Record<ActivityItem["kind"], "lime" | "purple" | "cyan"> = {
  system: "lime",
  market: "purple",
  leaderboard: "cyan"
};

export function ActivityFeed({ items, showHeader = true }: { items: ActivityItem[]; showHeader?: boolean }) {
  return (
    <section className="upliks-section">
      {showHeader ? (
        <div className="section-title-row">
          <h2>Живая активность</h2>
          <span className="subtle">Обновляется каждые несколько секунд</span>
        </div>
      ) : null}

      <div className="stack-list">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="activity-item-row upliks-card">
              <span className={`activity-badge ${item.kind}`}>
                <AppIcon name={KIND_ICON[item.kind]} size={14} tone={KIND_TONE[item.kind]} />
              </span>
              <p>{item.text}</p>
            </article>
          ))
        ) : (
          <div className="empty-card upliks-card">Как только появятся новые события раунда, лента сразу оживет.</div>
        )}
      </div>
    </section>
  );
}
