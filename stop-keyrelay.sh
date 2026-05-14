#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

APP_NAME="keyrelay"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Error: pm2 is not installed."
  exit 1
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 stop "$APP_NAME"
  pm2 delete "$APP_NAME"
  pm2 save
  echo "Stopped and removed PM2 process: $APP_NAME"
else
  echo "PM2 process '$APP_NAME' not found. Nothing to stop."
fi