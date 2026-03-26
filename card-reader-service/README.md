# Card Reader Service - NET Energy ERP

Runs as a **Windows Service** — starts automatically with Windows, no window to keep open.

## Installation (one-time)

1. Double-click **`install.bat`** (will request Administrator access)
2. Done — service starts automatically on every boot

## Uninstall

Double-click **`uninstall.bat`** (requires Administrator)

## Requirements

- Windows 10/11
- Node.js 18+ — https://nodejs.org
- USB Smart Card Reader (CCID standard)

## Troubleshooting

**npm install fails (Build Tools error):**
Open PowerShell as Administrator and run:
```
npm install --global windows-build-tools
```
Then run `install.bat` again.

**Service not responding:**
Open `services.msc`, find `CardReader-NETEnergy`, click Restart.

**Check service status:**
Open browser → http://localhost:38080/health
