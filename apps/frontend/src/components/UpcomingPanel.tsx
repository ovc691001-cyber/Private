import { AppIcon } from "./Icon";

const items = [
  {
    id: "duels",
    title: "Дуэли",
    description: "Собирай портфель и соревнуйся с другим игроком на короткой дистанции.",
    icon: "duels" as const
  },
  {
    id: "events",
    title: "Турниры",
    description: "Ежедневный формат на длинной дистанции с рейтингом и итоговой таблицей.",
    icon: "event" as const
  }
];

export function UpcomingPanel() {
  return (
    <section className="upliks-section">
      <div className="section-title-row">
        <h2>Скоро</h2>
        <span className="subtle">Откроется активным игрокам</span>
      </div>

      <div className="stack-list">
        {items.map((item) => (
          <article key={item.id} className="upcoming-card upliks-card">
            <span className="upcoming-icon">
              <AppIcon name={item.icon} size={20} tone={item.id === "duels" ? "purple" : "lime"} />
            </span>
            <div className="upcoming-copy">
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
