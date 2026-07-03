"""מודל מחיר: כמה שווה מ"ר בכל עיר/שכונה, לפי עסקאות אמת.

זה הלב של המערכת. בלי לדעת מה "מחיר שוק", אי אפשר לדעת אם מודעה זולה.
המודל מחשב חציון ₪/מ"ר לכל שכונה (ואם אין מספיק עסקאות — לכל עיר),
ומגמת מחירים: 12 החודשים האחרונים מול 12 שקדמו להם.

בנוסף, מודל "הדוני" פשוט לכל עיר: כמה קומה וגיל הבניין מזיזים את המחיר.
דירת קומת קרקע בבניין מ-1965 לא שווה כמו קומה 5 בבניין מ-2010 — המודל
לומד את זה מהעסקאות עצמן (רגרסיה לינארית, בלי ספריות חיצוניות).
"""

from __future__ import annotations

import csv
import math
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
class Hedonic:
    """מקדמי התאמה לעיר: כמה % מוסיפה כל קומה, וכמה מוריד כל עשור של גיל."""
    floor_coef: float        # שינוי ב-log(מחיר) לכל קומה מעל הממוצע
    age_coef: float          # שינוי ב-log(מחיר) לכל שנת גיל מעל הממוצע
    mean_floor: float
    mean_age: float
    sample_size: int

    def factor(self, floor: float | None, year_built: float | None,
               current_year: int) -> float:
        """מקדם תיקון לשווי (סביב 1.0), חסום כדי שלא ישתולל על נתוני קצה."""
        adj = 0.0
        if floor is not None:
            adj += self.floor_coef * (floor - self.mean_floor)
        if year_built is not None and year_built > 1900:
            adj += self.age_coef * ((current_year - year_built) - self.mean_age)
        return max(0.85, min(1.15, math.exp(adj)))


@dataclass
class PriceModel:
    by_neighborhood: dict[tuple[str, str], Benchmark] = field(default_factory=dict)
    by_city: dict[str, Benchmark] = field(default_factory=dict)
    hedonics: dict[str, Hedonic] = field(default_factory=dict)
    current_year: int = 2026

    def lookup(self, city: str, neighborhood: str = "") -> Benchmark | None:
        """מחזיר את הבנצ'מרק הכי מדויק שיש: שכונה, ואם אין — עיר."""
        if neighborhood:
            bench = self.by_neighborhood.get((city.strip(), neighborhood.strip()))
            if bench:
                return bench
        return self.by_city.get(city.strip())

    def estimate_ppsqm(self, city: str, neighborhood: str = "",
                       floor: float | None = None,
                       year_built: float | None = None) -> tuple[float, Benchmark] | None:
        """שווי ₪/מ"ר מותאם לנכס הספציפי (קומה + גיל בניין)."""
        bench = self.lookup(city, neighborhood)
        if bench is None:
            return None
        ppsqm = bench.ppsqm_median
        hedonic = self.hedonics.get(city.strip())
        if hedonic:
            ppsqm *= hedonic.factor(floor, year_built, self.current_year)
        return ppsqm, bench


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


MIN_DEALS_FOR_HEDONIC = 30


def _fit_hedonic(rows: list[dict], hood_medians: dict[str, float],
                 current_year: int) -> Hedonic | None:
    """רגרסיה של log(מחיר ביחס לחציון השכונה) על קומה וגיל בניין.

    פותרים משוואות נורמליות 2x2 ביד — בלי numpy, מספיק לשני משתנים.
    """
    points = []
    for r in rows:
        try:
            floor = float(r.get("floor") or "")
            year = float(r.get("year_built") or "")
        except ValueError:
            continue
        if not (0 <= floor <= 40 and 1900 < year <= current_year):
            continue
        base = hood_medians.get((r.get("neighborhood") or "").strip())
        if not base:
            continue
        points.append((floor, current_year - year, math.log(r["_ppsqm"] / base)))
    if len(points) < MIN_DEALS_FOR_HEDONIC:
        return None

    n = len(points)
    mean_f = sum(p[0] for p in points) / n
    mean_a = sum(p[1] for p in points) / n
    mean_y = sum(p[2] for p in points) / n
    sff = sfa = saa = sfy = say = 0.0
    for f, a, y in points:
        df, da, dy = f - mean_f, a - mean_a, y - mean_y
        sff += df * df; saa += da * da; sfa += df * da
        sfy += df * dy; say += da * dy
    det = sff * saa - sfa * sfa
    if abs(det) < 1e-9:
        return None
    b_floor = (sfy * saa - say * sfa) / det
    b_age = (say * sff - sfy * sfa) / det
    # מקדם קומה מעל 3% לקומה או גיל מעל 1% לשנה = כנראה רעש, חוסמים
    b_floor = max(-0.03, min(0.03, b_floor))
    b_age = max(-0.01, min(0.01, b_age))
    return Hedonic(floor_coef=b_floor, age_coef=b_age,
                   mean_floor=mean_f, mean_age=mean_a, sample_size=n)


def build_model(deals: list[dict], today: date | None = None) -> PriceModel:
    today = today or date.today()
    model = PriceModel(current_year=today.year)

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
        # חציוני שכונה לצורך נרמול הרגרסיה (גם שכונות קטנות — זה רק לנרמול)
        hood_medians: dict[str, float] = {}
        for (c, hood), hood_rows in groups.items():
            if c == city and hood:
                hood_medians[hood] = statistics.median(r["_ppsqm"] for r in hood_rows)
        hedonic = _fit_hedonic(rows, hood_medians, today.year)
        if hedonic:
            model.hedonics[city] = hedonic

    return model
