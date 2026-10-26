#!/bin/bash
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi
if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display dialog "Node.js is not installed. Install the LTS version from nodejs.org, then try again." buttons {"OK"}'
  open "https://nodejs.org"
  exit 1
fi
if [ ! -d node_modules/electron ]; then
  echo "First launch: installing Electron (one time, about a minute)..."
  npm install --no-audit --no-fund
fi
if [ ! -d node_modules/electron/dist ]; then
  node node_modules/electron/install.js
fi
npm start &
sleep 3
osascript -e 'tell application "Terminal" to close (every window whose name contains "Start Tessra")' >/dev/null 2>&1 &
