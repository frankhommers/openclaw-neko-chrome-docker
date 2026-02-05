# openclaw-neko-chrome-docker

Docker setup for [OpenClaw](https://github.com/openclaw/openclaw) browser automation: **Neko** (interactive WebRTC browser) + **headless Chrome** (Playwright/CDP automation).

## The Problem

[Neko](https://github.com/m1k1o/neko) is great for interactive browser access via WebRTC, but its bundled Chromium version often lags behind what Playwright requires. For example, Playwright 1.58.1 needs Chrome 145+, while Neko ships Chromium 139. This causes `connectOverCDP` to hang on the WebSocket handshake due to protocol version mismatch.

## The Solution

Run a separate **headless Chrome container** alongside Neko:

- **Neko** → interactive browsing via WebRTC (visual access, debugging)
- **Headless Chrome** → Playwright/CDP automation (screenshots, snapshots, page interaction)

Both containers run independently. OpenClaw connects to the headless Chrome container for automation while Neko remains available for interactive use.

## Architecture

```
OpenClaw Gateway (Playwright)
    │
    ├─ CDP ──→ localhost:9223 ──→ headless-chrome (Chrome 145+)
    │          Automation: screenshots, snapshots, actions
    │
    └─ WebRTC → your-domain.com ──→ neko (Chromium)
                Interactive: visual browsing, debugging
```

## Ports

| Port | Protocol | Container | Purpose |
|------|----------|-----------|---------|
| `9223` | TCP | headless-chrome | CDP endpoint for Playwright automation |
| `9222` | TCP | neko | CDP proxy (Neko's internal Chromium, optional) |
| `8080` | TCP | neko | Web UI (behind reverse proxy) |
| `52000-52100` | UDP | neko | WebRTC media streams |

> **Note:** Both CDP ports bind to `127.0.0.1` only (not exposed publicly).

## Quick Start

### 1. Headless Chrome (automation)

```bash
cd headless-chrome/
docker compose up -d
```

That's it. CDP available at `127.0.0.1:9223`.

### 2. Neko (interactive browser)

```bash
cd neko/
cp .env.example .env
# Edit .env with your credentials
docker compose up -d
```

Neko requires:
- A reverse proxy (e.g. Traefik) with the `proxy` Docker network
- UDP ports 52000-52100 open for WebRTC
- DNS pointing to your server
- Update `NEKO_NAT1TO1` in `docker-compose.yml` to your server's public IP

### 3. OpenClaw config

Add to your `openclaw.json`:

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

> The profile name is arbitrary. `cdpUrl` must point to the **headless Chrome** port (9223), not Neko's CDP port (9222).

## Neko Customization

This setup includes custom supervisord configs for Neko:

- **`chromium.conf`** — Enables CDP (`--remote-debugging-port=9222`) on Neko's bundled Chromium
- **`google-chrome.conf`** — Alternative config if you install Google Chrome inside Neko
- **`cdp-proxy.py`** — TCP proxy exposing Chromium's CDP port to the Docker host
- **`cdp-proxy.conf`** — Supervisord config for the CDP proxy

These make Neko's internal browser accessible via CDP for debugging. For automation, use the headless Chrome container instead.

## Files

```
├── headless-chrome/
│   └── docker-compose.yml        # Chrome 145+ headless container
├── neko/
│   ├── docker-compose.yml        # Neko interactive browser
│   ├── .env.example              # Credentials template
│   ├── chromium.conf             # Supervisord: Chromium with CDP
│   ├── cdp-proxy.py              # TCP proxy for CDP access
│   ├── cdp-proxy.conf            # Supervisord: CDP proxy process
│   └── google-chrome.conf        # Alternative: Google Chrome config
├── .gitignore
└── README.md
```

## Why not just use headless Chrome?

Neko gives you a **visual browser** you can access from anywhere via WebRTC. This is invaluable for:

- Debugging what the automation agent "sees"
- Manual intervention when automation gets stuck
- Interactive browsing sessions (login flows, CAPTCHAs)
- Shared browser access with team members

The headless Chrome container handles the automated work; Neko handles the human side.

## License

MIT
