// src/lib/analytics.ts
/** Reporting windows offered on the business analytics page. */
export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsDays = (typeof ANALYTICS_RANGES)[number];

/** Only explicit, supported ranges are allowed; everything else falls back to 30 days. */
export function parseAnalyticsDays(value: string | null | undefined): AnalyticsDays {
	const days = Number(value);
	return ANALYTICS_RANGES.find((range) => range === days) ?? 30;
}

export function rangeLabel(days: AnalyticsDays): string {
	return `Last ${days} days`;
}
