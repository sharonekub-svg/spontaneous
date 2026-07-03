"""הורדת עסקאות נדל"ן אמיתיות מהמאגר הממשלתי nadlan.gov.il.

זה מאגר עסקאות רשות המסים — כל עסקה שנסגרה באמת, עם מחיר, כתובת ושטח.
זה ה-ground truth של השוק, בניגוד למחירי מבוקש במודעות.

הערה חשובה: זה API פנימי של האתר הממשלתי, לא API רשמי מתועד.
המבנה שלו משתנה מדי פעם — אם הסקריפט מפסיק לעבוד, צריך לפתוח את
nadlan.gov.il בדפדפן עם DevTools (לשונית Network) ולעדכן את הכתובות/שדות.
"""

from __future__ import annotations

import csv
import json
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://www.nadlan.gov.il/Nadlan.REST/Main"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# עמודות הפלט האחיד שלנו — כל שאר המערכת עובדת רק מול הפורמט הזה
CSV_COLUMNS = [
    "date", "city", "neighborhood", "address",
    "rooms", "sqm", "floor", "year_built", "price",
]


def _request(url: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def get_query_descriptor(city: str) -> dict:
    """שלב 1: מבקשים מהאתר 'מזהה חיפוש' עבור עיר."""
    url = f"{BASE}/GetDataByQuery?query={urllib.parse.quote(city)}"
    return _request(url)


def fetch_city_deals(city: str, max_pages: int = 30, delay_sec: float = 1.5) -> list[dict]:
    """שלב 2: מושכים את דפי העסקאות של העיר, בקצב מנומס."""
    descriptor = get_query_descriptor(city)
    deals: list[dict] = []
    for page in range(1, max_pages + 1):
        descriptor["PageNo"] = page
        result = _request(f"{BASE}/GetAssestAndDeals", descriptor)
        rows = result.get("AllResults") or []
        if not rows:
            break
        for row in rows:
            deals.append(_normalize(row, city))
        print(f"  {city}: עמוד {page}, סה\"כ {len(deals)} עסקאות", file=sys.stderr)
        if result.get("IsLastPage"):
            break
        time.sleep(delay_sec)  # לא מפציצים שרת ממשלתי
    return deals


def _normalize(row: dict, city: str) -> dict:
    """ממפים את שדות ה-API (שמותיהם מוזרים ומשתנים) לפורמט האחיד שלנו."""
    price = str(row.get("DEALAMOUNT", "")).replace(",", "")
    return {
        "date": (row.get("DEALDATETIME") or row.get("DEALDATE") or "")[:10],
        "city": city,
        "neighborhood": row.get("NEIGHBORHOOD") or "",
        "address": row.get("FULLADRESS") or row.get("DISPLAYADRESS") or "",
        "rooms": row.get("ASSETROOMNUM") or "",
        "sqm": row.get("DEALNATURE") or "",
        "floor": row.get("FLOORNO") or "",
        "year_built": row.get("BUILDINGYEAR") or "",
        "price": price,
    }


def save_csv(deals: list[dict], path: str) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        for deal in deals:
            writer.writerow({col: deal.get(col, "") for col in CSV_COLUMNS})


def fetch_to_csv(cities: list[str], out_path: str, max_pages: int = 30) -> int:
    all_deals: list[dict] = []
    for city in cities:
        print(f"מושך עסקאות: {city} ...", file=sys.stderr)
        try:
            all_deals.extend(fetch_city_deals(city, max_pages=max_pages))
        except Exception as exc:  # noqa: BLE001 — ממשיכים לעיר הבאה, מדווחים
            print(f"  שגיאה בעיר {city}: {exc}", file=sys.stderr)
    save_csv(all_deals, out_path)
    return len(all_deals)
