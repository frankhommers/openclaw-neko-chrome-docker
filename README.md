# openclaw-neko-chrome-docker

Docker setup for [OpenClaw](https://github.com/openclaw/openclaw) browser automation using **Neko** — a visible, interactive browser via WebRTC with full Playwright/CDP automation support.

## The Problem

[Neko](https://github.com/m1k1o/neko) is great for interactive browser access via WebRTC, but:

1. Its bundled Chrome version lags behind what Playwright requires (e.g. base image ships 143, Playwright 1.58.1 needs 144+)
2. Chrome in non-headless mode binds CDP to `127.0.0.1` only — can't be reached from outside the container
3. Neko's managed policy disables DevTools/CDP entirely (`DeveloperToolsAvailability: 2`)

## The Solution

A custom Dockerfile that fixes all three issues:

- **Upgrades Chrome stable** to the latest available version via apt
- **Socat CDP proxy** forwards `0.0.0.0:9223` → `127.0.0.1:9222` inside the container
- **Fixes Chrome policy** to re-enable DevTools/CDP

The result: a single Neko container that serves both interactive WebRTC browsing **and** Playwright automation. No separate headless Chrome needed.

## Architecture

```
OpenClaw Gateway (Playwright 1.58.1)
    │
    └─ CDP ──→ host 127.0.0.1:9222
                  │
                  └─→ container 0.0.0.0:9223 (socat proxy)
                        │
                        └─→ Chrome 127.0.0.1:9222 (non-headless)
                              │
                              └─→ visible in Neko WebRTC UI
```

Frank (or anyone) can watch the automation live at `https://your-domain/` via WebRTC.

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| `9222` | TCP (host, localhost only) | CDP endpoint for Playwright |
| `8080` | TCP | Neko Web UI (put behind reverse proxy) |
| `52000-52100` | UDP | WebRTC media streams |

## Quick Start

```bash
cp .env.example .env
# Edit .env with your Neko credentials
docker compose build
docker compose up -d
```

### OpenClaw config

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "attachOnly": true,
    "defaultProfile": "neko",
    "profiles": {
      "neko": {
        "cdpUrl": "http://127.0.0.1:9222"
      }
    }
  }
}
```

### Prerequisites

- Docker with compose v2
- A reverse proxy (e.g. Traefik) on a shared `proxy` network for the Web UI
- UDP ports 52000-52100 open for WebRTC
- Update `NEKO_NAT1TO1` in `docker-compose.yml` to your server's public IP

## Key Discoveries

These cost us hours to figure out, so documenting them here:

### Chrome non-headless always binds CDP to 127.0.0.1
`--remote-debugging-address=0.0.0.0` is **ignored** in non-headless mode. Chrome always binds to loopback. The socat proxy is the lightest-weight workaround.

### Neko's DevTools policy blocks CDP
Neko sets `DeveloperToolsAvailability: 2` (disabled) in `/etc/opt/chrome/policies/managed/policies.json`. The Dockerfile patches this to `0`.

### Non-default user-data-dir required
Chrome refuses `--remote-debugging-port` with the default profile data directory. The supervisord config uses `--user-data-dir=/home/neko/.config/google-chrome-cdp`.

### Playwright version compatibility
Playwright 1.58.1 works with Chrome 144+. The Neko base image ships 143 which does NOT work (WebSocket handshake hangs). Upgrading to latest stable via apt fixes it.

### Gateway restart after container rebuild
When the Neko container is rebuilt, Playwright's cached CDP connection goes stale. A `SIGUSR1` (hot reload) is NOT enough — you need a full gateway kill + restart:
```bash
kill -9 $(pgrep -xf openclaw-gateway); sleep 2; openclaw gateway start
```

## Persistent Chrome Data

Chrome's user data (shortcuts, preferences, cookies, extensions state) is stored in a Docker named volume (`chrome-data`) mounted at `/home/neko/.config/google-chrome-cdp`.

This means:
- **`docker compose down` + `up`**: data persists ✅
- **`docker compose down -v`**: data is wiped (volume deleted)
- **Rebuild image**: data persists (volume is independent of image)

### First-time setup

NTP (New Tab Page) shortcuts can't be pre-seeded via Dockerfile — Chrome's NTP has its own internal state that only updates via the UI. After first deployment, add shortcuts manually via the "Add shortcut" button on the new tab page, or use browser automation (CDP). Once added, they persist in the volume.

## Chrome Policy

The Dockerfile replaces Neko's restrictive Chrome policy with a clean one (`policies.json`):

- **DevTools/CDP enabled** (Neko disables this by default)
- **uBlock Origin** force-installed (ad blocking)
- **SponsorBlock removed** (not needed for automation)
- No bookmarks bar, no password manager, no autofill, no sync

## Files

```
├── Dockerfile              # Custom image: Chrome upgrade + socat + policy fix
├── docker-compose.yml      # Neko container config + persistent volume
├── policies.json           # Chrome managed policy (DevTools, uBlock, clean defaults)
├── .env.example            # Credentials template
├── google-chrome.conf      # Supervisord: Chrome stable with CDP flags
└── cdp-proxy.conf          # Supervisord: socat CDP proxy
```

## License

MIT
