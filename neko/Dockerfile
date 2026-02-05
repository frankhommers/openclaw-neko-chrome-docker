FROM ghcr.io/m1k1o/neko/google-chrome:latest

# Neko base image ships Chrome 143; Playwright 1.58.1 requires 145+.
# Install Chrome Beta (145+) and socat (CDP proxy for non-headless mode).
# Once the base image ships 145+, replace google-chrome-beta with -stable.
RUN apt-get update -qq && \
    apt-get install -y -qq google-chrome-beta socat && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Enable DevTools/CDP (Neko disables it via managed policy)
# Chrome stable reads /etc/opt/chrome/, Beta reads /etc/opt/chrome-beta/
RUN mkdir -p /etc/opt/chrome-beta/policies/managed && \
    python3 -c "\
import json; \
src = '/etc/opt/chrome/policies/managed/policies.json'; \
d = json.load(open(src)); \
d['DeveloperToolsAvailability'] = 0; \
json.dump(d, open(src, 'w'), indent=2); \
json.dump(d, open('/etc/opt/chrome-beta/policies/managed/policies.json', 'w'), indent=2)"

# Override supervisord configs
COPY google-chrome.conf /etc/neko/supervisord/google-chrome.conf
COPY cdp-proxy.conf /etc/neko/supervisord/cdp-proxy.conf
