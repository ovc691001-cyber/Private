# VPS Production Deployment

This guide turns the temporary local setup into a permanent Telegram Mini App deployment.

Target URLs:

```text
https://app.example.com -> frontend
https://api.example.com -> backend
```

BotFather should use only the frontend URL:

```text
https://app.example.com
```

## What You Need

- A VPS with Ubuntu 22.04 or 24.04.
- A domain.
- Two DNS records:
  - `app.example.com` pointing to the VPS IP.
  - `api.example.com` pointing to the VPS IP.
- Open ports on the VPS firewall:
  - `80/tcp`
  - `443/tcp`
  - `22/tcp`

## Server Install

SSH into the VPS:

```bash
ssh root@YOUR_SERVER_IP
```

Install Docker:

```bash
apt update
apt install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Clone or upload the project:

```bash
git clone YOUR_REPO_URL /opt/volatility-club
cd /opt/volatility-club
```

If you do not use git yet, upload the project folder to `/opt/volatility-club` with SFTP or your hosting panel.

## Production Env

Create production env:

```bash
cp .env.production.example .env.production
nano .env.production
```

Fill it:

```env
APP_DOMAIN=app.example.com
API_DOMAIN=api.example.com
ACME_EMAIL=you@example.com

POSTGRES_USER=volatility
POSTGRES_PASSWORD=long_random_database_password
POSTGRES_DB=volatility_club

TELEGRAM_BOT_TOKEN=token_from_botfather
SESSION_SECRET=long_random_64_plus_chars
INTERNAL_SECRET=another_long_random_64_plus_chars

ROUND_DURATION_SECONDS=240
ROUND_BET_AMOUNT=100
ROUND_PAYOUT_MULTIPLIER=2.2
STARTING_BALANCE=1000
HOURLY_REFILL_AMOUNT=100
```

Generate secrets on the server:

```bash
openssl rand -hex 32
```

Run it three times for `POSTGRES_PASSWORD`, `SESSION_SECRET`, and `INTERNAL_SECRET`.

## Start

From the project root:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml up -d --build
```

Check status:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml ps
```

Watch logs:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml logs -f
```

Caddy will automatically request HTTPS certificates for `APP_DOMAIN` and `API_DOMAIN`.

## BotFather

Open `@BotFather`:

```text
/mybots
choose your bot
Bot Settings
Menu Button
Configure menu button
```

Set URL:

```text
https://app.example.com
```

Set title:

```text
Play
```

Open the bot, press `/start`, then press `Play`.

## Updating The MVP Later

On the server:

```bash
cd /opt/volatility-club
git pull
docker compose --env-file .env.production -f infra/docker-compose.prod.yml up -d --build
```

This keeps PostgreSQL, Redis, and Caddy volumes, so users and balances remain.

## Backups

Create a database backup:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml exec postgres pg_dump -U volatility volatility_club > backup.sql
```

Restore only when you know the current database can be replaced:

```bash
cat backup.sql | docker compose --env-file .env.production -f infra/docker-compose.prod.yml exec -T postgres psql -U volatility volatility_club
```

## Useful Commands

Restart all services:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml restart
```

Restart only backend:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml restart backend
```

Restart only frontend:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml restart frontend
```

Stop:

```bash
docker compose --env-file .env.production -f infra/docker-compose.prod.yml down
```

Do not use `down -v` unless you intentionally want to delete database volumes.
