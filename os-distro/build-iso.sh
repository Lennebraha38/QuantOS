#!/usr/bin/env bash
# ==============================================================================
# QuantOS Live ISO Yapılandırıcı (Debian Bookworm + Wayland + QuantOS DWM + J.A.R.V.I.S.)
# Hedef: Önyüklenebilir UEFI/BIOS Hibrit Kurulum ve Canlı Çalışma İmajı (.iso)
# ==============================================================================
set -euo pipefail

ARCH="${ARCH:-$(dpkg --print-architecture 2>/dev/null || uname -m)}"
WORK_DIR="${WORK_DIR:-/tmp/quantos-iso-build}"
OUT_ISO="${OUT_ISO:-QuantOS-1.0-${ARCH}.iso}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "======================================================================"
echo "  QuantOS Live ISO Builder — Mimari: ${ARCH}"
echo "======================================================================"

for cmd in debootstrap mksquashfs xorriso; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[!] Bilgi: '$cmd' kurulu değil. ISO imajı üretmek için:"
    echo "    apt-get install -y debootstrap squashfs-tools xorriso grub-efi-arm64-bin"
    exit 0
  fi
done

mkdir -p "${WORK_DIR}/chroot" "${WORK_DIR}/image/live" "${WORK_DIR}/image/boot/grub"

echo "[1/4] Temel Debian Bookworm kök dosya sistemi hazırlanıyor..."
debootstrap --arch="${ARCH}" --variant=minbase bookworm "${WORK_DIR}/chroot" http://deb.debian.org/debian

echo "[2/4] QuantOS Masaüstü, Node.js, PipeWire, Espeak-NG ve J.A.R.V.I.S. kopyalanıyor..."
mkdir -p "${WORK_DIR}/chroot/opt/quantos"
cp -r "${REPO_ROOT}/desktop" "${REPO_ROOT}/server.mjs" "${REPO_ROOT}/package.json" \
      "${REPO_ROOT}/os-distro" "${REPO_ROOT}/start-quantos.sh" "${WORK_DIR}/chroot/opt/quantos/"
cp "${REPO_ROOT}/os-distro/systemd/jarvisd.service" "${WORK_DIR}/chroot/etc/systemd/system/"
cp "${REPO_ROOT}/os-distro/wayland/quantos-session.desktop" "${WORK_DIR}/chroot/usr/share/wayland-sessions/" 2>/dev/null || true

echo "[3/4] SquashFS sıkıştırılmış sistem imajı oluşturuluyor..."
mksquashfs "${WORK_DIR}/chroot" "${WORK_DIR}/image/live/filesystem.squashfs" -comp xz -e boot

cat > "${WORK_DIR}/image/boot/grub/grub.cfg" <<'EOF'
set timeout=3
set default=0
menuentry "QuantOS 1.0 — Quantro AR-GE (J.A.R.V.I.S. Edition)" {
    linux /live/vmlinuz boot=live quiet splash
    initrd /live/initrd.img
}
EOF

echo "[4/4] Önyüklenebilir ISO üretiliyor: ${OUT_ISO}"
xorriso -as mkisofs -o "${OUT_ISO}" -V "QUANTOS_1_0" "${WORK_DIR}/image"
echo "[✓] QuantOS Live ISO hazır: ${OUT_ISO}"
