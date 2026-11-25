#!/usr/bin/env python3
"""
update_market.py - Berita Angin
Mengambil data pasar dari sumber publik (server-side, tanpa CORS/proxy publik) lalu menulis 3 file:

  market.json       {t, items{simbol:{px,prev,h[]}}}  -> Global Market, FX, IHSG
  market-data.json  {updated, symbols{}, directory{}} -> kartu Overview Market + direktori saham
  daily.json        objek window.__DAILY               -> kripto, FX, indeks, likuiditas, histori

Hanya memakai pustaka standar Python. Dijalankan GitHub Actions (lihat update-market.yml).
Prinsip: data lama TIDAK pernah ditimpa dengan kosong. Jika satu sumber gagal,
nilai terakhir yang baik dipertahankan.

Pemakaian:  python update_market.py <folder-output> [folder-data-lama]
"""
import csv
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

OUT = sys.argv[1] if len(sys.argv) > 1 else "data-out"
OLD = sys.argv[2] if len(sys.argv) > 2 else OUT
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0 Safari/537.36")

# ---------------------------------------------------------------- konfigurasi
GLOBAL_ROWS = {  # nama baris di halaman Global Market -> simbol Yahoo
    "S&P 500": "^GSPC", "NASDAQ Composite": "^IXIC", "Dow Jones Industrial": "^DJI",
    "Russell 2000": "^RUT", "FTSE 100": "^FTSE", "DAX Performance Index": "^GDAXI",
    "CAC 40": "^FCHI", "Euro Stoxx 50": "^STOXX50E", "Nikkei 225": "^N225",
    "TOPIX Index": "1306.T", "Hang Seng Index": "^HSI", "Shanghai Composite": "000001.SS",
    "CSI 300": "000300.SS", "Nifty 50": "^NSEI", "KOSPI": "^KS11", "ASX 200": "^AXJO",
    "IHSG": "^JKSE", "Straits Times Index": "^STI", "MSCI Emerging Markets": "EEM",
    "Spot Gold (XAU)": "GC=F", "Spot Silver (XAG)": "SI=F", "Crude Oil WTI": "CL=F",
    "Brent Crude Oil": "BZ=F", "Natural Gas": "NG=F", "Copper Futures": "HG=F",
    "US Dollar Index (DXY)": "DX-Y.NYB",
}
FX_ROWS = {"USD/IDR": "IDR=X", "EUR/USD": "EURUSD=X", "USD/JPY": "JPY=X",
           "GBP/USD": "GBPUSD=X", "USD/SGD": "SGD=X", "AUD/USD": "AUDUSD=X"}
CARDS = ["NVDA", "AAPL", "TSLA", "MSFT"]
# (kunci timeframe halaman, range Yahoo, interval Yahoo)
TIMEFRAMES = [("1d", "1d", "5m"), ("5d", "5d", "30m"), ("1mo", "1mo", "1d"),
              ("3mo", "3mo", "1d"), ("1y", "1y", "1wk")]
DIRECTORY = ("NVDA AAPL MSFT AMZN GOOGL META SPCX TSLA AMD NFLX INTC PYPL UBER JPM V WMT DIS BAC "
             "XOM CVX KO PEP PFE JNJ ABBV TMO COST AVGO CSCO ADBE CRM QCOM TXN ACN LIN NKE MCD IBM "
             "SBUX GE CAT BA HON UPS T VZ NEE LOW BLK SPGI MDT").split()
HIST_SYMBOLS = ["NVDA", "MSFT", "^GSPC", "^IXIC", "^DJI", "^N225", "^FTSE", "^STOXX50E",
                "000001.SS", "^NSEI", "^HSI", "^KS11", "^TWII", "^STI", "^JKSE", "^GDAXI",
                "^FCHI", "^AXJO", "^BVSP", "^GSPTSE", "^MXX", "^SSMI", "^IBEX", "FTSEMIB.MI",
                "^AEX", "^SET.BK", "^KLSE", "^NZ50", "XU100.IS", "^TASI.SR", "^MERV", "^IPSA",
                "^ATX", "^BFX", "PSI20.LS", "^ISEQ", "^OMXC25", "^OMXS30", "^OMXH25", "^OSEAX",
                "WIG20.WA", "^BUX.BD", "GD.AT", "IMOEX.ME", "^TA125.TA", "^CASE30", "^J203.JO",
                "PSEI.PS"]
# id baris likuiditas di halaman -> (seri FRED, pembagi ke satuan halaman, batas wajar)
FRED = {
    "fed": ("WALCL", 1e6, (2, 15)),        # juta USD -> triliun
    "rrp": ("RRPONTSYD", 1e3, (0, 3)),     # miliar USD -> triliun
    "tga": ("WTREGEN", 1e6, (0, 3)),       # juta USD -> triliun
    "m2": ("M2SL", 1e3, (10, 50)),         # miliar USD -> triliun
    "ust": ("DGS10", 1.0, (0, 15)),        # persen
}


# ------------------------------------------------------------------- utilitas
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def http(url, retries=3, timeout=25, headers=None):
    last = None
    for i in range(retries):
        try:
            h = {"User-Agent": UA, "Accept": "application/json,text/csv,*/*"}
            h.update(headers or {})
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout) as r:
                return r.read().decode("utf-8", "replace"), r
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 404:
                break
            time.sleep(1.5 * (i + 1))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def rnd(x, n=4):
    return round(float(x), n)


def load_old(name):
    try:
        with open(os.path.join(OLD, name), encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {}


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


# --------------------------------------------------------------------- Yahoo
def yahoo_chart(sym, rng, iv):
    q = "/v8/finance/chart/%s?range=%s&interval=%s&includePrePost=false" % (
        urllib.parse.quote(sym, safe=""), rng, iv)
    err = None
    for host in ("query1", "query2"):
        try:
            body, _ = http("https://%s.finance.yahoo.com%s" % (host, q), retries=2)
            r = json.loads(body)["chart"]["result"][0]
            if r.get("timestamp"):
                return r
        except Exception as e:  # noqa: BLE001
            err = e
    raise err or RuntimeError("kosong " + sym)


def bars(r):
    q = r["indicators"]["quote"][0]
    out = []
    for i, t in enumerate(r.get("timestamp") or []):
        try:
            o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        except Exception:  # noqa: BLE001
            continue
        if None in (o, h, l, c):
            continue
        out.append({"t": t * 1000, "o": rnd(o), "h": rnd(h), "l": rnd(l), "c": rnd(c),
                    "v": (q.get("volume") or [0] * (i + 1))[i] or 0})
    return out


def closes(r):
    """(daftar close valid, indeks terakhir yang valid di array mentah)"""
    cl = (r["indicators"]["quote"][0].get("close")) or []
    a = [(i, c) for i, c in enumerate(cl) if c is not None]
    return [c for _, c in a], (a[-1][0] if a else -1)


def prev_close(r, a, last_i):
    """Port __baPrev di index.html: tutup sebelumnya yang benar."""
    meta = r.get("meta") or {}
    ts = r.get("timestamp") or []
    if len(a) < 2:
        return a[-1] if a else None
    rmt = meta.get("regularMarketTime")
    if last_i >= 0 and rmt and last_i < len(ts):
        off = meta.get("gmtoffset", 0)
        same = (ts[last_i] + off) // 86400 == (rmt + off) // 86400
        return a[-2] if same else a[-1]
    return a[-1] if abs(a[-1] / (meta.get("regularMarketPrice") or a[-1]) - 1) > 1e-3 else a[-2]


def quote_from_chart(sym):
    r = yahoo_chart(sym, "1mo", "1d")
    a, li = closes(r)
    meta = r.get("meta") or {}
    px = meta.get("regularMarketPrice") or (a[-1] if a else None)
    pv = prev_close(r, a, li)
    if not px or not pv:
        raise RuntimeError("tanpa harga " + sym)
    return {"px": rnd(px, 6), "prev": rnd(pv, 6), "h": [rnd(x, 6) for x in a[-40:]],
            "hi52": meta.get("fiftyTwoWeekHigh"), "lo52": meta.get("fiftyTwoWeekLow"),
            "ts": (meta.get("regularMarketTime") or 0) * 1000}


def pool_map(fn, items, workers=6):
    res = {}

    def run(x):
        try:
            return x, fn(x)
        except Exception as e:  # noqa: BLE001
            log("  gagal", x, "-", type(e).__name__, str(e)[:80])
            return x, None
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for k, v in ex.map(run, items):
            if v is not None:
                res[k] = v
    return res


def yahoo_v7(symbols):
    """Market cap, EPS, P/E, dividen lewat crumb Yahoo. Opsional: gagal -> {}."""
    try:
        _, resp = http("https://fc.yahoo.com", retries=1, timeout=15)
    except urllib.error.HTTPError as e:  # fc.yahoo.com biasanya 404 tapi tetap memberi cookie
        resp = e
    except Exception:  # noqa: BLE001
        return {}
    try:
        cookies = resp.headers.get_all("Set-Cookie") or []
        ck = "; ".join(c.split(";")[0] for c in cookies)
        crumb, _ = http("https://query1.finance.yahoo.com/v1/test/getcrumb", retries=2,
                        headers={"Cookie": ck})
        if not crumb or "<" in crumb or len(crumb) > 40:
            return {}
        url = ("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s&crumb=%s"
               % (urllib.parse.quote(",".join(symbols)), urllib.parse.quote(crumb)))
        body, _ = http(url, retries=2, headers={"Cookie": ck})
        return {x["symbol"]: x for x in json.loads(body)["quoteResponse"]["result"]}
    except Exception as e:  # noqa: BLE001
        log("  v7 quote dilewati:", e)
        return {}


# ------------------------------------------------------------- bagian data
def build_market_items(old):
    syms = sorted(set(GLOBAL_ROWS.values()) | set(FX_ROWS.values()))
    got = pool_map(quote_from_chart, syms, workers=6)
    items = dict((old.get("items") or {}))
    fresh = 0
    for s, q in got.items():
        items[s] = {"px": q["px"], "prev": q["prev"], "h": q["h"]}
        fresh += 1
    log("market.json: %d/%d simbol baru" % (fresh, len(syms)))
    return items, got


def build_cards(old):
    syms = dict((old.get("symbols") or {}))

    def one(sym):
        tfs = {}
        quote = None
        for key, rng, iv in TIMEFRAMES:
            try:
                r = yahoo_chart(sym, rng, iv)
            except Exception as e:  # noqa: BLE001
                log("  kartu", sym, key, "gagal:", e)
                continue
            b = bars(r)
            if len(b) >= 5:
                tfs[key] = b[-120:]
            if key == "1mo" and b:
                meta = r.get("meta") or {}
                a, li = closes(r)
                n = len(b)
                last = b[-1]
                pv = prev_close(r, a, li)
                quote = {"price": rnd(meta.get("regularMarketPrice") or last["c"], 4),
                         "prev": rnd(pv or (b[-2]["c"] if n > 1 else last["c"]), 4),
                         "hi": meta.get("regularMarketDayHigh") or last["h"],
                         "lo": meta.get("regularMarketDayLow") or last["l"],
                         "vol": meta.get("regularMarketVolume") or last["v"],
                         "open": last["o"],
                         "ts": (meta.get("regularMarketTime") or 0) * 1000}
            time.sleep(0.2)
        if not quote:
            raise RuntimeError("tanpa kuotasi")
        return {"quote": quote, "charts": tfs}

    got = pool_map(one, CARDS, workers=4)
    for s, v in got.items():
        prev = syms.get(s) or {}
        merged = dict(prev.get("charts") or {})
        merged.update(v["charts"])
        syms[s] = {"quote": v["quote"], "charts": merged}
    log("kartu: %d/%d simbol baru" % (len(got), len(CARDS)))
    return syms


def build_directory(old):
    d = dict((old.get("directory") or {}))
    got = pool_map(quote_from_chart, DIRECTORY, workers=6)
    v7 = yahoo_v7(DIRECTORY)
    for s, q in got.items():
        row = dict(d.get(s) or {})
        row["price"] = q["px"]
        row["chg"] = rnd((q["px"] / q["prev"] - 1) * 100, 2)
        if q.get("hi52"):
            row["hi"] = q["hi52"]
        if q.get("lo52"):
            row["lo"] = q["lo52"]
        x = v7.get(s) or {}
        if x.get("marketCap"):
            row["cap"] = x["marketCap"]
        elif row.get("cap") and row.get("p0"):  # skala cap mengikuti harga bila v7 tidak ada
            row["cap"] = row["cap"] * q["px"] / row["p0"]
        row["p0"] = q["px"]
        if x.get("epsTrailingTwelveMonths") is not None:
            row["eps"] = x["epsTrailingTwelveMonths"]
        if x.get("trailingPE") is not None:
            row["pe"] = x["trailingPE"]
        dy = x.get("dividendYield")
        if dy is None and x.get("trailingAnnualDividendYield") is not None:
            dy = x["trailingAnnualDividendYield"] * 100
        if dy is not None:
            row["dy"] = dy
        d[s] = row
    log("direktori: %d/%d saham baru, v7=%d" % (len(got), len(DIRECTORY), len(v7)))
    return d, got


def build_crypto(old):
    out = {"coins": dict((old.get("crypto") or {})), "global": old.get("cryptoGlobal") or {}}
    try:
        body, _ = http("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd"
                       "&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h")
        for c in json.loads(body):
            sym = (c.get("symbol") or "").lower()
            if not sym or c.get("current_price") is None:
                continue
            if sym not in out["coins"] or (c.get("market_cap_rank") or 999) < (out["coins"][sym].get("r") or 999):
                out["coins"][sym] = {"p": c["current_price"],
                                     "c": rnd(c.get("price_change_percentage_24h") or 0, 2),
                                     "v": c.get("total_volume") or 0, "m": c.get("market_cap") or 0,
                                     "r": c.get("market_cap_rank") or 0}
        if "matic" not in out["coins"] and "pol" in out["coins"]:
            out["coins"]["matic"] = out["coins"]["pol"]
    except Exception as e:  # noqa: BLE001
        log("CoinGecko markets gagal:", e)
    try:
        body, _ = http("https://api.coingecko.com/api/v3/global")
        g = json.loads(body)["data"]
        p = g.get("market_cap_percentage") or {}
        out["global"] = {"mcap": rnd(g["total_market_cap"]["usd"] / 1e12, 3),
                         "vol": rnd(g["total_volume"]["usd"] / 1e9, 2),
                         "btc": rnd(p.get("btc", 0), 2), "eth": rnd(p.get("eth", 0), 2),
                         "stb": rnd((p.get("usdt") or 0) + (p.get("usdc") or 0), 2)}
    except Exception as e:  # noqa: BLE001
        log("CoinGecko global gagal:", e)
    return out


def fred_last(series):
    body, _ = http("https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + series, retries=2)
    rows = list(csv.reader(io.StringIO(body)))[1:]
    for r in reversed(rows):
        if len(r) >= 2 and r[1] not in (".", ""):
            return r[0], float(r[1])
    raise RuntimeError("FRED kosong " + series)


def build_liquidity(old, items, crypto):
    liq = dict(old.get("liq") or {})
    for lid, (series, div, (lo, hi)) in FRED.items():
        try:
            day, val = fred_last(series)
            v = val / div
            if not (lo <= v <= hi):
                log("  liq", lid, "di luar batas wajar:", v)
                continue
            liq[lid] = {"v": rnd(v, 3), "d": day}
        except Exception as e:  # noqa: BLE001
            log("  FRED", series, "gagal:", e)
    dx = items.get("DX-Y.NYB")
    if dx:
        liq["dxy"] = {"v": rnd(dx["px"], 2), "d": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    tot = (crypto["coins"].get("usdt") or {}).get("m", 0) + (crypto["coins"].get("usdc") or {}).get("m", 0)
    if tot > 5e9:
        liq["stb"] = {"v": rnd(tot / 1e9, 1), "d": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    eur = items.get("EURUSD=X")
    try:  # Neraca ECB (juta EUR) x EUR/USD -> triliun USD
        day, val = fred_last("ECBASSETSW")
        if eur and 3 <= val * eur["px"] / 1e6 <= 12:
            liq["ecb"] = {"v": rnd(val * eur["px"] / 1e6, 3), "d": day}
    except Exception as e:  # noqa: BLE001
        log("  FRED ECBASSETSW gagal:", e)
    return liq


def build_hist(old):
    hist = dict(old.get("hist") or {})

    def one(sym):
        r = yahoo_chart(sym, "1y", "1d")
        cl = (r["indicators"]["quote"][0].get("close")) or []
        out = []
        for t, c in zip(r["timestamp"], cl):
            if c is None:
                continue
            out.append([datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d"), rnd(c, 4)])
        if len(out) < 5:
            raise RuntimeError("histori pendek")
        return out
    got = pool_map(one, HIST_SYMBOLS, workers=6)
    hist.update(got)
    log("histori: %d/%d simbol baru" % (len(got), len(HIST_SYMBOLS)))
    return hist


# ----------------------------------------------------------------------- main
def main():
    started = time.time()
    now = datetime.now(timezone.utc)
    old_mk = load_old("market.json")
    old_md = load_old("market-data.json")
    old_dy = load_old("daily.json")

    items, got_items = build_market_items(old_mk)
    cards = build_cards(old_md)
    directory, got_dir = build_directory(old_md)
    crypto = build_crypto(old_dy)
    liq = build_liquidity(old_dy, items, crypto)
    hist = build_hist(old_dy)

    # sanity: jangan menulis apa pun kalau sumber utama (Yahoo) sama sekali tidak terjangkau
    if not got_items and not got_dir and not cards:
        log("FATAL: Yahoo tidak terjangkau, data lama dipertahankan")
        sys.exit(1)

    iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    # market.json (format lama yang sudah dibaca index.html)
    save("market.json", {"t": int(now.timestamp()), "updated": iso, "items": items})

    # market-data.json (kartu + direktori)
    dir_out = directory
    save("market-data.json", {"updated": iso, "symbols": cards, "directory": dir_out})

    # daily.json (= window.__DAILY)
    gl = {}
    for name, sym in GLOBAL_ROWS.items():
        it = items.get(sym)
        if not it or not it.get("prev"):
            continue
        mul = 2204.62 if sym == "HG=F" else 1
        gl[name] = {"v": rnd(it["px"] * mul, 4), "c": rnd((it["px"] / it["prev"] - 1) * 100, 2)}
    g = crypto["global"]
    if g.get("btc"):
        gl["Bitcoin Dominance Index"] = {"v": g["btc"]}
    fx = {}
    for name, sym in FX_ROWS.items():
        it = items.get(sym)
        if it and it.get("prev"):
            fx[name] = {"v": it["px"], "c": rnd((it["px"] / it["prev"] - 1) * 100, 2)}
    stocks = {s: {"v": r["price"], "c": r["chg"]} for s, r in dir_out.items() if r.get("price")}
    daily = {"updated": iso, "global": gl, "crypto": crypto["coins"], "fx": fx, "stocks": stocks,
             "liq": liq, "hist": hist, "cryptoGlobal": g}
    save("daily.json", daily)
    log("selesai dalam %.1f detik -> %s" % (time.time() - started, iso))


if __name__ == "__main__":
    main()
