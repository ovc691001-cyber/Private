import type { BetHistory } from "@/app/page";
import { CurrencyGlyph } from "./Brand";

export function History({ bets }: { bets: BetHistory[] }) {
  return (
    <section className="upliks-section">
      <div className="section-title-row">
        <h2>История</h2>
        <span className="subtle">Последние 10 раундов</span>
      </div>

      <div className="stack-list">
        {bets.length ? (
          bets.map((bet) => (
            <article key={bet.id} className="history-item upliks-card">
              <div className="history-head">
                <div>
                  <strong>{bet.assetName ?? "—"}</strong>
                  <span>{bet.horizon === "short" ? "Ближайшие тики" : "Перспектива"}</span>
                </div>
                <span className={`status-pill ${bet.status}`}>
                  {bet.status === "won" ? "Успех" : bet.status === "lost" ? "Мимо" : "В процессе"}
                </span>
              </div>

              <div className="history-grid">
                <div>
                  <span>Победитель</span>
                  <strong>{bet.winningAssetName ?? "—"}</strong>
                </div>
                <div>
                  <span>Ставка</span>
                  <strong className="value-inline">
                    {bet.amount.toLocaleString("ru-RU")}
                    <CurrencyGlyph size="sm" />
                  </strong>
                </div>
                <div>
                  <span>Результат</span>
                  <strong className={bet.payout > 0 ? "good" : "bad"}>
                    {bet.payout > 0 ? "+" : ""}
                    {bet.payout - bet.amount}
                    <CurrencyGlyph size="sm" />
                  </strong>
                </div>
                <div>
                  <span>Время</span>
                  <strong>
                    {new Date(bet.placedAt).toLocaleString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit"
                    })}
                  </strong>
                </div>
              </div>

              <div className="history-foot">
                <span>Hash: {bet.seedHash ? `${bet.seedHash.slice(0, 12)}...` : "—"}</span>
                <span>{bet.verifyPath ?? "Verify"}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-card upliks-card">Как только завершатся первые раунды, история появится здесь.</div>
        )}
      </div>
    </section>
  );
}
