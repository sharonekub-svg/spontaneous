"""רענון נתוני ערים מהדאטה הממשלתי הפתוח (data.gov.il).

מושך אוכלוסייה עדכנית לכל יישוב, שומר היסטוריה מקומית, ומחשב
צמיחת אוכלוסייה אמיתית בין שתי הרצות (במקום המספרים הידניים
ב-cities.csv). ככל שתריץ את זה יותר פעמים לאורך זמן — הדירוג משתפר.

הערה: מזהה המאגר (RESOURCE_ID) הוא של "רשימת יישובים ואוכלוסייתם".
אם data.gov.il מחליפים אותו — לחפש שם "אוכלוסייה יישובים" ולעדכן.
"""

from __future__ import annotations

import csv
import json
import os
import urllib.parse
import urllib.request
from datetime import date

CKAN_URL = "https://data.gov.il/api/3/action/datastore_search"
RESOURCE_ID = "64edd0ee-3d5d-43ce-8562-c336c24dbc1f"  # רשימת יישובים + אוכלוסייה
HISTORY_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            "data", "population_history.json")


def fetch_population() -> dict[str, int]:
    """אוכלוסייה נוכחית לכל יישוב, בעברית."""
    populations: dict[str, int] = {}
    offset = 0
    while True:
        params = urllib.parse.urlencode(
            {"resource_id": RESOURCE_ID, "limit": 1000, "offset": offset})
        with urllib.request.urlopen(f"{CKAN_URL}?{params}", timeout=30) as resp:
            result = json.loads(resp.read().decode())["result"]
        records = result.get("records", [])
        if not records:
            break
        for rec in records:
            # שמות השדות במאגר משתנים בין גרסאות — מנסים כמה אפשרויות
            name = (rec.get("שם_ישוב") or rec.get("שם ישוב") or "").strip()
            pop = rec.get("סהכ") or rec.get('סה"כ') or rec.get("אוכלוסייה")
            try:
                if name and pop:
                    populations[name] = int(float(str(pop).replace(",", "")))
            except ValueError:
                continue
        offset += len(records)
        if offset >= result.get("total", 0):
            break
    return populations


def _load_history() -> dict:
    try:
        with open(HISTORY_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def refresh(cities_csv: str) -> list[str]:
    """מעדכן pop_growth_pct בקובץ הערים לפי מדידות אמת. מחזיר סיכום שינויים."""
    populations = fetch_population()
    history = _load_history()
    today = date.today().isoformat()
    changes: list[str] = []

    with open(cities_csv, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        fieldnames = list(rows[0].keys())

    for row in rows:
        city = row["city"].strip()
        current = populations.get(city)
        if not current:
            changes.append(f"{city}: לא נמצא במאגר הממשלתי — נשאר ידני")
            continue
        past = history.get(city)  # {"date": ..., "population": ...}
        if past and past["date"] < today:
            years = max(0.2, (date.fromisoformat(today)
                              - date.fromisoformat(past["date"])).days / 365)
            growth = ((current / past["population"]) ** (1 / years) - 1) * 100
            old = row["pop_growth_pct"]
            row["pop_growth_pct"] = f"{growth:.1f}"
            changes.append(f"{city}: צמיחה נמדדה {growth:+.1f}%/שנה (היה {old})")
        else:
            changes.append(f"{city}: נשמרה מדידה ראשונה ({current:,} תושבים) — "
                           "צמיחה תחושב בהרצה הבאה")
        history[city] = {"date": today, "population": current}

    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=1)
    with open(cities_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return changes
