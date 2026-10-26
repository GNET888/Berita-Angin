#!/usr/bin/env python3
"""update_data.py - membuat data.js (window.__DAILY) untuk SEMUA halaman index.html.

Skema sama dengan yang dibaca pemuat harian di index.html:
  global{nama:{v,c}}  crypto{simbol:{p,c,v,m,r}}  cryptoGlobal{btc,eth,stb,mcap,vol}
  fx{pasangan:{v,c}}  stocks{simbol:{v,c}}        liq{id:{v,d}}
  hist{simbol:[[YYYY-MM-DD,harga],..]}            articles[...]   updated / asof

Aman terhadap kegagalan sebagian: data yang gagal diambil memakai nilai dari data.js sebelumnya,
dan angka yang tidak masuk akal (salah satuan / salah seri) ditolak lewat pagar kewajaran.
Hanya pustaka bawaan Python. Jalankan sekali sehari (GitHub Actions) di folder index.html.
"""
import csv
import io
import json
import re
import sys
import time
import datetime as dt
import urllib.parse
import urllib.request

OUT = "data.js"
UA = {"User-Agent": "Mozilla/5.0 (compatible; BeritaAnginBot/1.0)", "Accept": "application/json,text/csv,*/*"}
NOW = dt.datetime.now(dt.timezone.utc)
FETCHED = {"n": 0}  # jumlah nilai yang benar-benar berhasil diambil hari ini

# ---------------------------------------------------------------- peta simbol
GLOBAL_MAP = {  # nama baris di tabel Global Market -> simbol Yahoo (faktor = konversi satuan)
    "S&P 500": "^GSPC", "NASDAQ Composite": "^IXIC", "Dow Jones Industrial": "^DJI", "Russell 2000": "^RUT",
    "FTSE 100": "^FTSE", "DAX Performance Index": "^GDAXI", "CAC 40": "^FCHI", "Euro Stoxx 50": "^STOXX50E",
    "Nikkei 225": "^N225", "TOPIX Index": "^TOPX", "Hang Seng Index": "^HSI", "Shanghai Composite": "000001.SS",
    "CSI 300": "000300.SS", "Nifty 50": "^NSEI", "KOSPI": "^KS11", "ASX 200": "^AXJO", "IHSG": "^JKSE",
    "Straits Times Index": "^STI", "Spot Gold (XAU)": "GC=F", "Spot Silver (XAG)": "SI=F",
    "Crude Oil WTI": "CL=F", "Brent Crude Oil": "BZ=F", "Natural Gas": "NG=F",
    "US Dollar Index (DXY)": "DX-Y.NYB", "Bloomberg Commodity Index": "^BCOM",
}
GLOBAL_FACTOR = {"Copper Futures": 2204.62}  # HG=F USD/lb -> USD/ton (tampilan halaman per ton)
GLOBAL_MAP["Copper Futures"] = "HG=F"
# nilai acuan kasar (untuk pagar kewajaran saja; bukan data tampilan)
GLOBAL_BASE = {"S&P 500": 7600, "NASDAQ Composite": 25900, "Dow Jones Industrial": 52000, "Russell 2000": 2770,
               "FTSE 100": 10700, "DAX Performance Index": 25000, "CAC 40": 7800, "Euro Stoxx 50": 6000,
               "Nikkei 225": 62000, "TOPIX Index": 3900, "Hang Seng Index": 23000, "Shanghai Composite": 3700,
               "CSI 300": 4300, "Nifty 50": 22600, "KOSPI": 5500, "ASX 200": 8800, "IHSG": 5400,
               "Straits Times Index": 5400, "Spot Gold (XAU)": 3990, "Spot Silver (XAG)": 54, "Crude Oil WTI": 100,
               "Brent Crude Oil": 115, "Natural Gas": 2.6, "Copper Futures": 14000, "US Dollar Index (DXY)": 101.7,
               "Bloomberg Commodity Index": 140}
FX_MAP = {"USD/IDR": "IDR=X", "EUR/USD": "EURUSD=X", "USD/JPY": "JPY=X", "GBP/USD": "GBPUSD=X",
          "USD/SGD": "SGD=X", "AUD/USD": "AUDUSD=X"}
STOCKS = ("AAPL ABBV ACN ADBE AMD AMZN AVGO BA BAC BLK CAT COST CRM CSCO CVX DIS GE GOOGL HON IBM INTC JNJ JPM KO "
          "LIN LOW MCD MDT META MSFT NEE NFLX NKE NVDA PEP PFE PYPL QCOM SBUX SPGI T TMO TSLA TXN UBER UPS V VZ "
          "WMT XOM").split()
CHART_SYMS = ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "META"]
HIST_SYMS = (["^N225", "^FTSE", "^STOXX50E", "000001.SS", "^GSPC", "^NSEI", "^HSI", "^KS11", "^TWII", "^STI", "^JKSE",
              "^GDAXI", "^FCHI", "^AXJO", "^BVSP", "^GSPTSE", "FTSEMIB.MI", "^MXX", "^SSMI", "^IBEX", "^AEX",
              "^SET.BK", "^KLSE", "^NZ50", "XU100.IS", "^TASI.SR"] + CHART_SYMS)
# seri FRED (CSV publik tanpa kunci)
FRED = {"fed": "WALCL", "rrp": "RRPONTSYD", "tga": "WTREGEN", "ecb": "ECBASSETSW", "boj": "JPNASSETS",
        "m2": "M2SL", "ust": "DGS10"}
LIQ_BASE = {"fed": 6.7, "rrp": 0.012, "tga": 0.98, "ecb": 6.6, "boj": 4.1, "m2": 23.3, "ust": 5.3, "dxy": 101.9, "stb": 257}


# ---------------------------------------------------------------- jaringan
def http(url, timeout=25, tries=3):
    last = None
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (k + 1))
    raise last


def jget(url):
    return json.loads(http(url).decode("utf-8", "ignore"))


def yahoo(sym, rng="1y"):
    """-> dict(v, c, hist[[iso,close]]) atau None."""
    u = "https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=1d" % (urllib.parse.quote(sym), rng)
    try:
        r = jget(u)["chart"]["result"][0]
    except Exception:  # noqa: BLE001
        try:
            r = jget(u.replace("query1.", "query2."))["chart"]["result"][0]
        except Exception as e:  # noqa: BLE001
            print("[yahoo gagal] %s: %s" % (sym, e), file=sys.stderr)
            return None
    ts = r.get("timestamp") or []
    cl = ((r.get("indicators", {}).get("quote") or [{}])[0]).get("close") or []
    pts = [[dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime("%Y-%m-%d"), round(c, 4)]
           for t, c in zip(ts, cl) if c is not None]
    if len(pts) < 2:
        return None
    meta = r.get("meta", {})
    px = meta.get("regularMarketPrice") or pts[-1][1]
    rt = meta.get("regularMarketTime")
    if rt:
        d = dt.datetime.fromtimestamp(rt, dt.timezone.utc).strftime("%Y-%m-%d")
        if pts[-1][0] == d:
            pts[-1][1] = round(px, 4)
        elif d > pts[-1][0]:
            pts.append([d, round(px, 4)])
    prev = pts[-2][1]
    return {"v": round(pts[-1][1], 4), "c": round((pts[-1][1] / prev - 1) * 100, 2) if prev else 0.0, "hist": pts}


def sane(val, base, lo=0.4, hi=2.5):
    return val is not None and base and lo <= val / base <= hi


# ---------------------------------------------------------------- data lama (cadangan)
def load_old():
    try:
        s = open(OUT, encoding="utf-8").read()
        m = re.search(r"=\s*(\{.*\})\s*;?\s*$", s, re.S)
        return json.loads(m.group(1)) if m else {}
    except Exception:  # noqa: BLE001
        return {}


# ---------------------------------------------------------------- pengumpul
def collect_markets(old):
    G, FX, ST, H = dict(old.get("global", {})), dict(old.get("fx", {})), dict(old.get("stocks", {})), dict(old.get("hist", {}))
    cache = {}

    def get(sym):
        if sym not in cache:
            cache[sym] = yahoo(sym)
            time.sleep(0.25)
        return cache[sym]

    for name, sym in GLOBAL_MAP.items():
        d = get(sym)
        if not d:
            continue
        f = GLOBAL_FACTOR.get(name, 1)
        v = d["v"] * f
        if sane(v, GLOBAL_BASE.get(name)):
            G[name] = {"v": round(v, 4), "c": d["c"]}
            FETCHED["n"] += 1
        else:
            print("[ditolak] %s=%s di luar pagar kewajaran" % (name, v), file=sys.stderr)
    for pair, sym in FX_MAP.items():
        d = get(sym)
        if d:
            FX[pair] = {"v": d["v"], "c": d["c"]}
            FETCHED["n"] += 1
    for s in STOCKS:
        d = get(s)
        if d and d["v"] > 0:
            ST[s] = {"v": d["v"], "c": d["c"]}
            FETCHED["n"] += 1
    for s in HIST_SYMS:
        d = get(s)
        if d:
            H[s] = d["hist"][-253:]
    return G, FX, ST, H, cache


def collect_crypto(old):
    C, CG = dict(old.get("crypto", {})), dict(old.get("cryptoGlobal", {}))
    stb_sum = 0.0
    try:
        rows = jget("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc"
                    "&per_page=250&page=1&sparkline=false&price_change_percentage=24h")
        seen = set()
        for r in rows:
            sy = (r.get("symbol") or "").lower()
            if r.get("id") in ("tether", "usd-coin"):
                stb_sum += r.get("market_cap") or 0
            if not sy or sy in seen:
                continue
            seen.add(sy)
            FETCHED["n"] += 1
            C[sy] = {"p": r.get("current_price"), "c": round(r.get("price_change_percentage_24h") or 0, 2),
                     "v": r.get("total_volume"), "m": r.get("market_cap"), "r": r.get("market_cap_rank")}
    except Exception as e:  # noqa: BLE001
        print("[coingecko markets gagal]", e, file=sys.stderr)
    try:
        g = jget("https://api.coingecko.com/api/v3/global")["data"]
        pc = g["market_cap_percentage"]
        CG.update({"btc": round(pc.get("btc", 0), 2), "eth": round(pc.get("eth", 0), 2),
                   "stb": round(pc.get("usdt", 0) + pc.get("usdc", 0), 2),
                   "mcap": round(g["total_market_cap"]["usd"] / 1e12, 4), "vol": round(g["total_volume"]["usd"] / 1e9, 2)})
    except Exception as e:  # noqa: BLE001
        print("[coingecko global gagal]", e, file=sys.stderr)
    return C, CG, stb_sum / 1e9


def fred_last(series):
    raw = http("https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + series).decode("utf-8", "ignore")
    rows = list(csv.reader(io.StringIO(raw)))[1:]
    for r in reversed(rows):
        if len(r) >= 2 and r[1] not in (".", ""):
            try:
                return r[0], float(r[1])
            except ValueError:
                continue
    raise ValueError("kosong")


def fit(raw, base, mult_list):
    """pilih pengali satuan yang menghasilkan angka dekat acuan (menjaga dari salah satuan)."""
    for m in mult_list:
        if sane(raw * m, base, 0.3, 3.3):
            return raw * m
    return None


def collect_liq(old, cache, stb_b):
    L = dict(old.get("liq", {}))
    eur = (cache.get("EURUSD=X") or {}).get("v") or 1.12
    jpy = (cache.get("JPY=X") or {}).get("v") or 150.0
    conv = {  # id -> kandidat pengali ke satuan tampilan halaman
        "fed": [1e-6, 1e-3, 1], "rrp": [1e-3, 1, 1e-6], "tga": [1e-6, 1e-3, 1],
        "ecb": [eur * 1e-6, eur * 1e-3, eur], "boj": [1e8 / jpy / 1e12, 1e6 / jpy / 1e12, 1e9 / jpy / 1e12, 1 / jpy / 1e12],
        "m2": [1e-3, 1e-6, 1], "ust": [1],
    }
    for i, series in FRED.items():
        try:
            d, raw = fred_last(series)
            v = fit(raw, LIQ_BASE[i], conv[i])
            if v is None:
                print("[ditolak] %s (%s) mentah=%s" % (i, series, raw), file=sys.stderr)
                continue
            L[i] = {"v": round(v, 4), "d": d}
        except Exception as e:  # noqa: BLE001
            print("[fred gagal] %s: %s" % (series, e), file=sys.stderr)
    dx = cache.get("DX-Y.NYB")
    if dx and sane(dx["v"], LIQ_BASE["dxy"]):
        L["dxy"] = {"v": round(dx["v"], 3), "d": NOW.strftime("%Y-%m-%d")}
    if stb_b and sane(stb_b, LIQ_BASE["stb"], 0.3, 4):
        L["stb"] = {"v": round(stb_b, 2), "d": NOW.strftime("%Y-%m-%d")}
    return L


def collect_articles(old):
    try:
        import update_articles as ua
        items = []
        for name, url, cat in ua.FEEDS:
            items += ua.parse_feed(name, url, cat)
        arts = [ua.to_article(i) for i in ua.pick(items)] if items else []
        return arts or old.get("articles", [])
    except Exception as e:  # noqa: BLE001
        print("[artikel dilewati]", e, file=sys.stderr)
        return old.get("articles", [])


def main():
    old = load_old()
    G, FX, ST, H, cache = collect_markets(old)
    # indeks dominasi BTC di tabel Global Market
    C, CG, stb_b = collect_crypto(old)
    if CG.get("btc"):
        G["Bitcoin Dominance Index"] = {"v": CG["btc"]}
    L = collect_liq(old, cache, stb_b)
    data = {
        "updated": NOW.replace(microsecond=0).isoformat(), "asof": NOW.strftime("%Y-%m-%d"),
        "global": G, "crypto": C, "cryptoGlobal": CG, "fx": FX, "stocks": ST, "liq": L, "hist": H,
        "articles": collect_articles(old),
    }
    # tolak penulisan bila hampir semuanya gagal (jaringan mati): pertahankan data.js lama
    if FETCHED["n"] < 10:
        print("Pengambilan data gagal total; data.js lama dipertahankan.", file=sys.stderr)
        return 1
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.__DAILY=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("%s: global=%d crypto=%d saham=%d fx=%d liq=%d hist=%d artikel=%d" % (
        OUT, len(G), len(C), len(ST), len(FX), len(L), len(H), len(data["articles"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
