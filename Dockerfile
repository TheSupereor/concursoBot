# syntax=docker/dockerfile:1

# ---- Stage 1: install all dependencies (cached while lockfile is unchanged) ----
FROM node:25-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: the "prepare" script installs git hooks, which is irrelevant in an image
RUN npm ci --ignore-scripts

# ---- Stage 2: compile TypeScript ----
FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Stage 3: runtime image with production dependencies only ----
FROM node:25-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
