#!/usr/bin/env python3
"""
QuantOS — Host J.A.R.V.I.S. UART Ses Köprüsü (Voice Bridge)
============================================================
QEMU AArch64 seri konsol çıktısını canlı dinler ve çekirdekten gelen
`[JARVIS_SPEAK]: <yanıt>` satırlarını yakalar:
  1. Sistemde `termux-tts-speak` varsa Türkçe (`-l tr`) seslendirir.
  2. Yoksa `espeak-ng` / `espeak` (`-v tr`) ile seslendirir.
  3. Her durumda terminale renkli J.A.R.V.I.S. HUD formatında basar.

Kullanım modları:
  - Boru (pipe):      qemu-system-aarch64 ... -serial stdio | python3 scripts/jarvis-voice-bridge.py
  - Dosya takibi:     python3 scripts/jarvis-voice-bridge.py --follow serial.log
  - Birlikte çalıştır: python3 scripts/jarvis-voice-bridge.py --qemu qemu-system-aarch64 ...
"""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime
from typing import List, Optional

MARKER = "[JARVIS_SPEAK]:"

# ANSI Renk Kodları (Quantro Copper & J.A.R.V.I.S. Arc Cyan)
CLR_RESET = "\033[0m"
CLR_BOLD = "\033[1m"
CLR_COPPER = "\033[38;2;209;146;92m"
CLR_PATINA = "\033[38;2;95;138;122m"
CLR_CYAN = "\033[38;2;56;189;248m"
CLR_AMBER = "\033[38;2;245;158;11m"
CLR_MUTED = "\033[38;2;148;163;184m"
CLR_WHITE = "\033[38;2;237;235;230m"


def detect_tts_engine() -> Optional[List[str]]:
    """Sistemdeki yerel Türkçe TTS motorunu tespit eder."""
    if os.environ.get("QUANTOS_NO_TTS") == "1":
        return None

    termux_candidates = [
        shutil.which("termux-tts-speak"),
        "/data/data/com.termux/files/usr/bin/termux-tts-speak",
    ]
    for path in termux_candidates:
        if path and os.path.isfile(path) and os.access(path, os.X_OK):
            return [path, "-l", "tr"]

    espeak_ng = shutil.which("espeak-ng")
    if espeak_ng:
        return [espeak_ng, "-v", "tr", "-s", "165"]

    espeak = shutil.which("espeak")
    if espeak:
        return [espeak, "-v", "tr", "-s", "165"]

    return None


class JarvisVoiceBridge:
    def __init__(self, log_path: Optional[str] = "serial.log") -> None:
        self.tts_cmd = detect_tts_engine()
        self.log_path = log_path
        self._tts_lock = threading.Lock()
        self._active_tts: Optional[subprocess.Popen[bytes]] = None

    def engine_label(self) -> str:
        if not self.tts_cmd:
            return "HUD Görsel Modu (TTS ikilisi bulunamadı)"
        exe = os.path.basename(self.tts_cmd[0])
        return f"{exe} ({' '.join(self.tts_cmd[1:])})"

    def print_banner(self) -> None:
        sys.stdout.write(
            f"\n{CLR_COPPER}{CLR_BOLD}╔══════════════════════════════════════════════════════════════════════╗{CLR_RESET}\n"
            f"{CLR_COPPER}{CLR_BOLD}║{CLR_RESET}  {CLR_CYAN}{CLR_BOLD}◈ J.A.R.V.I.S. UART SES KÖPRÜSÜ AKTİF (QuantOS AArch64){CLR_RESET}            {CLR_COPPER}{CLR_BOLD}║{CLR_RESET}\n"
            f"{CLR_COPPER}{CLR_BOLD}║{CLR_RESET}  {CLR_MUTED}Ses Motoru :{CLR_RESET} {CLR_PATINA}{self.engine_label():<53}{CLR_RESET}{CLR_COPPER}{CLR_BOLD}║{CLR_RESET}\n"
            f"{CLR_COPPER}{CLR_BOLD}╚══════════════════════════════════════════════════════════════════════╝{CLR_RESET}\n\n"
        )
        sys.stdout.flush()

    def render_hud(self, message: str) -> None:
        ts = datetime.now().strftime("%H:%M:%S")
        mode_tag = "SESLİ + HUD" if self.tts_cmd else "HUD MODU"
        border = "─" * 68
        sys.stdout.write(
            f"\r\n{CLR_CYAN}{CLR_BOLD}┌─[ ◈ J.A.R.V.I.S. KOMUTA YANITI | {ts} | {mode_tag} ]{border[42:]}{CLR_RESET}\r\n"
            f"{CLR_CYAN}{CLR_BOLD}│{CLR_RESET} {CLR_AMBER}▸{CLR_RESET} {CLR_WHITE}{CLR_BOLD}{message}{CLR_RESET}\r\n"
            f"{CLR_CYAN}{CLR_BOLD}└{border}{CLR_RESET}\r\n"
        )
        sys.stdout.flush()

    def speak_async(self, message: str) -> None:
        clean = message.strip()
        if not clean:
            return
        self.render_hud(clean)
        if not self.tts_cmd:
            return

        def _worker() -> None:
            with self._tts_lock:
                try:
                    if self._active_tts and self._active_tts.poll() is None:
                        self._active_tts.kill()
                except Exception:
                    pass
                try:
                    proc = subprocess.Popen(
                        [*self.tts_cmd, clean],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                    self._active_tts = proc
                    try:
                        proc.wait(timeout=12.0)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                except Exception:
                    pass

        threading.Thread(target=_worker, daemon=True).start()

    def handle_line(self, raw_line: str, echo_non_jarvis: bool = True) -> None:
        idx = raw_line.find(MARKER)
        if idx != -1:
            prefix = raw_line[:idx]
            if prefix.strip() and echo_non_jarvis:
                sys.stdout.write(prefix + "\n")
                sys.stdout.flush()
            spoken = raw_line[idx + len(MARKER) :].strip()
            self.speak_async(spoken)
        elif echo_non_jarvis:
            sys.stdout.write(raw_line)
            sys.stdout.flush()


def run_pipe_mode(bridge: JarvisVoiceBridge) -> int:
    bridge.print_banner()
    try:
        for line in sys.stdin:
            bridge.handle_line(line, echo_non_jarvis=True)
    except KeyboardInterrupt:
        pass
    return 0


def run_follow_mode(bridge: JarvisVoiceBridge, filepath: str) -> int:
    bridge.print_banner()
    while not os.path.exists(filepath):
        time.sleep(0.1)

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            buf = ""
            while True:
                chunk = f.read(512)
                if not chunk:
                    time.sleep(0.08)
                    continue
                buf += chunk
                while "\n" in buf:
                    line, buf = buf.split("\n", 1)
                    if MARKER in line:
                        bridge.handle_line(line + "\n", echo_non_jarvis=False)
    except KeyboardInterrupt:
        pass
    return 0


def run_qemu_mode(bridge: JarvisVoiceBridge, qemu_cmd: List[str]) -> int:
    bridge.print_banner()
    log_file = open(bridge.log_path, "w", encoding="utf-8") if bridge.log_path else None

    proc = subprocess.Popen(
        qemu_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=0,
    )

    stop_event = threading.Event()

    def _stdin_forwarder() -> None:
        try:
            fd = sys.stdin.fileno()
            while not stop_event.is_set() and proc.poll() is None:
                data = os.read(fd, 64)
                if not data:
                    break
                if proc.stdin:
                    proc.stdin.write(data)
                    proc.stdin.flush()
        except Exception:
            pass

    if sys.stdin is not None:
        threading.Thread(target=_stdin_forwarder, daemon=True).start()

    def _sig_handler(signum: int, _frame: object) -> None:
        stop_event.set()
        if proc.poll() is None:
            proc.terminate()

    signal.signal(signal.SIGINT, _sig_handler)
    signal.signal(signal.SIGTERM, _sig_handler)

    line_buf = bytearray()
    try:
        assert proc.stdout is not None
        while True:
            ch = proc.stdout.read(1)
            if not ch:
                if proc.poll() is not None:
                    break
                continue

            if log_file:
                log_file.write(ch.decode("utf-8", errors="replace"))
                log_file.flush()

            line_buf.extend(ch)
            if ch == b"\n":
                decoded = line_buf.decode("utf-8", errors="replace")
                line_buf.clear()
                bridge.handle_line(decoded, echo_non_jarvis=True)
            elif len(line_buf) >= 24 and line_buf.endswith(b"PS C:\\QuantOS> "):
                # Komut istemini satir sonu beklemeden aninda goster
                decoded = line_buf.decode("utf-8", errors="replace")
                line_buf.clear()
                sys.stdout.write(decoded)
                sys.stdout.flush()
    finally:
        stop_event.set()
        if log_file:
            log_file.close()
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=2.0)
            except subprocess.TimeoutExpired:
                proc.kill()

    return proc.returncode or 0


def main(argv: List[str]) -> int:
    if len(argv) >= 2 and argv[1] in ("-h", "--help"):
        sys.stdout.write(__doc__ or "QuantOS J.A.R.V.I.S. UART Voice Bridge ([JARVIS_SPEAK]:)\n")
        return 0

    bridge = JarvisVoiceBridge()

    if len(argv) >= 2 and argv[1] == "--self-test":
        bridge.print_banner()
        sample = argv[2] if len(argv) >= 3 else "Efendim, QuantOS çekirdek ses köprüsü çevrimiçi."
        bridge.handle_line(f"{MARKER} {sample}\n")
        time.sleep(0.3)
        return 0

    if len(argv) >= 3 and argv[1] == "--follow":
        return run_follow_mode(bridge, argv[2])

    if len(argv) >= 3 and argv[1] == "--qemu":
        return run_qemu_mode(bridge, argv[2:])

    return run_pipe_mode(bridge)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
