export function Legend() {
  return (
    <div className="upliks-map-legend" aria-label="Легенда событий">
      <span>
        <i className="legend-dot growth" />
        Рост
      </span>
      <span>
        <i className="legend-dot fall" />
        Падение
      </span>
      <span>
        <i className="legend-dot neutral" />
        Нейтрально
      </span>
    </div>
  );
}
