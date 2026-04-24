import type { Mission } from "@/app/page";
import { CurrencyGlyph } from "./Brand";

type Props = {
  missions: Mission[];
  busy?: boolean;
  onClaim: (missionId: string) => void;
  compact?: boolean;
  showHeader?: boolean;
};

export function MissionsPanel({ missions, busy, onClaim, compact, showHeader = true }: Props) {
  const visible = compact ? missions.slice(0, 2) : missions;
  const readyCount = missions.filter((mission) => mission.claimable && !mission.claimed).length;

  return (
    <section className="upliks-section">
      {showHeader ? (
        <div className="section-title-row">
          <h2>Миссии дня</h2>
          <span className="subtle">{readyCount ? `${readyCount} готовы` : "Обновляются в течение дня"}</span>
        </div>
      ) : null}

      <div className="stack-list">
        {visible.length ? (
          visible.map((mission) => (
            <article key={mission.id} className="mission-item upliks-card">
              <div className="mission-copy">
                <strong>{mission.title}</strong>
                <span>{mission.description}</span>
              </div>

              <div className="mission-progress">
                <div className="progress-track">
                  <span style={{ width: `${Math.min(100, (mission.progress / mission.target) * 100)}%` }} />
                </div>
                <div className="mission-meta">
                  <span>
                    {mission.progress}/{mission.target}
                  </span>
                  <strong className="value-inline">
                    {mission.reward}
                    <CurrencyGlyph size="sm" />
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className={`ghost-button small mission-cta ${mission.claimed ? "muted" : mission.claimable ? "ready" : ""}`}
                disabled={busy || !mission.claimable || mission.claimed}
                onClick={() => onClaim(mission.id)}
              >
                {mission.claimed ? "Забрано" : mission.claimable ? "Забрать" : "В процессе"}
              </button>
            </article>
          ))
        ) : (
          <div className="empty-card upliks-card">Новые задания появятся в следующем игровом цикле.</div>
        )}
      </div>
    </section>
  );
}
