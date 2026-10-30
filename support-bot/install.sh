#!/usr/bin/env bash
# Installs or updates the Tessra support bot on an Ubuntu server and keeps it running.
#   curl -fsSL https://raw.githubusercontent.com/tatarigami22/tessra-journal/main/support-bot/install.sh | bash
# Run the same command again any time to update it.
set -euo pipefail
DIR="$HOME/tessra-support-bot"
REPO="https://github.com/tatarigami22/tessra-journal.git"

echo "==> Installing Node.js and git"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null
  sudo apt-get install -y nodejs >/dev/null
fi
command -v git >/dev/null 2>&1 || sudo apt-get install -y git >/dev/null

echo "==> Getting the bot"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only --quiet
else
  git clone --quiet --depth 1 --filter=blob:none --sparse "$REPO" "$DIR"
  git -C "$DIR" sparse-checkout set support-bot
fi
cd "$DIR/support-bot"
npm install --omit=dev --no-audit --no-fund --silent

if [ ! -f .env ]; then
  echo
  read -rsp "Paste your Discord bot token (it stays hidden), then press Enter: " DT </dev/tty; echo
  read -rsp "Paste your Anthropic API key (it stays hidden), then press Enter: " AK </dev/tty; echo
  umask 077
  printf 'DISCORD_TOKEN=%s\nANTHROPIC_API_KEY=%s\n' "$DT" "$AK" > .env
fi

echo "==> Test answer (this is what the bot would say)"
echo "Q: How do I import my Tradovate trades?"
node ask.js "How do I import my Tradovate trades?" || { echo "The test failed. Check the Anthropic key in $DIR/support-bot/.env"; exit 1; }

echo "==> Starting the bot (it restarts by itself if it crashes or the server reboots)"
sudo tee /etc/systemd/system/tessra-bot.service >/dev/null <<EOF
[Unit]
Description=Tessra Discord support bot
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
WorkingDirectory=$DIR/support-bot
ExecStart=$(command -v node) bot.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable tessra-bot >/dev/null 2>&1
sudo systemctl restart tessra-bot
sleep 8
sudo journalctl -u tessra-bot -n 8 --no-pager -o cat
echo
echo "Done. Logs any time: sudo journalctl -u tessra-bot -f"
