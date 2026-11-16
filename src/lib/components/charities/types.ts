/** Shared view models for the business-side charity screens. */
import type { FoodType } from '#lib/foodTypes.js';

export interface CharitySummary {
	accountId: string;
	name: string;
	logoUrl: string;
	country: string;
	description: string;
	foodTypes: FoodType[];
	contactEmail: string;
	lastRequestStatus: string | null;
	giftStatus: string | null;
}

export interface GiftSummary {
	id: string;
	charityName: string;
	logoUrl: string;
	schedule: string;
	status: string;
	locationName: string | null;
	foodType: FoodType | null;
	nextOccurrenceAt: string | Date | null;
	pickups: number;
	notes: string | null;
}

export interface LocationOption {
	id: string;
	name: string;
	city: string;
}

export interface OfferOption {
	id: string;
	name: string;
	locationId: string | null;
}
