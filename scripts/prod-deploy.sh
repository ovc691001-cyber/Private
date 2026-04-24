#!/usr/bin/env sh
set -eu

docker compose --env-file .env.production -f infra/docker-compose.prod.yml pull
docker compose --env-file .env.production -f infra/docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f infra/docker-compose.prod.yml ps
