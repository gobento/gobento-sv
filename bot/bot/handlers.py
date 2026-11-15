"""
Support relay: customers write to the bot, the team answers by replying.

- /start (optionally with err_<reference> from the website) greets the customer and tells the team.
- Every other message from a customer is copied to each admin, under a line saying who sent it.
- An admin's reply to such a copy (or to that line) goes back to the customer.
"""
import logging

from telegram import Message, Update
from telegram.constants import ParseMode
from telegram.error import TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

import texts
from settings.config import ADMINS
from store import Store

logger = logging.getLogger(__name__)

PRIVATE = filters.ChatType.PRIVATE
# An empty list matches nobody, so without ADMINS every sender counts as a customer.
FROM_ADMIN = filters.User(user_id=ADMINS)


def _store(context: ContextTypes.DEFAULT_TYPE) -> Store:
    return context.application.bot_data["store"]


async def _to_admins(context: ContextTypes.DEFAULT_TYPE, message: Message, header: str, copy: bool) -> None:
    """Sends the header line (and a copy of the message) to every admin, remembering the customer."""
    store = _store(context)
    for admin in ADMINS:
        try:
            note = await context.bot.send_message(admin, header, parse_mode=ParseMode.HTML)
            store.remember(admin, note.message_id, message.chat_id)
            if copy:
                copied = await message.copy(admin)
                store.remember(admin, copied.message_id, message.chat_id)
        except TelegramError as e:
            # An admin who never pressed Start cannot be messaged; the others still are.
            logger.warning("Could not relay to admin %s: %s", admin, e)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if user.id in ADMINS:
        await update.message.reply_text(texts.ADMIN_HINT)
        return

    reference = texts.error_reference(context.args[0] if context.args else None)
    if reference:
        context.user_data["reference"] = reference
    language = texts.lang(user.language_code)
    await update.message.reply_text(texts.hello(language, reference), parse_mode=ParseMode.HTML)

    header = texts.admin_header(user.full_name, user.username, user.id, reference) + "\nopened the support chat"
    await _to_admins(context, update.message, header, copy=False)


async def from_customer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    header = texts.admin_header(user.full_name, user.username, user.id, context.user_data.get("reference"))
    await _to_admins(context, update.message, header, copy=True)

    # Confirm once per conversation, not after every message.
    if not context.user_data.get("acknowledged"):
        context.user_data["acknowledged"] = True
        await update.message.reply_text(texts.received(texts.lang(user.language_code)))


async def from_admin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.message
    replied = message.reply_to_message
    customer = _store(context).customer_for(message.chat_id, replied.message_id) if replied else None
    if customer is None:
        await message.reply_text(texts.REPLY_UNKNOWN)
        return
    try:
        await message.copy(customer)
        await message.reply_text(texts.REPLY_SENT)
    except TelegramError as e:
        await message.reply_text(f"Could not deliver: {e}")


def register_handlers(app: Application) -> None:
    app.add_handler(CommandHandler("start", start, filters=PRIVATE))
    app.add_handler(MessageHandler(PRIVATE & FROM_ADMIN & ~filters.COMMAND, from_admin))
    app.add_handler(MessageHandler(PRIVATE & ~FROM_ADMIN & ~filters.COMMAND, from_customer))
