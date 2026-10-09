#!/usr/bin/env python3
"""Ambil data pasar terbaru -> tulis data.js (dibaca index.html) dan data-meta.json (dipantau data-refresh.js).

Tanpa dependensi: cukup Python 3.8+. Dijalankan otomatis oleh GitHub Actions (.github/workflows/update-data.yml),
atau manual:  python update_data.py

Perilaku aman:
- Bila satu sumber gagal, nilai lama dari data.js dipertahankan untuk bagian itu.
- Bila SEMUA sumber gagal, data.js TIDAK ditimpa dan skrip keluar dengan kode 1 (workflow tidak commit data kosong).
- Penulisan atomik (file sementara lalu rename) sehingga data.js tak pernah setengah jadi.
"""
import json, os, sys, time, hashlib, datetime, urllib.request, urllib.parse, urllib.error, pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "data.js"
META = HERE / "data-meta.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; BeritaAnginBot/1.1; +https://github.com)", "Accept": "application/json,text/csv,*/*"}


def log(*a):
    print(*a, flush=True)


def fetch(url, tries=3, timeout=25, as_json=True):
    """GET dengan retry + backoff (429/5xx lebih lama). Mengembalikan JSON/teks atau None."""
    err = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read().decode("utf-8", "replace")
            return json.loads(raw) if as_json else raw
        except urllib.error.HTTPError as e:
            err = e
            time.sleep(8 * (i + 1) if e.code in (429, 503) else 2 * (i + 1))
        except Exception as e:  # jaringan, timeout, JSON rusak
            err = e
            time.sleep(2 * (i + 1))
    log("GAGAL", url[:90], err)
    return None


def load_old():
    try:
        t = OUT.read_text(encoding="utf-8")
        return json.loads(t[t.index("=") + 1:].strip().rstrip(";"))
    except Exception:
        return {}


old = load_old()
data = {
    "global": old.get("global", {}),
    "crypto": old.get("crypto", {}),
    "cryptoGlobal": old.get("cryptoGlobal", {}),
    "sources": {},
}
fresh = 0  # jumlah data baru yang berhasil diambil (untuk memutuskan boleh menimpa atau tidak)

# ---------------- Yahoo Finance (indeks, komoditas, valas, saham) ----------------
YH = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]


def yahoo_raw(sym, rng, interval="1d"):
    q = urllib.parse.quote(sym)
    for host in YH:  # coba host cadangan bila host pertama menolak
        j = fetch("https://%s/v8/finance/chart/%s?range=%s&interval=%s" % (host, q, rng, interval), tries=2)
        try:
            return j["chart"]["result"][0]
        except Exception:
            continue
    return None


def yahoo(sym):
    res = yahoo_raw(sym, "5d")
    try:
        px = res["meta"]["regularMarketPrice"]
        cl = [c for c in res["indicators"]["quote"][0]["close"] if c is not None]
        # jika candle terakhir sama dengan harga kini (pasar tutup) -> pembanding = candle sebelumnya
        prev = cl[-2] if len(cl) >= 2 and abs(cl[-1] - px) / px < 1e-6 else cl[-1]
        return {"v": round(px, 4), "c": round((px / prev - 1) * 100, 2), "t": res["meta"].get("regularMarketTime")}
    except Exception:
        return None


Y = {  # nama baris di tabel Global Market -> simbol Yahoo (daftar dicoba berurutan)
    "S&P 500": ["^GSPC"], "NASDAQ Composite": ["^IXIC"], "Dow Jones Industrial": ["^DJI"], "Russell 2000": ["^RUT"],
    "FTSE 100": ["^FTSE"], "DAX Performance Index": ["^GDAXI"], "CAC 40": ["^FCHI"], "Euro Stoxx 50": ["^STOXX50E"],
    "Nikkei 225": ["^N225"], "TOPIX Index": ["^TOPX", "1306.T"], "Hang Seng Index": ["^HSI"],
    "Shanghai Composite": ["000001.SS"], "CSI 300": ["000300.SS"], "Nifty 50": ["^NSEI"], "KOSPI": ["^KS11"],
    "ASX 200": ["^AXJO"], "IHSG": ["^JKSE"], "Straits Times Index": ["^STI"], "MSCI Emerging Markets": ["EEM"],
    "Spot Gold (XAU)": ["GC=F"], "Spot Silver (XAG)": ["SI=F"], "Crude Oil WTI": ["CL=F"], "Brent Crude Oil": ["BZ=F"],
    "Natural Gas": ["NG=F"], "Copper Futures": ["HG=F"], "US Dollar Index (DXY)": ["DX-Y.NYB"],
}
FX = {"USD/IDR": "IDR=X", "EUR/USD": "EURUSD=X", "USD/JPY": "JPY=X", "GBP/USD": "GBPUSD=X", "USD/SGD": "SGD=X", "AUD/USD": "AUDUSD=X"}

ok = 0
for name, syms in Y.items():
    for sym in syms:
        r = yahoo(sym)
        if r:
            if sym == "HG=F":  # tembaga: USD/lb -> USD/ton, sama seperti sisi browser
                r["v"] = round(r["v"] * 2204.62, 2)
            data["global"][name] = r
            ok += 1
            break
data["fx"] = old.get("fx", {})
for name, sym in FX.items():
    r = yahoo(sym)
    if r:
        data["fx"][name] = r
        ok += 1
data["sources"]["yahoo"] = ok
fresh += ok

# ---------------- CoinGecko (kripto) ----------------
mk = fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h")
if mk:
    data["crypto"] = {
        c["symbol"].lower(): {"p": c["current_price"], "c": round(c.get("price_change_percentage_24h") or 0, 2), "v": c.get("total_volume") or 0}
        for c in mk if c.get("current_price") is not None
    }
    data["sources"]["coingecko_markets"] = len(mk)
    fresh += len(mk)
time.sleep(2)  # sopan terhadap rate limit CoinGecko
gl = fetch("https://api.coingecko.com/api/v3/global")
if gl:
    g = gl["data"]
    p = g["market_cap_percentage"]
    data["cryptoGlobal"] = {
        "mcap": g["total_market_cap"]["usd"] / 1e12, "vol": g["total_volume"]["usd"] / 1e9,
        "btc": p.get("btc"), "eth": p.get("eth"), "stb": (p.get("usdt") or 0) + (p.get("usdc") or 0),
        "mcapChg": g.get("market_cap_change_percentage_24h_usd"),
    }
    data["global"]["Bitcoin Dominance Index"] = {"v": round(p.get("btc", 0), 2), "c": None}
    fresh += 1
fg = fetch("https://api.alternative.me/fng/?limit=1")
if fg:
    data["cryptoGlobal"]["fng"] = int(fg["data"][0]["value"])
    fresh += 1

# ---------------- Riwayat harian 1 tahun (grafik multi-pasar, Peta Panas, komposit) ----------------
HIST = ["^N225", "^FTSE", "^STOXX50E", "000001.SS", "^GSPC", "^NSEI", "^HSI", "^KS11", "^TWII", "^STI", "^JKSE", "^GDAXI", "^FCHI", "^AXJO"]


def yahoo_hist(sym):
    res = yahoo_raw(sym, "1y")
    try:
        ts = res.get("timestamp") or []
        cl = res["indicators"]["quote"][0]["close"]
        return [[datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime("%Y-%m-%d"), round(c, 4)]
                for t, c in zip(ts, cl) if c is not None]
    except Exception:
        return None


data["hist"] = old.get("hist", {})
nh = 0
for sym in HIST:
    h = yahoo_hist(sym)
    if h and len(h) > 20:
        data["hist"][sym] = h
        nh += 1
data["sources"]["riwayat_indeks"] = nh
fresh += nh

# ---------------- Saham AS (U.S. Stock Directory & Top Movers) ----------------
STOCKS = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "INTC", "PYPL", "UBER", "JPM", "V", "WMT", "DIS", "BAC", "XOM", "CVX", "KO", "PEP", "PFE", "JNJ", "ABBV", "TMO", "COST", "AVGO", "CSCO", "ADBE", "CRM", "QCOM", "TXN", "ACN", "LIN", "NKE", "MCD", "IBM", "SBUX", "GE", "CAT", "BA", "HON", "UPS", "T", "VZ", "NEE", "LOW", "BLK", "SPGI", "MDT"]
data["stocks"] = old.get("stocks", {})
ns = 0
for sym in STOCKS:
    r = yahoo(sym)
    if r:
        data["stocks"][sym] = r
        ns += 1
data["sources"]["saham_as"] = ns
fresh += ns


# ---------------- Komponen likuiditas makro (FRED, tanpa API key) ----------------
def fred(sid):
    txt = fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + sid, as_json=False)
    if not txt:
        return None
    try:
        rows = [l.split(",") for l in txt.strip().split("\n")[1:]]
        rows = [(d, float(v)) for d, v in rows if v not in ("", ".")]
        return rows[-1]
    except Exception as e:
        log("GAGAL FRED", sid, e)
        return None


data["liq"] = old.get("liq", {})
for key, sid, div in [("fed", "WALCL", 1e6), ("rrp", "RRPONTSYD", 1e3), ("tga", "WTREGEN", 1e6), ("m2", "M2SL", 1e3), ("ust", "DGS10", 1)]:
    r = fred(sid)
    if r:
        data["liq"][key] = {"v": round(r[1] / div, 4), "d": r[0]}
        fresh += 1
if "US Dollar Index (DXY)" in data["global"]:
    data["liq"]["dxy"] = {"v": data["global"]["US Dollar Index (DXY)"]["v"], "d": datetime.date.today().isoformat()}
data["sources"]["fred"] = len(data["liq"])

# ---------------- Tulis hasil ----------------
if fresh == 0:
    log("SEMUA sumber gagal; data.js tidak diubah.")
    sys.exit(1)

now = datetime.datetime.now(datetime.timezone.utc)
data["asOf"] = now.strftime("%Y-%m-%d")
data["asOfISO"] = now.isoformat(timespec="seconds")


def atomic_write(path, text):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


body = "window.__DAILY = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
atomic_write(OUT, body)
meta = {
    "asOf": data["asOf"], "asOfISO": data["asOfISO"], "sources": data["sources"],
    "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest()[:16], "bytes": len(body.encode("utf-8")),
}
atomic_write(META, json.dumps(meta, ensure_ascii=False, indent=1) + "\n")
log("Selesai:", data["asOfISO"], data["sources"])
