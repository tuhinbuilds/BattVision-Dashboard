# BATTVISION WORKSTATION - COMPLETE DEPLOYMENT GUIDE

This guide provides end-to-end instructions for deploying the **BattVision EV Battery Health Monitoring System**.

---

## 1. Executive Deployment Comparison

Depending on your objective, choose the deployment model that best fits your needs:

| Deployment Path | Target Environment | Best For | Estimated Setup Time | Cost | Real Backend API & WS | In-Browser Simulation |
|---|---|---|:---:|:---:|:---:|:---:|
| **Path A: Vercel / Netlify** | Global Edge CDN | Portfolio showcase, university evaluation, public demo URL | 2 minutes | Free | No (falls to demo mode) | Yes (100% interactive) |
| **Path B: Render / Railway / Docker** | Cloud Container (Linux) | Full-stack cloud demo, live FastAPI REST API, SQLite, and WebSockets | 5 minutes | Free tier available | Yes (live over HTTP/WSS) | Yes |
| **Path C: Linux SBC (Edge Hardware)** | Raspberry Pi 4/5, Radxa, Orange Pi | Target laboratory bench, EV onboard computing, air-gapped offline use | 10 minutes | Hardware cost | Yes (local SQLite/WS) | Yes |
| **Path D: Local Workstation** | macOS / Linux / Windows | Active engineering development, rapid prototyping | 1 minute | Free | Yes (localhost) | Yes |

---

## 2. Path A: Vercel / Netlify (Recommended for Instant Public Web Review)

Use this path when sharing BattVision with recruiters, professors, team members, or clients who want to open a URL and immediately interact with the battery dashboard on mobile, tablet, or desktop.

### Why It Works
In `DEMO MODE`, the entire BattVision frontend runs 100% client-side in React 18:
- All 8 modules function with realistic 8S4P LiFePO4 battery dynamics.
- Full CAD-grade 32-cell Pack Explorer with cell inspection drawers.
- Synchronized live oscilloscope with time-window slicing.
- 6 interactive fault scenarios via Demo Controls drawer.
- Presentation Mode (`Shift + P`) for large screens.
- Client-side CSV dataset importer and Data Quality Inspector.

### Steps to Deploy on Vercel (1-Click via Git)
1. Push your repository to GitHub: `https://github.com/tuhinbuilds/BattVision-Dashboard.git`.
2. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
3. Click **Add New Project** and select `BattVision-Dashboard`.
4. Vercel automatically detects the Vite framework settings:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Click **Deploy**.
6. The included `vercel.json` automatically configures client-side SPA routing (`/* -> /index.html`).
7. Your dashboard is immediately live on `https://battvision-dashboard.vercel.app` (or custom domain).

### Steps to Deploy on Netlify
1. Go to [https://netlify.com](https://netlify.com) and log in with GitHub.
2. Click **Add new site** > **Import an existing project**.
3. Select `BattVision-Dashboard`.
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy Site**.

---

## 3. Path B: Render / Railway / Docker (Full-Stack Cloud Deployment)

Use this path to run both the **Python FastAPI Edge Backend** and the **React Dashboard** in a single container with live WebSockets, SQLite persistence, and REST endpoints.

### Method 1: Deploying via Docker (Render / Railway / Fly.io / DigitalOcean)

The repository includes a production multi-stage [Dockerfile](../../Dockerfile) that builds the Vite frontend in Stage 1 and copies it directly into a lightweight Python 3.11 runtime in Stage 2.

#### Render Deployment Steps
1. Log in to [https://render.com](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your repository: `https://github.com/tuhinbuilds/BattVision-Dashboard`.
4. Configure settings:
   - **Name:** `battvision-edge`
   - **Runtime:** `Docker`
   - **Region:** Choose closest region
   - **Instance Type:** `Free` (or Starter)
5. Add Environment Variables (optional, defaults provided):
   - `PORT`: `8000` (Render sets this automatically)
   - `BV_HOST`: `0.0.0.0`
6. Click **Create Web Service**.
7. Render builds the Docker image and starts the server.
8. Access your live full-stack dashboard at `https://battvision-edge.onrender.com`. Both the UI and `/api/v1/health` and `/ws/telemetry` are accessible.

#### Railway Deployment Steps
1. Log in to [https://railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select `BattVision-Dashboard`.
4. Railway automatically detects the `Dockerfile` and deploys.
5. In **Settings** > **Networking**, click **Generate Domain** to get a public HTTPS/WSS URL.

---

## 4. Path C: Linux Single-Board Computer (Real Target Offline Edge Deployment)

This is the genuine target hardware deployment: an offline, air-gapped Linux SBC (e.g. Raspberry Pi 4/5, Radxa Rock 5, Orange Pi 5) installed inside the vehicle or battery testing laboratory.

### Automated 1-Command Installation
On the target Linux SBC terminal, run:

```bash
git clone https://github.com/tuhinbuilds/BattVision-Dashboard.git /opt/battvision
cd /opt/battvision
sudo ./deploy/setup_sbc.sh
```

### What `deploy/setup_sbc.sh` Does Automatically:
1. Installs system packages: `python3`, `python3-venv`, `python3-pip`, `nodejs`, `curl`.
2. Builds the optimized React production bundle (`npm run build -> dist/`).
3. Creates the Python 3 virtual environment (`backend/.venv`) and installs backend dependencies.
4. Prepares SQLite telemetry storage directories (`data/telemetry/`).
5. Installs and starts the systemd service (`battvision-backend.service`).
6. Enables automatic reboot recovery (starts automatically on SBC power-up).

### Verifying SBC Service
```bash
# Check service status
sudo systemctl status battvision-backend.service

# View live structured log output
sudo journalctl -u battvision-backend.service -f
```

### Accessing the Dashboard on the Bench
- **Direct HDMI / Kiosk Display on SBC:** Open `http://localhost:8000` in Chromium kiosk mode:
  ```bash
  chromium-browser --kiosk http://localhost:8000
  ```
- **From Engineer's Laptop over Local Wi-Fi / LAN:**
  Connect laptop to the SBC network hotspot and open:
  ```
  http://<sbc-ip-address>:8000
  # e.g., http://192.168.4.1:8000 or http://battvision.local:8000
  ```

---

## 5. Path D: Local Workstation (macOS / Linux / Windows)

For local evaluation and development:

```bash
# 1. Install frontend packages and run Vite dev server
npm install
npm run dev

# 2. In a separate terminal, start the Python Edge Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# 3. (Optional) Stream simulated ESP32-S3 packets into the backend
.venv/bin/python tools/simulated_esp32_sender.py --interval 1.0
```

- Open `http://localhost:5173` for hot-module-reloading frontend development.
- Open `http://127.0.0.1:8000` to inspect the backend-hosted production build.

---

## 6. Pre-Flight Verification Checklist

Before presenting or demonstrating your deployment, verify these checks:

- [ ] **Frontend Build:** `npm run typecheck && npm run build` exits with code 0.
- [ ] **Backend Tests:** `pytest backend/tests/test_backend.py` passes 8/8 tests.
- [ ] **Health Endpoint:** `GET /api/v1/health` returns `{"status":"OK", "database_connected":true}`.
- [ ] **WebSocket Stream:** `ws://<host>:<port>/ws/telemetry` connects and emits `telemetry` frames.
- [ ] **Missing Sensor Honesty:** Running `simulated_esp32_sender.py --drop-temp3` shows `TEMP-03` as `NOT CONNECTED` (never coerced to 0).
- [ ] **Responsive Viewports:** Interface renders cleanly across 2560x1440 desktop, 1366x768 laptop, 1024x768 tablet, and 375px mobile viewports.
