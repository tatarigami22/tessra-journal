#!/bin/bash
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -d node_modules/electron-builder ] || npm install --no-audit --no-fund
echo "Building Tessra..."
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir || { echo "Build failed"; read -n 1; exit 1; }
APP=$(find dist -maxdepth 2 -name "Tessra.app" | head -1)
if [ -n "$APP" ]; then
  codesign --force --deep --sign - "$APP" >/dev/null 2>&1
  osascript -e 'quit app "Edge Journal"' >/dev/null 2>&1
  osascript -e 'quit app "Tessra"' >/dev/null 2>&1
  rm -rf "/Applications/Edge Journal.app" "/Applications/Tessra.app"
  cp -R "$APP" /Applications/
  echo "Installed to /Applications/Tessra.app"
  echo "Your existing trades and journal carry over automatically."
  open -R "/Applications/Tessra.app"
fi
read -n 1 -p "Done. Press any key to close."
