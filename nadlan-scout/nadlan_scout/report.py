"""דשבורד HTML: כל התמונה בקובץ אחד שנפתח בכל דפדפן, בלי אינטרנט.

`scout.py report` מייצר data/report.html עם:
- מספרי מפתח (כמה מודעות, כמה דילים, הדיל הטוב ביותר)
- דירוג ערים (גרף עמודות)
- מגמת מחירים רבעונית לכל עיר (גרף קווים)
- טבלת כל המודעות המדורגות

הגרפים הם SVG שנבנה כאן בקוד — אין תלות בשום ספרייה או רשת.
"""

from __future__ import annotations

import html
import statistics
from datetime import date

from .analyze import ListingVerdict
from .city_scores import CityScore

# פלטת צבעים נגישה (עברה ולידציה לעיוורון צבעים בשני המצבים)
SERIES_LIGHT = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7"]
SERIES_DARK = ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9"]

CSS = """
.nls-root{--surface:#fcfcfb;--page:#f9f9f7;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;
--grid:#e1e0d9;--axis:#c3c2b7;--border:rgba(11,11,11,.10);
--s1:#2a78d6;--s2:#1baf7a;--s3:#eda100;--s4:#008300;--s5:#4a3aa7;
font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);
background:var(--page);padding:24px;max-width:900px;margin:0 auto;direction:rtl}
@media (prefers-color-scheme:dark){.nls-root{--surface:#1a1a19;--page:#0d0d0d;--ink:#fff;
--ink2:#c3c2b7;--grid:#2c2c2a;--axis:#383835;--border:rgba(255,255,255,.10);
--s1:#3987e5;--s2:#199e70;--s3:#c98500;--s4:#008300;--s5:#9085e9}}
:root[data-theme="dark"] .nls-root{--surface:#1a1a19;--page:#0d0d0d;--ink:#fff;
--ink2:#c3c2b7;--grid:#2c2c2a;--axis:#383835;--border:rgba(255,255,255,.10);
--s1:#3987e5;--s2:#199e70;--s3:#c98500;--s4:#008300;--s5:#9085e9}
:root[data-theme="light"] .nls-root{--surface:#fcfcfb;--page:#f9f9f7;--ink:#0b0b0b;
--ink2:#52514e;--muted:#898781;--grid:#e1e0d9;--axis:#c3c2b7;--border:rgba(11,11,11,.10);
--s1:#2a78d6;--s2:#1baf7a;--s3:#eda100;--s4:#008300;--s5:#4a3aa7}
.nls-root h1{font-size:22px;margin:0 0 4px}
.nls-root h2{font-size:15px;margin:28px 0 10px;color:var(--ink)}
.nls-root .sub{color:var(--ink2);font-size:13px;margin:0 0 20px}
.nls-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;
padding:16px;margin-bottom:16px;overflow-x:auto}
.nls-tiles{display:flex;gap:12px;flex-wrap:wrap}
.nls-tile{flex:1;min-width:140px;background:var(--surface);border:1px solid var(--border);
border-radius:10px;padding:14px 16px}
.nls-tile .v{font-size:24px;font-weight:650}
.nls-tile .l{font-size:12px;color:var(--ink2);margin-top:2px}
.nls-root svg{width:100%;height:auto;display:block}
.nls-root svg text{font-family:inherit}
.nls-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink2);margin:4px 2px 10px}
.nls-legend span{display:inline-flex;align-items:center;gap:5px}
.nls-legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
.nls-root table{border-collapse:collapse;width:100%;font-size:13px}
.nls-root th{text-align:right;color:var(--ink2);font-weight:600;padding:6px 8px;
border-bottom:1px solid var(--axis)}
.nls-root td{padding:6px 8px;border-bottom:1px solid var(--grid);
font-variant-numeric:tabular-nums}
.nls-root details{font-size:13px;color:var(--ink2);margin-top:8px}
#nls-tip{position:fixed;display:none;background:var(--surface);color:var(--ink);
border:1px solid var(--border);border-radius:6px;padding:6px 9px;font-size:12px;
pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.15);z-index:9;white-space:pre}
.nls-hot{color:#0ca30c;font-weight:650}.nls-bad{color:var(--muted)}
"""

TOOLTIP_JS = """
(function(){var t=document.getElementById('nls-tip');
document.querySelectorAll('[data-tip]').forEach(function(el){
el.addEventListener('mousemove',function(e){t.textContent=el.getAttribute('data-tip');
t.style.display='block';var x=e.clientX+14,y=e.clientY+14;
if(x+t.offsetWidth>window.innerWidth-8)x=e.clientX-t.offsetWidth-10;
t.style.left=x+'px';t.style.top=y+'px';});
el.addEventListener('mouseleave',function(){t.style.display='none';});});})();
"""


def _esc(s: object) -> str:
    return html.escape(str(s))


def _city_bars_svg(scores: list[CityScore]) -> str:
    """גרף עמודות אופקי: ציון לכל עיר, עמודות דקות עם תווית ערך."""
    rows = [s for s in scores if s.score][:12]
    row_h, pad_top, label_w, chart_w = 26, 8, 96, 560
    height = pad_top * 2 + row_h * len(rows)
    max_score = 100.0
    # direction:ltr — קואורדינטות SVG לא מתהפכות ב-RTL, אחרת התוויות נחתכות
    parts = [f'<svg viewBox="0 0 {label_w + chart_w + 60} {height}" role="img" '
             f'style="direction:ltr" aria-label="דירוג ערים">']
    for i, s in enumerate(rows):
        y = pad_top + i * row_h
        bar_w = max(2.0, s.score / max_score * chart_w)
        tip = (f"{s.city} ציון {s.score} | אשכול {s.socio_cluster} | "
               f"צמיחה {s.pop_growth_pct}%")
        parts.append(
            f'<text x="{label_w - 6}" y="{y + 16}" text-anchor="end" font-size="12" '
            f'fill="var(--ink2)">{_esc(s.city)}</text>'
            f'<rect x="{label_w}" y="{y + 5}" width="{bar_w:.1f}" height="14" rx="0" '
            f'fill="var(--s1)" data-tip="{_esc(tip)}"/>'
            f'<rect x="{label_w + bar_w - 4:.1f}" y="{y + 5}" width="4" height="14" '
            f'rx="3" fill="var(--s1)" pointer-events="none"/>'
            f'<text x="{label_w + bar_w + 8:.1f}" y="{y + 16}" font-size="12" '
            f'fill="var(--ink)">{s.score:g}</text>')
    parts.append(f'<line x1="{label_w}" y1="{pad_top}" x2="{label_w}" '
                 f'y2="{height - pad_top}" stroke="var(--axis)"/>')
    parts.append("</svg>")
    return "".join(parts)


def _quarter(deal_date: str) -> str:
    year, month = deal_date[:4], int(deal_date[5:7])
    return f"{year}-Q{(month - 1) // 3 + 1}"


def _trend_lines_svg(deals: list[dict]) -> tuple[str, str, list[str]]:
    """גרף קווים: חציון ₪/מ"ר רבעוני לכל עיר. מחזיר (svg, טבלת נתונים, ערים)."""
    buckets: dict[str, dict[str, list[float]]] = {}
    for deal in deals:
        if len(deal.get("date", "")) < 7:
            continue
        buckets.setdefault(deal["city"], {}).setdefault(
            _quarter(deal["date"]), []).append(deal["_ppsqm"])

    cities = sorted(buckets, key=lambda c: -sum(len(v) for v in buckets[c].values()))[:5]
    quarters = sorted({q for c in cities for q in buckets[c]})
    if len(quarters) < 2:
        return "", "", []

    series: dict[str, list[float | None]] = {}
    values: list[float] = []
    for city in cities:
        points = []
        for q in quarters:
            vals = buckets[city].get(q, [])
            med = statistics.median(vals) if len(vals) >= 3 else None
            points.append(med)
            if med:
                values.append(med)
        series[city] = points

    lo, hi = min(values) * 0.95, max(values) * 1.05
    width, height, pad_l, pad_r, pad_y = 640, 260, 62, 40, 22
    plot_w, plot_h = width - pad_l - pad_r, height - pad_y * 2

    def x(i: int) -> float:
        return pad_l + i / (len(quarters) - 1) * plot_w

    def y(v: float) -> float:
        return pad_y + (1 - (v - lo) / (hi - lo)) * plot_h

    parts = [f'<svg viewBox="0 0 {width} {height}" role="img" style="direction:ltr" '
             f'aria-label="מגמת מחירים">']
    for frac in (0.0, 0.5, 1.0):  # קווי רשת עדינים + תוויות ציר
        gy = pad_y + frac * plot_h
        val = hi - frac * (hi - lo)
        parts.append(f'<line x1="{pad_l}" y1="{gy:.1f}" x2="{width - pad_r}" '
                     f'y2="{gy:.1f}" stroke="var(--grid)"/>'
                     f'<text x="{pad_l - 8}" y="{gy + 4:.1f}" text-anchor="end" '
                     f'font-size="11" fill="var(--muted)">{val:,.0f}</text>')
    for i, q in enumerate(quarters):
        if i % max(1, len(quarters) // 6) == 0:
            parts.append(f'<text x="{x(i):.1f}" y="{height - 4}" text-anchor="middle" '
                         f'font-size="11" fill="var(--muted)">{_esc(q)}</text>')
    for idx, city in enumerate(cities):
        color = f"var(--s{idx + 1})"
        path, segments = [], []
        for i, v in enumerate(series[city]):
            if v is None:
                segments.append(path); path = []
                continue
            path.append((x(i), y(v)))
        segments.append(path)
        for seg in segments:
            if len(seg) >= 2:
                d = "M" + " L".join(f"{px:.1f},{py:.1f}" for px, py in seg)
                parts.append(f'<path d="{d}" fill="none" stroke="{color}" '
                             f'stroke-width="2" stroke-linejoin="round"/>')
        for i, v in enumerate(series[city]):  # עיגולי hover גדולים מהסימן עצמו
            if v is None:
                continue
            unit = '₪/מ"ר'
            tip = f"{city} — {quarters[i]}: {v:,.0f} {unit}"
            parts.append(f'<circle cx="{x(i):.1f}" cy="{y(v):.1f}" r="3.5" fill="{color}" '
                         f'stroke="var(--surface)" stroke-width="2"/>'
                         f'<circle cx="{x(i):.1f}" cy="{y(v):.1f}" r="11" fill="transparent" '
                         f'data-tip="{_esc(tip)}"/>')
    parts.append("</svg>")

    legend = "".join(
        f'<span><i style="background:var(--s{i + 1})"></i>{_esc(city)}</span>'
        for i, city in enumerate(cities))

    table_rows = "".join(
        "<tr><td>" + _esc(q) + "</td>" + "".join(
            f"<td>{series[c][i]:,.0f}</td>" if series[c][i] else "<td>-</td>"
            for c in cities) + "</tr>"
        for i, q in enumerate(quarters))
    table = ('<details><summary>הנתונים כטבלה</summary><table><tr><th>רבעון</th>'
             + "".join(f"<th>{_esc(c)}</th>" for c in cities)
             + f"</tr>{table_rows}</table></details>")
    return "".join(parts), f'<div class="nls-legend">{legend}</div>', table


def _listings_table(verdicts: list[ListingVerdict]) -> str:
    rows = []
    for v in verdicts:
        cls = "nls-hot" if "🔥" in v.grade else ("nls-bad" if "❌" in v.grade else "")
        rows.append(
            f'<tr class="{cls}"><td>{_esc(v.grade)}</td>'
            f"<td>{_esc(v.address)}</td><td>{_esc(v.city)}</td>"
            f"<td>{v.asking_price:,.0f}</td><td>{v.market_value:,.0f}</td>"
            f"<td>{v.discount_pct:+.1f}%</td><td>{v.flip.net_profit:,.0f}</td>"
            f"<td>{v.flip.roi_pct}%</td></tr>")
    return ("<table><tr><th>ציון</th><th>כתובת</th><th>עיר</th><th>מבוקש ₪</th>"
            "<th>שווי שוק ₪</th><th>מול השוק</th><th>רווח נטו ₪</th><th>ROI</th></tr>"
            + "".join(rows) + "</table>")


def render_body(scores: list[CityScore], deals: list[dict],
                verdicts: list[ListingVerdict], data_label: str) -> str:
    hot = [v for v in verdicts if "🔥" in v.grade]
    best = max(verdicts, key=lambda v: v.flip.net_profit, default=None)
    trend_svg, trend_legend, trend_table = _trend_lines_svg(deals)

    tiles = f"""
    <div class="nls-tiles">
      <div class="nls-tile"><div class="v">{len(deals):,}</div><div class="l">עסקאות אמת במודל</div></div>
      <div class="nls-tile"><div class="v">{len(verdicts)}</div><div class="l">מודעות נותחו</div></div>
      <div class="nls-tile"><div class="v">{len(hot)}</div><div class="l">🔥 דילים</div></div>
      <div class="nls-tile"><div class="v">{f"{best.flip.net_profit:,.0f} ₪" if best else "-"}</div>
        <div class="l">הרווח הצפוי הגבוה ביותר</div></div>
    </div>"""

    return f"""<div class="nls-root">
<h1>nadlan-scout 🏠</h1>
<p class="sub">נוצר {date.today().isoformat()} · מקור נתונים: {_esc(data_label)}</p>
{tiles}
<h2>דירוג ערים — איפה לחפש</h2>
<div class="nls-card">{_city_bars_svg(scores)}</div>
<h2>מגמת מחירים — חציון ₪/מ"ר רבעוני</h2>
<div class="nls-card">{trend_legend}{trend_svg}{trend_table}</div>
<h2>המודעות שלך, מדורגות</h2>
<div class="nls-card">{_listings_table(verdicts)}</div>
<p class="sub">המערכת מצביעה, היא לא מחליטה: לפני עסקה אמיתית — שמאי, עו"ד, נסח טאבו.</p>
<div id="nls-tip"></div>
</div>
<style>{CSS}</style>
<script>{TOOLTIP_JS}</script>"""


def render_page(scores: list[CityScore], deals: list[dict],
                verdicts: list[ListingVerdict], data_label: str) -> str:
    body = render_body(scores, deals, verdicts, data_label)
    return (f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f"<title>nadlan-scout</title></head><body style=\"margin:0\">{body}</body></html>")
