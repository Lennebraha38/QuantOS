# ==============================================================================
# QuantOS — Bare-Metal UEFI/Limine AArch64 Cekirdek Yapim Sistemi
# Quantro AR-GE | Windows 11 DWM + QPU + Astrofizik + J.A.R.V.I.S. Ses Koprusu
# ==============================================================================

ARCH := aarch64

ifeq ($(shell command -v aarch64-linux-gnu-gcc 2>/dev/null),)
  CROSS   :=
  CC      := clang --target=aarch64-none-elf
  LD      := ld.lld
  OBJCOPY := llvm-objcopy
else
  CROSS   := aarch64-linux-gnu-
  CC      := $(CROSS)gcc
  LD      := $(CROSS)ld
  OBJCOPY := $(CROSS)objcopy
endif

# QEMU AArch64 Donanim Parametreleri
QEMU         := qemu-system-aarch64
QEMU_BIOS    := /usr/share/qemu-efi-aarch64/QEMU_EFI.fd
QEMU_MACHINE := virt
QEMU_CPU     := cortex-a53
QEMU_MEM     := 1G
QMP_SOCK     := /tmp/quantos-qmp.sock

# Freestanding C17 Derleyici Bayraklari (Sifir libc bagimliligi, Genel Yazmaclar)
CFLAGS := -std=gnu17 -Wall -Wextra -O2 -pipe -ffreestanding -nostdinc \
          -fno-stack-protector -fno-pie -fno-pic \
          -mgeneral-regs-only \
          -Wno-unused-const-variable -Wno-type-limits \
          -ffunction-sections -fdata-sections \
          -Ikernel/include -Ikernel/arch/aarch64 \
          -D__AARCH64__

# Linker Bayraklari (Yuksek Yarimayfa 0xffffffff80000000, Limine Rev 2)
LDFLAGS := -T kernel/arch/aarch64/linker.ld \
           -nostdlib -z max-page-size=0x1000

KERNEL_DIR     := kernel
BUILD_DIR      := build
BOOTLOADER_DIR := bootloader
KERNEL_ELF     := $(BUILD_DIR)/kernel

KERNEL_SRCS := $(shell find $(KERNEL_DIR) -name '*.c' -o -name '*.S' | sort)
KERNEL_OBJS := $(patsubst $(KERNEL_DIR)/%.c,$(BUILD_DIR)/%.o,\
               $(patsubst $(KERNEL_DIR)/%.S,$(BUILD_DIR)/%.o,$(KERNEL_SRCS)))

.PHONY: all esp clean run run-x11 run-vnc run-jarvis x\:11 x11 server x11-server

all: $(KERNEL_ELF)

$(KERNEL_ELF): $(KERNEL_OBJS)
	@mkdir -p $(dir $@)
	$(LD) $(LDFLAGS) $(KERNEL_OBJS) -o $@
	@echo "[QuantOS] AArch64 Cekirdek ELF olusturuldu: $@"

$(BUILD_DIR)/%.o: $(KERNEL_DIR)/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/%.o: $(KERNEL_DIR)/%.S
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

# EFI Sistem Bolumu (FAT32 ESP) olusturur ve Limine + Kernel dosyalarini yerlestirir
esp: $(KERNEL_ELF) $(BOOTLOADER_DIR)/BOOTAA64.EFI limine.conf
	rm -rf esp && mkdir -p esp/EFI/BOOT esp/boot
	cp $(BOOTLOADER_DIR)/BOOTAA64.EFI esp/EFI/BOOT/BOOTAA64.EFI
	cp limine.conf esp/limine.conf
	cp $(KERNEL_ELF) esp/boot/kernel
	@echo "[QuantOS] UEFI ESP dizini hazir: esp/"

# Headless QEMU onyukleme testi (serial.log uretir)
run: esp
	@rm -f $(QMP_SOCK)
	$(QEMU) -M $(QEMU_MACHINE) -cpu $(QEMU_CPU) -m $(QEMU_MEM) \
		-bios $(QEMU_BIOS) \
		-drive file=fat:rw:esp,format=raw,if=virtio \
		-device ramfb \
		-device virtio-gpu-pci,xres=1280,yres=800 \
		-device virtio-tablet-device \
		-device virtio-keyboard-device \
		-display none \
		-serial file:serial.log \
		-qmp unix:$(QMP_SOCK),server,nowait \
		-no-reboot &

# Termux:X11 Sunucusu Hazirlik
server x11-server:
	@mkdir -p /tmp/.X11-unix
	@ln -sf /data/data/com.termux/files/usr/tmp/.X11-unix/X0 /tmp/.X11-unix/X0 2>/dev/null || true
	@if ! pgrep -f "termux-x11" >/dev/null 2>&1; then \
		echo "[QuantOS] Termux:X11 sunucusu baslatiliyor..."; \
		(termux-x11 :0 -ac >/dev/null 2>&1 &); \
		sleep 1; \
	fi
	@echo "[✓] Termux:X11 Sunucusu aktif (DISPLAY=:0)"

x\:11: run-x11
x11: run-x11

# Termux:X11 uzerinden tam ekran masaustu arayuzunu baslat
run-x11: esp
	@chmod +x ./start-x11.sh
	@./start-x11.sh

# VNC Sunucusu (127.0.0.1:5900) uzerinden masaustunu baslat
run-vnc: esp
	@echo "[QuantOS] VNC Sunucusu baslatiliyor: 127.0.0.1:5900"
	$(QEMU) -M $(QEMU_MACHINE) -cpu $(QEMU_CPU) -m $(QEMU_MEM) \
		-bios $(QEMU_BIOS) \
		-drive file=fat:rw:esp,format=raw,if=virtio \
		-device ramfb \
		-device virtio-gpu-pci,xres=1280,yres=800 \
		-device virtio-tablet-device \
		-device virtio-keyboard-device \
		-vnc 0.0.0.0:0 \
		-serial stdio \
		-no-reboot

# QEMU + Host J.A.R.V.I.S. Ses Koprusu (UART [JARVIS_SPEAK] -> TTS / HUD) birlikte calistir
run-jarvis: esp
	@chmod +x ./scripts/jarvis-voice-bridge.py
	python3 ./scripts/jarvis-voice-bridge.py --qemu \
		$(QEMU) -M $(QEMU_MACHINE) -cpu $(QEMU_CPU) -m $(QEMU_MEM) \
		-bios $(QEMU_BIOS) \
		-drive file=fat:rw:esp,format=raw,if=virtio \
		-device ramfb \
		-device virtio-gpu-pci,xres=1280,yres=800 \
		-device virtio-tablet-device \
		-device virtio-keyboard-device \
		-display none \
		-serial stdio \
		-no-reboot

clean:
	rm -rf $(BUILD_DIR) esp serial.log $(QMP_SOCK)
