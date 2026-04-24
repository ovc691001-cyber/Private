import type { Round } from "@/app/page";

export function AuditBlock({ round }: { round: Round }) {
  return (
    <section className="upliks-section">
      <div className="section-title-row">
        <h2>Fairness</h2>
        <span className="subtle">Seed hash • reveal • verify</span>
      </div>

      <article className="audit-card upliks-card">
        <div>
          <span>Hash</span>
          <strong>{round.seedHash}</strong>
        </div>
        <div>
          <span>Seed</span>
          <strong>{round.revealedSeed ?? "Откроется после расчета"}</strong>
        </div>
        <div>
          <span>Verify</span>
          <strong>{`/rounds/${round.id}/verify`}</strong>
        </div>
      </article>
    </section>
  );
}
