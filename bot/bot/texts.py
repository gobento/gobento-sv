"""Everything the bot says, in English and German (Telegram tells us the user's language)."""
import html
import re
from typing import Final

# The website links here with ?start=err_<reference>; Telegram allows [A-Za-z0-9_-]{1,64}.
_ERROR_PAYLOAD: Final = re.compile(r"^err_([A-Za-z0-9-]{1,60})$")


def error_reference(payload: str | None) -> str | None:
    """The error reference from a /start payload, or None when there is none."""
    match = _ERROR_PAYLOAD.match(payload or "")
    return match.group(1) if match else None


def lang(language_code: str | None) -> str:
    return "de" if (language_code or "").lower().startswith("de") else "en"


def hello(language: str, reference: str | None) -> str:
    ref = html.escape(reference) if reference else None
    if language == "de":
        if ref:
            return (
                "Hallo! 👋 Danke, dass du dich meldest.\n\n"
                f"Wir haben deine Fehlerreferenz: <code>{ref}</code>\n"
                "Schreib uns kurz, was du gerade gemacht hast. Wir antworten dir hier."
            )
        return "Hallo! 👋 Wie können wir helfen? Schreib uns einfach hier, wir antworten dir in diesem Chat."
    if ref:
        return (
            "Hi! 👋 Thanks for reaching out.\n\n"
            f"We've got your error reference: <code>{ref}</code>\n"
            "Tell us briefly what you were doing. We'll answer right here."
        )
    return "Hi! 👋 How can we help? Just write your message here and we'll answer in this chat."


def received(language: str) -> str:
    return "Danke! Wir melden uns hier. 🍱" if language == "de" else "Thanks! We'll get back to you here. 🍱"


def admin_header(name: str, username: str | None, user_id: int, reference: str | None = None) -> str:
    who = html.escape(name) + (f" (@{html.escape(username)})" if username else "")
    lines = [f"💬 <b>{who}</b> · <code>{user_id}</code>"]
    if reference:
        lines.append(f"Error reference: <code>{html.escape(reference)}</code>")
    return "\n".join(lines)


ADMIN_HINT: Final = "Reply to a customer's message to answer them."
REPLY_SENT: Final = "✓ Sent"
REPLY_UNKNOWN: Final = "Reply to one of the forwarded customer messages to answer."
