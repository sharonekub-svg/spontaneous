"""מודל מחיר: כמה שווה מ"ר בכל עיר/שכונה, לפי עסקאות אמת.

זה הלב של המערכת. בלי לדעת מה "מחיר שוק", אי אפשר לדעת אם מודעה זולה.
המודל מחשב חציון ₪/מ"ר לכל שכונה (ואם אין מספיק עסקאות — לכל עיר),
ומגמת מחירים: 12 החודשים האחרונים מול 12 שקדמו להם.
"""

from __future__ import annotations

import csv
import statistics
from dataclasses import dataclass, field
from datetime import date, timedelta

MIN_DEALS_FOR_NEIGHBORHOOD = 8   # פחות מזה — לא סומכים על שכונה, יורדים לרמת עיר
MIN_SQM, MAX_SQM = 25, 350       # מסננים רשומות זבל (חניות, מגרשים, שגיאות הקלדה)
MIN_PPSQM, MAX_PPSQM = 3_000, 120_000


@dataclass
class Benchmark:
    ppsqm_median: float          # חציון ₪ למ"ר
    deal_count: int
    trend_pct: float | None      # שינוי שנתי ב-% (None אם אין מספיק נתונים)
    level: str                   # "neighborhood" או "city"


@dataclass
class PriceModel:
    by_neighborhood: dict[tuple[str, str], Benchmark] = field(default_factory=dict)
    by_city: dict[str, Benchmark] = field(default_factory=dict)

    def lookup(self, city: str, neighborhood: str = "") -> Benchmark | None:
        """מחזיר את הבנצ'מרק הכי מדויק שיש: שכונה, ואם אין — עיר."""
        if neighborhood:
            bench = self.by_neighborhood.get((city.strip(), neighborhood.strip()))
            if bench:
                return bench
        return self.by_city.get(city.strip())


def load_deals(path: str) -> list[dict]:
    """טוען CSV של עסקאות ומסנן רשומות לא סבירות."""
    deals = []
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                sqm = float(row["sqm"])
                price = float(row["price"])
            except (ValueError, KeyError):
                continue
            if not (MIN_SQM <= sqm <= MAX_SQM):
                continue
            ppsqm = price / sqm
            if not (MIN_PPSQM <= ppsqm <= MAX_PPSQM):
                continue
            row["_sqm"] = sqm
            row["_price"] = price
            row["_ppsqm"] = ppsqm
            deals.append(row)
    return deals


def _trend(deals: list[dict], today: date) -> float | None:
    """מגמה: חציון ₪/מ"ר ב-12 החודשים האחרונים מול 12 שלפניהם."""
    recent, previous = [], []
    for deal in deals:
        try:
            deal_date = date.fromisoformat(deal["date"])
        except ValueError:
            continue
        age = today - deal_date
        if age <= timedelta(days=365):
            recent.append(deal["_ppsqm"])
        elif age <= timedelta(days=730):
            previous.append(deal["_ppsqm"])
    if len(recent) < 5 or len(previous) < 5:
        return None
    old, new = statistics.median(previous), statistics.median(recent)
    return round((new - old) / old * 100, 1)


def build_model(deals: list[dict], today: date | None = None) -> PriceModel:
    today = today or date.today()
    model = PriceModel()

    groups: dict[tuple[str, str], list[dict]] = {}
    city_groups: dict[str, list[dict]] = {}
    for deal in deals:
        city = deal["city"].strip()
        hood = (deal.get("neighborhood") or "").strip()
        groups.setdefault((city, hood), []).append(deal)
        city_groups.setdefault(city, []).append(deal)

    for (city, hood), rows in groups.items():
        if hood and len(rows) >= MIN_DEALS_FOR_NEIGHBORHOOD:
            model.by_neighborhood[(city, hood)] = Benchmark(
                ppsqm_median=round(statistics.median(r["_ppsqm"] for r in rows)),
                deal_count=len(rows),
                trend_pct=_trend(rows, today),
                level="neighborhood",
            )

    for city, rows in city_groups.items():
        model.by_city[city] = Benchmark(
            ppsqm_median=round(statistics.median(r["_ppsqm"] for r in rows)),
            deal_count=len(rows),
            trend_pct=_trend(rows, today),
            level="city",
        )

    return model
