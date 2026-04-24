"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { CurrencyGlyph, InlineValue } from "@/components/Brand";
import { AppIcon } from "@/components/Icon";
import { api, ApiError, clearSessionToken, saveSessionToken } from "@/lib/api";
import { getDeviceFingerprint, getTelegramInitData, setupTelegramTheme } from "@/lib/telegram";

export type AppTab = "lobby" | "assets" | "map" | "events" | "profile";

type View = AppTab | "eventDetail" | "assetDetail";
type Accent = "green" | "blue" | "orange" | "red" | "purple";
type TransportType = "plane" | "ship" | "truck" | "weather";
type EventOutcome = "success" | "delay" | "fail";

export type User = {
  id?: string;
  username?: string | null;
  balance: number;
  nickname: string | null;
  firstName: string | null;
  photoUrl: string | null;
  rulesAcceptedAt?: string | null;
  currentStreak?: number;
  bestStreak?: number;
};

type ChartPoint = {
  tick: number;
  value: number;
};

type WorldAsset = {
  id: string;
  name: string;
  sector: string;
  description: string;
  iconToken: string;
  volatilityType?: string;
  volatilityLabel?: string;
  volatilityScore?: number;
  hint?: string | null;
  currentPrice: number;
  change5m: number;
  players: number;
  pool: number;
  accent: Accent;
  chartData: ChartPoint[];
};

export type RoundAsset = WorldAsset & {
  volatilityType: string;
  volatilityLabel: string;
  volatilityScore: number;
  finalReturn: number | null;
  returnsByHorizon?: { short: number; long: number } | null;
};

export type Round = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  seedHash: string;
  revealedSeed: string | null;
  winningAssetId?: string | null;
  winners?: { short: string | null; long: string | null };
  horizons?: Array<{ id: "short" | "long"; label: string; subtitle: string }>;
  assets?: RoundAsset[];
};

export type BetHistory = {
  id: string;
  roundId: string;
  assetName: string | null;
  winningAssetName: string | null;
  amount: number;
  horizon: "short" | "long";
  status: string;
  payout: number;
  placedAt: string;
  seedHash: string | null;
  revealedSeed: string | null;
  winningAssetId: string | null;
  verifyPath: string | null;
};

export type LeaderboardRow = {
  name: string;
  photoUrl: string | null;
  betsCount: number;
  winsCount: number;
  winRate: number;
  currentStreak: number;
  netProfit: number;
  score: number;
};

export type Mission = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
  claimable: boolean;
};

export type ProfileDetails = {
  totalRounds: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  level: number;
};

export type ReferralOverview = {
  code: string;
  link: string;
  invitedCount: number;
  rewardsEarned: number;
  items: Array<{ id: string; name: string; roundsPlayed: number; milestoneReached: boolean }>;
};

export type EducationLessonPreview = {
  id: string;
  title: string;
  summary: string;
};

export type EducationLessonFull = EducationLessonPreview & {
  body: string[];
  quiz?: { question: string; answer: string };
};

type WorldEvent = {
  id: string;
  round_id: string;
  type: string;
  title: string;
  description: string;
  route_from: string;
  route_to: string;
  transport_type: TransportType;
  related_asset_id: string;
  related_asset_name: string;
  duration_seconds: number;
  remaining_seconds: number;
  status: "active" | "resolved";
  probability_success: number;
  probability_delay: number;
  probability_fail: number;
  success_impact: number;
  delay_impact: number;
  fail_impact: number;
  outcome: EventOutcome | null;
  impact_applied: boolean;
  created_at: string;
  resolves_at: string;
  tone: Accent;
  map: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    card: { x: number; y: number };
    vehicle: { x: number; y: number };
  };
};

type EventFeedItem = {
  id: string;
  title: string;
  description: string;
  assetName: string | null;
  impactPercent: number;
  timeAgo: string;
  tone: Accent;
};

export type ActivityItem = {
  id: string;
  kind: "system" | "market" | "leaderboard";
  text: string;
};

type RoundSummary = {
  id: string;
  number: number;
  status: string;
  statusLabel: string;
  startAt: string;
  endAt: string;
  seedHash: string;
  revealedSeed: string | null;
  remainingSeconds: number;
  prizePool: number;
  platformFeePercent: number;
  participantCount: number;
  participantAvatars: string[];
};

type CityLabel = {
  name: string;
  x: number;
  y: number;
};

type LobbyResponse = {
  user: User;
  round: RoundSummary;
  assets: WorldAsset[];
  events: WorldEvent[];
  eventFeed: EventFeedItem[];
  activity: ActivityItem[];
  map?: {
    cities: CityLabel[];
    events: WorldEvent[];
  };
};

type StakeTarget = {
  assetId: string;
  eventId?: string;
  outcome?: EventOutcome;
  title: string;
};

const filters = ["Все", "Технологии", "Транспорт", "Энергетика"] as const;
const stakeAmounts = [100, 250, 500, 1000] as const;

export default function Home() {
  const [data, setData] = useState<LobbyResponse | null>(null);
  const [view, setView] = useState<View>("lobby");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Все");
  const [stakeTarget, setStakeTarget] = useState<StakeTarget | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<(typeof stakeAmounts)[number]>(250);
  const [soon, setSoon] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [mapZoom, setMapZoom] = useState(1);

  useEffect(() => {
    setupTelegramTheme();
    void boot();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data || data.round.id === "demo-round") return;
    const polling = window.setInterval(() => {
      void refreshLiveLayer();
    }, 5000);
    return () => window.clearInterval(polling);
  }, [data?.round.id]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeTab: AppTab = view === "assetDetail" ? "assets" : view === "eventDetail" ? "map" : view;
  const assets = data?.assets ?? [];
  const events = data?.events ?? [];
  const cities = data?.map?.cities ?? demoCities;

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? assets.find((asset) => asset.name === "AeroTexa") ?? assets[0] ?? null,
    [assets, selectedAssetId]
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events[0] ?? null,
    [events, selectedEventId]
  );

  const filteredAssets = activeFilter === "Все" ? assets : assets.filter((asset) => asset.sector === activeFilter);
  const popularAssets = assets.slice(0, 3);
  const upcomingEvent = events[0] ?? null;

  async function boot() {
    setLoading(true);
    setError(null);

    try {
      const initData = getTelegramInitData();
      if (initData) {
        const auth = await api<{ user: User; sessionToken: string }>("/auth/telegram", {
          method: "POST",
          body: { initData, deviceFingerprint: getDeviceFingerprint() }
        });
        saveSessionToken(auth.sessionToken);
      }

      const lobby = await api<LobbyResponse>("/lobby");
      setData(normalizeLobby(lobby));
      setSelectedAssetId(lobby.assets[2]?.id ?? lobby.assets[0]?.id ?? null);
      setSelectedEventId(lobby.events[0]?.id ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) clearSessionToken();
      if (process.env.NODE_ENV === "production") {
        setError(err instanceof ApiError ? err.message : "Не удалось открыть Mini App.");
      } else {
        const demo = createDemoLobby();
        setData(demo);
        setSelectedAssetId(demo.assets[2]?.id ?? demo.assets[0]?.id ?? null);
        setSelectedEventId(demo.events[0]?.id ?? null);
        setNotice("Dev-режим запущен без Telegram-сессии.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshLiveLayer() {
    try {
      const [activity, map] = await Promise.all([
        api<{ items: ActivityItem[] }>("/activity/feed"),
        api<{ cities: CityLabel[]; events: WorldEvent[] }>("/map/events")
      ]);
      setData((current) => (current ? { ...current, activity: activity.items, events: map.events, map } : current));
    } catch {
      // Polling should stay quiet in Telegram.
    }
  }

  function openEvent(event: WorldEvent) {
    setSelectedEventId(event.id);
    setView("eventDetail");
  }

  function openAsset(asset: WorldAsset) {
    setSelectedAssetId(asset.id);
    setView("assetDetail");
  }

  function closeMiniApp() {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    if (tg?.close) tg.close();
    else setSoon("Закрытие доступно внутри Telegram.");
  }

  async function placeStake() {
    if (!data || !stakeTarget) return;
    setBusy(true);
    setError(null);

    try {
      if (data.round.id !== "demo-round") {
        await api("/bets", {
          method: "POST",
          body: {
            roundId: data.round.id,
            assetId: stakeTarget.assetId,
            eventId: stakeTarget.eventId,
            outcome: stakeTarget.outcome,
            horizon: "short",
            amount: selectedAmount
          }
        });
        const lobby = await api<LobbyResponse>("/lobby");
        setData(normalizeLobby(lobby));
      }

      setNotice("Ставка отправлена на сервер.");
      setStakeTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Сервер не принял ставку.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="upliks-loading">Загрузка Upliks...</main>;
  }

  if (error && !data) {
    return (
      <main className="upliks-loading">
        <section className="modal-card">
          <h1>Вход не удался</h1>
          <p>{error}</p>
          <button type="button" className="primary-cta" onClick={boot}>
            Повторить
          </button>
        </section>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="upliks-app">
      <TopBar onClose={closeMiniApp} onMore={() => setSoon("Дополнительные действия появятся скоро.")} />

      {notice ? <div className="app-toast">{notice}</div> : null}
      {error ? <div className="app-toast danger">{error}</div> : null}

      <section className="screen-stack">
        {view === "lobby" ? (
          <LobbyScreen
            user={data.user}
            round={data.round}
            assets={popularAssets}
            event={upcomingEvent}
            now={now}
            onPlay={() => setView("map")}
            onOpenAsset={openAsset}
            onOpenEvent={openEvent}
            onAllEvents={() => setView("events")}
            onSoon={setSoon}
          />
        ) : null}

        {view === "map" ? (
          <MapScreen
            events={events}
            cities={cities}
            zoom={mapZoom}
            onZoomIn={() => setMapZoom((value) => Math.min(1.18, round2(value + 0.06)))}
            onZoomOut={() => setMapZoom((value) => Math.max(0.92, round2(value - 0.06)))}
            onFullscreen={() => setSoon("Полноэкранный режим появится в следующем обновлении.")}
            onOpenEvent={openEvent}
            now={now}
          />
        ) : null}

        {view === "eventDetail" && selectedEvent ? (
          <EventDetailScreen
            event={selectedEvent}
            asset={assets.find((asset) => asset.id === selectedEvent.related_asset_id) ?? null}
            now={now}
            onClose={() => setView("map")}
            onStake={(outcome) =>
              setStakeTarget({
                assetId: selectedEvent.related_asset_id,
                eventId: selectedEvent.id,
                outcome,
                title: `${selectedEvent.title}: ${outcomeLabel(selectedEvent.transport_type, outcome)}`
              })
            }
          />
        ) : null}

        {view === "assets" ? (
          <AssetsScreen
            assets={filteredAssets}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            onOpenAsset={openAsset}
          />
        ) : null}

        {view === "assetDetail" && selectedAsset ? (
          <AssetDetailScreen
            asset={selectedAsset}
            events={events.filter((event) => event.related_asset_id === selectedAsset.id)}
            now={now}
            onBack={() => setView("assets")}
            onOpenEvent={openEvent}
            onStake={() => setStakeTarget({ assetId: selectedAsset.id, title: selectedAsset.name })}
          />
        ) : null}

        {view === "events" ? <FeedScreen feed={data.eventFeed} onFilter={() => setSoon("Фильтры ленты появятся скоро.")} /> : null}

        {view === "profile" ? (
          <ProfileScreen user={data.user} round={data.round} activity={data.activity} onVerify={() => setSoon("Проверка seed доступна после завершения раунда.")} />
        ) : null}
      </section>

      <BottomNav
        active={activeTab}
        onChange={(next) => {
          setView(next);
          if (next === "assets") setSelectedAssetId((current) => current ?? assets[0]?.id ?? null);
          if (next === "map") setSelectedEventId((current) => current ?? events[0]?.id ?? null);
        }}
      />

      {stakeTarget ? (
        <div className="overlay">
          <section className="modal-card stake-sheet">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Ставка</span>
                <h2>{stakeTarget.title}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setStakeTarget(null)} aria-label="Закрыть">
                <AppIcon name="close" size={18} />
              </button>
            </div>
            <div className="stake-grid">
              {stakeAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`stake-option ${selectedAmount === amount ? "selected" : ""}`}
                  onClick={() => setSelectedAmount(amount)}
                >
                  <span>{amount.toLocaleString("ru-RU")}</span>
                  <CurrencyGlyph size="sm" />
                </button>
              ))}
            </div>
            <button type="button" className="primary-cta" disabled={busy} onClick={placeStake}>
              Сделать ставку
            </button>
          </section>
        </div>
      ) : null}

      {soon ? (
        <div className="overlay">
          <section className="modal-card">
            <div className="modal-head">
              <h2>Скоро</h2>
              <button type="button" className="icon-button" onClick={() => setSoon(null)} aria-label="Закрыть">
                <AppIcon name="close" size={18} />
              </button>
            </div>
            <p>{soon}</p>
            <button type="button" className="primary-cta compact" onClick={() => setSoon(null)}>
              Понятно
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function TopBar({ onClose, onMore }: { onClose: () => void; onMore: () => void }) {
  return (
    <header className="top-bar">
      <button type="button" className="top-close" onClick={onClose}>
        Закрыть
      </button>
      <div className="top-title">
        <strong>Upliks</strong>
        <span>мини-приложение</span>
      </div>
      <button type="button" className="top-more" onClick={onMore} aria-label="Ещё">
        <AppIcon name="more" size={20} />
      </button>
    </header>
  );
}

function LobbyScreen({
  user,
  round,
  assets,
  event,
  now,
  onPlay,
  onOpenAsset,
  onOpenEvent,
  onAllEvents,
  onSoon
}: {
  user: User;
  round: RoundSummary;
  assets: WorldAsset[];
  event: WorldEvent | null;
  now: number;
  onPlay: () => void;
  onOpenAsset: (asset: WorldAsset) => void;
  onOpenEvent: (event: WorldEvent) => void;
  onAllEvents: () => void;
  onSoon: (message: string) => void;
}) {
  return (
    <>
      <section className="lobby-wallet">
        <div className="balance-pill">
          <InlineValue value={user.balance || 3_810} />
        </div>
        <button type="button" className="icon-button add" onClick={() => onSoon("Внутриигровое пополнение появится позже.")} aria-label="Добавить">
          <AppIcon name="plus" size={18} />
        </button>
        <button type="button" className="icon-button" onClick={() => onSoon("Подарки появятся скоро.")} aria-label="Подарки">
          <AppIcon name="gift" size={18} />
        </button>
        <button type="button" className="icon-button" onClick={() => onSoon("Уведомления появятся скоро.")} aria-label="Уведомления">
          <AppIcon name="bell" size={18} />
        </button>
        <div className="player-avatar">{avatarInitial(user)}</div>
      </section>

      <section className="round-card">
        <div className="round-head">
          <div>
            <span className="eyebrow">Раунд #{round.number}</span>
            <h1>{formatRoundClock(round, now)}</h1>
          </div>
          <span className="status-chip">{round.statusLabel}</span>
        </div>
        <button type="button" className="primary-cta" onClick={onPlay}>
          Играть в раунд
        </button>
        <div className="round-metrics">
          <Metric label="Призовой фонд" value={<InlineValue value={round.prizePool} />} />
          <Metric label="Комиссия платформы" value={<strong>{round.platformFeePercent}%</strong>} />
        </div>
        <div className="participant-row">
          <div className="avatar-stack">
            {round.participantAvatars.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
          <p>{round.participantCount.toLocaleString("ru-RU")} игроков участвуют</p>
        </div>
      </section>

      <SectionHead title="Популярные активы" />
      <div className="popular-grid">
        {assets.map((asset) => (
          <button key={asset.id} type="button" className={`popular-card tone-${asset.accent}`} onClick={() => onOpenAsset(asset)}>
            <div>
              <strong>{asset.name}</strong>
              <span>{asset.sector}</span>
            </div>
            <span className={`change ${asset.change5m >= 0 ? "good" : "bad"}`}>{formatPercent(asset.change5m)}</span>
            <Sparkline points={asset.chartData} tone={asset.accent} compact />
          </button>
        ))}
      </div>

      <SectionHead title="Лента событий" action="Все" onAction={onAllEvents} />
      {event ? (
        <button type="button" className={`event-preview tone-${event.tone}`} onClick={() => onOpenEvent(event)}>
          <div className="event-icon">
            <AppIcon name={transportIcon(event.transport_type)} size={20} tone={toneToIcon(event.tone)} />
          </div>
          <div>
            <strong>{event.title}</strong>
            <span>
              {event.route_from} → {event.route_to}
            </span>
            <small>{event.description}</small>
          </div>
          <time>{formatEventClock(event, now)}</time>
        </button>
      ) : null}
    </>
  );
}

function MapScreen({
  events,
  cities,
  zoom,
  onZoomIn,
  onZoomOut,
  onFullscreen,
  onOpenEvent,
  now
}: {
  events: WorldEvent[];
  cities: CityLabel[];
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
  onOpenEvent: (event: WorldEvent) => void;
  now: number;
}) {
  return (
    <section className="map-screen">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">Карта событий</span>
          <h1>Мир маршрутов</h1>
        </div>
        <div className="map-actions">
          <button type="button" className="icon-button" onClick={onZoomIn} aria-label="Приблизить">
            <AppIcon name="plus" size={18} />
          </button>
          <button type="button" className="icon-button" onClick={onZoomOut} aria-label="Отдалить">
            <AppIcon name="minus" size={18} />
          </button>
          <button type="button" className="icon-button" onClick={onFullscreen} aria-label="Во весь экран">
            <AppIcon name="fullscreen" size={18} />
          </button>
        </div>
      </div>

      <div className="map-canvas">
        <div className="map-zoom-layer" style={{ "--map-zoom": zoom } as CSSProperties}>
          <WorldMapSvg />
          <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {events.map((event) => (
              <line
                key={event.id}
                x1={event.map.from.x}
                y1={event.map.from.y}
                x2={event.map.to.x}
                y2={event.map.to.y}
                className={`route-line tone-${event.tone}`}
              />
            ))}
          </svg>
          {cities.map((city) => (
            <span key={city.name} className="city-label" style={{ left: `${city.x}%`, top: `${city.y}%` }}>
              {city.name}
            </span>
          ))}
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              className={`map-event-card tone-${event.tone}`}
              style={{ left: `${event.map.card.x}%`, top: `${event.map.card.y}%` }}
              onClick={() => onOpenEvent(event)}
            >
              <strong>{event.title}</strong>
              <span>
                {event.route_from} → {event.route_to}
              </span>
              <time>{formatEventClock(event, now)}</time>
            </button>
          ))}
          {events.map((event) => (
            <button
              key={`${event.id}-vehicle`}
              type="button"
              className={`vehicle-pin tone-${event.tone}`}
              style={{ left: `${event.map.vehicle.x}%`, top: `${event.map.vehicle.y}%` }}
              onClick={() => onOpenEvent(event)}
              aria-label={event.title}
            >
              <AppIcon name={transportIcon(event.transport_type)} size={18} tone={toneToIcon(event.tone)} />
            </button>
          ))}
        </div>
        <div className="map-legend">
          <span className="legend-dot growth" /> Рост
          <span className="legend-dot fall" /> Падение
          <span className="legend-dot neutral" /> Нейтрально
        </div>
      </div>
    </section>
  );
}

function EventDetailScreen({
  event,
  asset,
  now,
  onClose,
  onStake
}: {
  event: WorldEvent;
  asset: WorldAsset | null;
  now: number;
  onClose: () => void;
  onStake: (outcome: EventOutcome) => void;
}) {
  const outcomes: EventOutcome[] = ["success", "delay", "fail"];

  return (
    <section className="detail-screen">
      <div className="detail-head">
        <div>
          <span className="eyebrow">Текущее событие</span>
          <h1>{event.title}</h1>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть событие">
          <AppIcon name="close" size={18} />
        </button>
      </div>

      <article className={`event-hero tone-${event.tone}`}>
        <div className="big-event-icon">
          <AppIcon name={transportIcon(event.transport_type)} size={28} tone={toneToIcon(event.tone)} />
        </div>
        <div>
          <h2>{event.transport_type === "plane" ? "Авиадоставка" : event.transport_type === "ship" ? "Морской маршрут" : "Наземный маршрут"}</h2>
          <p>
            {event.route_from} → {event.route_to}
          </p>
          <span>{event.description}</span>
        </div>
      </article>

      <section className="timer-card">
        <span>Прибытие через</span>
        <strong>{formatEventClock(event, now)}</strong>
      </section>

      <div className="progress-card">
        <div className="progress-track">
          <span style={{ width: `${eventProgress(event, now)}%` }} />
        </div>
        <div className="progress-labels">
          <span>Вылет</span>
          <span>В пути</span>
          <span>Прибытие</span>
        </div>
      </div>

      <section className="impact-card">
        <span className="eyebrow">Влияние на актив</span>
        <strong>{asset?.name ?? event.related_asset_name}</strong>
      </section>

      <SectionHead title="Возможные исходы" />
      <div className="outcome-list">
        {outcomes.map((outcome) => (
          <button key={outcome} type="button" className="outcome-card" onClick={() => onStake(outcome)}>
            <div>
              <strong>{outcomeLabel(event.transport_type, outcome)}</strong>
              <span>вероятность {eventProbability(event, outcome)}%</span>
            </div>
            <span className={`change ${eventImpact(event, outcome) >= 0 ? "good" : "bad"}`}>
              {event.related_asset_name} {formatPercent(eventImpact(event, outcome))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AssetsScreen({
  assets,
  activeFilter,
  onFilter,
  onOpenAsset
}: {
  assets: WorldAsset[];
  activeFilter: (typeof filters)[number];
  onFilter: (filter: (typeof filters)[number]) => void;
  onOpenAsset: (asset: WorldAsset) => void;
}) {
  return (
    <section className="assets-screen">
      <div className="screen-title">
        <span className="eyebrow">Активы</span>
        <h1>Список активов</h1>
      </div>
      <div className="filter-row">
        {filters.map((filter) => (
          <button key={filter} type="button" className={activeFilter === filter ? "active" : ""} onClick={() => onFilter(filter)}>
            {filter}
          </button>
        ))}
      </div>
      <div className="asset-list">
        {assets.map((asset) => (
          <AssetRow key={asset.id} asset={asset} onOpen={() => onOpenAsset(asset)} />
        ))}
      </div>
    </section>
  );
}

function AssetDetailScreen({
  asset,
  events,
  now,
  onBack,
  onOpenEvent,
  onStake
}: {
  asset: WorldAsset;
  events: WorldEvent[];
  now: number;
  onBack: () => void;
  onOpenEvent: (event: WorldEvent) => void;
  onStake: () => void;
}) {
  return (
    <section className="detail-screen">
      <div className="detail-head">
        <div>
          <span className="eyebrow">{asset.sector}</span>
          <h1>{asset.name}</h1>
        </div>
        <button type="button" className="icon-button" onClick={onBack} aria-label="Назад к активам">
          <AppIcon name="close" size={18} />
        </button>
      </div>

      <section className={`large-chart-card tone-${asset.accent}`}>
        <Sparkline points={asset.chartData} tone={asset.accent} large />
      </section>

      <div className="asset-stats">
        <Metric label="текущая цена" value={<InlineValue value={asset.currentPrice} />} />
        <Metric label="изменение 5M" value={<strong className={asset.change5m >= 0 ? "good" : "bad"}>{formatPercent(asset.change5m)}</strong>} />
        <Metric label="игроков" value={<strong>{asset.players.toLocaleString("ru-RU")}</strong>} />
        <Metric label="вложено" value={<InlineValue value={asset.pool} />} />
      </div>

      <button type="button" className="primary-cta" onClick={onStake}>
        Сделать ставку
      </button>

      <SectionHead title="Влияющие события" />
      <div className="influence-list">
        {events.map((event) => (
          <button key={event.id} type="button" className={`influence-card tone-${event.tone}`} onClick={() => onOpenEvent(event)}>
            <div className="event-icon">
              <AppIcon name={transportIcon(event.transport_type)} size={18} tone={toneToIcon(event.tone)} />
            </div>
            <div>
              <strong>{event.title}</strong>
              <span>
                {event.route_from} → {event.route_to}
              </span>
              <small>прибытие через {formatEventClock(event, now)}</small>
            </div>
            <span className={`change ${event.success_impact >= 0 ? "good" : "bad"}`}>потенциал {formatPercent(event.success_impact)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function FeedScreen({ feed, onFilter }: { feed: EventFeedItem[]; onFilter: () => void }) {
  return (
    <section className="feed-screen">
      <div className="feed-head">
        <div>
          <span className="eyebrow">Лента событий</span>
          <h1>События мира</h1>
        </div>
        <button type="button" className="filter-button" onClick={onFilter}>
          Все
        </button>
      </div>
      <div className="feed-list">
        {feed.map((item) => (
          <article key={item.id} className={`feed-card tone-${item.tone}`}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              {item.assetName ? <small>для {item.assetName}</small> : null}
            </div>
            <div className="feed-side">
              <span className={`change ${item.impactPercent >= 0 ? "good" : "bad"}`}>{formatPercent(item.impactPercent)}</span>
              <time>{item.timeAgo}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProfileScreen({
  user,
  round,
  activity,
  onVerify
}: {
  user: User;
  round: RoundSummary;
  activity: ActivityItem[];
  onVerify: () => void;
}) {
  return (
    <section className="profile-screen">
      <div className="profile-card">
        <div className="player-avatar large">{avatarInitial(user)}</div>
        <div>
          <span className="eyebrow">Профиль</span>
          <h1>{user.nickname ?? user.firstName ?? "Игрок"}</h1>
          <InlineValue value={user.balance || 3_810} />
        </div>
      </div>
      <section className="fairness-card">
        <span className="eyebrow">Fairness</span>
        <strong>Seed hash опубликован</strong>
        <p>{round.seedHash}</p>
        <button type="button" className="secondary-cta" onClick={onVerify}>
          Проверить раунд
        </button>
      </section>
      <SectionHead title="Живая активность" />
      <div className="activity-list">
        {activity.map((item) => (
          <article key={item.id} className="activity-row">
            <span />
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AssetRow({ asset, onOpen }: { asset: WorldAsset; onOpen: () => void }) {
  return (
    <button type="button" className={`asset-row tone-${asset.accent}`} onClick={onOpen}>
      <div className="asset-badge">{asset.name.slice(0, 1)}</div>
      <div className="asset-main">
        <strong>{asset.name}</strong>
        <span>{asset.sector}</span>
        <div className="asset-row-meta">
          <InlineValue value={asset.currentPrice} />
          <span>{asset.players.toLocaleString("ru-RU")} игроков</span>
        </div>
      </div>
      <div className="asset-side">
        <span className={`change ${asset.change5m >= 0 ? "good" : "bad"}`}>{formatPercent(asset.change5m)}</span>
        <Sparkline points={asset.chartData} tone={asset.accent} compact />
      </div>
    </button>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action ? (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="metric">
      <span>{label}</span>
      {value}
    </div>
  );
}

function Sparkline({
  points,
  tone,
  compact,
  large
}: {
  points: ChartPoint[];
  tone: Accent;
  compact?: boolean;
  large?: boolean;
}) {
  const path = useMemo(() => buildSparkPath(points), [points]);
  return (
    <div className={`sparkline tone-${tone} ${compact ? "compact" : ""} ${large ? "large" : ""}`}>
      <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden="true">
        <path className="spark-area" d={`${path} L120 56 L0 56 Z`} />
        <path className="spark-glow" d={path} />
        <path className="spark-line" d={path} />
      </svg>
    </div>
  );
}

function WorldMapSvg() {
  return (
    <svg className="world-map" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M8 30 18 24 31 29 27 43 17 48 10 42Z" />
      <path d="M27 57 36 59 41 72 34 86 27 76Z" />
      <path d="M45 24 58 20 70 29 65 42 51 40 43 33Z" />
      <path d="M58 44 72 42 84 51 78 64 63 60Z" />
      <path d="M72 68 88 70 93 82 82 88 72 80Z" />
      <path d="M47 54 58 57 57 78 48 86 42 72Z" />
    </svg>
  );
}

function buildSparkPath(points: ChartPoint[]) {
  const safePoints = points.length > 1 ? points : [{ tick: 0, value: 100 }, { tick: 1, value: 101 }];
  const values = safePoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return safePoints
    .map((point, index) => {
      const x = (index / Math.max(1, safePoints.length - 1)) * 120;
      const y = 48 - ((point.value - min) / range) * 40;
      return `${index === 0 ? "M" : "L"}${round2(x)} ${round2(y)}`;
    })
    .join(" ");
}

function normalizeLobby(value: LobbyResponse): LobbyResponse {
  return {
    ...value,
    assets: value.assets ?? [],
    events: value.events ?? value.map?.events ?? [],
    eventFeed: value.eventFeed ?? [],
    activity: value.activity ?? [],
    map: value.map ?? { cities: demoCities, events: value.events ?? [] }
  };
}

function formatRoundClock(round: RoundSummary, now: number) {
  const fromDate = Math.ceil((new Date(round.endAt).getTime() - now) / 1000);
  return formatLongDuration(Number.isFinite(fromDate) ? Math.max(0, fromDate) : round.remainingSeconds || 5077);
}

function formatEventClock(event: WorldEvent, now: number) {
  const left = Math.ceil((new Date(event.resolves_at).getTime() - now) / 1000);
  return formatShortDuration(Number.isFinite(left) ? Math.max(0, left) : event.remaining_seconds);
}

function eventProgress(event: WorldEvent, now: number) {
  const left = Math.max(0, Math.ceil((new Date(event.resolves_at).getTime() - now) / 1000));
  return Math.min(100, Math.max(4, ((event.duration_seconds - left) / Math.max(1, event.duration_seconds)) * 100));
}

function eventProbability(event: WorldEvent, outcome: EventOutcome) {
  if (outcome === "success") return event.probability_success;
  if (outcome === "delay") return event.probability_delay;
  return event.probability_fail;
}

function eventImpact(event: WorldEvent, outcome: EventOutcome) {
  if (outcome === "success") return event.success_impact;
  if (outcome === "delay") return event.delay_impact;
  return event.fail_impact;
}

function outcomeLabel(transportType: TransportType, outcome: EventOutcome) {
  if (transportType === "ship") {
    if (outcome === "success") return "Танкер прибыл";
    if (outcome === "delay") return "Задержался";
    return "Потерял груз / шторм";
  }
  if (transportType === "truck") {
    if (outcome === "success") return "Доставлен";
    if (outcome === "delay") return "Задержан";
    return "Не доставлен";
  }
  if (outcome === "success") return "Успешная доставка";
  if (outcome === "delay") return "Задержка";
  return "Неудача";
}

function transportIcon(type: TransportType): "plane" | "ship" | "truck" | "map" {
  if (type === "ship") return "ship";
  if (type === "truck") return "truck";
  if (type === "weather") return "map";
  return "plane";
}

function toneToIcon(tone: Accent): "lime" | "purple" | "blue" | "orange" | "red" {
  if (tone === "green") return "lime";
  if (tone === "blue") return "blue";
  return tone;
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatShortDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatLongDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function avatarInitial(user: User) {
  return (user.nickname ?? user.firstName ?? "U").slice(0, 1).toUpperCase();
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function createDemoLobby(): LobbyResponse {
  const now = Date.now();
  const round: RoundSummary = {
    id: "demo-round",
    number: 4821,
    status: "active",
    statusLabel: "Идёт",
    startAt: new Date(now).toISOString(),
    endAt: new Date(now + 5_077_000).toISOString(),
    seedHash: "7d0f7fb486e746d1760ef3c428e0f8aa9e840a19e6a98306d07af2a05f0ef482",
    revealedSeed: null,
    remainingSeconds: 5_077,
    prizePool: 125_470,
    platformFeePercent: 10,
    participantCount: 1_248,
    participantAvatars: ["S", "Q", "A", "N", "E"]
  };

  const assets: WorldAsset[] = [
    demoAsset("asset-skyforge", "SkyForge", "Логистика", 58_230, 12.4, 1_248, 2_450_000, "green", [100, 102, 104, 106, 112.4]),
    demoAsset("asset-quant", "QuantCircuit", "Технологии", 32_410, 6.7, 944, 1_820_000, "orange", [100, 101, 100.5, 104, 106.7]),
    demoAsset("asset-aero", "AeroTexa", "Транспорт", 14_830, -3.8, 713, 1_170_000, "purple", [100, 99.2, 98.8, 97.5, 96.2]),
    demoAsset("asset-neuro", "NeuroPharm", "Медицина", 11_240, 2.1, 532, 840_000, "blue", [100, 100.4, 101.1, 100.8, 102.1]),
    demoAsset("asset-eco", "EcoVolt", "Энергетика", 26_750, 8.9, 820, 1_390_000, "green", [100, 102.3, 103.4, 105.7, 108.9])
  ];

  const events = createDemoEvents(now, round.id, assets);

  return {
    user: { id: "demo-user", balance: 3_810, nickname: "Upliker", firstName: "Upliker", photoUrl: null },
    round,
    assets,
    events,
    eventFeed: [
      { id: "f1", title: "Танкер прибыл в Роттердам", description: "Поставка нефти завершена", assetName: "SkyForge", impactPercent: 4.2, timeAgo: "2 мин назад", tone: "green" },
      { id: "f2", title: "Авиапоставка в Берлин", description: "Новый электромобиль запущен", assetName: "AeroTexa", impactPercent: 3.1, timeAgo: "5 мин назад", tone: "green" },
      { id: "f3", title: "Авиапоставка сорвана", description: "Токио → Сидней. Груз повреждён при шторме", assetName: "AeroTexa", impactPercent: -6.7, timeAgo: "12 мин назад", tone: "red" },
      { id: "f4", title: "Грузовик доставлен в Дубай", description: "Сырьё для производства", assetName: "QuantCircuit", impactPercent: 2.4, timeAgo: "18 мин назад", tone: "green" },
      { id: "f5", title: "Шторм в Атлантике", description: "Задержки поставок по морским маршрутам", assetName: null, impactPercent: -1.3, timeAgo: "22 мин назад", tone: "red" }
    ],
    activity: [
      { id: "a1", kind: "system", text: "Авиадоставка в Берлин прибудет через 00:18" },
      { id: "a2", kind: "market", text: "Ставки на AeroTexa резко выросли" },
      { id: "a3", kind: "market", text: "Танкер с чипами задерживается" },
      { id: "a4", kind: "market", text: "SkyForge удерживает лидерство" },
      { id: "a5", kind: "system", text: "Новый маршрут появился на карте" }
    ],
    map: { cities: demoCities, events }
  };
}

function demoAsset(id: string, name: string, sector: string, price: number, change: number, players: number, pool: number, accent: Accent, values: number[]): WorldAsset {
  return {
    id,
    name,
    sector,
    description: `${name} реагирует на транспортные события виртуального мира Upliks.`,
    iconToken: sector.toLowerCase(),
    currentPrice: price,
    change5m: change,
    players,
    pool,
    accent,
    chartData: values.map((value, tick) => ({ tick, value }))
  };
}

function createDemoEvents(now: number, roundId: string, assets: WorldAsset[]): WorldEvent[] {
  const aero = assets.find((asset) => asset.name === "AeroTexa") ?? assets[0]!;
  const quant = assets.find((asset) => asset.name === "QuantCircuit") ?? assets[0]!;
  const sky = assets.find((asset) => asset.name === "SkyForge") ?? assets[0]!;
  return [
    demoEvent("air-ny-berlin", roundId, "plane_delivery", "Авиадоставка в Берлин", "Доставка электроники", "Нью-Йорк", "Берлин", "plane", aero, 18, "blue", 4.2, 1.5, -6.7, { from: { x: 22, y: 38 }, to: { x: 52, y: 33 }, card: { x: 37, y: 19 }, vehicle: { x: 40, y: 34 } }, now),
    demoEvent("ship-rotterdam-shanghai", roundId, "ship_delivery", "Танкер с чипами", "Морская поставка чипов", "Роттердам", "Шанхай", "ship", quant, 95, "green", 4.2, -1.3, -7.4, { from: { x: 49, y: 31 }, to: { x: 76, y: 48 }, card: { x: 56, y: 60 }, vehicle: { x: 65, y: 47 } }, now),
    demoEvent("air-tokyo-dubai", roundId, "plane_delivery", "Авиадоставка", "Задержка", "Токио", "Дубай", "plane", aero, 42, "red", 4.2, 1.5, -6.7, { from: { x: 82, y: 42 }, to: { x: 61, y: 51 }, card: { x: 70, y: 24 }, vehicle: { x: 73, y: 45 } }, now),
    demoEvent("truck-cape-dubai", roundId, "truck_delivery", "Грузовик с сырьём", "Сырьё для производства", "Кейптаун", "Дубай", "truck", sky, 27, "orange", 2.4, 0.5, -3.2, { from: { x: 53, y: 78 }, to: { x: 61, y: 51 }, card: { x: 30, y: 55 }, vehicle: { x: 58, y: 64 } }, now)
  ];
}

function demoEvent(
  id: string,
  roundId: string,
  type: string,
  title: string,
  description: string,
  from: string,
  to: string,
  transport: TransportType,
  asset: WorldAsset,
  duration: number,
  tone: Accent,
  successImpact: number,
  delayImpact: number,
  failImpact: number,
  map: WorldEvent["map"],
  now: number
): WorldEvent {
  return {
    id,
    round_id: roundId,
    type,
    title,
    description,
    route_from: from,
    route_to: to,
    transport_type: transport,
    related_asset_id: asset.id,
    related_asset_name: asset.name,
    duration_seconds: duration,
    remaining_seconds: duration,
    status: "active",
    probability_success: transport === "ship" ? 60 : transport === "truck" ? 68 : 65,
    probability_delay: transport === "ship" ? 28 : transport === "truck" ? 22 : 25,
    probability_fail: transport === "ship" ? 12 : transport === "truck" ? 10 : 10,
    success_impact: successImpact,
    delay_impact: delayImpact,
    fail_impact: failImpact,
    outcome: null,
    impact_applied: false,
    created_at: new Date(now).toISOString(),
    resolves_at: new Date(now + duration * 1000).toISOString(),
    tone,
    map
  };
}

const demoCities: CityLabel[] = [
  { name: "Нью-Йорк", x: 22, y: 38 },
  { name: "Берлин", x: 52, y: 33 },
  { name: "Токио", x: 82, y: 42 },
  { name: "Дубай", x: 61, y: 51 },
  { name: "Сан-Паулу", x: 35, y: 72 },
  { name: "Сидней", x: 84, y: 76 },
  { name: "Кейптаун", x: 53, y: 78 }
];
