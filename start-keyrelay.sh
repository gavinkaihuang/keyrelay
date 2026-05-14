#!/usr/bin/env bash
set -euo pipefail

# Always run from the project root (directory of this script)
cd "$(dirname "$0")"

APP_NAME="keyrelay"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Error: pm2 is not installed. Install it first: npm i -g pm2"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Building Next.js app..."
npm run build

echo "Starting app with PM2 on port 3010..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.js --env production
fi

pm2 save
pm2 status "$APP_NAME"

echo "Done. $APP_NAME is managed by PM2 and should be running on port 3010."