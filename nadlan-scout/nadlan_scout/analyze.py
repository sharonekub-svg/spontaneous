"""מנתח מודעות: לוקח רשימת מודעות ומדרג אותן מהדיל הכי טוב להכי גרוע.

המודעות מגיעות מקובץ CSV שאתה ממלא (ידנית או בייצוא) עם העמודות:
city,neighborhood,address,rooms,sqm,asking_price,condition,url

condition: shabby / ok / renovated — כמה שיפוץ הנכס צריך.

לכל מודעה המנתח:
1. שולף את מחיר השוק (₪/מ"ר) מהמודל שנבנה מעסקאות אמת
2. מחשב כמה המודעה זולה/יקרה מהשוק
3. מריץ את כלכלת הפליפ המלאה (מסים, שיפוץ, מימון)
4. נותן ציון וסיווג: 🔥 דיל / 🟡 שווה בדיקה / ❌ עזוב
"""

from __future__ import annotations

import csv
from dataclasses import dataclass

from .deal_calc import FlipResult, flip
from .price_model import PriceModel

# איזה שיפוץ צריך לפי מצב הנכס במודעה (שיפוץ פליפ, לא בנייה מחדש)
RENOVATION_BY_CONDITION = {"shabby": "medium", "ok": "light", "renovated": "none"}
# החציון האזורי מערבב מוזנח ומשופץ — נכס אחרי שיפוץ נמכר קצת מעליו
POST_RENO_VALUE_FACTOR = {"shabby": 1.08, "ok": 1.06, "renovated": 1.02}


@dataclass
class ListingVerdict:
    address: str
    city: str
    neighborhood: str
    sqm: float
    asking_price: float
    market_value: float          # שווי לפי המודל (₪/מ"ר חציוני × שטח)
    discount_pct: float          # כמה מתחת לשוק (חיובי = זול מהשוק)
    benchmark_level: str         # שכונה או עיר
    benchmark_deals: int
    flip: FlipResult
    grade: str
    url: str


def load_listings(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def analyze_listings(listings_csv: str, model: PriceModel) -> list[ListingVerdict]:
    verdicts = []
    for row in load_listings(listings_csv):
        try:
            sqm = float(row["sqm"])
            asking = float(row["asking_price"])
        except (ValueError, KeyError):
            continue
        city = row["city"].strip()
        hood = (row.get("neighborhood") or "").strip()

        def _opt_float(key: str) -> float | None:
            try:
                return float(row.get(key) or "")
            except ValueError:
                return None

        estimate = model.estimate_ppsqm(city, hood,
                                        floor=_opt_float("floor"),
                                        year_built=_opt_float("year_built"))
        if estimate is None:
            continue  # אין נתוני אמת לעיר — אי אפשר לשפוט
        ppsqm, bench = estimate

        condition = (row.get("condition") or "ok").strip()
        market_value = ppsqm * sqm
        sell_estimate = market_value * POST_RENO_VALUE_FACTOR.get(condition, 1.0)
        discount = (market_value - asking) / market_value * 100

        result = flip(
            buy_price=asking, sell_price=sell_estimate, sqm=sqm,
            renovation_level=RENOVATION_BY_CONDITION.get(condition, "medium"),
        )

        if result.roi_pct >= 10 and discount >= 15:
            grade = "🔥 דיל"
        elif result.roi_pct >= 6:
            grade = "🟡 שווה בדיקה"
        else:
            grade = "❌ עזוב"

        verdicts.append(ListingVerdict(
            address=row.get("address", ""), city=city, neighborhood=hood,
            sqm=sqm, asking_price=asking, market_value=round(market_value),
            discount_pct=round(discount, 1),
            benchmark_level=bench.level, benchmark_deals=bench.deal_count,
            flip=result, grade=grade, url=row.get("url", ""),
        ))

    verdicts.sort(key=lambda v: v.flip.roi_pct, reverse=True)
    return verdicts
