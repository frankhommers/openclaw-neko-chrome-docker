FROM ghcr.io/m1k1o/neko/google-chrome:latest

# Upgrade Chrome stable to latest available + install socat for CDP proxy
RUN apt-get update -qq && \
    apt-get install -y -qq socat && \
    apt-get install -y -qq --only-upgrade google-chrome-stable && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Replace Neko's restrictive Chrome policy with our clean one
# (enables DevTools/CDP, keeps uBlock Origin, removes SponsorBlock)
COPY policies.json /etc/opt/chrome/policies/managed/policies.json

# Override supervisord configs
COPY google-chrome.conf /etc/neko/supervisord/google-chrome.conf
COPY cdp-proxy.conf /etc/neko/supervisord/cdp-proxy.conf
