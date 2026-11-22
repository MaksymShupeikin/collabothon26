"""Read regular-session bars for a single Real Market ticker and date range."""
import csv
import json
import os
import sys
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

symbol, interval, from_date, to_date = sys.argv[1:]
start, end = date.fromisoformat(from_date), date.fromisoformat(to_date)
us = not symbol.endswith(".DE")
zone = ZoneInfo("America/New_York" if us else "Europe/Berlin")
today = datetime.now(zone).date()
minute_interval = {"5m": 5, "15m": 15, "1h": 60, "4h": 240}[interval]
# Leave a calendar-day margin on Yahoo's rolling limits so a midnight request
# never straddles the cutoff in the exchange timezone.
cutoff = today - timedelta(days=59 if minute_interval < 60 else 729)


def read_archive(first, stop):
    cache = os.environ.get("REAL_MARKET_AFES_CACHE")
    if not cache or not us or first >= stop:
        return []

    import exchange_calendars

    market = exchange_calendars.get_calendar("XNYS")
    hours = {}
    for session in market.sessions_in_range(first.isoformat(), (stop - timedelta(days=1)).isoformat()):
        hours[session.date()] = (market.session_open(session), market.session_close(session))
    collected = []
    month = first.replace(day=1)
    while month < stop:
        path = Path(cache) / f"{symbol}_{month:%Y-%m}.csv"
        month = (month + timedelta(days=32)).replace(day=1)
        if not path.is_file():
            continue
        with path.open(newline="") as file:
            rows = []
            for row in csv.DictReader(file):
                stamp = datetime.fromisoformat(row["timestamp"]).replace(tzinfo=zone)
                bounds = hours.get(stamp.date())
                if bounds and bounds[0] <= stamp < bounds[1]:
                    values = tuple(float(row[key]) for key in ("open", "high", "low", "close", "volume"))
                    rows.append((stamp, values))
        rows.sort()
        steps = Counter(int((b[0] - a[0]).total_seconds()) // 60
                        for a, b in zip(rows, rows[1:]) if a[0].date() == b[0].date())
        native_interval = steps.most_common(1)[0][0] if steps else 0
        if native_interval in (5, 15, 60) and native_interval <= minute_interval:
            collected.extend((stamp, values, "AFES") for stamp, values in rows)
    return collected


def read_yahoo(first, stop):
    if first >= stop:
        return []
    import yfinance as yf

    yf.config.debug.hide_exceptions = True
    frame = yf.Ticker(symbol).history(
        start=first.isoformat(), end=stop.isoformat(),
        interval="1h" if interval == "4h" else interval,
        prepost=False, auto_adjust=False, actions=False, timeout=8,
    )
    columns = ["Open", "High", "Low", "Close", "Volume"]
    return [(stamp.to_pydatetime().astimezone(zone), values, "Yahoo Finance")
            for stamp, values in frame[columns].dropna().iterrows()]


def aggregate(rows):
    bars = {}
    open_minute = 570 if us else 540
    for stamp, (opening, high, low, close, volume), source in rows:
        elapsed = stamp.hour * 60 + stamp.minute - open_minute
        if elapsed < 0:
            continue
        midnight = stamp.replace(hour=0, minute=0, second=0, microsecond=0)
        bucket = midnight + timedelta(minutes=open_minute + elapsed // minute_interval * minute_interval)
        if bucket not in bars:
            bars[bucket] = [opening, high, low, close, int(volume), source]
        else:
            bar = bars[bucket]
            bar[1] = max(bar[1], high)
            bar[2] = min(bar[2], low)
            bar[3] = close
            bar[4] += int(volume)
    return [[int(stamp.timestamp()), stamp.date().isoformat(), *bar] for stamp, bar in sorted(bars.items())]


archive = read_archive(start, min(end, cutoff))
try:
    recent = read_yahoo(max(start, cutoff), end)
except Exception:
    if not archive:
        raise
    # Older local bars remain usable if Yahoo is temporarily unreachable.
    print(json.dumps({"bars": aggregate(archive), "partial": True}, allow_nan=False))
else:
    print(json.dumps({"bars": aggregate(archive + recent)}, allow_nan=False))
