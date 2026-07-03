#!/usr/bin/env python3
"""nadlan-scout — מערכת איתור עסקאות נדל"ן.

פקודות:
  fetch          הורדת עסקאות אמת מ-nadlan.gov.il (דורש אינטרנט פתוח)
  cities         דירוג ערים לפי עתיד, כלכלה ומומנטום מחירים
  model          הצגת מחירי שוק (₪/מ"ר) לפי עיר ושכונה
  analyze        ניתוח קובץ מודעות ודירוג מהדיל הכי טוב להכי גרוע
  calc           מחשבון עסקה בודדת (פליפ או השכרה)
  add            הוספת מודעה חדשה לקובץ המודעות בשורת פקודה אחת
  watch          ניתוח + התראת טלגרם על כל דיל חדש (לשים ב-cron יומי)
  report         יצירת דשבורד HTML עם גרפים (data/report.html)
  refresh-cities עדכון נתוני אוכלוסייה מ-data.gov.il וחישוב צמיחה אמיתית

דוגמאות:
  python3 scout.py fetch --cities "חיפה,באר שבע" --out data/deals.csv
  python3 scout.py cities --deals data/deals.csv
  python3 scout.py analyze --deals data/deals.csv --listings data/my_listings.csv
  python3 scout.py calc --buy 900000 --sell 1250000 --sqm 75 --level medium
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nadlan_scout.analyze import analyze_listings
from nadlan_scout.city_scores import score_cities
from nadlan_scout.deal_calc import flip, rental_yield
from nadlan_scout.price_model import build_model, load_deals

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DEALS = os.path.join(HERE, "data", "sample_deals.csv")
DEFAULT_CITIES = os.path.join(HERE, "data", "cities.csv")


def _fmt(n: float) -> str:
    return f"{n:,.0f} ₪"


def cmd_fetch(args) -> None:
    from nadlan_scout.fetch_deals import fetch_to_csv
    cities = [c.strip() for c in args.cities.split(",") if c.strip()]
    count = fetch_to_csv(cities, args.out, max_pages=args.pages)
    print(f"נשמרו {count} עסקאות אל {args.out}")


def cmd_cities(args) -> None:
    model = build_model(load_deals(args.deals))
    ppsqm_header = '₪/מ"ר'
    print(f"\n{'עיר':<12} {'ציון':>5} {'אשכול':>5} {'צמיחה':>6} {'מגמת מחיר':>10} {ppsqm_header:>9}  הערה")
    print("-" * 85)
    for c in score_cities(args.cities_file, model):
        trend = f"{c.price_trend_pct:+.1f}%" if c.price_trend_pct is not None else "אין נתון"
        ppsqm = f"{c.ppsqm_median:,.0f}" if c.ppsqm_median else "-"
        print(f"{c.city:<12} {c.score:>5} {c.socio_cluster:>5} {c.pop_growth_pct:>5.1f}% "
              f"{trend:>10} {ppsqm:>9}  {c.note}")
    print("\nציון גבוה = שילוב של עיר מבוקשת-אך-לא-יקרה-מדי, אוכלוסייה גדלה ומחירים במומנטום.")


def cmd_model(args) -> None:
    model = build_model(load_deals(args.deals))
    ppsqm_header = '₪/מ"ר'
    print(f"\n{'עיר':<12} {'שכונה':<18} {ppsqm_header:>9} {'עסקאות':>7} {'מגמה':>8}")
    print("-" * 60)
    for city, bench in sorted(model.by_city.items()):
        trend = f"{bench.trend_pct:+.1f}%" if bench.trend_pct is not None else "-"
        print(f"{city:<12} {'(כל העיר)':<18} {bench.ppsqm_median:>9,.0f} {bench.deal_count:>7} {trend:>8}")
        hoods = [(k[1], b) for k, b in model.by_neighborhood.items() if k[0] == city]
        for hood, b in sorted(hoods, key=lambda x: -x[1].ppsqm_median):
            trend = f"{b.trend_pct:+.1f}%" if b.trend_pct is not None else "-"
            print(f"{'':<12} {hood:<18} {b.ppsqm_median:>9,.0f} {b.deal_count:>7} {trend:>8}")


def cmd_analyze(args) -> None:
    model = build_model(load_deals(args.deals))
    verdicts = analyze_listings(args.listings, model)
    if not verdicts:
        print("לא נמצאו מודעות ברות-ניתוח (בדוק שיש נתוני עסקאות לערים במודעות).")
        return
    print(f"\nנותחו {len(verdicts)} מודעות, מהדיל הכי טוב להכי גרוע:\n")
    for v in verdicts:
        print(f"{v.grade}  {v.address} ({v.city}" + (f", {v.neighborhood}" if v.neighborhood else "") + ")")
        print(f"    מבוקש: {_fmt(v.asking_price)} | שווי שוק: {_fmt(v.market_value)} "
              f"({v.discount_pct:+.1f}% מול השוק, לפי {v.benchmark_deals} עסקאות ברמת {v.benchmark_level})")
        f = v.flip
        print(f"    פליפ: השקעה כוללת {_fmt(f.total_invested)} → רווח נטו {_fmt(f.net_profit)} "
              f"(ROI {f.roi_pct}%)")
        for w in f.warnings:
            print(f"    ⚠️  {w}")
        if v.url:
            print(f"    {v.url}")
        print()


def cmd_calc(args) -> None:
    if args.rent:
        r = rental_yield(args.buy, args.sqm, args.rent, renovation_level=args.level)
        print(f"\nהשקעה כוללת: {_fmt(r['total_invested'])}")
        print(f"שכירות שנתית נטו (11 חודשים + תחזוקה): {_fmt(r['annual_rent_net'])}")
        print(f"תשואה: {r['yield_pct']}% — {r['verdict']}")
        return
    if not args.sell:
        print("לפליפ צריך --sell, להשכרה צריך --rent", file=sys.stderr)
        sys.exit(1)
    f = flip(args.buy, args.sell, args.sqm, renovation_level=args.level, months_hold=args.months)
    print(f"\nקנייה:            {_fmt(f.buy_price)}")
    print(f"מס רכישה (משקיע): {_fmt(f.purchase_tax)}")
    print(f"שיפוץ (+20% רזרבה): {_fmt(f.renovation)}")
    print(f"תיווך+עו\"ד בקנייה: {_fmt(f.buy_side_fees)}")
    print(f"החזקה ומימון ({args.months} חוד'): {_fmt(f.holding_costs)}")
    print(f"תיווך+עו\"ד במכירה: {_fmt(f.sell_side_fees)}")
    print(f"מס שבח (הערכה):   {_fmt(f.capital_gains_tax)}")
    print("-" * 40)
    print(f"סה\"כ השקעה:       {_fmt(f.total_invested)}")
    print(f"מכירה:            {_fmt(f.sell_price)}")
    print(f"רווח נטו:         {_fmt(f.net_profit)}  (ROI {f.roi_pct}%)")
    for w in f.warnings:
        print(f"⚠️  {w}")


LISTING_COLUMNS = ["city", "neighborhood", "address", "rooms", "sqm",
                   "asking_price", "condition", "floor", "year_built", "url"]


def cmd_add(args) -> None:
    import csv
    exists = os.path.exists(args.listings)
    with open(args.listings, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=LISTING_COLUMNS, extrasaction="ignore")
        if not exists:
            writer.writeheader()
        writer.writerow({col: getattr(args, col, "") or "" for col in LISTING_COLUMNS})
    print(f"נוספה מודעה: {args.address} ({args.city}) → {args.listings}")


def cmd_watch(args) -> None:
    from nadlan_scout.alerts import check_and_alert
    model = build_model(load_deals(args.deals))
    verdicts = analyze_listings(args.listings, model)
    sent = check_and_alert(verdicts)
    print(f"נבדקו {len(verdicts)} מודעות, נשלחו {sent} התראות חדשות.")


def cmd_report(args) -> None:
    from nadlan_scout.city_scores import score_cities
    from nadlan_scout.report import render_page
    deals = load_deals(args.deals)
    model = build_model(deals)
    verdicts = analyze_listings(args.listings, model) if args.listings else []
    scores = score_cities(args.cities_file, model)
    label = os.path.basename(args.deals)
    if "sample" in label:
        label += " (נתוני דמו — הרץ fetch לנתוני אמת)"
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(render_page(scores, deals, verdicts, label))
    print(f"הדשבורד נוצר: {args.out} — פתח אותו בדפדפן.")


def cmd_refresh_cities(args) -> None:
    from nadlan_scout.refresh_cities import refresh
    for change in refresh(args.cities_file):
        print(change)


def main() -> None:
    parser = argparse.ArgumentParser(description="nadlan-scout — איתור עסקאות נדל\"ן")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("fetch", help="הורדת עסקאות אמת מ-nadlan.gov.il")
    p.add_argument("--cities", required=True, help="ערים מופרדות בפסיק")
    p.add_argument("--out", default="data/deals.csv")
    p.add_argument("--pages", type=int, default=30, help="מקסימום עמודים לעיר")
    p.set_defaults(func=cmd_fetch)

    p = sub.add_parser("cities", help="דירוג ערים")
    p.add_argument("--deals", default=DEFAULT_DEALS)
    p.add_argument("--cities-file", default=DEFAULT_CITIES)
    p.set_defaults(func=cmd_cities)

    p = sub.add_parser("model", help="מחירי שוק לפי עיר/שכונה")
    p.add_argument("--deals", default=DEFAULT_DEALS)
    p.set_defaults(func=cmd_model)

    p = sub.add_parser("analyze", help="ניתוח ודירוג מודעות")
    p.add_argument("--deals", default=DEFAULT_DEALS)
    p.add_argument("--listings", required=True)
    p.set_defaults(func=cmd_analyze)

    p = sub.add_parser("calc", help="מחשבון עסקה בודדת")
    p.add_argument("--buy", type=float, required=True)
    p.add_argument("--sell", type=float, default=None)
    p.add_argument("--rent", type=float, default=None, help="שכ\"ד חודשי (לחישוב תשואה)")
    p.add_argument("--sqm", type=float, required=True)
    p.add_argument("--level", choices=["none", "light", "medium", "heavy"], default="medium")
    p.add_argument("--months", type=int, default=9)
    p.set_defaults(func=cmd_calc)

    p = sub.add_parser("add", help="הוספת מודעה לקובץ המודעות")
    p.add_argument("--listings", default="data/my_listings.csv")
    p.add_argument("--city", required=True)
    p.add_argument("--neighborhood", default="")
    p.add_argument("--address", required=True)
    p.add_argument("--rooms", default="")
    p.add_argument("--sqm", required=True)
    p.add_argument("--asking-price", dest="asking_price", required=True)
    p.add_argument("--condition", choices=["shabby", "ok", "renovated"], default="ok")
    p.add_argument("--floor", default="")
    p.add_argument("--year-built", dest="year_built", default="")
    p.add_argument("--url", default="")
    p.set_defaults(func=cmd_add)

    p = sub.add_parser("watch", help="ניתוח + התראות טלגרם על דילים חדשים")
    p.add_argument("--deals", default=DEFAULT_DEALS)
    p.add_argument("--listings", required=True)
    p.set_defaults(func=cmd_watch)

    p = sub.add_parser("report", help="יצירת דשבורד HTML")
    p.add_argument("--deals", default=DEFAULT_DEALS)
    p.add_argument("--listings", default=os.path.join(HERE, "data", "sample_listings.csv"))
    p.add_argument("--cities-file", default=DEFAULT_CITIES)
    p.add_argument("--out", default=os.path.join(HERE, "data", "report.html"))
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("refresh-cities", help="עדכון נתוני אוכלוסייה מהממשלה")
    p.add_argument("--cities-file", default=DEFAULT_CITIES)
    p.set_defaults(func=cmd_refresh_cities)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
