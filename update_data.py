#!/usr/bin/env python3
"""update_data.py: menarik data pasar terbaru dan menulis data.js untuk index.html.

Sumber (gratis, tanpa API key):
  - Yahoo Finance chart API : indeks saham, komoditas, DXY, valas, saham individual, riwayat harga
  - CoinGecko               : harga kripto + data global kripto

Pakai:    python update_data.py
Otomatis: lihat .github/workflows/update-data.yml (jalan tiap hari)

Prinsip: kalau satu sumber gagal, kunci itu DILEWATI (tidak ditulis), sehingga index.html
memakai nilai bawaan / data hari sebelumnya. Data lama dari data.js sebelumnya dipertahankan.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.js")
UA = {"User-Agent": "Mozilla/5.0 (compatible; BeritaAnginBot/1.0)"}

# nama di index.html -> daftar simbol Yahoo (dicoba berurutan), pengali (konversi satuan)
GLOBAL = {
    "S&P 500": (["^GSPC"], 1),
    "NASDAQ Composite": (["^IXIC"], 1),
    "Dow Jones Industrial": (["^DJI"], 1),
    "Russell 2000": (["^RUT"], 1),
    "FTSE 100": (["^FTSE"], 1),
    "DAX Performance Index": (["^GDAXI"], 1),
    "CAC 40": (["^FCHI"], 1),
    "Euro Stoxx 50": (["^STOXX50E"], 1),
    "Nikkei 225": (["^N225"], 1),
    "TOPIX Index": (["^TOPX"], 1),
    "Hang Seng Index": (["^HSI"], 1),
    "Shanghai Composite": (["000001.SS"], 1),
    "CSI 300": (["000300.SS"], 1),
    "Nifty 50": (["^NSEI"], 1),
    "KOSPI": (["^KS11"], 1),
    "ASX 200": (["^AXJO"], 1),
    "IHSG": (["^JKSE"], 1),
    "Straits Times Index": (["^STI"], 1),
    "Spot Gold (XAU)": (["XAUUSD=X", "GC=F"], 1),
    "Spot Silver (XAG)": (["XAGUSD=X", "SI=F"], 1),
    "Crude Oil WTI": (["CL=F"], 1),
    "Brent Crude Oil": (["BZ=F"], 1),
    "Natural Gas": (["NG=F"], 1),
    "Copper Futures": (["HG=F"], 2204.62),  # $/lb -> $/ton, sama dengan satuan di index.html
    "US Dollar Index (DXY)": (["DX-Y.NYB"], 1),
}

FX = {  # nama di index.html -> simbol Yahoo
    "USD/IDR": "IDR=X",
    "EUR/USD": "EURUSD=X",
    "USD/JPY": "JPY=X",
    "GBP/USD": "GBPUSD=X",
    "USD/SGD": "SGD=X",
    "AUD/USD": "AUDUSD=X",
}

# saham individual yang ada di direktori index.html (tambah sesuai kebutuhan)
STOCKS = ["NVDA", "MSFT", "AAPL", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "TSM", "JPM"]

# simbol yang disimpan riwayat hariannya (untuk grafik saat sumber live gagal)
HIST = ["NVDA", "MSFT", "AAPL", "TSLA", "^GSPC", "^JKSE"]


def get_json(url, tries=3, timeout=20):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    print(f"  gagal: {url[:90]}... ({last})", file=sys.stderr)
    return None


def yahoo(symbol, rng="5d"):
    """Kembalikan (harga, perubahan %, [(tanggal, close), ...]) atau None."""
    q = urllib.parse.quote(symbol, safe="")
    for host in ("query1", "query2"):
        d = get_json(f"https://{host}.finance.yahoo.com/v8/finance/chart/{q}?range={rng}&interval=1d")
        try:
            res = d["chart"]["result"][0]
            closes = res["indicators"]["quote"][0]["close"]
            ts = res["timestamp"]
            pts = [(t, c) for t, c in zip(ts, closes) if c is not None]
            if len(pts) < 2:
                continue
            meta = res.get("meta", {})
            price = meta.get("regularMarketPrice") or pts[-1][1]
            # bila harga live sama dengan close terakhir, pembanding = close sebelumnya;
            # bila berbeda (sesi masih berjalan), pembanding = close terakhir
            prev = pts[-2][1] if abs(pts[-1][1] - price) < 1e-9 else pts[-1][1]
            chg = (price / prev - 1) * 100 if prev else 0.0
            return price, chg, pts
        except Exception:  # noqa: BLE001
            continue
    return None


def load_previous():
    """Baca data.js lama supaya kunci yang gagal ditarik hari ini tetap punya nilai."""
    try:
        with open(OUT, encoding="utf-8") as f:
            txt = f.read()
        m = re.search(r"window\.__DAILY\s*=\s*(\{.*\})\s*;?\s*$", txt, re.S)
        return json.loads(m.group(1)) if m else {}
    except Exception:  # noqa: BLE001
        return {}


def main():
    data = load_previous()
    for k in ("global", "crypto", "fx", "stocks", "hist"):
        data.setdefault(k, {})
    ok = 0

    print("Indeks, komoditas, DXY ...")
    for name, (syms, mult) in GLOBAL.items():
        for s in syms:
            r = yahoo(s)
            if r:
                data["global"][name] = {"v": round(r[0] * mult, 4), "c": round(r[1], 2)}
                ok += 1
                break

    print("Valas ...")
    for name, s in FX.items():
        r = yahoo(s)
        if r:
            data["fx"][name] = {"v": round(r[0], 4), "c": round(r[1], 2)}
            ok += 1

    print("Saham individual ...")
    for s in STOCKS:
        r = yahoo(s)
        if r:
            data["stocks"][s] = {"v": round(r[0], 2), "c": round(r[1], 2)}
            ok += 1

    print("Riwayat harga ...")
    for s in HIST:
        r = yahoo(s, "1y")
        if r:
            data["hist"][s] = [[int(t), round(c, 4)] for t, c in r[2]]
            ok += 1

    print("Kripto ...")
    cg = get_json(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc"
        "&per_page=100&page=1&price_change_percentage=24h"
    )
    if cg:
        seen = set()
        for c in cg:
            sym = (c.get("symbol") or "").lower()
            if not sym or sym in seen or not c.get("current_price"):
                continue  # simbol kembar: pakai yang kapitalisasinya terbesar (urutan pertama)
            seen.add(sym)
            data["crypto"][sym] = {
                "p": c.get("current_price"),
                "c": round(c.get("price_change_percentage_24h") or 0, 2),
                "v": c.get("total_volume"),
                "m": c.get("market_cap"),
                "r": c.get("market_cap_rank"),
            }
        ok += 1
    g = get_json("https://api.coingecko.com/api/v3/global")
    if g and g.get("data"):
        gd = g["data"]
        pc = gd.get("market_cap_percentage", {})
        data["cryptoGlobal"] = {
            "mcap": gd["total_market_cap"]["usd"] / 1e12,
            "vol": gd["total_volume"]["usd"] / 1e9,
            "btc": pc.get("btc"),
            "eth": pc.get("eth"),
            "stb": (pc.get("usdt") or 0) + (pc.get("usdc") or 0),
        }
        if pc.get("btc") is not None:
            data["global"]["Bitcoin Dominance Index"] = {"v": round(pc["btc"], 2), "c": 0.0}

    if ok < 5:
        print("Terlalu sedikit data berhasil ditarik; data.js TIDAK diubah.", file=sys.stderr)
        sys.exit(1)

    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("/* dibuat otomatis oleh update_data.py, jangan diedit manual */\n")
        f.write("window.__DAILY = " + body + ";\n")
    print(f"Selesai: {ok} sumber berhasil, ditulis ke {OUT}")


if __name__ == "__main__":
    main()
