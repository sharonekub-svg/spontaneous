"""מחשבון עסקה: כל הכלכלה האמיתית של פליפ או השכרה בישראל.

זה החלק שמציל אותך מעסקאות רעות. רוב האנשים מחשבים
"קניתי במיליון, מכרתי במיליון שלוש — הרווחתי 300 אלף" ומתעלמים
ממס רכישה, מס שבח, תיווך, עו"ד, מימון וחריגות שיפוץ.

שיעורי המס נכונים לתחילת 2026 — לוודא מול רשות המסים לפני עסקה אמיתית.
"""

from __future__ import annotations

from dataclasses import dataclass

# --- פרמטרים ניתנים לכוונון (עדכן לפי המציאות) ---
VAT = 0.18                        # מע"מ
INVESTOR_PURCHASE_TAX_LOW = 0.08  # מס רכישה לדירה נוספת (משקיע) — מהשקל הראשון
INVESTOR_PURCHASE_TAX_HIGH = 0.10
PURCHASE_TAX_HIGH_THRESHOLD = 6_055_070  # ₪ — מעל זה 10%
CAPITAL_GAINS_TAX = 0.25          # מס שבח על הרווח הריאלי (יחיד, לא עסק)
AGENT_FEE_BUY = 0.02              # תיווך בקנייה
AGENT_FEE_SELL = 0.01             # במכירה אפשר לרדת ל-1% או למכור לבד
LAWYER_FEE = 0.0075               # עו"ד
RENOVATION_CONTINGENCY = 0.20     # שיפוץ תמיד חורג — 20% רזרבה
ANNUAL_FINANCE_RATE = 0.06        # ריבית שנתית על החלק הממומן
FINANCED_FRACTION = 0.5           # כמה מההשקעה ממומנת בהלוואה (השאר הון עצמי)
MONTHLY_HOLDING_FIXED = 1_200     # ארנונה, ועד, ביטוח, חשמל בזמן שיפוץ

RENOVATION_PER_SQM = {            # ₪ למ"ר — שיפוץ לפליפ, לא בנייה מחדש
    "none": 400,                  # ניקיון, צבע נקודתי, הצגה למכירה
    "light": 1_200,               # צבע מלא, תיקונים, הכנה למכירה
    "medium": 2_500,              # מטבח+אמבטיה+צבע — הפליפ הקלאסי
    "heavy": 4_000,               # חשמל, אינסטלציה, ריצוף — הכל
}


@dataclass
class FlipResult:
    buy_price: float
    purchase_tax: float
    renovation: float
    buy_side_fees: float
    holding_costs: float
    sell_side_fees: float
    capital_gains_tax: float
    total_invested: float
    sell_price: float
    net_profit: float
    roi_pct: float
    warnings: list[str]


def purchase_tax_investor(price: float) -> float:
    """מס רכישה לדירה נוספת (מדרגות משקיע)."""
    if price <= PURCHASE_TAX_HIGH_THRESHOLD:
        return price * INVESTOR_PURCHASE_TAX_LOW
    low_part = PURCHASE_TAX_HIGH_THRESHOLD * INVESTOR_PURCHASE_TAX_LOW
    high_part = (price - PURCHASE_TAX_HIGH_THRESHOLD) * INVESTOR_PURCHASE_TAX_HIGH
    return low_part + high_part


def flip(buy_price: float, sell_price: float, sqm: float,
         renovation_level: str = "medium", months_hold: int = 9) -> FlipResult:
    warnings: list[str] = []

    tax_buy = purchase_tax_investor(buy_price)
    renovation = RENOVATION_PER_SQM[renovation_level] * sqm * (1 + RENOVATION_CONTINGENCY)
    buy_fees = buy_price * (AGENT_FEE_BUY + LAWYER_FEE) * (1 + VAT)

    cash_in = buy_price + tax_buy + renovation + buy_fees
    finance = cash_in * FINANCED_FRACTION * ANNUAL_FINANCE_RATE * (months_hold / 12)
    holding = finance + MONTHLY_HOLDING_FIXED * months_hold

    sell_fees = sell_price * (AGENT_FEE_SELL + LAWYER_FEE) * (1 + VAT)

    # מס שבח: על הרווח אחרי כל ההוצאות המוכרות (קירוב — שמאי/רו"ח יחשב מדויק)
    taxable_gain = sell_price - buy_price - tax_buy - renovation - buy_fees - sell_fees
    cg_tax = max(0.0, taxable_gain * CAPITAL_GAINS_TAX)

    total_invested = cash_in + holding
    net_profit = sell_price - total_invested - sell_fees - cg_tax
    roi = net_profit / total_invested * 100 if total_invested else 0.0

    if net_profit < 0:
        warnings.append("עסקה מפסידה לפי ההנחות האלה — אל תתקרב.")
    elif roi < 10:
        warnings.append("רווח דק מדי — חריגת שיפוץ אחת מוחקת אותו.")
    if months_hold > 12:
        warnings.append("החזקה מעל שנה — עלויות המימון שוחקות את הרווח.")

    return FlipResult(
        buy_price=buy_price, purchase_tax=round(tax_buy),
        renovation=round(renovation), buy_side_fees=round(buy_fees),
        holding_costs=round(holding), sell_side_fees=round(sell_fees),
        capital_gains_tax=round(cg_tax), total_invested=round(total_invested),
        sell_price=sell_price, net_profit=round(net_profit),
        roi_pct=round(roi, 1), warnings=warnings,
    )


def rental_yield(buy_price: float, sqm: float, monthly_rent: float,
                 renovation_level: str = "light") -> dict:
    """תשואת השכרה: שכירות שנתית נטו חלקי ההשקעה הכוללת."""
    tax_buy = purchase_tax_investor(buy_price)
    renovation = RENOVATION_PER_SQM[renovation_level] * sqm * (1 + RENOVATION_CONTINGENCY)
    buy_fees = buy_price * (AGENT_FEE_BUY + LAWYER_FEE) * (1 + VAT)
    total = buy_price + tax_buy + renovation + buy_fees
    # חודש חודש ריק בשנה + תחזוקה שוטפת — הערכה שמרנית
    annual_net = monthly_rent * 11 - buy_price * 0.005
    gross_yield = annual_net / total * 100
    return {
        "total_invested": round(total),
        "annual_rent_net": round(annual_net),
        "yield_pct": round(gross_yield, 2),
        "verdict": (
            "תשואה טובה" if gross_yield >= 4.0
            else "תשואה בינונית" if gross_yield >= 3.0
            else "תשואה נמוכה — הכסף עובד חלש"
        ),
    }
