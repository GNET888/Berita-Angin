#!/usr/bin/env python3
"""Ambil data pasar global dari Yahoo Finance (sisi server) -> market.json.
Dijalankan GitHub Actions tiap 5 menit. Semua browser membaca file yang sama, jadi angkanya seragam."""
import json, time, urllib.request, urllib.parse, sys

SYMS = ['^GSPC','^IXIC','^DJI','^RUT','^FTSE','^GDAXI','^FCHI','^STOXX50E','^N225','1306.T','^HSI',
        '000001.SS','000300.SS','^NSEI','^KS11','^AXJO','^JKSE','^STI','EEM','GC=F','SI=F','CL=F',
        'BZ=F','NG=F','HG=F','DX-Y.NYB','IDR=X','EURUSD=X','JPY=X','GBPUSD=X','SGD=X','AUDUSD=X']

def get(sym):
    q = '/v8/finance/chart/%s?range=1mo&interval=1d' % urllib.parse.quote(sym, safe='')
    last = None
    for host in ('query1', 'query2'):
        for _ in range(2):
            try:
                req = urllib.request.Request('https://%s.finance.yahoo.com%s' % (host, q),
                                             headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=15) as r:
                    return json.load(r)
            except Exception as e:
                last = e; time.sleep(1)
    raise last

def parse(j):
    r = j['chart']['result'][0]; m = r.get('meta', {})
    ts = r.get('timestamp') or []; cl = r['indicators']['quote'][0].get('close') or []
    pts = [(t, c) for t, c in zip(ts, cl) if c is not None]
    if len(pts) < 2: raise ValueError('data kurang')
    a = [c for _, c in pts]
    px = m.get('regularMarketPrice') or a[-1]
    off = m.get('gmtoffset', 0); rt = m.get('regularMarketTime')
    # penutupan sebelumnya ditentukan dari TANGGAL bar terakhir (bukan selisih harga)
    if rt and (pts[-1][0] + off) // 86400 == (rt + off) // 86400: prev = a[-2]
    else: prev = a[-1]
    if not (px > 0 and prev > 0): raise ValueError('harga tidak valid')
    return {'px': round(px, 4), 'prev': round(prev, 4), 'h': [round(x, 4) for x in a[-40:]], 'mt': rt}

def main():
    items = {}
    for s in SYMS:
        try: items[s] = parse(get(s))
        except Exception as e: print('gagal', s, e, file=sys.stderr)
    if len(items) < 10:
        print('terlalu sedikit data, market.json tidak diubah'); return
    with open('market.json', 'w') as f:
        json.dump({'t': int(time.time()), 'items': items}, f, separators=(',', ':'))
    print('ok', len(items), 'simbol')

if __name__ == '__main__': main()
