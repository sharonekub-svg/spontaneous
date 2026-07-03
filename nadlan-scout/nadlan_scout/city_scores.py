"""דירוג ערים: איפה בכלל שווה לחפש — "עתיד העיר והכלכלה".

הציון משלב שלושה דברים:
1. אשכול חברתי-כלכלי של הלמ"ס (data/cities.csv — תמונת מצב, לרענן מהלמ"ס)
2. צמיחת אוכלוסייה שנתית (שם)
3. מומנטום מחירים — מחושב חי מנתוני העסקאות שהורדת

ההיגיון: עיר משגשגת לפליפ היא לא בהכרח היקרה ביותר — היא עיר
עם ביקוש עולה (אוכלוסייה + מחירים עולים) שעדיין לא יקרה מדי.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass

from .price_model import PriceModel


@dataclass
class CityScore:
    city: str
    socio_cluster: int          # 1-10 (למ"ס)
    pop_growth_pct: float       # צמיחת אוכלוסייה שנתית
    price_trend_pct: float | None
    ppsqm_median: float | None
    score: float
    note: str


def load_city_data(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def score_cities(cities_csv: str, model: PriceModel) -> list[CityScore]:
    scored = []
    for row in load_city_data(cities_csv):
        city = row["city"].strip()
        cluster = int(row["socio_cluster"])
        growth = float(row["pop_growth_pct"])
        bench = model.by_city.get(city)
        trend = bench.trend_pct if bench else None
        ppsqm = bench.ppsqm_median if bench else None

        # ניקוד 0-100:
        # אשכול 4-7 הוא המתוק לפליפ: זול מספיק לקנות, מבוקש מספיק למכור
        cluster_score = {4: 80, 5: 90, 6: 85, 7: 70}.get(cluster, 50 if cluster in (3, 8) else 30)
        growth_score = min(100, max(0, growth * 40))          # 2.5% צמיחה => 100
        trend_score = 50 if trend is None else min(100, max(0, 50 + trend * 5))

        score = round(cluster_score * 0.3 + growth_score * 0.35 + trend_score * 0.35, 1)
        scored.append(CityScore(
            city=city, socio_cluster=cluster, pop_growth_pct=growth,
            price_trend_pct=trend, ppsqm_median=ppsqm,
            score=score, note=row.get("note", ""),
        ))
    scored.sort(key=lambda c: c.score, reverse=True)
    return scored
