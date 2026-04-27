"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { EventMap } from "@/components/EventMap";
import { Legend } from "@/components/Legend";
import { TelegramHeader } from "@/components/TelegramHeader";
import { AppIcon } from "@/components/Icon";
import { api, ApiError, saveSessionToken } from "@/lib/api";
import { getDeviceFingerprint, getTelegramInitData, setupTelegramTheme } from "@/lib/telegram";

export type AppTab = "lobby" | "assets" | "map" | "events" | "profile";
type AppView = AppTab | "assetDetail" | "market" | "round" | "eventDetail";
export type Accent = "green" | "blue" | "orange" | "red";
export type TransportType = "plane" | "ship" | "truck";
type EventOutcome = "success" | "delay" | "fail";
type Direction = "up" | "down";

type ChartPoint = {
  tick: number;
  value: number;
};

export type User = {
  balance: number;
  nickname: string | null;
  firstName: string | null;
  photoUrl: string | null;
  username?: string | null;
};

export type RoundAsset = {
  id: string;
  name: string;
  sector: string;
  description: string;
  iconToken: string;
  currentPrice: number;
  change5m: number;
  players: number;
  pool: number;
  accent: Accent | "purple";
  chartData: ChartPoint[];
  volatilityType?: string;
  volatilityLabel?: string;
  volatilityScore?: number;
  finalReturn?: number | null;
  returnsByHorizon?: { short: number; long: number } | null;
  hint?: string | null;
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

export type Round = {
  id: string;
  seedHash: string;
  revealedSeed: string | null;
  number: number;
  status: string;
  statusLabel: string;
  startAt: string;
  endAt: string;
  remainingSeconds: number;
  prizePool: number;
  platformFeePercent: number;
  participantCount: number;
  participantAvatars: string[];
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

export type ActivityItem = {
  id: string;
  kind: "system" | "market" | "leaderboard";
  text: string;
};

export type EducationLessonPreview = {
  id: string;
  title: string;
  summary: string;
};

export type EducationLessonFull = EducationLessonPreview & {
  body: string[];
  quiz?: {
    question: string;
    answer: string;
  } | null;
};

export type MapPoint = {
  x: number;
  y: number;
};

type BackendMapEvent = {
  id: string;
  title: string;
  description: string;
  route_from: string;
  route_to: string;
  related_asset_id: string;
  related_asset_name: string;
  transport_type: TransportType | "weather";
  duration_seconds: number;
  remaining_seconds: number;
  status: "active" | "resolved";
  resolves_at: string;
  probability_success: number;
  probability_delay: number;
  probability_fail: number;
  tone: Accent | "purple";
  outcome: EventOutcome | null;
  success_impact: number;
  delay_impact: number;
  fail_impact: number;
  map: {
    from: MapPoint;
    to: MapPoint;
    card: MapPoint;
    vehicle: MapPoint;
  };
};

export type MapEvent = {
  id: string;
  title: string;
  route: string;
  routeFrom: string;
  routeTo: string;
  timer: string;
  description: string;
  transport: TransportType;
  accent: Accent;
  from: MapPoint;
  to: MapPoint;
  vehicle: MapPoint;
  card: MapPoint;
  status: "active" | "resolved";
  remainingSeconds: number;
  durationSeconds: number;
  resolvesAt: string;
  successProbability: number;
  delayProbability: number;
  failProbability: number;
  assetId: string;
  assetName: string;
  successImpact: number;
  delayImpact: number;
  failImpact: number;
  outcome: EventOutcome | null;
};

type FeedEvent = {
  id: string;
  title: string;
  subtitle: string;
  impact: string;
  time: string;
  accent: "lime" | "orange" | "red" | "cyan";
  icon: "plane" | "ship" | "truck" | "activity";
};

type LobbyResponse = {
  user: User;
  round: Round;
  assets: RoundAsset[];
  map: {
    events: BackendMapEvent[];
  };
  eventFeed: Array<{
    id: string;
    title: string;
    description: string;
    assetName: string | null;
    impactPercent: number;
    timeAgo: string;
    tone: "green" | "red" | "orange" | "blue" | "purple";
  }>;
  profile: ProfileDetails;
  history: BetHistory[];
  leaderboard: LeaderboardRow[];
  missions: Mission[];
  referral: ReferralOverview;
};

type LobbyState = {
  user: User;
  round: Round;
  assets: RoundAsset[];
  rawEvents: BackendMapEvent[];
  feed: FeedEvent[];
  profile: ProfileDetails;
  history: BetHistory[];
  leaderboard: LeaderboardRow[];
  missions: Mission[];
  referral: ReferralOverview;
};

type MarketAction = {
  id: string;
  assetId: string;
  direction: Direction;
  amount: number;
};

type AcceptedRoundBet = {
  assetId: string;
  assetName: string;
  direction: Direction;
  amount: number;
  placedAt: number;
};

const ROUND_AMOUNTS = [100, 250, 500, 1000] as const;
const MARKET_AMOUNTS = [100, 500, 1000] as const;

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="upliks-screen-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {action}
    </div>
  );
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatTimer(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function secondsUntil(isoDate: string, now: number) {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - now) / 1000));
}

function eventAccent(tone: BackendMapEvent["tone"]): Accent {
  if (tone === "green") return "green";
  if (tone === "orange") return "orange";
  if (tone === "red") return "red";
  return "blue";
}

function eventTransport(transport: BackendMapEvent["transport_type"]): TransportType {
  if (transport === "ship") return "ship";
  if (transport === "truck") return "truck";
  return "plane";
}

function feedAccent(tone: "green" | "red" | "orange" | "blue" | "purple"): FeedEvent["accent"] {
  if (tone === "green") return "lime";
  if (tone === "orange") return "orange";
  if (tone === "red") return "red";
  return "cyan";
}

function feedIcon(title: string): FeedEvent["icon"] {
  const normalized = title.toLowerCase();
  if (normalized.includes("танкер") || normalized.includes("шторм")) return normalized.includes("шторм") ? "activity" : "ship";
  if (normalized.includes("грузовик")) return "truck";
  return "plane";
}

function toFeed(items: LobbyResponse["eventFeed"]): FeedEvent[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.assetName ? `${item.description} • ${item.assetName}` : item.description,
    impact: `${item.impactPercent >= 0 ? "+" : ""}${item.impactPercent.toFixed(1)}%`,
    time: item.timeAgo,
    accent: feedAccent(item.tone),
    icon: feedIcon(item.title)
  }));
}

function toState(payload: LobbyResponse): LobbyState {
  return {
    user: payload.user,
    round: payload.round,
    assets: payload.assets,
    rawEvents: payload.map.events,
    feed: toFeed(payload.eventFeed),
    profile: payload.profile,
    history: payload.history,
    leaderboard: payload.leaderboard,
    missions: payload.missions,
    referral: payload.referral
  };
}

function formatMoney(value: number) {
  return Math.max(0, value).toLocaleString("ru-RU");
}

function Money({ value, signed = false }: { value: number; signed?: boolean }) {
  return (
    <span className="money-value">
      {signed && value > 0 ? "+" : ""}
      {formatMoney(value)}
      <span className="money-icon">₽</span>
    </span>
  );
}

function toneForAsset(asset: Pick<RoundAsset, "accent" | "change5m">) {
  if (asset.accent === "purple") return "purple";
  if (asset.accent === "green") return "lime";
  if (asset.accent === "blue") return "blue";
  if (asset.accent === "orange") return "orange";
  if (asset.accent === "red") return "red";
  return asset.change5m >= 0 ? "lime" : "red";
}

function assetSceneKind(asset: RoundAsset) {
  const token = asset.iconToken.toLowerCase();
  if (token.includes("logistics") || asset.name === "SkyForge") return "drone";
  if (token.includes("tech") || asset.name === "QuantCircuit") return "chip";
  if (token.includes("transport") || asset.name === "AeroTexa") return "transport";
  if (token.includes("medicine") || asset.name === "NeuroPharm") return "lab";
  if (token.includes("energy") || asset.name === "EcoVolt") return "energy";
  return "chip";
}

function marketInterest(asset: RoundAsset, localBoost = 0) {
  const baseline = Math.min(88, Math.max(16, Math.round(asset.players / 16)));
  return Math.min(96, baseline + localBoost);
}

function normalizePoints(points: ChartPoint[]) {
  const values = points.length ? points.map((point) => point.value) : [100, 101, 100.5, 102];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 46 - ((value - min) / span) * 34;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
}

function Sparkline({ points, tone, large = false }: { points: ChartPoint[]; tone: string; large?: boolean }) {
  const path = normalizePoints(points);
  return (
    <svg className={`sparkline ${large ? "large" : ""} tone-${tone}`} viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">
      <polyline className="sparkline-glow" points={path.join(" ")} />
      <polyline className="sparkline-line" points={path.join(" ")} />
    </svg>
  );
}

function MarketInfluenceBadge({ interest, players }: { interest: number; players: number }) {
  return (
    <div className="market-influence" style={{ ["--interest" as string]: `${interest}%` }}>
      <div className="market-influence__top">
        <span>интерес</span>
        <strong>{interest}%</strong>
      </div>
      <div className="market-influence__bar">
        <i />
      </div>
      <span className="market-influence__meta">{formatMoney(players)} игроков</span>
    </div>
  );
}

function AssetMiniScene({ asset, interest, large = false }: { asset: RoundAsset; interest: number; large?: boolean }) {
  const kind = assetSceneKind(asset);
  const tone = toneForAsset(asset);
  const mood = asset.change5m >= 0 ? "is-up" : "is-down";

  return (
    <div className={`asset-scene scene-${kind} tone-${tone} ${mood} ${large ? "large" : ""}`} style={{ ["--interest" as string]: `${interest}%` }}>
      <span className="scene-flow flow-a" />
      <span className="scene-flow flow-b" />
      <span className="scene-flow flow-c" />
      <span className="scene-glow" />

      {kind === "drone" ? (
        <div className="scene-drone">
          <span className="rotor left" />
          <span className="rotor right" />
          <span className="drone-body" />
        </div>
      ) : null}

      {kind === "chip" ? (
        <div className="scene-chip">
          <span />
          <i />
        </div>
      ) : null}

      {kind === "transport" ? (
        <div className="scene-transport">
          <span className="transport-body" />
          <i className="trail one" />
          <i className="trail two" />
        </div>
      ) : null}

      {kind === "lab" ? (
        <div className="scene-lab">
          <span className="capsule" />
          <i className="pulse" />
        </div>
      ) : null}

      {kind === "energy" ? (
        <div className="scene-energy">
          <span className="battery"><i /></span>
          <em />
        </div>
      ) : null}
    </div>
  );
}

function AssetPreviewCard({
  asset,
  interest,
  onClick,
  compact = false
}: {
  asset: RoundAsset;
  interest: number;
  onClick: () => void;
  compact?: boolean;
}) {
  const tone = toneForAsset(asset);

  return (
    <button type="button" className={`asset-live-card tone-${tone} ${compact ? "compact" : ""}`} onClick={onClick}>
      <AssetMiniScene asset={asset} interest={interest} />
      <div className="asset-live-card__copy">
        <span className="asset-mini-letter">{asset.name.slice(0, 1)}</span>
        <strong>{asset.name}</strong>
        <span>{asset.sector}</span>
      </div>
      <div className="asset-live-card__numbers">
        <span className={asset.change5m < 0 ? "bad" : "good"}>{`${asset.change5m >= 0 ? "+" : ""}${asset.change5m.toFixed(1)}%`}</span>
        <Money value={asset.currentPrice} />
      </div>
      <Sparkline points={asset.chartData} tone={tone} />
      <MarketInfluenceBadge interest={interest} players={asset.players} />
    </button>
  );
}

function EventListItem({ event, onClick }: { event: MapEvent; onClick: () => void }) {
  const iconTone = event.accent === "green" ? "lime" : event.accent === "blue" ? "cyan" : event.accent;
  const impact = event.outcome === "fail" ? event.failImpact : event.outcome === "delay" ? event.delayImpact : event.successImpact;

  return (
    <button type="button" className="upliks-feed-item tall is-clickable" onClick={onClick}>
      <div className={`upliks-feed-icon tone-${iconTone}`}>
        <AppIcon name={event.transport === "ship" ? "ship" : event.transport === "truck" ? "truck" : "plane"} size={18} tone={iconTone} />
      </div>
      <div className="upliks-feed-copy">
        <strong>{event.title}</strong>
        <span>{event.route} • {event.assetName}</span>
      </div>
      <div className="upliks-feed-side">
        <strong>{event.timer}</strong>
        <span className={impact < 0 ? "bad" : "good"}>{event.status === "resolved" ? `${impact >= 0 ? "+" : ""}${impact.toFixed(1)}%` : "в пути"}</span>
      </div>
    </button>
  );
}

function RoundStatusPill({ status, seconds }: { status: string; seconds: number }) {
  const label = seconds <= 0 ? "Завершён" : status || "Идёт";
  return (
    <span className="round-status-pill">
      <i />
      {label}
    </span>
  );
}

function LobbyScreen({
  state,
  assets,
  events,
  roundSeconds,
  balance,
  interestForAsset,
  onTopUp,
  onPlayRound,
  onOpenAsset,
  onOpenEvent,
  onOpenEvents
}: {
  state: LobbyState;
  assets: RoundAsset[];
  events: MapEvent[];
  roundSeconds: number;
  balance: number;
  interestForAsset: (asset: RoundAsset) => number;
  onTopUp: () => void;
  onPlayRound: () => void;
  onOpenAsset: (asset: RoundAsset) => void;
  onOpenEvent: (event: MapEvent) => void;
  onOpenEvents: () => void;
}) {
  return (
    <section className="upliks-tab-screen">
      <div className="lobby-wallet-row">
        <div className="balance-chip">
          <span>баланс</span>
          <strong><Money value={balance} /></strong>
        </div>
        <button type="button" className="round-icon-button top-up" aria-label="Добавить 1000 демо рублей" onClick={onTopUp}>
          <AppIcon name="plus" size={18} tone="lime" />
        </button>
        <button type="button" className="round-icon-button" aria-label="Подарки">
          <AppIcon name="gift" size={18} tone="purple" />
        </button>
        <button type="button" className="round-icon-button" aria-label="Уведомления">
          <AppIcon name="bell" size={18} tone="cyan" />
        </button>
        <div className="upliks-avatar-badge">{(state.user.nickname ?? state.user.firstName ?? "U").slice(0, 1)}</div>
      </div>

      <div className="upliks-hero-card round-card">
        <div className="round-card__head">
          <div>
            <span className="upliks-label">Раунд #{state.round.number}</span>
            <RoundStatusPill status={state.round.statusLabel} seconds={roundSeconds} />
          </div>
          <strong className="round-timer">{formatTimer(roundSeconds)}</strong>
        </div>

        <div className="round-energy-panel">
          <div className="round-energy-panel__pulse" />
          <span>рынок влияния активен</span>
          <strong>ставки, события и интерес игроков уже двигают раунд</strong>
        </div>

        <button type="button" className="upliks-pill-button wide" onClick={onPlayRound}>
          Играть в раунд
        </button>

        <div className="round-card__stats">
          <div>
            <span>призовой фонд</span>
            <strong><Money value={state.round.prizePool} /></strong>
          </div>
          <div>
            <span>комиссия</span>
            <strong>{state.round.platformFeePercent}%</strong>
          </div>
        </div>

        <div className="participant-strip">
          <div className="participant-avatars">
            {state.round.participantAvatars.slice(0, 5).map((avatar, index) => (
              <span key={`${avatar}:${index}`}>{avatar}</span>
            ))}
          </div>
          <span>{formatMoney(state.round.participantCount)} игроков участвуют</span>
        </div>
      </div>

      <div className="upliks-block-card">
        <div className="upliks-block-head">
          <h2>Популярные активы</h2>
          <span>деньги = влияние</span>
        </div>

        <div className="upliks-asset-mini-grid">
          {assets.slice(0, 3).map((asset) => (
            <AssetPreviewCard key={asset.id} asset={asset} interest={interestForAsset(asset)} compact onClick={() => onOpenAsset(asset)} />
          ))}
        </div>
      </div>

      <div className="upliks-block-card">
        <div className="upliks-block-head">
          <h2>Лента событий</h2>
          <button type="button" className="tiny-link-button" onClick={onOpenEvents}>Все</button>
        </div>

        <div className="upliks-list">
          {(events.length ? events.slice(0, 1) : []).map((event) => (
            <EventListItem key={event.id} event={event} onClick={() => onOpenEvent(event)} />
          ))}
          {state.feed.slice(0, 2).map((item) => (
            <article key={item.id} className="upliks-feed-item">
              <div className={`upliks-feed-icon tone-${item.accent}`}>
                <AppIcon name={item.icon} size={18} tone={item.accent === "cyan" ? "cyan" : item.accent} />
              </div>
              <div className="upliks-feed-copy">
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
              <div className="upliks-feed-side">
                <strong className={item.impact.startsWith("-") ? "bad" : "good"}>{item.impact}</strong>
                <span>{item.time}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AssetsScreen({
  assets,
  interestForAsset,
  onOpenAsset
}: {
  assets: RoundAsset[];
  interestForAsset: (asset: RoundAsset) => number;
  onOpenAsset: (asset: RoundAsset) => void;
}) {
  const [filter, setFilter] = useState("Все");
  const filters = ["Все", "Технологии", "Транспорт", "Энергетика"];
  const filteredAssets = filter === "Все" ? assets : assets.filter((asset) => asset.sector === filter);

  return (
    <section className="upliks-tab-screen">
      <SectionTitle title="Активы" subtitle="Живые компании текущего раунда: цена, интерес игроков, поток денег и события." />

      <div className="filter-row">
        {filters.map((item) => (
          <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="upliks-list">
        {filteredAssets.map((asset) => (
          <button key={asset.id} type="button" className={`asset-row-live tone-${toneForAsset(asset)}`} onClick={() => onOpenAsset(asset)}>
            <AssetMiniScene asset={asset} interest={interestForAsset(asset)} />
            <div className="asset-row-live__main">
              <div>
                <strong>{asset.name}</strong>
                <span>{asset.sector}</span>
              </div>
              <Sparkline points={asset.chartData} tone={toneForAsset(asset)} />
              <MarketInfluenceBadge interest={interestForAsset(asset)} players={asset.players} />
            </div>
            <div className="asset-row-live__side">
              <strong><Money value={asset.currentPrice} /></strong>
              <span className={asset.change5m < 0 ? "bad" : "good"}>{`${asset.change5m >= 0 ? "+" : ""}${asset.change5m.toFixed(1)}%`}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function AssetDetailScreen({
  asset,
  events,
  interest,
  onBack,
  onMarket,
  onRound,
  onOpenEvent
}: {
  asset: RoundAsset;
  events: MapEvent[];
  interest: number;
  onBack: () => void;
  onMarket: () => void;
  onRound: () => void;
  onOpenEvent: (event: MapEvent) => void;
}) {
  const tone = toneForAsset(asset);

  return (
    <section className="upliks-tab-screen">
      <SectionTitle
        title={asset.name}
        subtitle={asset.sector}
        action={
          <button type="button" className="round-icon-button" aria-label="Закрыть актив" onClick={onBack}>
            <AppIcon name="close" size={18} tone="text" />
          </button>
        }
      />

      <div className={`asset-detail-hero tone-${tone}`}>
        <AssetMiniScene asset={asset} interest={interest} large />
        <Sparkline points={asset.chartData} tone={tone} large />
      </div>

      <div className="metric-grid">
        <div>
          <span>текущая цена</span>
          <strong><Money value={asset.currentPrice} /></strong>
        </div>
        <div>
          <span>изменение 5M</span>
          <strong className={asset.change5m < 0 ? "bad" : "good"}>{`${asset.change5m >= 0 ? "+" : ""}${asset.change5m.toFixed(1)}%`}</strong>
        </div>
        <div>
          <span>игроков</span>
          <strong>{formatMoney(asset.players)}</strong>
        </div>
        <div>
          <span>вложено</span>
          <strong><Money value={asset.pool} /></strong>
        </div>
      </div>

      <MarketInfluenceBadge interest={interest} players={asset.players} />

      <div className="action-pair">
        <button type="button" className="upliks-pill-button wide" onClick={onMarket}>Вложить на бирже</button>
        <button type="button" className="secondary-button" onClick={onRound}>Сделать ставку</button>
      </div>

      <div className="upliks-block-card">
        <div className="upliks-block-head">
          <h2>Влияющие события</h2>
          <span>{events.length || 0} активных триггера</span>
        </div>
        <div className="upliks-list">
          {events.length ? (
            events.map((event) => <EventListItem key={event.id} event={event} onClick={() => onOpenEvent(event)} />)
          ) : (
            <div className="empty-state">Сейчас актив двигается в основном за счёт интереса игроков.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function MarketScreen({
  asset,
  balance,
  interest,
  direction,
  amount,
  onBack,
  onDirection,
  onAmount,
  onInvest
}: {
  asset: RoundAsset;
  balance: number;
  interest: number;
  direction: Direction;
  amount: number;
  onBack: () => void;
  onDirection: (direction: Direction) => void;
  onAmount: (amount: number) => void;
  onInvest: () => void;
}) {
  return (
    <section className="upliks-tab-screen">
      <SectionTitle
        title="Биржа влияния"
        subtitle="Демо-режим: вклад меняет визуальный интерес к активу."
        action={
          <button type="button" className="round-icon-button" aria-label="Назад" onClick={onBack}>
            <AppIcon name="close" size={18} tone="text" />
          </button>
        }
      />

      <div className={`market-panel tone-${toneForAsset(asset)}`}>
        <div className="market-panel__head">
          <div>
            <strong>{asset.name}</strong>
            <span>{asset.sector}</span>
          </div>
          <Money value={balance} />
        </div>
        <AssetMiniScene asset={asset} interest={interest} large />
        <MarketInfluenceBadge interest={interest} players={asset.players} />
      </div>

      <div className="choice-card">
        <span className="choice-label">Направление влияния</span>
        <div className="segmented-control">
          <button type="button" className={direction === "up" ? "active" : ""} onClick={() => onDirection("up")}>Вложить в рост</button>
          <button type="button" className={direction === "down" ? "active danger" : "danger"} onClick={() => onDirection("down")}>Вложить в падение</button>
        </div>
      </div>

      <div className="choice-card">
        <span className="choice-label">Сумма</span>
        <div className="amount-row">
          {MARKET_AMOUNTS.map((value) => (
            <button key={value} type="button" className={amount === value ? "active" : ""} onClick={() => onAmount(value)}>
              <Money value={value} />
            </button>
          ))}
          <button type="button" className={amount === balance ? "active" : ""} onClick={() => onAmount(balance)}>
            всё
          </button>
        </div>
        <input className="amount-input" inputMode="numeric" value={String(amount)} onChange={(event) => onAmount(Number(event.target.value.replace(/\D/g, "")))} />
      </div>

      <button type="button" className="upliks-pill-button wide" onClick={onInvest}>
        Подтвердить влияние
      </button>
    </section>
  );
}

function RoundPlayScreen({
  assets,
  events,
  round,
  roundSeconds,
  balance,
  selectedAssetId,
  direction,
  amount,
  acceptedBet,
  interestForAsset,
  onSelectAsset,
  onDirection,
  onAmount,
  onConfirm,
  onOpenMap,
  onOpenAsset
}: {
  assets: RoundAsset[];
  events: MapEvent[];
  round: Round;
  roundSeconds: number;
  balance: number;
  selectedAssetId: string | null;
  direction: Direction;
  amount: number;
  acceptedBet: AcceptedRoundBet | null;
  interestForAsset: (asset: RoundAsset) => number;
  onSelectAsset: (assetId: string) => void;
  onDirection: (direction: Direction) => void;
  onAmount: (amount: number) => void;
  onConfirm: () => void;
  onOpenMap: () => void;
  onOpenAsset: (asset: RoundAsset) => void;
}) {
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? null;

  return (
    <section className="upliks-tab-screen">
      <SectionTitle title="Участие в раунде" subtitle={`Раунд #${round.number} • до конца ${formatTimer(roundSeconds)}`} />

      <div className="round-entry-card">
        <div>
          <RoundStatusPill status={round.statusLabel} seconds={roundSeconds} />
          <strong className="round-timer">{formatTimer(roundSeconds)}</strong>
        </div>
        <div>
          <span>доступно</span>
          <strong><Money value={balance} /></strong>
        </div>
      </div>

      <div className="round-asset-picker">
        {assets.map((asset) => (
          <button key={asset.id} type="button" className={selectedAsset?.id === asset.id ? "active" : ""} onClick={() => onSelectAsset(asset.id)}>
            <AssetMiniScene asset={asset} interest={interestForAsset(asset)} />
            <span>{asset.name}</span>
            <strong className={asset.change5m < 0 ? "bad" : "good"}>{`${asset.change5m >= 0 ? "+" : ""}${asset.change5m.toFixed(1)}%`}</strong>
          </button>
        ))}
      </div>

      {selectedAsset ? (
        <div className="choice-card">
          <div className="choice-card__head">
            <span className="choice-label">Прогноз по {selectedAsset.name}</span>
            <button type="button" className="tiny-link-button" onClick={() => onOpenAsset(selectedAsset)}>детали</button>
          </div>
          <div className="segmented-control">
            <button type="button" className={direction === "up" ? "active" : ""} onClick={() => onDirection("up")}>Пойдёт вверх</button>
            <button type="button" className={direction === "down" ? "active danger" : "danger"} onClick={() => onDirection("down")}>Пойдёт вниз</button>
          </div>
        </div>
      ) : null}

      <div className="choice-card">
        <span className="choice-label">Сумма ставки</span>
        <div className="amount-row">
          {[100, 500, 1000].map((value) => (
            <button key={value} type="button" className={amount === value ? "active" : ""} onClick={() => onAmount(value)}>
              <Money value={value} />
            </button>
          ))}
          <button type="button" onClick={() => onAmount(bestRoundAmount(balance))}>всё</button>
        </div>
        <input className="amount-input" inputMode="numeric" value={String(amount)} onChange={(event) => onAmount(Number(event.target.value.replace(/\D/g, "")))} />
      </div>

      <button type="button" className="upliks-pill-button wide" onClick={onConfirm}>
        Подтвердить ставку
      </button>

      {acceptedBet ? (
        <div className="accepted-bet-card">
          <span>текущая ставка</span>
          <strong>{acceptedBet.assetName} • {acceptedBet.direction === "up" ? "вверх" : "вниз"} • <Money value={acceptedBet.amount} /></strong>
        </div>
      ) : null}

      <div className="upliks-block-card">
        <div className="upliks-block-head">
          <h2>События рядом</h2>
          <button type="button" className="tiny-link-button" onClick={onOpenMap}>карта</button>
        </div>
        <div className="round-event-strip">
          {events.slice(0, 3).map((event) => (
            <span key={event.id}>{event.title} • {event.timer}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MapScreen({
  zoom,
  onZoomIn,
  onZoomOut,
  expanded,
  onToggleExpanded,
  events,
  onEventSelect
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  events: MapEvent[];
  onEventSelect: (event: MapEvent) => void;
}) {
  return (
    <section className={`upliks-map-shell ${expanded ? "is-expanded" : ""}`}>
      <div className="upliks-map-head">
        <div>
          <h1>Карта событий</h1>
          <p className="upliks-live-indicator">
            <span className="upliks-live-dot" />
            Серверное <strong>время</strong>
          </p>
        </div>

        <button
          type="button"
          className="upliks-map-action"
          aria-label={expanded ? "Свернуть карту" : "Расширить карту"}
          aria-pressed={expanded}
          onClick={onToggleExpanded}
        >
          <AppIcon name="fullscreen" size={18} tone="text" />
        </button>
      </div>

      <EventMap events={events} zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onEventSelect={onEventSelect} />
      <Legend />
    </section>
  );
}

function EventDetailScreen({
  event,
  asset,
  onBack,
  onAsset
}: {
  event: MapEvent;
  asset: RoundAsset | null;
  onBack: () => void;
  onAsset: () => void;
}) {
  const progress = Math.round((1 - event.remainingSeconds / Math.max(1, event.durationSeconds)) * 100);
  const outcomes = outcomeRows(event);

  return (
    <section className="upliks-tab-screen">
      <SectionTitle
        title="Текущее событие"
        subtitle={event.status === "resolved" ? "исход зафиксирован сервером" : "маршрут в пути"}
        action={
          <button type="button" className="round-icon-button" aria-label="Закрыть событие" onClick={onBack}>
            <AppIcon name="close" size={18} tone="text" />
          </button>
        }
      />

      <div className={`event-detail-card tone-${event.accent}`}>
        <div className="event-detail-card__top">
          <span className="upliks-map-event-icon">
            <AppIcon name={event.transport === "ship" ? "ship" : event.transport === "truck" ? "truck" : "plane"} size={20} tone={event.accent === "blue" ? "cyan" : event.accent === "green" ? "lime" : event.accent} />
          </span>
          <div>
            <strong>{event.title}</strong>
            <span>{event.route}</span>
          </div>
        </div>
        <p>{event.description}</p>
        <div className="event-timer-block">
          <span>{event.status === "resolved" ? "Завершено" : "Прибытие через"}</span>
          <strong>{event.timer}</strong>
        </div>
        <div className="event-progress">
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="event-progress-labels">
          <span>Вылет</span>
          <span>В пути</span>
          <span>Прибытие</span>
        </div>
      </div>

      <button type="button" className="linked-asset-card" onClick={onAsset}>
        <span>Влияние на актив</span>
        <strong>{asset?.name ?? event.assetName}</strong>
        <AppIcon name="arrow-right" size={18} tone="lime" />
      </button>

      <div className="upliks-block-card">
        <div className="upliks-block-head">
          <h2>Возможные исходы</h2>
          <span>рассчитаны на сервере</span>
        </div>
        <div className="outcome-list">
          {outcomes.map((outcome) => (
            <div key={outcome.id} className={event.outcome === outcome.id ? "active" : ""}>
              <strong>{outcome.label}</strong>
              <span>вероятность {outcome.probability}%</span>
              <em className={outcome.impact < 0 ? "bad" : "good"}>{event.assetName} {outcome.impact >= 0 ? "+" : ""}{outcome.impact.toFixed(1)}%</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EventsScreen({
  events,
  feed,
  onOpenEvent
}: {
  events: MapEvent[];
  feed: FeedEvent[];
  onOpenEvent: (event: MapEvent) => void;
}) {
  return (
    <section className="upliks-tab-screen">
      <SectionTitle
        title="Лента событий"
        subtitle="Текущие и завершённые триггеры, которые двигают настроение активов."
        action={<button type="button" className="tiny-link-button">Все</button>}
      />

      <div className="upliks-list">
        {events.map((event) => (
          <EventListItem key={event.id} event={event} onClick={() => onOpenEvent(event)} />
        ))}
      </div>

      <div className="upliks-block-card">
        <div className="upliks-block-head">
          <h2>Последние эффекты</h2>
          <span>результаты и системная активность</span>
        </div>

        <div className="upliks-list">
          {feed.slice(0, 5).map((item) => (
            <article key={item.id} className="upliks-feed-item">
              <div className={`upliks-feed-icon tone-${item.accent}`}>
                <AppIcon name={item.icon} size={18} tone={item.accent === "cyan" ? "cyan" : item.accent} />
              </div>
              <div className="upliks-feed-copy">
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
              <div className="upliks-feed-side">
                <strong className={item.impact.startsWith("-") ? "bad" : "good"}>{item.impact}</strong>
                <span>{item.time}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileScreen({ state, balance, acceptedBet }: { state: LobbyState; balance: number; acceptedBet: AcceptedRoundBet | null }) {
  return (
    <section className="upliks-tab-screen">
      <SectionTitle title="Профиль" subtitle="Статистика игрока и демо-баланс текущей сессии." />

      <div className="upliks-profile-card-simple">
        <div className="upliks-profile-head">
          <div className="upliks-avatar-badge large">{(state.user.nickname ?? state.user.firstName ?? "U").slice(0, 1)}</div>
          <div>
            <strong>{state.user.nickname ?? state.user.firstName ?? "Игрок"}</strong>
            <span>{`Уровень ${state.profile.level} • Winrate ${state.profile.winRate}%`}</span>
          </div>
        </div>

        <div className="upliks-profile-grid-simple">
          <div>
            <span>баланс</span>
            <strong><Money value={balance} /></strong>
          </div>
          <div>
            <span>текущая серия</span>
            <strong>{state.profile.currentStreak}</strong>
          </div>
          <div>
            <span>лучшая серия</span>
            <strong>{state.profile.bestStreak}</strong>
          </div>
          <div>
            <span>приглашено</span>
            <strong>{state.referral.invitedCount}</strong>
          </div>
        </div>
      </div>

      {acceptedBet ? (
        <div className="accepted-bet-card">
          <span>ставка раунда</span>
          <strong>{acceptedBet.assetName} • {acceptedBet.direction === "up" ? "вверх" : "вниз"} • <Money value={acceptedBet.amount} /></strong>
        </div>
      ) : null}
    </section>
  );
}

function LoadingScreen() {
  return (
    <section className="upliks-tab-screen">
      <div className="upliks-hero-card">
        <div className="upliks-block-head">
          <h2>Загружаем текущий раунд</h2>
          <span>Подтягиваем события, активы и баланс игрока</span>
        </div>
      </div>
    </section>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="upliks-tab-screen">
      <div className="upliks-hero-card">
        <div className="upliks-block-head">
          <h2>Не удалось обновить данные</h2>
          <span>{message}</span>
        </div>
        <button type="button" className="upliks-pill-button" onClick={onRetry}>
          Обновить
        </button>
      </div>
    </section>
  );
}

function navTabForView(view: AppView): AppTab {
  if (view === "assetDetail" || view === "market") return "assets";
  if (view === "round") return "lobby";
  if (view === "eventDetail") return "events";
  return view;
}

function titleForView(view: AppView) {
  const labels: Record<AppView, string> = {
    lobby: "Лобби",
    assets: "Активы",
    map: "Карта",
    events: "События",
    profile: "Профиль",
    assetDetail: "Актив",
    market: "Биржа",
    round: "Раунд",
    eventDetail: "Событие"
  };
  return labels[view];
}

function bestRoundAmount(balance: number) {
  return [...ROUND_AMOUNTS].reverse().find((value) => value <= balance) ?? 100;
}

function normalizeRoundAmount(amount: number, balance: number) {
  const safeAmount = Math.max(0, Math.floor(amount));
  const available = ROUND_AMOUNTS.filter((value) => value <= balance);
  if (available.length === 0) return null;
  if ((ROUND_AMOUNTS as readonly number[]).includes(safeAmount) && safeAmount <= balance) return safeAmount;
  return [...available].reverse().find((value) => value <= safeAmount) ?? available[0] ?? null;
}

function outcomeRows(event: MapEvent) {
  if (event.transport === "ship") {
    return [
      { id: "success" as const, label: "Танкер прибыл", probability: event.successProbability, impact: event.successImpact },
      { id: "delay" as const, label: "Задержался", probability: event.delayProbability, impact: event.delayImpact },
      { id: "fail" as const, label: "Потерял груз / шторм", probability: event.failProbability, impact: event.failImpact }
    ];
  }
  if (event.transport === "truck") {
    return [
      { id: "success" as const, label: "Доставлен", probability: event.successProbability, impact: event.successImpact },
      { id: "delay" as const, label: "Задержан", probability: event.delayProbability, impact: event.delayImpact },
      { id: "fail" as const, label: "Не доставлен", probability: event.failProbability, impact: event.failImpact }
    ];
  }
  return [
    { id: "success" as const, label: "Успешная доставка", probability: event.successProbability, impact: event.successImpact },
    { id: "delay" as const, label: "Задержка", probability: event.delayProbability, impact: event.delayImpact },
    { id: "fail" as const, label: "Неудача", probability: event.failProbability, impact: event.failImpact }
  ];
}

export default function Home() {
  const [zoom, setZoom] = useState(1);
  const [activeView, setActiveView] = useState<AppView>("lobby");
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [state, setState] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventReturnView, setEventReturnView] = useState<AppView>("events");
  const [marketDirection, setMarketDirection] = useState<Direction>("up");
  const [marketAmount, setMarketAmount] = useState(500);
  const [roundDirection, setRoundDirection] = useState<Direction>("up");
  const [roundAmount, setRoundAmount] = useState(500);
  const [marketActions, setMarketActions] = useState<MarketAction[]>([]);
  const [localMarketSpend, setLocalMarketSpend] = useState(0);
  const [acceptedBet, setAcceptedBet] = useState<AcceptedRoundBet | null>(null);
  const roundRef = useRef<string | null>(null);

  const hydrateLobby = useCallback((payload: LobbyResponse) => {
    setState(toState(payload));
    if (roundRef.current && roundRef.current !== payload.round.id) {
      setNotice("Новый раунд начался. Активы, события и таймеры обновлены.");
      setAcceptedBet(null);
      setMarketActions([]);
      setLocalMarketSpend(0);
    }
    roundRef.current = payload.round.id;
    setError(null);
    setLoading(false);
  }, []);

  const ensureSession = useCallback(async () => {
    const deviceFingerprint = getDeviceFingerprint();
    const initData = getTelegramInitData();

    if (initData) {
      const auth = await api<{ sessionToken?: string }>("/auth/telegram", {
        method: "POST",
        body: { initData, deviceFingerprint }
      });
      saveSessionToken(auth.sessionToken);
      return;
    }

    const auth = await api<{ sessionToken?: string }>("/auth/dev", {
      method: "POST",
      body: { deviceFingerprint }
    });
    saveSessionToken(auth.sessionToken);
  }, []);

  const loadLobby = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const payload = await api<LobbyResponse>("/lobby");
        hydrateLobby(payload);
        return;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          try {
            await ensureSession();
            const retryPayload = await api<LobbyResponse>("/lobby");
            hydrateLobby(retryPayload);
            return;
          } catch (retryError) {
            const message = retryError instanceof Error ? retryError.message : "Не удалось авторизоваться.";
            setError(message);
            setLoading(false);
            return;
          }
        }

        const message = error instanceof Error ? error.message : "Не удалось получить данные.";
        setError(message);
        setLoading(false);
      }
    },
    [ensureSession, hydrateLobby]
  );

  useEffect(() => {
    setupTelegramTheme();
    void loadLobby();
  }, [loadLobby]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void loadLobby(true);
    }, 5000);

    return () => window.clearInterval(poll);
  }, [loadLobby]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (navTabForView(activeView) !== "map" && isMapExpanded) {
      setIsMapExpanded(false);
    }
  }, [activeView, isMapExpanded]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = isMapExpanded ? "hidden" : previousOverflow || "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMapExpanded]);

  const roundSeconds = useMemo(() => {
    if (!state) return 0;
    return secondsUntil(state.round.endAt, now);
  }, [now, state]);

  const mapEvents = useMemo<MapEvent[]>(() => {
    if (!state) return [];
    return state.rawEvents.map((event) => {
      const remainingSeconds = secondsUntil(event.resolves_at, now);
      const status = remainingSeconds <= 0 ? "resolved" : event.status;
      return {
        id: event.id,
        title: event.title,
        route: `${event.route_from} → ${event.route_to}`,
        routeFrom: event.route_from,
        routeTo: event.route_to,
        timer: formatTimer(remainingSeconds),
        description: event.description,
        transport: eventTransport(event.transport_type),
        accent: eventAccent(event.tone),
        from: event.map.from,
        to: event.map.to,
        vehicle: event.map.vehicle,
        card: event.map.card,
        status,
        remainingSeconds,
        durationSeconds: Math.max(1, event.duration_seconds),
        resolvesAt: event.resolves_at,
        successProbability: event.probability_success,
        delayProbability: event.probability_delay,
        failProbability: event.probability_fail,
        assetId: event.related_asset_id,
        assetName: event.related_asset_name,
        successImpact: event.success_impact,
        delayImpact: event.delay_impact,
        failImpact: event.fail_impact,
        outcome: status === "resolved" ? event.outcome : null
      };
    });
  }, [now, state]);

  const marketBoostByAsset = useMemo(() => {
    const boost = new Map<string, number>();
    for (const action of marketActions) {
      boost.set(action.assetId, (boost.get(action.assetId) ?? 0) + Math.min(24, Math.floor(action.amount / 120)));
    }
    return boost;
  }, [marketActions]);

  const visibleAssets = useMemo(() => {
    if (!state) return [];
    return state.assets.map((asset) => {
      const localAmount = marketActions.filter((item) => item.assetId === asset.id).reduce((sum, item) => sum + item.amount, 0);
      const playerBoost = Math.floor(localAmount / 100);
      return {
        ...asset,
        players: asset.players + playerBoost,
        pool: asset.pool + localAmount
      };
    });
  }, [marketActions, state]);

  const visibleBalance = Math.max(0, (state?.user.balance ?? 0) - localMarketSpend);
  const selectedAsset = visibleAssets.find((asset) => asset.id === selectedAssetId) ?? visibleAssets[0] ?? null;
  const selectedEvent = mapEvents.find((event) => event.id === selectedEventId) ?? mapEvents[0] ?? null;
  const selectedEventAsset = selectedEvent ? visibleAssets.find((asset) => asset.id === selectedEvent.assetId) ?? null : null;
  const activeNav = navTabForView(activeView);
  const headerTitle = titleForView(activeView);

  const interestForAsset = useCallback(
    (asset: RoundAsset) => marketInterest(asset, marketBoostByAsset.get(asset.id) ?? 0),
    [marketBoostByAsset]
  );

  const openAsset = useCallback((asset: RoundAsset) => {
    setSelectedAssetId(asset.id);
    setActiveView("assetDetail");
  }, []);

  const openEvent = useCallback(
    (event: MapEvent) => {
      setSelectedEventId(event.id);
      setEventReturnView(activeView === "eventDetail" ? "events" : activeView);
      setActiveView("eventDetail");
    },
    [activeView]
  );

  const handleTopUp = useCallback(async () => {
    try {
      const result = await api<{ amount: number; user: User }>("/me/demo-top-up", { method: "POST" });
      setState((current) => (current ? { ...current, user: { ...current.user, balance: result.user.balance } } : current));
      setNotice(`На счёт добавлено ${formatMoney(result.amount)} ₽ (демо).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось пополнить демо-баланс.";
      setNotice(message);
    }
  }, []);

  const handleMarketInvest = useCallback(() => {
    if (!selectedAsset) return;
    const amount = Math.max(0, Math.floor(marketAmount));
    if (amount <= 0) {
      setNotice("Укажи сумму влияния.");
      return;
    }
    if (amount > visibleBalance) {
      setNotice("Недостаточно демо-баланса.");
      return;
    }

    setMarketActions((items) => [...items, { id: `${selectedAsset.id}:${Date.now()}`, assetId: selectedAsset.id, direction: marketDirection, amount }]);
    setLocalMarketSpend((current) => current + amount);
    setNotice(`Вы ${marketDirection === "up" ? "усилили рост" : "усилили давление"} ${selectedAsset.name}.`);
  }, [marketAmount, marketDirection, selectedAsset, visibleBalance]);

  const handleRoundBet = useCallback(async () => {
    if (!state || !selectedAsset) return;
    const normalizedAmount = normalizeRoundAmount(roundAmount, visibleBalance);
    if (!normalizedAmount) {
      setNotice("Недостаточно демо-баланса для ставки.");
      return;
    }
    if (normalizedAmount !== roundAmount) {
      setRoundAmount(normalizedAmount);
      setNotice(`Для раунда выбрана ближайшая доступная сумма ${formatMoney(normalizedAmount)} ₽.`);
      return;
    }

    try {
      await api("/bets", {
        method: "POST",
        body: {
          roundId: state.round.id,
          assetId: selectedAsset.id,
          horizon: roundDirection === "up" ? "long" : "short",
          amount: normalizedAmount
        }
      });
      setAcceptedBet({
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        direction: roundDirection,
        amount: normalizedAmount,
        placedAt: Date.now()
      });
      setState((current) =>
        current
          ? {
              ...current,
              user: { ...current.user, balance: Math.max(0, current.user.balance - normalizedAmount) }
            }
          : current
      );
      setNotice("Ставка принята сервером. Выплата будет рассчитана после раунда.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось создать ставку.";
      setNotice(message);
    }
  }, [roundAmount, roundDirection, selectedAsset, state, visibleBalance]);

  return (
    <main className={`upliks-map-app ${isMapExpanded ? "map-expanded" : ""}`}>
      <TelegramHeader
        title="Upliks"
        subtitle="мини-приложение"
        onClose={() => {
          if (typeof window !== "undefined" && window.Telegram?.WebApp?.close) {
            window.Telegram.WebApp.close();
            return;
          }
          setNotice("Закрытие доступно внутри Telegram.");
        }}
        onMore={() => setNotice(`Открыто меню раздела «${headerTitle}».`)}
      />

      {loading && !state ? <LoadingScreen /> : null}
      {!loading && error && !state ? <ErrorScreen message={error} onRetry={() => void loadLobby()} /> : null}

      {state ? (
        <>
          {activeView === "lobby" ? (
            <LobbyScreen
              state={state}
              assets={visibleAssets}
              events={mapEvents}
              roundSeconds={roundSeconds}
              balance={visibleBalance}
              interestForAsset={interestForAsset}
              onTopUp={() => void handleTopUp()}
              onPlayRound={() => {
                setSelectedAssetId(selectedAsset?.id ?? visibleAssets[0]?.id ?? null);
                setActiveView("round");
              }}
              onOpenAsset={openAsset}
              onOpenEvent={openEvent}
              onOpenEvents={() => setActiveView("events")}
            />
          ) : null}

          {activeView === "assets" ? <AssetsScreen assets={visibleAssets} interestForAsset={interestForAsset} onOpenAsset={openAsset} /> : null}

          {activeView === "assetDetail" && selectedAsset ? (
            <AssetDetailScreen
              asset={selectedAsset}
              events={mapEvents.filter((event) => event.assetId === selectedAsset.id)}
              interest={interestForAsset(selectedAsset)}
              onBack={() => setActiveView("assets")}
              onMarket={() => setActiveView("market")}
              onRound={() => setActiveView("round")}
              onOpenEvent={openEvent}
            />
          ) : null}

          {activeView === "market" && selectedAsset ? (
            <MarketScreen
              asset={selectedAsset}
              balance={visibleBalance}
              interest={interestForAsset(selectedAsset)}
              direction={marketDirection}
              amount={marketAmount}
              onBack={() => setActiveView("assetDetail")}
              onDirection={setMarketDirection}
              onAmount={setMarketAmount}
              onInvest={handleMarketInvest}
            />
          ) : null}

          {activeView === "round" ? (
            <RoundPlayScreen
              assets={visibleAssets}
              events={mapEvents}
              round={state.round}
              roundSeconds={roundSeconds}
              balance={visibleBalance}
              selectedAssetId={selectedAsset?.id ?? null}
              direction={roundDirection}
              amount={roundAmount}
              acceptedBet={acceptedBet}
              interestForAsset={interestForAsset}
              onSelectAsset={setSelectedAssetId}
              onDirection={setRoundDirection}
              onAmount={setRoundAmount}
              onConfirm={() => void handleRoundBet()}
              onOpenMap={() => setActiveView("map")}
              onOpenAsset={openAsset}
            />
          ) : null}

          {activeView === "map" ? (
            <MapScreen
              zoom={zoom}
              onZoomIn={() => setZoom((current) => Math.min(1.18, Math.round((current + 0.05) * 100) / 100))}
              onZoomOut={() => setZoom((current) => Math.max(0.92, Math.round((current - 0.05) * 100) / 100))}
              expanded={isMapExpanded}
              onToggleExpanded={() => setIsMapExpanded((current) => !current)}
              events={mapEvents}
              onEventSelect={openEvent}
            />
          ) : null}

          {activeView === "eventDetail" && selectedEvent ? (
            <EventDetailScreen
              event={selectedEvent}
              asset={selectedEventAsset}
              onBack={() => setActiveView(eventReturnView)}
              onAsset={() => {
                if (selectedEventAsset) openAsset(selectedEventAsset);
              }}
            />
          ) : null}

          {activeView === "events" ? <EventsScreen events={mapEvents} feed={state.feed} onOpenEvent={openEvent} /> : null}
          {activeView === "profile" ? <ProfileScreen state={state} balance={visibleBalance} acceptedBet={acceptedBet} /> : null}
        </>
      ) : null}

      <BottomNav
        active={activeNav}
        onChange={(tab) => {
          setActiveView(tab);
          setIsMapExpanded(false);
        }}
      />

      {notice ? (
        <div className="upliks-inline-toast" role="status">
          {notice}
        </div>
      ) : null}
    </main>
  );
}
