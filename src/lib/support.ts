// Support runs over Telegram. Links open the support chat with a short hello
// already typed, plus the error reference when there is one, so nobody has to
// copy and paste it.

const SUPPORT_HANDLE = 'MilitaernewsKontakt';

export function supportMessage(errorId?: string | null): string {
	return errorId
		? `Hi GoBento team! I ran into an error. Error reference: ${errorId}`
		: 'Hi GoBento team! ';
}

/** `t.me` link to the support chat with the message prefilled. */
export function supportUrl(errorId?: string | null): string {
	return `https://t.me/${SUPPORT_HANDLE}?text=${encodeURIComponent(supportMessage(errorId))}`;
}
