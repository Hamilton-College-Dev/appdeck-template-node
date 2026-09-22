# syntax=docker/dockerfile:1

# ---------- Stage 1: install dependencies ----------
# npm lives in this stage only. Nothing from here reaches the final image
# except the installed packages themselves.
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./

# --omit=dev leaves out anything under devDependencies.
# If package-lock.json is committed (it should be), npm uses it for an exact,
# repeatable install.
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# ---------- Stage 2: the image that actually runs ----------
FROM node:22-alpine AS runtime

# Cap the heap below the container's 512 MB so Node reports being out of memory
# instead of being killed with no explanation.
ENV NODE_ENV=production \
    PORT=8080 \
    NODE_OPTIONS=--max-old-space-size=384

WORKDIR /app

# Only what's needed to run: the installed packages and the source.
# No compilers, no dev dependencies, no build cache.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# node:22-alpine ships a non-root "node" user. Run as that, never as root.
USER node

EXPOSE 8080

# Exec form, so SIGTERM reaches Node directly and shutdown stays clean.
CMD ["node", "src/server.js"]
