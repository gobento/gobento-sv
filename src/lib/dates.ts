// One date format for the whole app: dd.mm.yyyy, with ", hh:mm" when a time
// matters. Built by hand (not Intl) so the browser's locale can never change it.

type DateInput = Date | string | number;

const pad = (value: number) => String(value).padStart(2, '0');

/** "05.03.2026" */
export function formatDate(value: DateInput): string {
	const d = new Date(value);
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "08:05" (24h) */
export function formatTimeOfDay(value: DateInput): string {
	const d = new Date(value);
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "05.03.2026, 08:05" */
export function formatDateTime(value: DateInput): string {
	return `${formatDate(value)}, ${formatTimeOfDay(value)}`;
}

/** "05.03." for tight spots such as chart axes. */
export function formatDayMonth(value: DateInput): string {
	const d = new Date(value);
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

/** "03.2026" */
export function formatMonthYear(value: DateInput): string {
	const d = new Date(value);
	return `${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
