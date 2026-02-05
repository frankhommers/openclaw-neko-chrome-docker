FROM ghcr.io/m1k1o/neko/google-chrome:latest

# Upgrade Chrome stable to latest available + install socat for CDP proxy
RUN apt-get update -qq && \
    apt-get install -y -qq socat && \
    apt-get install -y -qq --only-upgrade google-chrome-stable && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Enable DevTools/CDP (Neko disables it via managed policy)
RUN python3 -c "\
import json; \
src = '/etc/opt/chrome/policies/managed/policies.json'; \
d = json.load(open(src)); \
d['DeveloperToolsAvailability'] = 0; \
json.dump(d, open(src, 'w'), indent=2)"

# Override supervisord configs
COPY google-chrome.conf /etc/neko/supervisord/google-chrome.conf
COPY cdp-proxy.conf /etc/neko/supervisord/cdp-proxy.conf
