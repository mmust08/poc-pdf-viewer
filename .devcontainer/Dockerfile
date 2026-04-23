FROM node:20-bookworm-slim

ARG CLAUDE_CODE_VERSION=latest

# System dependencies required by the canvas native addon
# (cairo, pango, jpeg, gif, rsvg, pixman) plus build toolchain + curl for Claude Code install
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    curl \
    ca-certificates \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code globally into /usr/local/bin (accessible to all users including node).
# Using npm install -g directly avoids the install script running as root with HOME=/root,
# which would put the binary in /root/.local/bin and outside the node user's PATH.
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Pre-create the mount point owned by the node user.
# Docker seeds an empty named volume from the image directory's ownership,
# so npm install (which runs as 'node') can write without sudo.
RUN mkdir -p /workspace/node_modules && chown -R node:node /workspace

WORKDIR /workspace
USER node

EXPOSE 5173
