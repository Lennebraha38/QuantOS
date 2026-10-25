#!/usr/bin/env bash
# ==============================================================================
# QuantOS — Termux:X11 Canlı Masaüstü & J.A.R.V.I.S. Ses Köprüsü Başlatıcı
# Windows 11 DWM + Quantro Ink & Copper + AArch64 Bare-Metal Çekirdek
# ==============================================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "======================================================================"
echo "  QUANTOS — TERMUX:X11 CANLI AARCH64 MASAÜSTÜ & J.A.R.V.I.S. BAŞLATICI"
echo "======================================================================"

# 1. X11 Soketini PRoot Konteynerine Bağla
mkdir -p /tmp/.X11-unix
if [ -d "/data/data/com.termux/files/usr/tmp/.X11-unix" ]; then
    ln -sf /data/data/com.termux/files/usr/tmp/.X11-unix/X0 /tmp/.X11-unix/X0 2>/dev/null || true
fi

# 2. Termux:X11 Sunucusunu Kontrol Et ve Gerekirse Başlat
if ! pgrep -f "termux-x11" >/dev/null 2>&1; then
    echo "[*] Termux:X11 sunucusu başlatılıyor..."
    if command -v termux-x11 >/dev/null 2>&1; then
        termux-x11 :0 -ac >/dev/null 2>&1 &
        sleep 1
    fi
fi
echo "[✓] Termux:X11 Sunucusu Aktif (DISPLAY=:0)"

# 3. Android Ekranında Termux:X11 Uygulamasını Ön Plana Getir
if [ -x "/data/data/com.termux/files/usr/bin/am" ]; then
    echo "[*] Termux:X11 Android ekranı ön plana getiriliyor..."
    /data/data/com.termux/files/usr/bin/am start --user 0 -n com.termux.x11/com.termux.x11.MainActivity >/dev/null 2>&1 || true
fi

# 4. UEFI ESP ve Çekirdek İmajını Hazırla
echo "[*] QuantOS UEFI ESP ve AArch64 çekirdek imajı doğrulanıyor..."
make esp

# 5. Arka Planda J.A.R.V.I.S. Ses Köprüsünü serial.log Üzerinde Başlat
rm -f serial.log
touch serial.log
BRIDGE_PID=""
if command -v python3 >/dev/null 2>&1 && [ -f "./scripts/jarvis-voice-bridge.py" ]; then
    python3 ./scripts/jarvis-voice-bridge.py --follow serial.log &
    BRIDGE_PID=$!
    trap 'if [ -n "$BRIDGE_PID" ]; then kill "$BRIDGE_PID" 2>/dev/null || true; fi' EXIT INT TERM
fi

echo "[*] QuantOS (Windows 11 + J.A.R.V.I.S. + Quantro AR-GE) ekrana yansıtılıyor..."
echo "----------------------------------------------------------------------"
echo ">>> Termux:X11 uygulamasına geçin; QuantOS masaüstü aktif! <<<"
echo "----------------------------------------------------------------------"

export DISPLAY=:0
export SDL_VIDEODRIVER=x11
export GDK_BACKEND=x11

qemu-system-aarch64 \
    -M virt \
    -cpu cortex-a53 \
    -m 1G \
    -bios /usr/share/qemu-efi-aarch64/QEMU_EFI.fd \
    -drive file=fat:rw:esp,format=raw,if=virtio \
    -device ramfb \
    -device virtio-gpu-pci,xres=1280,yres=800 \
    -device virtio-tablet-device \
    -device virtio-keyboard-device \
    -display sdl \
    -serial file:serial.log \
    -no-reboot
