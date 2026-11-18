# ==============================================================================
# BATTVISION WORKSTATION - PRODUCTION MULTI-STAGE DOCKERFILE
# Stage 1: Build React 18 + TypeScript + Vite Single-Page Application (dist/)
# Stage 2: Python 3.11 FastAPI + SQLite + WebSocket Edge Backend (Serving SPA)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Build
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY package.json package-lock.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci

COPY src ./src
RUN npm run typecheck && npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python Edge Runtime & Offline Server
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BV_HOST=0.0.0.0 \
    BV_PORT=8000 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, data placeholders, and built frontend dist
COPY backend/app ./backend/app
COPY backend/tools ./backend/tools
COPY data ./data

# Copy built frontend assets from Stage 1 into /app/dist
COPY --from=frontend-builder /build/dist ./dist

# Create runtime directories if not existing
RUN mkdir -p data/telemetry data/experiments data/models data/exports

EXPOSE 8000

# Run FastAPI backend serving both API routes and frontend SPA on $PORT
CMD ["sh", "-c", "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
