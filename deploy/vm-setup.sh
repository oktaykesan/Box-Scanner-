#!/usr/bin/env bash
# BoxScan — VM İlk Kurulum Scripti
# VM'de bir kez çalıştırılır (Ubuntu 22.04 / Debian 12 hedef)
# Kullanım: bash vm-setup.sh

set -euo pipefail

echo "╔══════════════════════════════════════════╗"
echo "║     BoxScan VM Kurulum                  ║"
echo "╚══════════════════════════════════════════╝"

# ── Docker kurulumu ───────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "[1/3] Docker kuruluyor..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    echo "  Docker kuruldu. Grup değişikliği için oturumu yeniden aç veya 'newgrp docker' çalıştır."
else
    echo "[1/3] Docker zaten kurulu: $(docker --version)"
fi

# ── Docker Compose v2 kontrolü ────────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
    echo "[2/3] Docker Compose plugin kuruluyor..."
    sudo apt-get update -qq
    sudo apt-get install -y docker-compose-plugin
else
    echo "[2/3] Docker Compose zaten kurulu: $(docker compose version --short)"
fi

# ── sqlite3 CLI (WAL checkpoint için) ────────────────────────────────────────
if ! command -v sqlite3 &>/dev/null; then
    echo "[3/3] sqlite3 kuruluyor..."
    sudo apt-get update -qq
    sudo apt-get install -y sqlite3
else
    echo "[3/3] sqlite3 zaten kurulu."
fi

echo ""
echo "✓ VM hazır. Şimdi migrate-to-vm.sh scriptini Windows'tan çalıştır."
