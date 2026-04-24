import type { LeaderboardRow } from "@/app/page";
import { CurrencyGlyph } from "./Brand";

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <section className="upliks-section">
      <div className="section-title-row">
        <h2>Рейтинг дня</h2>
        <span className="subtle">Топ 10</span>
      </div>

      <div className="stack-list">
        {rows.map((row, index) => (
          <article key={`${row.name}-${index}`} className="leaderboard-item upliks-card">
            <div className="leader-rank">{index + 1}</div>
            <div className="leader-copy">
              <strong>{row.name}</strong>
              <span>
                Побед: {row.winsCount} • Winrate {row.winRate}%
              </span>
            </div>
            <div className="leader-score">
              <strong className={row.netProfit >= 0 ? "good" : "bad"}>
                {row.netProfit >= 0 ? "+" : ""}
                {row.netProfit}
                <CurrencyGlyph size="sm" />
              </strong>
              <span>Серия {row.currentStreak}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
