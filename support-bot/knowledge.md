# Tessra support notes

These are the owner's notes for common questions. The current README is added below these notes automatically.

## Basics
- Tessra is a free desktop trading journal for futures and prop firm traders, made by Ethan (Instagram @NQ.Masked). It is free and he does not earn money from it.
- Download: https://github.com/tatarigami22/tessra-journal/releases/latest
- Mac with Apple Silicon (M1, M2, M3, M4): the file ending in mac-arm64.dmg. Intel Mac: mac-x64.dmg. Windows 10 or 11: Tessra-Setup-x.x.x.exe. There is no Linux, iPhone, Android or web version.
- Checking which Mac: Apple menu > About This Mac. "Chip: Apple M..." means Apple Silicon.
- Checking the Tessra version: on Mac, click Tessra in the top menu bar > About Tessra. On Windows, Settings > Apps > Installed apps and find Tessra.
- All data stays on the user's computer. Nothing is uploaded. There are no accounts or logins.

## Install problems
- Mac says Tessra "can't be opened" or "unidentified developer": right click Tessra in Applications and choose Open. If there is no Open button: System Settings > Privacy & Security, scroll down, click Open Anyway. Only needed once.
- Mac says Tessra "is damaged and can't be opened": this is macOS quarantine on unsigned downloads, the file is fine. Make sure Tessra is in Applications, then open Terminal and run: xattr -cr /Applications/Tessra.app and open it again.
- Wrong Mac file: an Intel build on Apple Silicon runs slowly through Rosetta, an Apple Silicon build won't open on an Intel Mac. Download the right file and replace the app in Applications. Data is kept.
- Windows "Windows protected your PC": click More info > Run anyway.
- Running Tessra straight from the opened .dmg window causes problems (updates can't install). Drag it into Applications first and eject the dmg.

## Updates
- From 1.1.1 on, Tessra checks for updates when it opens and asks "Would you like to update now?". Yes downloads, installs and restarts. Data is kept.
- If the update fails or nothing happens: on Mac make sure Tessra is in the Applications folder (not Downloads or the dmg). Otherwise just download the newest file from the releases page and install over the old one. Data is never lost by reinstalling.
- People on 1.0.0 or 1.1.0 need to download the new version by hand once, after that updates are automatic.

## Data and backups
- Settings > Open data folder opens it directly. Mac data folder: ~/Library/Application Support/Tessra/data/ . Windows: %APPDATA%\Tessra\data\
- Automatic daily backups (last 30 days) are in the backups folder inside the data folder.
- Moving to a new computer: Settings > Export full backup on the old one, then Settings > Restore backup on the new one.
- Uninstalling or reinstalling the app does not delete data.
- Demo data: Settings > Load demo data, and Remove demo data clears it without touching real trades.

## Trades on the wrong day / time zone
- Since 1.1.2 Tessra can count the trading day like CME and prop firms: trades after the 6 PM New York reopen count toward the next day, wherever the user lives. Example: a trade at 6:30 PM New York on the 21st shows on the 22nd.
- New installs use the futures session by default. People who installed before 1.1.2 keep their computer's calendar day until they change it.
- To change it: Settings > Profile > "Count trades toward the day in" and pick "Futures session (recommended)", the computer's time zone, or a New York, Chicago or London calendar day. Existing trades move to the right day straight away.

## Imports
- Settings > Import CSV. Tradovate, NinjaTrader, Rithmic R|Trader, MotiveWave, ProjectX / TopstepX, Quantower and Sierra Chart are recognized automatically. Other files: match the columns once in the import window.
- Platforms that export fills (Tradovate, Rithmic, MotiveWave) get paired into trades automatically.
- MotiveWave: export the Executions list. If it opens in Numbers on Mac, use File > Export To > CSV and import that CSV.
- Re-importing the same file skips trades that already exist, so it is safe.
- P&L looking off after import: check Settings > Contract specs (point value and fees per contract, round trip). Fees default from there.
- If a file still won't import: post in #bug-reports with the platform name and, if they are comfortable, a sample file with account numbers removed.

## Share cards
- Open a trade, day, week or month and click Share. Weeks: Weekly Review > Share week, or the share icon on any calendar week.
- The share button doing nothing was a bug fixed in 1.1.1. Update to the latest version.
- Saved images go where the user picks; if saving fails, Tessra saves to the Downloads folder.
- Username on cards: the name field in the share window or Settings > Profile.

## Accounts and prop firms
- Prop firm presets (Topstep, Apex, Lucid, Tradeify, Take Profit Trader, MyFundedFutures) fill in target, drawdown, daily loss, consistency and payout rules from public summaries. Firms change rules often, so users should check their firm's site and edit the account if something differs.
- Consistency tracker shows the best day as a share of total profit and how much more can be made today without breaking the rule.

## Other
- Menu bar (Mac) / system tray (Windows) widget: turn on in Settings.
- Pre-trade checklist: optional, in Settings.
- Run the first-run setup again: Settings > Profile > Run setup again.
- Feature ideas go in #feature-requests.
