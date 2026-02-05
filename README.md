# aivy-browser

Browser automation infrastructure for OpenClaw/Aivy. Two containers:

1. **Neko** — Interactive Chromium browser with WebRTC (visual access via `browser.aivy.hommers.it`)
2. **Headless Chrome** — Chrome 145 for Playwright/CDP automation (port 9223)

## Architecture

```
OpenClaw Gateway (Playwright 1.58.1)
    │
    ├── CDP → 127.0.0.1:9223 → headless-chrome container (Chrome 145)
    │         Used for: screenshots, snapshots, page automation
    │
    └── WebRTC → browser.aivy.hommers.it → neko container (Chromium)
                 Used for: interactive browsing, visual debugging
```

## Why two containers?

Playwright 1.58.1 requires Chrome 145+. Neko ships Chromium 139 which causes
`connectOverCDP` to hang on WebSocket handshake (protocol version mismatch).
Solution: separate headless Chrome 145 container specifically for automation.

Neko stays for interactive WebRTC browser access.

## Setup

### Headless Chrome (automation)

```bash
cd headless-chrome/
docker compose up -d
```

Exposes CDP on `127.0.0.1:9223`.

### Neko (interactive)

```bash
cd neko/
cp .env.example .env  # Edit credentials
docker compose up -d
```

Requires:
- Traefik `proxy` network
- UDP ports 52000-52100 open (WebRTC)
- DNS: `browser.aivy.hommers.it` → server IP

### OpenClaw config

```json
{
  "browser": {
    "defaultProfile": "neko",
    "attachOnly": true,
    "profiles": {
      "neko": {
        "cdpUrl": "http://127.0.0.1:9223"
      }
    }
  }
}
```

Note: `cdpUrl` points to headless Chrome (9223), not Neko (9222).
The profile name "neko" is historical — automation actually uses the headless container.

## Neko internals

Neko's Chromium has CDP enabled via a custom supervisord config (`chromium.conf`)
with `--remote-debugging-port=9222`. A Python TCP proxy (`cdp-proxy.py`) exposes
this on port 9223 inside the container, which maps to host port 9222.

## Files

```
├── headless-chrome/
│   └── docker-compose.yml      # Chrome 145 headless container
├── neko/
│   ├── docker-compose.yml      # Neko interactive browser
│   ├── .env.example            # Credentials template
│   ├── chromium.conf           # Supervisord: Chromium with CDP enabled
│   ├── cdp-proxy.py            # TCP proxy for CDP access
│   ├── cdp-proxy.conf          # Supervisord: CDP proxy process
│   └── google-chrome.conf      # Alternative: Google Chrome supervisord config
└── README.md
```
