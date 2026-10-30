# Tessra support bot

A Discord bot that answers in **#help** and **#bug-reports** using Claude (Haiku 5.5).

- Every new post gets its own thread with an answer based on the Tessra README and `knowledge.md`.
- In #bug-reports it asks for the version, computer and steps, then logs the report to **#mod-log**.
- When it can't help, it pings **@Mod** in the thread. Once an Owner or Mod replies in a thread, the bot stays out of it.
- Posts a daily digest of bugs and escalations to #mod-log at 9 PM New York.
- It can't ping @everyone or @here, and it only knows about Tessra. It has no access to GitHub, computers or anything else.
- Limits: 6 replies per person per 10 minutes, 300 replies per day.

To change what it knows, edit `knowledge.md` and run the install command again. It reads the README from GitHub every 6 hours, so new release notes there reach it without doing anything.

## Setup

### 1. Anthropic API key
1. Sign up at https://console.anthropic.com (separate from a Claude subscription).
2. **Billing**: add $5 of credit.
3. **Limits**: set a monthly spend limit (for example $5).
4. **API keys**: Create key, name it "Tessra bot", copy it.

### 2. Discord bot
1. https://discord.com/developers/applications > **New Application**, name it "Tessra Helper".
2. **Bot** tab: turn **Public Bot** off, turn **Message Content Intent** on, Save. Click **Reset Token** and copy the token.
3. **General Information** tab: copy the **Application ID**, then open this link with it filled in:
   `https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot&permissions=309237713984`
   and add it to the Tessra server.
4. In Discord, create a private text channel **#mod-log** (Owner and Mod only) and add the Tessra Helper role to it with View Channel and Send Messages.

### 3. Free server (Oracle Cloud Always Free)
1. Sign up at https://cloud.oracle.com. A card is needed to verify; Always Free resources are not charged.
2. **Compute > Instances > Create instance**. Image: **Ubuntu 24.04**. Shape: **VM.Standard.E2.1.Micro** (Always Free). Under SSH keys choose **Generate a key pair** and **Save private key**. Create.
3. Copy the instance's **Public IP**. On a Mac, open Terminal:
   ```
   chmod 600 ~/Downloads/ssh-key-*.key
   ssh -i ~/Downloads/ssh-key-*.key ubuntu@PUBLIC_IP
   ```
4. Paste this and follow the prompts:
   ```
   curl -fsSL https://raw.githubusercontent.com/tatarigami22/tessra-journal/main/support-bot/install.sh | bash
   ```

It shows a test answer, starts the bot, and keeps it running after crashes and reboots.

## Settings (optional, in `support-bot/.env`)

| Setting | Default |
| --- | --- |
| `HELP_CHANNELS` | `help,bug-reports` |
| `STAFF_ROLES` | `Owner,Mod` (the bot stays quiet once they reply) |
| `PING_ROLE` | `Mod` |
| `LOG_CHANNEL` | `mod-log` |
| `DIGEST_HOUR` / `DIGEST_TZ` | `21` / `America/New_York` |
| `USER_LIMIT` / `DAILY_LIMIT` | `6` / `300` |
| `MODEL` | `claude-haiku-5-5` |

After changing it: `sudo systemctl restart tessra-bot`

## Testing locally

`npm test` runs a simulated Discord conversation without any keys. `npm run ask -- "question"` prints the answer Claude would give, using the key in `.env`.
