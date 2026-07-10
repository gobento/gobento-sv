// src/lib/foodTypes.ts

/**
 * Categories of food that a charity can declare it wants to receive, and that a
 * business can use when searching for a charity to collect surplus food.
 */
export const FOOD_TYPES = [
	'bakery',
	'produce',
	'dairy',
	'prepared_meals',
	'packaged_dry',
	'frozen',
	'beverages',
	'other'
] as const;

export type FoodType = (typeof FOOD_TYPES)[number];

export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
	bakery: 'Bakery & bread',
	produce: 'Fruit & vegetables',
	dairy: 'Dairy & eggs',
	prepared_meals: 'Prepared meals',
	packaged_dry: 'Packaged & dry goods',
	frozen: 'Frozen food',
	beverages: 'Beverages',
	other: 'Other'
};

/** Type guard used to validate untrusted input (form data, query params). */
export function isFoodType(value: unknown): value is FoodType {
	return typeof value === 'string' && (FOOD_TYPES as readonly string[]).includes(value);
}

/** Filter an arbitrary list of strings down to valid, de-duplicated food types. */
export function parseFoodTypes(values: (string | null | undefined)[]): FoodType[] {
	const seen = new Set<FoodType>();
	for (const value of values) {
		if (isFoodType(value)) {
			seen.add(value);
		}
	}
	return [...seen];
}
