"""בדיקות למערכת. הרצה: python3 tests/test_scout.py (בלי pytest, בלי כלום)."""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nadlan_scout.analyze import analyze_listings
from nadlan_scout.city_scores import score_cities
from nadlan_scout.deal_calc import flip, purchase_tax_investor, rental_yield
from nadlan_scout.price_model import build_model, load_deals
from nadlan_scout.report import render_page

HERE = os.path.dirname(os.path.abspath(__file__))
DEALS = os.path.join(HERE, "..", "data", "sample_deals.csv")
LISTINGS = os.path.join(HERE, "..", "data", "sample_listings.csv")
CITIES = os.path.join(HERE, "..", "data", "cities.csv")


def test_purchase_tax():
    # מתחת למדרגה: 8% שטוח
    assert purchase_tax_investor(1_000_000) == 80_000
    # מעל המדרגה: 8% עד הסף + 10% מעליו
    tax = purchase_tax_investor(7_000_000)
    expected = 6_055_070 * 0.08 + (7_000_000 - 6_055_070) * 0.10
    assert abs(tax - expected) < 1


def test_flip_math():
    result = flip(buy_price=745_000, sell_price=1_200_000, sqm=90,
                  renovation_level="light", months_hold=9)
    assert result.purchase_tax == 59_600
    assert result.net_profit > 0
    assert result.total_invested > 745_000  # עלויות תמיד מוסיפות
    # עסקה בלי מרווח חייבת לצאת מפסידה
    bad = flip(buy_price=1_000_000, sell_price=1_050_000, sqm=80)
    assert bad.net_profit < 0
    assert any("מפסידה" in w for w in bad.warnings)


def test_rental_yield():
    r = rental_yield(700_000, 65, 3_200, renovation_level="light")
    assert 0 < r["yield_pct"] < 10
    assert r["total_invested"] > 700_000


def test_model_and_hedonics():
    model = build_model(load_deals(DEALS))
    assert len(model.by_city) >= 4
    bench = model.lookup("חיפה", "הדר")
    assert bench and bench.level == "neighborhood"
    # ההתאמה ההדונית חסומה ולא משתוללת
    for hedonic in model.hedonics.values():
        factor = hedonic.factor(floor=30, year_built=1901, current_year=2026)
        assert 0.85 <= factor <= 1.15


def test_analyze_grades():
    model = build_model(load_deals(DEALS))
    verdicts = analyze_listings(LISTINGS, model)
    assert len(verdicts) >= 5
    # ממוין מהטוב לרע
    rois = [v.flip.roi_pct for v in verdicts]
    assert rois == sorted(rois, reverse=True)
    grades = {v.grade for v in verdicts}
    assert any("🔥" in g for g in grades)
    assert any("❌" in g for g in grades)


def test_city_scores():
    model = build_model(load_deals(DEALS))
    scores = score_cities(CITIES, model)
    assert len(scores) >= 10
    assert all(0 <= s.score <= 100 for s in scores)


def test_report_renders():
    deals = load_deals(DEALS)
    model = build_model(deals)
    verdicts = analyze_listings(LISTINGS, model)
    scores = score_cities(CITIES, model)
    page = render_page(scores, deals, verdicts, "test")
    assert "<svg" in page and "nls-root" in page
    assert "קרית גת" in page
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(page)


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as exc:
                failures += 1
                print(f"FAIL {name}: {exc}")
    sys.exit(1 if failures else 0)
