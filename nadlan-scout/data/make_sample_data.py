"""מייצר נתוני דמו סינתטיים כדי שאפשר יהיה להריץ את המערכת בלי אינטרנט.

הנתונים האלה מומצאים! ברגע שיש לך גישה לאינטרנט, החלף אותם בעסקאות
אמת עם: python3 scout.py fetch --cities "חיפה,באר שבע" --out data/deals.csv
"""

import csv
import os
import random
from datetime import date, timedelta

random.seed(42)

# עיר -> (שכונות עם ₪/מ"ר בסיסי, מגמה שנתית)
MARKET = {
    "חיפה": ({"הדר": 11_000, "נווה שאנן": 14_500, "כרמל מרכזי": 21_000, "קרית חיים": 13_000}, 0.05),
    "באר שבע": ({"שכונה ד": 10_500, "רמות": 14_000, "נווה זאב": 12_000}, 0.07),
    "נתניה": ({"מרכז העיר": 17_000, "קרית השרון": 21_000, "אגמים": 22_500}, 0.06),
    "עפולה": ({"מרכז": 9_500, "עפולה הצעירה": 11_500}, 0.09),
    "קרית גת": ({"העיר העתיקה": 9_000, "כרמי גת": 13_500}, 0.10),
}

TODAY = date(2026, 7, 1)
rows = []
for city, (hoods, annual_trend) in MARKET.items():
    for hood, base_ppsqm in hoods.items():
        for _ in range(random.randint(25, 45)):
            days_ago = random.randint(0, 730)
            deal_date = TODAY - timedelta(days=days_ago)
            # ככל שהעסקה ישנה יותר, המחיר נמוך יותר לפי המגמה
            trend_factor = (1 + annual_trend) ** (-days_ago / 365)
            sqm = random.choice([55, 62, 70, 75, 82, 90, 100, 115])
            ppsqm = base_ppsqm * trend_factor * random.uniform(0.85, 1.15)
            rows.append({
                "date": deal_date.isoformat(),
                "city": city,
                "neighborhood": hood,
                "address": f"רחוב לדוגמה {random.randint(1, 99)}",
                "rooms": {55: 2.5, 62: 3, 70: 3, 75: 3.5, 82: 4, 90: 4, 100: 4.5, 115: 5}[sqm],
                "sqm": sqm,
                "floor": random.randint(0, 8),
                "year_built": random.randint(1965, 2015),
                "price": round(ppsqm * sqm, -3),
            })

out = os.path.join(os.path.dirname(__file__), "sample_deals.csv")
with open(out, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
print(f"נכתבו {len(rows)} עסקאות דמו אל {out}")
