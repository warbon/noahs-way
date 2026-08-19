FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
  && npm install -g firebase-tools \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

