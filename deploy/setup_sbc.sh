#!/usr/bin/env bash
# ==============================================================================
# BATTVISION EDGE SBC AUTOMATED INSTALLER & SERVICE SETUP
# Target: Debian / Ubuntu / Raspberry Pi OS on Linux SBC
# Prepares: Node.js build, Python 3.11 virtualenv, SQLite, systemd daemon
# ==============================================================================

set -euo pipefail

INSTALL_DIR="/opt/battvision"
SERVICE_NAME="battvision-backend.service"

echo "=== [1/5] BattVision Offline Edge Installer Starting ==="

# Check root/sudo
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run as root or with sudo: sudo ./deploy/setup_sbc.sh"
  exit 1
fi

echo "=== [2/5] Installing System Packages (Python3, pip, venv, curl) ==="
apt-get update -y
apt-get install -y python3 python3-pip python3-venv curl build-essential

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not detected. Installing Node.js LTS via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "Python3 version: $(python3 --version)"

echo "=== [3/5] Syncing Files to ${INSTALL_DIR} ==="
mkdir -p "${INSTALL_DIR}"
cp -r ./* "${INSTALL_DIR}/" || true

cd "${INSTALL_DIR}"

echo "=== [4/5] Building React Production Dashboard (dist/) ==="
npm ci
npm run build

echo "Setting up Python Backend Virtual Environment..."
cd "${INSTALL_DIR}/backend"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# Ensure data directories exist
mkdir -p "${INSTALL_DIR}/data/telemetry"
mkdir -p "${INSTALL_DIR}/data/experiments"
mkdir -p "${INSTALL_DIR}/data/models"
mkdir -p "${INSTALL_DIR}/data/exports"
chmod -R 755 "${INSTALL_DIR}/data"

echo "=== [5/5] Installing and Enabling Systemd Service ==="
cp "${INSTALL_DIR}/deploy/${SERVICE_NAME}" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo ""
echo "=========================================================================="
echo "✓ BATTVISION EDGE BACKEND & OFFLINE DASHBOARD INSTALLED SUCCESSFULLY"
echo "Service Status: active (running)"
echo "Local Dashboard URL: http://localhost:8000"
echo "Network / Wi-Fi Hotspot URL: http://$(hostname -I | awk '{print $1}'):8000"
echo "Manage Service: sudo systemctl status ${SERVICE_NAME}"
echo "=========================================================================="
