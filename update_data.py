#!/usr/bin/env python3
"""
update_data.py  -  membuat data.js (window.__DAILY) untuk index.html Berita Angin.

Sumber (semua gratis, tanpa API key):
  - Yahoo Finance  : indeks saham, komoditas, DXY, valas, saham AS, riwayat harga
  - CoinGecko      : harga kripto, dominasi BTC, kapitalisasi pasar, stablecoin
  - FRED (CSV)     : Neraca Fed (WALCL), TGA (WTREGEN), RRP (RRPONTSYD), UST 10Y (DGS10), M2 (M2SL)

Prinsip: data yang gagal diambil TIDAK menimpa data lama (nilai terakhir dipertahankan),
sehingga satu sumber yang down tidak merusak tampilan situs.

Pemakaian:  python update_data.py            -> menulis data.js di folder yang sama
            python update_data.py --out x.js -> tulis ke berkas lain
"""
import argparse, json, os, re, sys, time, datetime as dt
import urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (compatible; BeritaAnginBot/1.0)", "Accept": "application/json,text/csv,*/*"}

# ---------------------------------------------------------------- peta ke nama di index.html
# nama kunci HARUS sama persis dengan kolom pertama array R di modul Global Market.
GLOBAL = {
    "S&P 500": "^GSPC", "NASDAQ Composite": "^IXIC", "Dow Jones Industrial": "^DJI", "Russell 2000": "^RUT",
    "FTSE 100": "^FTSE", "DAX Performance Index": "^GDAXI", "CAC 40": "^FCHI", "Euro Stoxx 50": "^STOXX50E",
    "Nikkei 225": "^N225", "TOPIX Index": "^TOPX", "Hang Seng Index": "^HSI", "Shanghai Composite": "000001.SS",
    "CSI 300": "000300.SS", "Nifty 50": "^NSEI", "KOSPI": "^KS11", "ASX 200": "^AXJO", "IHSG": "^JKSE",
    "Straits Times Index": "^STI",
    "Spot Gold (XAU)": "GC=F", "Spot Silver (XAG)": "SI=F", "Crude Oil WTI": "CL=F", "Brent Crude Oil": "BZ=F",
    "Natural Gas": "NG=F", "Copper Futures": "HG=F", "US Dollar Index (DXY)": "DX-Y.NYB",
}
# tembaga di tabel memakai USD/ton (embedded $13,647); Yahoo HG=F = USD/pon -> kalikan.
SCALE = {"Copper Futures": 2204.62}
# MSCI EM & Bloomberg Commodity tidak punya simbol Yahoo yang setara -> tetap memakai nilai bawaan HTML.

FX = {"USD/IDR": "USDIDR=X", "EUR/USD": "EURUSD=X", "USD/JPY": "USDJPY=X",
      "GBP/USD": "GBPUSD=X", "USD/SGD": "USDSGD=X", "AUD/USD": "AUDUSD=X"}

# seri riwayat (D.hist[simbolYahoo] = [[epoch_detik, harga], ...]) untuk fallback grafik
HIST = ["^GSPC", "^IXIC", "^DJI", "^FTSE", "^GDAXI", "^FCHI", "^N225", "^HSI", "^JKSE", "^KS11", "^AXJO",
        "GC=F", "CL=F", "DX-Y.NYB", "NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META"]

FRED = {  # id: (seri, pengali ke satuan tampilan)
    "fed": ("WALCL", 1e-6),      # juta USD  -> triliun
    "tga": ("WTREGEN", 1e-6),    # juta USD  -> triliun
    "rrp": ("RRPONTSYD", 1e-3),  # miliar USD-> triliun
    "ust": ("DGS10", 1.0),       # persen
    "m2":  ("M2SL", 1e-3),       # miliar USD-> triliun
}

# cadangan bila index.html tidak ada di sebelah skrip
DEFAULT_STOCKS = ("AAPL ABBV ACN ADBE AMD AMZN AVGO BA BAC BLK CAT COST CRM CSCO CVX DIS GE GOOGL HON IBM INTC JNJ "
                  "JPM KO LIN LOW MCD MDT META MSFT NEE NFLX NKE NVDA PEP PFE PYPL QCOM SBUX SPGI T TMO TSLA TXN "
                  "UBER UPS V VZ WMT XOM").split()


# ---------------------------------------------------------------- util jaringan
def http(url, tries=3, timeout=20):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def jget(url, **kw):
    return json.loads(http(url, **kw))


def yahoo(sym, rng="1y"):
    """Kembalikan {'v':harga,'c':%harian,'t':epoch,'h':[[t,close],...]} atau None."""
    q = urllib.parse.quote(sym, safe="")
    last = None
    for host in ("query1", "query2"):
        try:
            j = jget(f"https://{host}.finance.yahoo.com/v8/finance/chart/{q}?range={rng}&interval=1d")
            r = j["chart"]["result"][0]
            ts, cl = r["timestamp"], r["indicators"]["quote"][0]["close"]
            pts = [[t, float(c)] for t, c in zip(ts, cl) if c is not None]
            if len(pts) < 2:
                raise ValueError("data kurang")
            v = pts[-1][1]
            prev = r.get("meta", {}).get("chartPreviousClose") if len(pts) == 1 else pts[-2][1]
            c = (v / prev - 1) * 100 if prev else 0.0
            return {"v": v, "c": c, "t": pts[-1][0], "h": pts}
        except Exception as e:  # noqa
            last = e
    print(f"  ! Yahoo gagal {sym}: {last}", file=sys.stderr)
    return None


def fred(series):
    t = http(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}"
             f"&cosd={(dt.date.today() - dt.timedelta(days=400)).isoformat()}")
    last = None
    for line in t.strip().splitlines()[1:]:
        p = line.split(",")
        try:
            last = (p[0], float(p[1]))
        except (ValueError, IndexError):
            continue
    return last  # (tanggal, nilai) terakhir yang valid


# ---------------------------------------------------------------- data lama (untuk dipertahankan)
def load_old(path):
    try:
        raw = open(path, encoding="utf-8").read()
        m = re.search(r"window\.__DAILY\s*=\s*(\{.*\})\s*;", raw, re.S)
        return json.loads(m.group(1)) if m else {}
    except Exception:
        return {}


def stock_symbols():
    p = os.path.join(HERE, "index.html")
    try:
        txt = open(p, encoding="utf-8").read()
        found = sorted(set(re.findall(r"symbol:\s*'([A-Z][A-Z.\-]{0,5})'", txt)))
        if len(found) >= 20:
            return found
    except Exception:
        pass
    return DEFAULT_STOCKS


# ---------------------------------------------------------------- pembuat data
def build(old):
    D = {k: dict(v) if isinstance(v, dict) else v for k, v in old.items()}
    for k in ("global", "crypto", "fx", "stocks", "liq", "hist"):
        D.setdefault(k, {})
    ok = fail = 0

    # --- Yahoo: semua simbol sekaligus (paralel terbatas agar tidak kena rate-limit)
    syms = set(GLOBAL.values()) | set(FX.values()) | set(stock_symbols()) | set(HIST)
    with ThreadPoolExecutor(max_workers=6) as ex:
        Y = dict(zip(sorted(syms), ex.map(yahoo, sorted(syms))))

    for name, s in GLOBAL.items():
        y = Y.get(s)
        if y:
            k = SCALE.get(name, 1.0)
            D["global"][name] = {"v": round(y["v"] * k, 4), "c": round(y["c"], 4)}; ok += 1
        else:
            fail += 1
    for name, s in FX.items():
        y = Y.get(s)
        if y:
            D["fx"][name] = {"v": round(y["v"], 6), "c": round(y["c"], 4)}; ok += 1
        else:
            fail += 1
    for s in stock_symbols():
        y = Y.get(s)
        if y:
            D["stocks"][s] = {"v": round(y["v"], 4), "c": round(y["c"], 4)}; ok += 1
        else:
            fail += 1
    for s in HIST:
        y = Y.get(s)
        if y:
            D["hist"][s] = [[int(t), round(c, 4)] for t, c in y["h"][-260:]]

    # --- CoinGecko
    stb = 0.0
    try:
        mk = jget("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc"
                  "&per_page=250&page=1&sparkline=false&price_change_percentage=24h")
        for c in mk:
            sym = (c.get("symbol") or "").lower()
            if not sym or sym in D["crypto"] and D["crypto"][sym].get("_f") == 1:
                continue
            D["crypto"][sym] = {"p": c["current_price"], "c": round(c.get("price_change_percentage_24h") or 0, 4),
                                "v": c.get("total_volume"), "m": c.get("market_cap"),
                                "r": c.get("market_cap_rank"), "_f": 1}
            if sym in ("usdt", "usdc"):
                stb += (c.get("market_cap") or 0) / 1e9
        for v in D["crypto"].values():
            v.pop("_f", None)
        ok += 1
    except Exception as e:  # noqa
        fail += 1; print("  ! CoinGecko markets gagal:", e, file=sys.stderr)
    try:
        time.sleep(2)
        g = jget("https://api.coingecko.com/api/v3/global")["data"]
        p = g["market_cap_percentage"]
        D["cryptoGlobal"] = {"mcap": g["total_market_cap"]["usd"] / 1e12, "vol": g["total_volume"]["usd"] / 1e9,
                             "btc": p.get("btc", 0), "eth": p.get("eth", 0),
                             "stb": p.get("usdt", 0) + p.get("usdc", 0)}
        name = "Bitcoin Dominance Index"
        prev = old.get("global", {}).get(name)
        v = round(p.get("btc", 0), 2)
        c = ((v / prev["v"] - 1) * 100 if prev and prev.get("v") and abs(prev["v"] - v) > 1e-9
             else (prev or {}).get("c", 0))
        D["global"][name] = {"v": v, "c": round(c, 4)}; ok += 1
    except Exception as e:  # noqa
        fail += 1; print("  ! CoinGecko global gagal:", e, file=sys.stderr)

    # --- FRED + likuiditas
    for key, (series, mul) in FRED.items():
        try:
            r = fred(series)
            if r:
                D["liq"][key] = {"v": round(r[1] * mul, 5), "d": r[0]}; ok += 1
        except Exception as e:  # noqa
            fail += 1; print(f"  ! FRED {series} gagal:", e, file=sys.stderr)
    y = Y.get("DX-Y.NYB")
    if y:
        D["liq"]["dxy"] = {"v": round(y["v"], 3), "d": dt.datetime.utcfromtimestamp(y["t"]).strftime("%Y-%m-%d")}
    if stb > 0:
        D["liq"]["stb"] = {"v": round(stb, 2), "d": dt.date.today().isoformat()}

    D["_meta"] = {"updated": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "ok": ok, "fail": fail}
    return D, ok, fail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "data.js"))
    a = ap.parse_args()
    D, ok, fail = build(load_old(a.out))
    if ok == 0:
        print("Semua sumber gagal; data.js tidak diubah.", file=sys.stderr)
        sys.exit(1)
    js = ("/* Dibuat otomatis oleh update_data.py - jangan diedit manual. */\n"
          "window.__DAILY=" + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n")
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"data.js ditulis: {ok} sumber berhasil, {fail} gagal -> {a.out}")


if __name__ == "__main__":
    main()
