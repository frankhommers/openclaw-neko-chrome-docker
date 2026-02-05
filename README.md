# openclaw-neko-chrome-docker

Docker setup for [OpenClaw](https://github.com/openclaw/openclaw) browser automation using **Neko** — a visible, interactive browser via WebRTC with full Playwright/CDP automation support.

## The Problem

[Neko](https://github.com/m1k1o/neko) is great for interactive browser access via WebRTC, but:

1. Its bundled Chrome version lags behind what Playwright requires (e.g. Playwright 1.58.1 needs Chrome 145+, Neko ships 143)
2. Chrome in non-headless mode binds CDP to `127.0.0.1` only — can't be reached from outside the container
3. Neko's managed policy disables DevTools/CDP entirely (`DeveloperToolsAvailability: 2`)

## The Solution

A custom Dockerfile that fixes all three issues:

- **Installs Chrome Beta** (145+) alongside the base image's Chrome for Playwright compatibility
- **Socat CDP proxy** forwards `0.0.0.0:9223` → `127.0.0.1:9222` inside the container
- **Fixes Chrome policy** to re-enable DevTools/CDP in both stable and beta policy directories

The result: a single Neko container that serves both interactive WebRTC browsing **and** Playwright automation. No separate headless Chrome needed.

## Architecture

```
OpenClaw Gateway (Playwright 1.58.1)
    │
    └─ CDP ──→ host 127.0.0.1:9222
                  │
                  └─→ container 0.0.0.0:9223 (socat proxy)
                        │
                        └─→ Chrome Beta 127.0.0.1:9222 (non-headless)
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
    "executablePath": "/usr/bin/google-chrome-beta",
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

### Chrome Beta reads policies from a different directory
- Chrome stable: `/etc/opt/chrome/policies/managed/`
- Chrome Beta: `/etc/opt/chrome-beta/policies/managed/`

Neko sets `DeveloperToolsAvailability: 2` (disabled) in the stable dir. If you install Beta, you must also create the policy in the Beta dir with value `0`.

### Non-default user-data-dir required
Chrome refuses `--remote-debugging-port` with the default profile data directory. The supervisord config uses `--user-data-dir=/home/neko/.config/google-chrome-cdp`.

### When to switch back to Chrome stable
Once the Neko base image ships Chrome 145+ (check with `docker run --rm ghcr.io/m1k1o/neko/google-chrome:latest google-chrome-stable --version`), you can:
1. Remove `google-chrome-beta` from the Dockerfile
2. Change `command` in `google-chrome.conf` to `/usr/bin/google-chrome-stable`
3. Remove the Beta policy directory creation

## Files

```
├── Dockerfile              # Custom image: Chrome Beta + socat + policy fix
├── docker-compose.yml      # Neko container config
├── .env.example            # Credentials template
├── google-chrome.conf      # Supervisord: Chrome Beta with CDP flags
└── cdp-proxy.conf          # Supervisord: socat CDP proxy
```

## License

MIT
