#!/usr/bin/env python3
"""
QuantOS Native System Daemon (jarvisd)
Quantro AR-GE Linux İşletim Sistemi Katmanı — Donanım Telemetrisi ve Sesli J.A.R.V.I.S. Servisi
"""
from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Dict, Any

BOOT_TIME = time.time()


def read_meminfo() -> Dict[str, int]:
    info: Dict[str, int] = {}
    try:
        with open("/proc/meminfo", "r", encoding="utf-8") as f:
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    if val.isdigit():
                        info[key] = int(val) * 1024
    except OSError:
        pass
    return {
        "total_bytes": info.get("MemTotal", 0),
        "available_bytes": info.get("MemAvailable", info.get("MemFree", 0)),
    }


def read_loadavg() -> list[float]:
    try:
        return list(os.getloadavg())
    except OSError:
        return [0.0, 0.0, 0.0]


_ACTIVE_TTS_PROC: subprocess.Popen[bytes] | None = None


def speak_native(text: str, lang: str = "tr") -> bool:
    global _ACTIVE_TTS_PROC
    clean = text.replace("\x00", " ").strip()[:500]
    if not clean:
        return False
    safe_lang = "en" if lang.lower().startswith("en") else "tr"
    if _ACTIVE_TTS_PROC is not None and _ACTIVE_TTS_PROC.poll() is None:
        try:
            _ACTIVE_TTS_PROC.terminate()
        except Exception:
            pass
    if shutil.which("termux-tts-speak"):
        _ACTIVE_TTS_PROC = subprocess.Popen(
            ["termux-tts-speak", "-l", safe_lang, "--", clean],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    if shutil.which("espeak-ng"):
        _ACTIVE_TTS_PROC = subprocess.Popen(
            ["espeak-ng", "-v", safe_lang, "-s", "168", "--", clean],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    return False


class JarvisDaemonHandler(BaseHTTPRequestHandler):
    def _send_json(self, code: int, payload: Dict[str, Any]) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path == "/status":
            self._send_json(
                200,
                {
                    "daemon": "jarvisd",
                    "version": "1.0.0",
                    "arch": platform.machine(),
                    "kernel": platform.release(),
                    "uptime_sec": round(time.time() - BOOT_TIME, 2),
                    "loadavg": read_loadavg(),
                    "memory": read_meminfo(),
                    "provenance": "linux-procfs-direct",
                },
            )
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        if self.path == "/speak":
            try:
                raw_len = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                raw_len = 0
            length = max(0, min(raw_len, 4096))
            body = self.rfile.read(length).decode("utf-8", errors="replace")
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self._send_json(400, {"error": "invalid_json"})
                return
            ok = speak_native(str(data.get("text", "")), str(data.get("lang", "tr")))
            self._send_json(200, {"ok": ok})
            return
        self._send_json(404, {"error": "not_found"})

    def log_message(self, fmt: str, *args: Any) -> None:
        return


def main() -> None:
    host = os.environ.get("JARVISD_HOST", "127.0.0.1")
    port = int(os.environ.get("JARVISD_PORT", "3801"))
    srv = HTTPServer((host, port), JarvisDaemonHandler)
    print(f"[jarvisd] QuantOS Sistem Servisi aktif -> http://{host}:{port}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
