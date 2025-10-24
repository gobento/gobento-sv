export function formatTime(timeString: string | null) {
	if (!timeString) return '';
	const [hours, minutes] = timeString.split(':');
	return `${hours}:${minutes}`;
}

export function formatDate(date: Date | null) {
	if (!date) return 'No expiry';
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}
