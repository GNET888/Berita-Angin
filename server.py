#!/usr/bin/env python3
"""Server lokal + pembaruan data otomatis, TANPA GitHub.
Jalankan:  python server.py            (port 8000, update tiap 6 jam)
           python server.py --port 9000 --every 3
Buka:      http://localhost:8000
Cara kerja: saat start, data.js dicek; bila lebih tua dari --every jam, update_data.py dijalankan.
Lalu update diulang di latar belakang. Browser otomatis mendeteksi data baru lewat data-meta.json.
Hanya library bawaan Python 3.8+."""
import argparse, json, subprocess, sys, threading, time, pathlib, datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, default=8000)
ap.add_argument("--every", type=float, default=6, help="interval update (jam)")
ap.add_argument("--host", default="127.0.0.1", help="gunakan 0.0.0.0 agar bisa dibuka dari HP satu Wi-Fi")
a = ap.parse_args()
lock = threading.Lock()


def age_hours():
    try:
        m = json.loads((ROOT / "data-meta.json").read_text(encoding="utf-8"))
        t = datetime.datetime.fromisoformat(m["asOfISO"])
        return (datetime.datetime.now(datetime.timezone.utc) - t).total_seconds() / 3600
    except Exception:
        return 1e9


def update():
    if not lock.acquire(blocking=False):
        return
    try:
        print("[%s] update data..." % time.strftime("%H:%M:%S"), flush=True)
        r = subprocess.run([sys.executable, str(ROOT / "update_data.py")], cwd=ROOT)
        print("[update] selesai" if r.returncode == 0 else "[update] gagal, data lama dipakai", flush=True)
    finally:
        lock.release()


def loop():
    while True:
        if age_hours() >= a.every:
            update()
        time.sleep(600)  # cek tiap 10 menit (tahan laptop sleep/bangun)


class H(SimpleHTTPRequestHandler):
    def __init__(self, *x, **k):
        super().__init__(*x, directory=str(ROOT), **k)

    def end_headers(self):
        if self.path.split("?")[0].endswith(("data.js", "data-meta.json", "sw.js", "index.html", "/")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *x):
        pass


threading.Thread(target=loop, daemon=True).start()
print("Situs: http://%s:%d   | update tiap %g jam | Ctrl+C untuk berhenti" % ("localhost" if a.host == "127.0.0.1" else a.host, a.port, a.every))
try:
    ThreadingHTTPServer((a.host, a.port), H).serve_forever()
except KeyboardInterrupt:
    pass
