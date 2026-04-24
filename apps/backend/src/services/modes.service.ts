export function getModes() {
  return [
    {
      id: "quick",
      title: "Быстрый раунд",
      description: "Выбери актив, спрогнозируй движение и забери награду.",
      available: true,
      status: "available"
    },
    {
      id: "duels",
      title: "Дуэли",
      description: "Собирай портфель и соревнуйся с другим игроком на короткой дистанции.",
      available: false,
      status: "locked",
      note: "Доступно самым активным игрокам"
    },
    {
      id: "daily-event",
      title: "Ежедневное событие",
      description: "Длинная дистанция с общей таблицей и серией заданий дня.",
      available: false,
      status: "locked",
      note: "Доступно самым активным игрокам"
    }
  ] as const;
}
