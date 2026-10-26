#!/usr/bin/env python3
"""update_articles.py - membuat articles.json (artikel Beranda harian dari berita pasar + foto).

Dijalankan sekali per hari (GitHub Actions / cron). Hanya memakai pustaka bawaan Python.
Hasil: articles.json di folder yang sama dengan index.html. Skema tiap artikel:
  {t, c, lead, pts:[[judul,teks] x3], opp, risk, body:[paragraf], img, url, src}
index.html (blok "da-daily-js") membaca file ini otomatis dan menampilkannya di Beranda.

Menambah sumber: tambahkan baris ke FEEDS = (nama, url_rss, kategori_default).
Kategori yang dikenali Beranda: Crypto Market, Stock Exchange, Global Market, Ekonomi Makro, Web3 & DeFi.
"""
import json
import re
import sys
import html
import datetime as dt
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

OUT = "articles.json"
MAX_ARTICLES = 8
MAX_AGE_HOURS = 48
UA = {"User-Agent": "Mozilla/5.0 (compatible; BeritaAnginBot/1.0)"}

FEEDS = [
    ("Yahoo Finance", "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US", "Stock Exchange"),
    ("CNBC Finance", "https://www.cnbc.com/id/10000664/device/rss/rss.html", "Stock Exchange"),
    ("CNBC Economy", "https://www.cnbc.com/id/20910258/device/rss/rss.html", "Ekonomi Makro"),
    ("CNBC Top News", "https://www.cnbc.com/id/100003114/device/rss/rss.html", "Global Market"),
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/", "Crypto Market"),
    ("Cointelegraph", "https://cointelegraph.com/rss", "Crypto Market"),
]

# kata kunci -> (label tema, kategori Beranda)
THEMES = [
    (r"\b(fed|federal reserve|powell|fomc|rate cuts?|rate hikes?|interest rates?|treasury yields?)\b", "Fed & Suku Bunga", "Ekonomi Makro"),
    (r"\b(cpi|pce|ppi|inflation|gdp|jobs report|nonfarm|payrolls?|unemployment|retail sales|recession)\b", "Data Ekonomi AS", "Ekonomi Makro"),
    (r"\b(tariffs?|trade (war|deal|talks)|sanctions?|shutdown|export controls?)\b", "Kebijakan & Tarif", "Ekonomi Makro"),
    (r"\b(oil|crude|opec|natural gas|gold|copper)\b", "Energi & Komoditas", "Global Market"),
    (r"\b(bitcoin|btc|crypto|ethereum|ether|solana|xrp|stablecoin|etf)\b", "Kripto", "Crypto Market"),
    (r"\b(defi|web3|layer[- ]?2|airdrop|smart contract|nft)\b", "Web3 & DeFi", "Web3 & DeFi"),
    (r"\b(earnings|quarterly results|guidance|eps)\b", "Laporan Keuangan", "Stock Exchange"),
    (r"\b(ai|nvidia|chips?|semiconductors?|apple|microsoft|alphabet|google|meta|amazon|tesla)\b", "Teknologi & AI", "Stock Exchange"),
    (r"\b(stocks?|wall street|s&p 500|nasdaq|dow|rally|sell-?off|futures)\b", "Pasar Saham AS", "Stock Exchange"),
]
BULL = re.compile(r"\b(rall(y|ies)|surges?|jumps?|gains?|climbs?|soars?|rises?|record high|upgrades?|beats?|rebounds?)\b", re.I)
BEAR = re.compile(r"\b(falls?|drops?|slumps?|plunges?|tumbles?|sinks?|slides?|losses|sell-?off|downgrades?|misses?|fears?|warns?)\b", re.I)

NS = {
    "media": "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
}


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def first_img_in_html(s):
    m = re.search(r"<img[^>]+src=[\"']([^\"']+)[\"']", s or "", re.I)
    return m.group(1) if m else ""


def item_image(it):
    """foto berita: media:content/thumbnail, enclosure, <img> di deskripsi/content."""
    for tag in ("media:content", "media:thumbnail"):
        for el in it.findall(tag, NS):
            u = el.get("url", "")
            t = el.get("type", "") or ""
            if u.startswith("http") and (not t or "image" in t or re.search(r"\.(jpe?g|png|webp)(\?|$)", u, re.I)):
                return u
    for el in it.findall("enclosure"):
        u, t = el.get("url", ""), el.get("type", "") or ""
        if u.startswith("http") and ("image" in t or re.search(r"\.(jpe?g|png|webp)(\?|$)", u, re.I)):
            return u
    raw = (it.findtext("content:encoded", default="", namespaces=NS) or "") + (it.findtext("description") or "")
    return first_img_in_html(html.unescape(raw))


def og_image(url):
    """cadangan: ambil og:image dari halaman beritanya (hanya bila RSS tidak membawa foto)."""
    try:
        page = fetch(url, timeout=12)[:200000].decode("utf-8", "ignore")
        m = re.search(r"<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", page, re.I) or \
            re.search(r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:image[\"']", page, re.I)
        return html.unescape(m.group(1)) if m and m.group(1).startswith("http") else ""
    except Exception:
        return ""


def parse_feed(name, url, default_cat):
    try:
        root = ET.fromstring(fetch(url))
    except Exception as e:
        print(f"[lewati] {name}: {e}", file=sys.stderr)
        return []
    out = []
    for it in root.iter("item"):
        title = strip_html(it.findtext("title"))
        link = (it.findtext("link") or "").strip()
        if not title or not link.startswith("http"):
            continue
        try:
            when = parsedate_to_datetime(it.findtext("pubDate"))
            if when.tzinfo is None:
                when = when.replace(tzinfo=dt.timezone.utc)
        except Exception:
            when = dt.datetime.now(dt.timezone.utc)
        out.append({
            "title": title, "link": link, "when": when, "src": name, "cat": default_cat,
            "desc": strip_html(it.findtext("description") or it.findtext("content:encoded", namespaces=NS)),
            "img": item_image(it),
        })
    return out


def theme_of(title, default_cat):
    for pat, label, cat in THEMES:
        if re.search(pat, title, re.I):
            return label, cat
    return "Pasar & Ekonomi", default_cat


def clip(s, n):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else re.sub(r"\s+\S*$", "", s[: n - 1]) + "\u2026"


def to_article(n):
    label, cat = theme_of(n["title"], n["cat"])
    sn = (1 if BULL.search(n["title"]) else 0) - (1 if BEAR.search(n["title"]) else 0)
    lead = clip(n["desc"], 260) if len(n["desc"]) > 30 and n["desc"].lower() != n["title"].lower() \
        else f"Berita pasar terbaru bertema {label} dari {n['src']}. Buka laporan lengkap di sumber untuk detailnya."
    wib = n["when"].astimezone(dt.timezone(dt.timedelta(hours=7)))
    return {
        "t": clip(n["title"], 150),
        "c": cat,
        "lead": lead,
        "pts": [
            ["Tema", label],
            ["Sentimen judul", "Positif, judul memuat kata kenaikan." if sn > 0 else
             "Negatif, judul memuat kata penurunan." if sn < 0 else "Netral, tidak ada kata arah yang dominan."],
            ["Sumber", f"{n['src']} \u00b7 {wib.strftime('%d/%m %H:%M')} WIB"],
        ],
        "opp": "Sentimen positif dapat menopang minat beli jika didukung data dan volume." if sn > 0
        else "Berita ini membantu membaca arah sentimen sebelum mengambil keputusan.",
        "risk": "Tekanan jual bisa berlanjut bila kabar buruk lain menyusul." if sn < 0
        else "Satu berita belum tentu mengubah tren; cek data pasar pada halaman terkait.",
        "body": [lead, f"Dirangkum otomatis dari {n['src']}. Judul dan isi mengikuti sumber aslinya; baca laporan lengkap di tautan sumber."],
        "img": n["img"],
        "url": n["link"],
        "src": n["src"],
    }


def pick(items):
    """segar (<= 48 jam), unik, utamakan yang punya foto dan beragam tema/kategori."""
    now = dt.datetime.now(dt.timezone.utc)
    fresh = [i for i in items if (now - i["when"]).total_seconds() <= MAX_AGE_HOURS * 3600]
    pool = fresh if len(fresh) >= 4 else items
    seen, uniq = set(), []
    for i in sorted(pool, key=lambda x: x["when"], reverse=True):
        k = re.sub(r"\W+", "", i["title"].lower())[:60]
        if k not in seen:
            seen.add(k)
            uniq.append(i)
    for i in uniq[:40]:                      # cari foto cadangan hanya untuk kandidat teratas
        if not i["img"]:
            i["img"] = og_image(i["link"])
    uniq.sort(key=lambda x: (0 if x["img"] else 1, -x["when"].timestamp()))
    chosen, used = [], set()
    for i in uniq:                           # satu per kategori dulu, supaya Beranda beragam
        if i["cat"] not in used and i["img"]:
            used.add(i["cat"]); chosen.append(i)
    for i in uniq:
        if len(chosen) >= MAX_ARTICLES:
            break
        if i not in chosen:
            chosen.append(i)
    return chosen[:MAX_ARTICLES]


def main():
    items = []
    for name, url, cat in FEEDS:
        got = parse_feed(name, url, cat)
        print(f"{name}: {len(got)} berita")
        items += got
    if not items:
        print("Tidak ada berita yang berhasil diambil; articles.json lama dipertahankan.", file=sys.stderr)
        return 1
    arts = [to_article(i) for i in pick(items)]
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"updated": dt.datetime.now(dt.timezone.utc).isoformat(), "articles": arts}, f, ensure_ascii=False, indent=1)
    print(f"{OUT}: {len(arts)} artikel ({sum(1 for a in arts if a['img'])} berfoto)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
