#!/usr/bin/env python3
"""
update_data.py  -  Pembaruan data harian untuk Web3.html (Berita Angin)

Menghasilkan dua file di folder yang sama dengan skrip ini:
  data.js          -> window.__DAILY = {...}   (dibaca loader di <head> Web3.html)
  liquidity.json   -> riwayat FRED (WALCL, RRPONTSYD, WTREGEN) untuk grafik likuiditas

Hanya memakai pustaka standar Python 3.8+. Tiap bagian diambil terpisah: bila satu
sumber gagal, bagian itu memakai nilai terakhir yang sukses (dari data.js lama),
bagian lain tetap diperbarui.

Sumber: CoinGecko (kripto), Yahoo Finance chart API (indeks, komoditas, valas,
saham, riwayat), FRED (likuiditas makro), alternative.me tidak diperlukan di sini.
Jalankan:  python3 update_data.py
"""
import json, os, re, sys, time, datetime as dt
import urllib.request, urllib.parse, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

# ---------------------------------------------------------------- HTTP
def http(url, tries=3, timeout=25, as_json=True):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read().decode("utf-8", "replace")
            return json.loads(raw) if as_json else raw
        except Exception as e:  # noqa
            last = e
            time.sleep(1.5 * (i + 1))
    raise last

def log(*a):
    print(*a, file=sys.stderr)

# ---------------------------------------------------------------- Yahoo
_yc = {}
def yahoo(sym, rng="1y"):
    """Kembalikan dict {v: harga terakhir, c: % perubahan harian, pts: [[YYYY-MM-DD, close],...]}"""
    key = (sym, rng)
    if key in _yc:
        return _yc[key]
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=1d"
           % (urllib.parse.quote(sym, safe=""), rng))
    try:
        j = http(url)
    except Exception:
        j = http(url.replace("query1.", "query2."))
    r = j["chart"]["result"][0]
    ts = r.get("timestamp") or []
    cl = ((r.get("indicators", {}).get("quote") or [{}])[0]).get("close") or []
    meta = r.get("meta", {})
    pts = []
    for t, c in zip(ts, cl):
        if c is not None and c == c:
            pts.append([dt.datetime.utcfromtimestamp(t).strftime("%Y-%m-%d"), float(c)])
    px = meta.get("regularMarketPrice")
    pt = meta.get("regularMarketTime")
    if px and pt and pts:
        day = dt.datetime.utcfromtimestamp(pt).strftime("%Y-%m-%d")
        if pts[-1][0] == day:
            pts[-1][1] = float(px)
        elif day > pts[-1][0]:
            pts.append([day, float(px)])
    if len(pts) < 2:
        raise ValueError("data kosong untuk " + sym)
    last = pts[-1][1]
    prev = pts[-2][1]
    out = {"v": last, "c": (last / prev - 1) * 100 if prev else 0.0, "pts": pts}
    _yc[key] = out
    time.sleep(0.25)
    return out

# ---------------------------------------------------------------- peta simbol
# nama baris di modul Pasar Global  ->  (simbol Yahoo, pengali)
GLOBAL = {
    "S&P 500": ("^GSPC", 1), "NASDAQ Composite": ("^IXIC", 1),
    "Dow Jones Industrial": ("^DJI", 1), "Russell 2000": ("^RUT", 1),
    "FTSE 100": ("^FTSE", 1), "DAX Performance Index": ("^GDAXI", 1),
    "CAC 40": ("^FCHI", 1), "Euro Stoxx 50": ("^STOXX50E", 1),
    "Nikkei 225": ("^N225", 1), "TOPIX Index": ("^TOPX", 1),
    "Hang Seng Index": ("^HSI", 1), "Shanghai Composite": ("000001.SS", 1),
    "CSI 300": ("000300.SS", 1), "Nifty 50": ("^NSEI", 1),
    "KOSPI": ("^KS11", 1), "ASX 200": ("^AXJO", 1), "IHSG": ("^JKSE", 1),
    "Straits Times Index": ("^STI", 1),
    "Spot Gold (XAU)": ("GC=F", 1), "Spot Silver (XAG)": ("SI=F", 1),
    "Crude Oil WTI": ("CL=F", 1), "Brent Crude Oil": ("BZ=F", 1),
    "Natural Gas": ("NG=F", 1),
    "Copper Futures": ("HG=F", 2204.62),   # HG=F USD/lb  -> USD/ton (tampilan di aplikasi per ton)
    "US Dollar Index (DXY)": ("DX-Y.NYB", 1),
    "Bloomberg Commodity Index": ("^BCOM", 1),
}
FX = {"USD/IDR": "IDR=X", "EUR/USD": "EURUSD=X", "USD/JPY": "JPY=X",
      "GBP/USD": "GBPUSD=X", "USD/SGD": "SGD=X", "AUD/USD": "AUDUSD=X"}
# simbol riwayat harian (cadangan grafik bila Yahoo diblokir di browser)
HIST = ["^N225", "^FTSE", "^STOXX50E", "000001.SS", "^GSPC", "^NSEI", "^HSI", "^KS11",
        "^TWII", "^STI", "^JKSE", "^GDAXI", "^FCHI", "^AXJO", "^BVSP", "^GSPTSE", "^MXX",
        "^SSMI", "^IBEX", "FTSEMIB.MI", "^AEX", "^SET.BK", "^KLSE", "^NZ50", "XU100.IS",
        "^TASI.SR", "SPY", "^VIX", "DX-Y.NYB", "CL=F", "GC=F", "BTC-USD"]

def stock_symbols():
    """Ambil daftar simbol saham langsung dari Web3.html agar selalu sinkron."""
    p = os.path.join(HERE, "Web3.html")
    try:
        s = open(p, encoding="utf-8").read()
        i = s.index("const allStockDirectory = [")
        j = s.index("];", i)
        syms = re.findall(r"symbol:\s*'([^']+)'", s[i:j])
        if syms:
            return syms
    except Exception as e:  # noqa
        log("! tidak bisa membaca Web3.html:", e)
    return ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD", "NFLX", "INTC"]

# ---------------------------------------------------------------- bagian-bagian
def sec_crypto():
    url = ("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc"
           "&per_page=250&page=1&sparkline=false&price_change_percentage=24h")
    rows = http(url)
    crypto = {}
    for r in rows:  # urutan market cap menurun: simbol pertama menang (hindari token tiruan)
        k = (r.get("symbol") or "").lower()
        if not k or k in crypto or r.get("current_price") is None:
            continue
        crypto[k] = {"p": r["current_price"],
                     "c": round(r.get("price_change_percentage_24h") or 0, 2),
                     "v": r.get("total_volume") or 0}
    # alias nama lama -> token pengganti (selalu timpa: "matic"/"rndr" lama bisa tersisa di CoinGecko)
    if "pol" in crypto:
        crypto["matic"] = crypto["pol"]
    if "render" in crypto:
        crypto["rndr"] = crypto["render"]
    if "btc" not in crypto:
        raise ValueError("BTC tidak ada di respons CoinGecko")
    caps = {(r.get("symbol") or "").lower(): r.get("market_cap") or 0 for r in rows}
    return crypto, caps

def sec_crypto_global(caps):
    g = http("https://api.coingecko.com/api/v3/global")["data"]
    p = g.get("market_cap_percentage", {})
    return {"mcap": g["total_market_cap"]["usd"] / 1e12,
            "vol": g["total_volume"]["usd"] / 1e9,
            "btc": p.get("btc"), "eth": p.get("eth"),
            "stb": (p.get("usdt") or 0) + (p.get("usdc") or 0)}, p.get("btc")

def sec_global(btc_dom):
    out = {}
    for name, (sym, mul) in GLOBAL.items():
        try:
            y = yahoo(sym, "5d")
            out[name] = {"v": y["v"] * mul, "c": round(y["c"], 2)}
        except Exception as e:  # noqa
            log("  - global gagal:", name, sym, e)
    if btc_dom:
        out["Bitcoin Dominance Index"] = {"v": round(btc_dom, 2)}
    return out

def sec_fx():
    out = {}
    for name, sym in FX.items():
        try:
            y = yahoo(sym, "5d")
            out[name] = {"v": y["v"], "c": round(y["c"], 2)}
        except Exception as e:  # noqa
            log("  - fx gagal:", name, e)
    return out

def sec_stocks():
    out = {}
    for s in stock_symbols():
        try:
            y = yahoo(s.replace(".", "-"), "5d")
            out[s] = {"v": y["v"], "c": round(y["c"], 2)}
        except Exception as e:  # noqa
            log("  - saham gagal:", s, e)
    return out

def sec_hist():
    out = {}
    for sym in HIST:
        try:
            y = yahoo(sym, "1y")
            out[sym] = [[d, round(c, 4)] for d, c in y["pts"]][-260:]
        except Exception as e:  # noqa
            log("  - riwayat gagal:", sym, e)
    return out

def fred(series_id, days=420):
    cosd = (dt.date.today() - dt.timedelta(days=days)).isoformat()
    t = http("https://fred.stlouisfed.org/graph/fredgraph.csv?id=%s&cosd=%s" % (series_id, cosd),
             as_json=False, timeout=40)
    out = []
    for line in t.strip().splitlines()[1:]:
        p = line.split(",")
        try:
            out.append([p[0], float(p[1])])
        except Exception:  # noqa
            pass
    if not out:
        raise ValueError("FRED kosong: " + series_id)
    return out

def sec_liq(crypto_caps, global_):
    S = {k: fred(k) for k in ["WALCL", "RRPONTSYD", "WTREGEN", "M2SL", "DGS10", "ECBASSETSW", "JPNASSETS"]}
    last = lambda k: S[k][-1]
    eurusd = (yahoo("EURUSD=X", "5d")["v"])
    usdjpy = (yahoo("USDJPY=X", "5d")["v"])
    liq = {
        "fed": {"v": last("WALCL")[1] / 1e6,      "d": last("WALCL")[0]},
        "rrp": {"v": last("RRPONTSYD")[1] / 1e3,  "d": last("RRPONTSYD")[0]},
        "tga": {"v": last("WTREGEN")[1] / 1e6,    "d": last("WTREGEN")[0]},
        "m2":  {"v": last("M2SL")[1] / 1e3,       "d": last("M2SL")[0]},
        "ust": {"v": last("DGS10")[1],            "d": last("DGS10")[0]},
        "ecb": {"v": last("ECBASSETSW")[1] / 1e6 * eurusd, "d": last("ECBASSETSW")[0]},
        "boj": {"v": last("JPNASSETS")[1] * 1e8 / usdjpy / 1e12, "d": last("JPNASSETS")[0]},
    }
    dxy = global_.get("US Dollar Index (DXY)")
    if dxy:
        liq["dxy"] = {"v": dxy["v"], "d": dt.date.today().isoformat()}
    if caps_ok(crypto_caps):
        liq["stb"] = {"v": (crypto_caps["usdt"] + crypto_caps["usdc"]) / 1e9, "d": dt.date.today().isoformat()}
    liq_json = {"fed": S["WALCL"], "rrp": S["RRPONTSYD"], "tga": S["WTREGEN"]}
    return liq, liq_json

def caps_ok(c):
    return bool(c) and c.get("usdt", 0) > 0 and c.get("usdc", 0) > 0

# ---------------------------------------------------------------- data lama
def load_previous():
    p = os.path.join(HERE, "data.js")
    try:
        s = open(p, encoding="utf-8").read()
        m = re.search(r"window\.__DAILY\s*=\s*(\{.*\})\s*;?\s*$", s, re.S)
        return json.loads(m.group(1)) if m else {}
    except Exception:  # noqa
        return {}

def main():
    prev = load_previous()
    D = {}
    status = {}
    caps = {}
    def run(key, fn, *a):
        try:
            v = fn(*a)
            status[key] = "ok"
            return v
        except Exception as e:  # noqa
            status[key] = "gagal: %s" % e
            log("! %s gagal: %s" % (key, e))
            return None

    cr = run("crypto", sec_crypto)
    if cr:
        D["crypto"], caps = cr
    btc_dom = None
    cg = run("cryptoGlobal", sec_crypto_global, caps)
    if cg:
        D["cryptoGlobal"], btc_dom = cg
    g = run("global", sec_global, btc_dom)
    if g:
        D["global"] = g
    fx = run("fx", sec_fx)
    if fx:
        D["fx"] = fx
    st = run("stocks", sec_stocks)
    if st:
        D["stocks"] = st
    h = run("hist", sec_hist)
    if h:
        D["hist"] = h
    lq = run("liq", sec_liq, caps, D.get("global", prev.get("global", {})))
    if lq:
        D["liq"], liq_json = lq
        with open(os.path.join(HERE, "liquidity.json"), "w", encoding="utf-8") as f:
            json.dump(liq_json, f, separators=(",", ":"))

    # bagian yang gagal -> pakai nilai terakhir yang sukses; bagian yang sebagian -> gabung per kunci
    for k, v in prev.items():
        if k in ("generated", "status"):
            continue
        if k not in D or not D[k]:
            D[k] = v
        elif isinstance(v, dict) and isinstance(D[k], dict) and k != "cryptoGlobal":
            for kk, vv in v.items():
                D[k].setdefault(kk, vv)

    D["generated"] = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    D["status"] = status
    ok = sum(1 for v in status.values() if v == "ok")
    if ok == 0:
        log("Semua sumber gagal - data.js tidak ditimpa.")
        sys.exit(1)
    with open(os.path.join(HERE, "data.js"), "w", encoding="utf-8") as f:
        f.write("/* dibuat otomatis oleh update_data.py - jangan diedit */\nwindow.__DAILY=")
        json.dump(D, f, separators=(",", ":"), ensure_ascii=False)
        f.write(";\n")
    log("Selesai:", json.dumps(status, ensure_ascii=False))

if __name__ == "__main__":
    main()
