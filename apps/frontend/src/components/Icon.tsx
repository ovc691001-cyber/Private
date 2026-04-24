type IconName =
  | "activity"
  | "assets"
  | "map"
  | "events"
  | "quick"
  | "duels"
  | "event"
  | "select"
  | "trend"
  | "stake"
  | "win"
  | "lobby"
  | "history"
  | "rating"
  | "education"
  | "profile"
  | "gift"
  | "bell"
  | "more"
  | "plus"
  | "minus"
  | "fullscreen"
  | "plane"
  | "ship"
  | "truck"
  | "arrow-right"
  | "close"
  | "spark";

type Props = {
  name: IconName;
  size?: number;
  tone?: "lime" | "purple" | "cyan" | "blue" | "orange" | "red" | "text" | "muted";
};

export function AppIcon({ name, size = 22, tone = "text" }: Props) {
  const color =
    tone === "lime"
      ? "#7CFF6B"
      : tone === "purple"
        ? "#9B6BFF"
        : tone === "cyan" || tone === "blue"
          ? "#57B7FF"
          : tone === "orange"
            ? "#FFAD4D"
            : tone === "red"
              ? "#FF5D6C"
              : tone === "muted"
                ? "#8D98B1"
                : "#F5F7FB";

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {name === "activity" ? (
        <>
          <path d="M6 15h2.2l1.8-5 2.2 8 1.8-5H18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6h16" stroke={color} strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {name === "assets" ? (
        <>
          <rect x="5" y="5" width="6" height="6" rx="1.8" stroke={color} strokeWidth="1.8" />
          <rect x="13" y="5" width="6" height="6" rx="1.8" stroke={color} strokeWidth="1.8" />
          <rect x="5" y="13" width="6" height="6" rx="1.8" stroke={color} strokeWidth="1.8" />
          <rect x="13" y="13" width="6" height="6" rx="1.8" stroke={color} strokeWidth="1.8" />
        </>
      ) : null}
      {name === "map" ? (
        <>
          <path d="m5 6 4-1.5 6 2L19 5v13l-4 1.5-6-2L5 19V6Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 4.5v13M15 6.5v13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {name === "events" ? (
        <>
          <path d="M7 5.5h10M7 12h10M7 18.5h10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="5" cy="5.5" r="1.2" fill={color} />
          <circle cx="5" cy="12" r="1.2" fill={color} />
          <circle cx="5" cy="18.5" r="1.2" fill={color} />
        </>
      ) : null}
      {name === "quick" ? (
        <>
          <path d="M5 15.5 9 11l3 2.5L17 7.5l2 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="17" cy="7.5" r="2" fill={color} />
        </>
      ) : null}
      {name === "duels" ? (
        <>
          <path d="m8 5 8 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="m16 5-8 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="m6.8 17.2 2-2M15.2 17.2l2-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {name === "event" ? (
        <>
          <path d="M12 5.2 13.8 9l4.2.6-3 3 .7 4.2L12 14.8 8.3 16.8 9 12.6 6 9.6 10.2 9 12 5.2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "select" ? (
        <>
          <rect x="5.5" y="6" width="3" height="12" rx="1.5" fill={color} fillOpacity=".92" />
          <rect x="10.5" y="10" width="3" height="8" rx="1.5" fill={color} fillOpacity=".92" />
          <rect x="15.5" y="3.5" width="3" height="14.5" rx="1.5" fill={color} fillOpacity=".92" />
        </>
      ) : null}
      {name === "trend" ? (
        <>
          <path d="M6.5 16.5 12 11l5.5 5.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 6v10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {name === "stake" ? (
        <>
          <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="2" />
          <path d="M12 8v8M15 9.5c-.4-.8-1.4-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 1.4 1 2 3 2.3 2 .3 3 1 3 2.4S13.8 17 12 17c-1.7 0-2.8-.7-3.3-1.7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {name === "win" ? (
        <>
          <path d="M8 6h8v2.5A4.5 4.5 0 0 1 11.5 13h-1A4.5 4.5 0 0 1 6 8.5V6h2Z" stroke={color} strokeWidth="1.8" />
          <path d="M9.5 13v2.5m5 0h-5M8 8H5.5A2.5 2.5 0 0 0 8 10.5m8-2H18.5A2.5 2.5 0 0 1 16 10.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "lobby" ? (
        <>
          <path d="m5.5 11.5 6.5-5 6.5 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 10.5V18h9v-7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "history" ? (
        <>
          <path d="M7 6h10M7 11h10M7 16h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="5" cy="6" r="1" fill={color} />
          <circle cx="5" cy="11" r="1" fill={color} />
          <circle cx="5" cy="16" r="1" fill={color} />
        </>
      ) : null}
      {name === "rating" ? (
        <>
          <path d="m7 15 3-3 2 2 4-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 18h13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {name === "education" ? (
        <>
          <path d="M6.5 7.5 12 5l5.5 2.5L12 10 6.5 7.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M7.5 9.5V16c0 .8 1.7 1.5 4.5 1.5s4.5-.7 4.5-1.5V9.5" stroke={color} strokeWidth="1.8" />
        </>
      ) : null}
      {name === "profile" ? (
        <>
          <circle cx="12" cy="9" r="3.2" stroke={color} strokeWidth="1.8" />
          <path d="M6.5 18c1.1-2.5 3-3.8 5.5-3.8s4.4 1.3 5.5 3.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {name === "gift" ? (
        <>
          <path d="M5 10h14v9H5v-9Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M4.5 7h15v3h-15V7ZM12 7v12" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 7c-2-3.6-5.2-2.2-4.4.1M12 7c2-3.6 5.2-2.2 4.4.1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {name === "bell" ? (
        <>
          <path d="M7 10.5a5 5 0 0 1 10 0v3.7l1.4 2.3H5.6L7 14.2v-3.7Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 18.5a2.2 2.2 0 0 0 4 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {name === "more" ? (
        <>
          <circle cx="6" cy="12" r="1.5" fill={color} />
          <circle cx="12" cy="12" r="1.5" fill={color} />
          <circle cx="18" cy="12" r="1.5" fill={color} />
        </>
      ) : null}
      {name === "plus" ? <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" /> : null}
      {name === "minus" ? <path d="M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" /> : null}
      {name === "fullscreen" ? (
        <>
          <path d="M8 5H5v3M16 5h3v3M8 19H5v-3M19 16v3h-3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {name === "plane" ? (
        <path d="M3.8 12.4 20 5l-4.2 15-3.2-6.4-6.8-1.2Zm8.8 1.2 3.2-4.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {name === "ship" ? (
        <>
          <path d="M5 13.5h14l-2 4H7l-2-4Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 13.5V7h6l2 6.5M9 17.5c1 .8 2 .8 3 0 1 .8 2 .8 3 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {name === "truck" ? (
        <>
          <path d="M4 8h9v7H4V8Zm9 2h3l3 3v2h-6v-5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="8" cy="17" r="1.6" stroke={color} strokeWidth="1.8" />
          <circle cx="16" cy="17" r="1.6" stroke={color} strokeWidth="1.8" />
        </>
      ) : null}
      {name === "arrow-right" ? (
        <path d="M6 12h12m-4.5-4.5L18 12l-4.5 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {name === "close" ? (
        <>
          <path d="m7 7 10 10M17 7 7 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {name === "spark" ? (
        <path d="m10.2 5.8-.9 3.5 4-1.4-1.4 3.2 2.8-1.1-1 4.1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
}
