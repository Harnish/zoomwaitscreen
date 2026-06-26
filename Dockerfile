FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm ci

FROM node:20-alpine AS test
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm test

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('./countdown')" || exit 1
CMD ["npm", "test"]
