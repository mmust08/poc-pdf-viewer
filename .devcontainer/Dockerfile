FROM node:20-bookworm-slim

# System dependencies required by the canvas native addon
# (cairo, pango, jpeg, gif, rsvg, pixman) plus build toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Pre-create the mount point owned by the node user.
# Docker seeds an empty named volume from the image directory's ownership,
# so npm install (which runs as 'node') can write without sudo.
RUN mkdir -p /workspace/node_modules && chown -R node:node /workspace

WORKDIR /workspace
USER node

EXPOSE 5173
