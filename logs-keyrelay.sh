#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

APP_NAME="keyrelay"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Error: pm2 is not installed."
  exit 1
fi

pm2 logs "$APP_NAME"