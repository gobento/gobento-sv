// Support runs through GoBento's Telegram support bot (bot/ in this repository).
// The link opens it with /start err_<reference>, so the bot greets the customer
// with a short hello that already names the error, and the team sees it too.

const SUPPORT_BOT = 'RW_BridgeBot';

/** `t.me` link to the support bot, carrying the error reference when there is one. */
export function supportUrl(errorId?: string | null): string {
	// Telegram start parameters allow [A-Za-z0-9_-], up to 64 characters.
	const reference = errorId?.replace(/[^A-Za-z0-9-]/g, '').slice(0, 60);
	return reference
		? `https://t.me/${SUPPORT_BOT}?start=err_${reference}`
		: `https://t.me/${SUPPORT_BOT}?start=support`;
}
