# Upliks MVP

Upliks is a Telegram Mini App about short fictional market rounds. Players pick one of several generated campaigns, choose a horizon, place an in-game stake, and climb the daily ranking. The product is fully virtual: no real-money purchases, no subscriptions, and no payment flows.

## What Changed

- Rebrand from the older prototype into **Upliks**
- New neon dark UI close to the latest mock
- Fictional campaign generator instead of generic static asset labels
- Two working horizons:
  - `Ближайшие тики`
  - `Перспектива`
- Flexible stakes:
  - `100`
  - `250`
  - `500`
  - `1000`
- Info boosts:
  - extra history
  - soft pattern hint
- Referral deep links
- Expanded daily mission pool
- Live activity feed
- Built-in learning section

## Product Structure

### Lobby

- Header with Upliks logo, avatar, nickname, level, and balance
- Current round hero card
- Game modes
- How to play
- Trading lessons entry
- Live activity
- Daily missions

### Round Composer

Each round contains three fictional campaigns generated from the round seed. For every campaign the app shows:

- generated name
- generated sector
- generated short description
- volatility style
- chart preview
- visual token for card styling

The player can:

- choose one campaign
- choose horizon
- choose stake
- buy boosts for the current round

### Tabs

- Lobby
- History
- Rating
- Education
- Profile

## Economy

Only one internal balance exists. In the interface it is always rendered as **number + icon**, without any textual currency label.

### Base Values

- start balance: `1000`
- round payout on success: `270 total return`
- default quick stake: `100`
- available stakes: `100`, `250`, `500`, `1000`

### Daily Bonuses

- daily login: `+200`
- rescue when balance is below `200`: `+200`, once per 3 hours

### Daily Missions

Every day the backend deterministically generates a fresh board from a mission pool. The board avoids duplicates and tracks progress from real server data.

Mission examples:

- play 5 rounds
- win 2 rounds
- build a 2-win streak
- use 1 info boost
- pick 3 different campaigns
- play 3 rounds in a row
- make a 250+ stake
- play short horizon
- play long horizon

Rewards vary by mission and are claimed manually.

### Referral Rewards

Every user has a deep link:

```text
https://t.me/<bot_username>?start=<ref_code>
```

Rewards:

- friend joined: `+300`
- same friend completed 3 settled rounds: `+300`

Referral rewards are server-side and idempotent.

## Campaign Generator

The round generator is deterministic from the seed and produces:

- fictional company/campaign names
- sector
- short narrative
- volatility archetype
- soft hint profile
- chart data for both short and long horizon evaluation

Current archetypes:

- `pumpy`
- `stable`
- `false-breakout`
- `late-move`
- `choppy`
- `trend-following`

No real companies are used in generated production data.

## Boosts

### Extra History

- unlocks the full chart for the current round
- cost: `50`

### Soft Hint

- returns a useful but non-explicit pattern clue
- cost: `100`

Boost logic is server-authoritative. The client cannot grant itself access for free.

## Fairness

- round seed hash is shown before settlement
- revealed seed is shown after settlement
- `GET /rounds/:id/verify` recomputes the result from the seed

## Education

The app includes short built-in lessons:

- what a market is
- buyers and sellers
- price movement
- volatility
- trend
- news impact
- risk
- probabilities
- beginner mistakes

Each lesson is optimized for one mobile screen and is reachable from the lobby and the bottom navigation.

## API

Main endpoints:

- `POST /auth/telegram`
- `GET /me`
- `PATCH /me/profile`
- `GET /me/missions`
- `POST /me/claim-daily-login`
- `POST /me/claim-mission`
- `POST /me/claim-rescue`
- `GET /lobby`
- `GET /modes`
- `GET /activity/feed`
- `GET /education/lessons`
- `GET /education/lessons/:id`
- `GET /rounds/current`
- `GET /rounds/:id`
- `GET /rounds/:id/verify`
- `POST /rounds/:id/boosts/history`
- `POST /rounds/:id/boosts/hint`
- `POST /bets`
- `GET /bets/history`
- `GET /leaderboard/daily`
- `GET /profile`
- `GET /referral`
- `POST /internal/rounds/tick`

## Local Run

### Requirements

- Node.js 22+
- pnpm 9+
- Docker Desktop

### 1. Create env

```bash
cp .env.example .env
```

Fill:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
SESSION_SECRET=long_random_secret
INTERNAL_SECRET=long_internal_secret
```

### 2. Start infra

```bash
docker compose up -d
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Generate Prisma client and apply migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Seed a local round

```bash
pnpm db:seed
```

### 6. Run the apps

```bash
pnpm dev
```

Open:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:4000/health`

## Local Browser Preview

For browser-only preview outside Telegram keep this in `.env`:

```env
ENABLE_DEV_AUTH=true
```

Then the app can open in local dev without Telegram `initData`.

## Telegram Setup

1. Create a bot in BotFather
2. Put the bot token and bot username into env
3. Deploy frontend and backend behind HTTPS
4. Set Mini App / menu button URL to:

```text
https://app.your-domain.tld
```

5. Open the bot and press `Play`

## Production Deployment

Use:

- `.env.production.example`
- `infra/docker-compose.prod.yml`
- `infra/Caddyfile`

Start or refresh production:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml up -d --build
```

## Tests

Updated tests cover:

- fictional campaign generation
- round determinism from seed
- horizon schema validation
- 270 payout math
- rescue cooldown
- boost affordability
- soft hint wording
- referral link generation
- daily mission generation without duplicates
- activity item structure
- education lesson access
- absence of money/subscription copy in the UI

Note: in this Windows environment Vitest may still hit a local `spawn EPERM` issue under the Cyrillic home path before executing the suite.
