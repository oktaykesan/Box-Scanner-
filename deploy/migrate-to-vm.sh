#!/usr/bin/env bash
# BoxScan — VM Migration Script
# Kullanım: ./deploy/migrate-to-vm.sh <VM_IP> [SSH_USER]
# Örnek:    ./deploy/migrate-to-vm.sh 192.168.1.50 ubuntu
#
# Gereksinimler (Windows'ta): Git Bash veya WSL, rsync, ssh erişimi VM'e
# VM'de gerekli: Docker, Docker Compose v2

set -euo pipefail

VM_IP="${1:?'Kullanım: $0 <VM_IP> [SSH_USER]'}"
SSH_USER="${2:-ubuntu}"
REMOTE="$SSH_USER@$VM_IP"
REMOTE_DIR="/opt/boxscan"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "╔══════════════════════════════════════════╗"
echo "║     BoxScan → VM Migration              ║"
echo "╠══════════════════════════════════════════╣"
echo "║  Hedef : $REMOTE:$REMOTE_DIR"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. SQLite WAL checkpoint (veri bütünlüğü) ─────────────────────────────────
echo "[1/5] SQLite WAL checkpoint alınıyor..."
sqlite3 "$SCRIPT_DIR/backend/boxscan.db" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true

# ── 2. VM'de dizin hazırlığı ──────────────────────────────────────────────────
echo "[2/5] VM dizinleri hazırlanıyor..."
ssh "$REMOTE" "sudo mkdir -p $REMOTE_DIR/{backend/uploads,deploy} && sudo chown -R $SSH_USER:$SSH_USER $REMOTE_DIR"

# ── 3. Kaynak dosyaları aktar (node_modules hariç) ────────────────────────────
echo "[3/5] Kaynak dosyaları aktarılıyor (node_modules hariç)..."
rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='mobile' \
    --exclude='.claude' \
    --exclude='*.txt' \
    --exclude='dist' \
    --exclude='.expo' \
    "$SCRIPT_DIR/" "$REMOTE:$REMOTE_DIR/"

# ── 4. Mevcut veritabanı ve görselleri aktar ──────────────────────────────────
echo "[4/5] Veritabanı ve görseller aktarılıyor..."
rsync -avz --progress \
    "$SCRIPT_DIR/backend/boxscan.db" \
    "$REMOTE:$REMOTE_DIR/backend/boxscan.db"

rsync -avz --progress \
    "$SCRIPT_DIR/backend/uploads/" \
    "$REMOTE:$REMOTE_DIR/backend/uploads/"

# ── 5. VM'de .env dosyasını oluştur (IP güncellenerek) ───────────────────────
echo "[5/5] VM .env dosyası oluşturuluyor..."
ssh "$REMOTE" "bash -s" <<EOF
cd $REMOTE_DIR
# Mevcut .env'i VM IP ile güncelle
sed "s|APP_BASE_URL=http://[^:]*:|APP_BASE_URL=http://$VM_IP:|g" backend/.env.example > backend/.env.new 2>/dev/null || true

# .env zaten varsa IP'yi güncelle, yoksa .env.example'dan oluştur
if [ -f backend/.env ]; then
    sed -i "s|APP_BASE_URL=http://[0-9.]*:|APP_BASE_URL=http://$VM_IP:|g" backend/.env
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:8081,http://localhost:19006,exp://$VM_IP:8081,http://$VM_IP:8081|g" backend/.env
    echo "  .env güncellendi (IP: $VM_IP)"
else
    echo "  UYARI: backend/.env bulunamadı. Manuel olarak oluşturmanız gerekiyor."
    echo "  Örnek: cp backend/.env.example backend/.env && nano backend/.env"
fi

rm -f backend/.env.new
EOF

echo ""
echo "✓ Transfer tamamlandı."
echo ""
echo "Sonraki adımlar (VM'de çalıştır):"
echo "  ssh $REMOTE"
echo "  cd $REMOTE_DIR"
echo "  # .env dosyasını kontrol et:"
echo "  cat backend/.env"
echo "  # Docker ile başlat:"
echo "  docker compose up -d --build"
echo "  # Logları izle:"
echo "  docker compose logs -f"
echo ""
echo "VM hazır olduktan sonra mobile/.env.local içindeki IP'yi güncelle:"
echo "  EXPO_PUBLIC_API_BASE_URL=http://$VM_IP:3000"
