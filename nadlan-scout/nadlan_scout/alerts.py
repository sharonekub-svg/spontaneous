"""התראות: המערכת בודקת בשבילך ומודיעה רק כשיש משהו שווה.

`scout.py watch` מריץ ניתוח על קובץ המודעות, משווה למצב הקודם
(data/alert_state.json), ועל כל מודעה שהפכה ל-🔥 או 🟡 שולח התראה.

טלגרם (חינם, 5 דקות הקמה):
1. מדברים עם @BotFather בטלגרם → /newbot → מקבלים טוקן
2. שולחים הודעה כלשהי לבוט החדש שלך
3. גולשים אל https://api.telegram.org/bot<TOKEN>/getUpdates ומעתיקים את chat id
4. מגדירים משתני סביבה: TELEGRAM_BOT_TOKEN ו-TELEGRAM_CHAT_ID

בלי הגדרה — ההתראות פשוט מודפסות למסך.
להרצה יומית אוטומטית: cron בלינוקס/מק, Task Scheduler בווינדוס.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request

from .analyze import ListingVerdict

STATE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "data", "alert_state.json")


def _load_state() -> dict[str, str]:
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_state(state: dict[str, str]) -> None:
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=1)


def _listing_key(v: ListingVerdict) -> str:
    return f"{v.city}|{v.neighborhood}|{v.address}|{v.asking_price:.0f}"


def send_telegram(text: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
    with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=20):
        return True


def _format_alert(v: ListingVerdict) -> str:
    lines = [
        f"{v.grade}: {v.address} ({v.city}" + (f", {v.neighborhood}" if v.neighborhood else "") + ")",
        f"מבוקש {v.asking_price:,.0f} ₪ | שווי שוק {v.market_value:,.0f} ₪ ({v.discount_pct:+.1f}%)",
        f"רווח נטו צפוי בפליפ: {v.flip.net_profit:,.0f} ₪ (ROI {v.flip.roi_pct}%)",
    ]
    if v.url:
        lines.append(v.url)
    return "\n".join(lines)


def check_and_alert(verdicts: list[ListingVerdict]) -> int:
    """שולח התראה על כל מודעה מעניינת שעדיין לא הותרעה. מחזיר כמה נשלחו."""
    state = _load_state()
    sent = 0
    for v in verdicts:
        if "❌" in v.grade:
            continue
        key = _listing_key(v)
        if state.get(key) == v.grade:
            continue  # כבר הותרע על זה בדיוק
        message = _format_alert(v)
        if not send_telegram(message):
            print("(טלגרם לא מוגדר — מדפיס למסך)\n" + message + "\n")
        state[key] = v.grade
        sent += 1
    _save_state(state)
    return sent
