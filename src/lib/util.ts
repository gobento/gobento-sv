export function formatTime(time: Date | string | null) {
	if (!time) return '';

	if (typeof time === 'string') {
		const [hours, minutes] = time.split(':');
		return `${hours}:${minutes}`;
	}

	const hours = time.getHours().toString().padStart(2, '0');
	const minutes = time.getMinutes().toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

export function formatDate(date: Date | null | string) {
	if (!date) return 'No expiry';
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

// Haversine formula to calculate distance in kilometers
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(degrees: number): number {
	return degrees * (Math.PI / 180);
}

export const formatPrice = (price: number, currency: string) => {
	if (currency === 'USDT') {
		return `${price.toFixed(2)} USDT`;
	}
	if (currency === 'IRR') {
		return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
	}
	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: currency
	}).format(price);
};

export function formatDistance(distance: number | null) {
	if (distance === null) return null;
	if (distance < 1) {
		return `${Math.round(distance * 1000)}m`;
	}
	return `${distance.toFixed(1)}km`;
}
