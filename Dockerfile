# Stage 1: Build Vue client
FROM node:20-alpine AS client-build
COPY client/ /build/
WORKDIR /build
RUN npm ci && npm run build

# Stage 2: Final image
FROM ghcr.io/m1k1o/neko/google-chrome:3
RUN rm -rf /var/www/*
COPY --from=client-build /build/dist/ /var/www/
RUN apt-get update -qq && \
    apt-get install -y -qq socat iproute2 && \
    apt-get install -y -qq --only-upgrade google-chrome-stable && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
# Disable audio: kill PulseAudio config so nothing tries to connect
RUN echo "autospawn = no" > /etc/pulse/client.conf && \
    echo "daemon-binary = /bin/true" >> /etc/pulse/client.conf

COPY policies.json /etc/opt/chrome/policies/managed/policies.json
COPY google-chrome.conf /etc/neko/supervisord/google-chrome.conf
COPY cdp-proxy.conf /etc/neko/supervisord/cdp-proxy.conf
