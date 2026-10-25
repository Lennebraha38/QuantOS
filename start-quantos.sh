#!/usr/bin/env bash
# ==============================================================================
# QuantOS — Birleşik Başlatıcı (Quantro AR-GE İşletim Sistemi)
# Windows 11 Masaüstü Kabuğu + J.A.R.V.I.S. Sesli Asistan + AArch64 Çekirdeği
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-web}"

print_banner() {
  echo "======================================================================"
  echo "  QuantOS v1.0 — Quantro AR-GE Kuantum & Astrofizik İşletim Sistemi"
  echo "  Windows 11 DWM + J.A.R.V.I.S. Sesli Asistan + AArch64 Limine Kernel"
  echo "======================================================================"
}

case "$MODE" in
  web|desktop)
    print_banner
    PORT="${PORT:-3800}"
    echo "[*] QuantOS Masaüstü Sunucusu ve J.A.R.V.I.S. Ses Köprüsü başlatılıyor..."
    echo "[✓] Tarayıcı adresi: http://localhost:${PORT}"
    exec node server.mjs
    ;;
  x11)
    print_banner
    echo "[*] Bare-Metal AArch64 Çekirdeği Termux:X11 üzerinde başlatılıyor..."
    chmod +x ./start-x11.sh
    exec ./start-x11.sh
    ;;
  qemu)
    print_banner
    echo "[*] Bare-Metal AArch64 Çekirdeği + J.A.R.V.I.S. Ses Köprüsü başlatılıyor..."
    exec make run-jarvis
    ;;
  kernel)
    print_banner
    echo "[*] Bare-Metal AArch64 UEFI/Limine çekirdeği derleniyor..."
    make clean && make && make esp
    echo "[✓] Çekirdek derlemesi tamamlandı: build/kernel & esp/"
    ;;
  test|check)
    print_banner
    echo "[1/2] Bare-Metal AArch64 Çekirdek Derleme Kontrolü..."
    make && make esp
    echo "[2/2] Bilimsel Motorlar, J.A.R.V.I.S. ve Masaüstü Bütünlük Testleri..."
    npm run check
    ;;
  *)
    print_banner
    echo "Kullanım: ./start-quantos.sh [web|x11|qemu|kernel|test]"
    echo "  web     : Tam etkileşimli Windows 11 + J.A.R.V.I.S. Sesli Masaüstü (http://localhost:3800)"
    echo "  x11     : AArch64 Bare-Metal Çekirdeği Termux:X11 ekranında çalıştır"
    echo "  qemu    : AArch64 Bare-Metal Çekirdeği QEMU + J.A.R.V.I.S. TTS köprüsü ile çalıştır"
    echo "  kernel  : Yalnızca AArch64 UEFI/Limine çekirdeğini derle"
    echo "  test    : Tüm derleme, birim ve bütünlük testlerini çalıştır"
    exit 1
    ;;
esac
