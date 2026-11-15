"""
GoBento support bot: customers write here, the team answers by replying (see handlers.py).

The website's "Contact support" opens this bot with /start err_<reference>, so the error reference
arrives with the customer's first hello.
"""
import logging
from typing import Final

from telegram import BotCommand, Update
from telegram.constants import ParseMode
from telegram.error import TelegramError
from telegram.ext import Application, ApplicationBuilder, Defaults

from handlers import register_handlers
from settings.config import DATA_PATH, TOKEN
from store import Store

DISPLAY_NAME: Final = "GoBento Support"
DESCRIPTION: Final[dict[str, str]] = {
    "en": "Questions about an order, your account or an error in GoBento? Write to us here; the team answers in this chat.",
    "de": "Fragen zu einer Bestellung, deinem Konto oder einem Fehler in GoBento? Schreib uns hier; das Team antwortet in diesem Chat.",
}
SHORT_DESCRIPTION: Final[dict[str, str]] = {
    "en": "GoBento support: we answer right here.",
    "de": "GoBento-Support: Wir antworten direkt hier.",
}


async def post_init(app: Application) -> None:
    app.bot_data["store"] = Store(DATA_PATH)
    bot = app.bot
    await bot.delete_webhook(drop_pending_updates=False)
    await bot.set_my_commands([BotCommand("start", "Contact GoBento support")])
    await bot.set_my_commands([BotCommand("start", "GoBento-Support kontaktieren")], language_code="de")
    # Name and descriptions are rate-limited by Telegram, so only touch them when they differ.
    for language, code in (("en", None), ("de", "de")):
        try:
            if (await bot.get_my_name(language_code=code)).name != DISPLAY_NAME:
                await bot.set_my_name(DISPLAY_NAME, language_code=code)
            if (await bot.get_my_description(language_code=code)).description != DESCRIPTION[language]:
                await bot.set_my_description(DESCRIPTION[language], language_code=code)
            if (await bot.get_my_short_description(language_code=code)).short_description != SHORT_DESCRIPTION[language]:
                await bot.set_my_short_description(SHORT_DESCRIPTION[language], language_code=code)
        except TelegramError as e:
            logging.warning("Could not update the bot profile (%s): %s", language, e)


def main() -> None:
    logging.basicConfig(
        format="%(asctime)s %(levelname)-5s %(funcName)-20s [%(filename)s:%(lineno)d]: %(message)s",
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)

    app = (
        ApplicationBuilder()
        .token(TOKEN)
        .defaults(Defaults(parse_mode=ParseMode.HTML))
        .post_init(post_init)
        .build()
    )
    register_handlers(app)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
