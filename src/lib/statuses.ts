/**
 * Central status vocabulary.
 *
 * Every status shown as a badge lives here so the same state always gets the
 * same label and the same colour, whichever page renders it.
 */
import type { Component } from 'svelte';
import type { Tone } from '$lib/components/ui/tokens';

import IconClock from '~icons/fluent/clock-24-regular';
import IconCheckmarkCircle from '~icons/fluent/checkmark-circle-24-regular';
import IconDismissCircle from '~icons/fluent/dismiss-circle-24-regular';
import IconWarning from '~icons/fluent/warning-24-regular';

export interface StatusMeta {
	label: string;
	tone: Tone;
	icon?: Component;
}

/** Reservations held by a customer. */
export const RESERVATION_STATUS: Record<string, StatusMeta> = {
	active: { label: 'Active', tone: 'primary' },
	claimed: { label: 'Claimed', tone: 'success', icon: IconCheckmarkCircle },
	completed: { label: 'Completed', tone: 'neutral' },
	expired: { label: 'Expired', tone: 'error' }
};

/** Payouts settled to a business or charity. */
export const SETTLEMENT_STATUS: Record<string, StatusMeta> = {
	pending: { label: 'Pending', tone: 'warning', icon: IconClock },
	processing: { label: 'Processing', tone: 'info', icon: IconClock },
	paid: { label: 'Paid', tone: 'success', icon: IconCheckmarkCircle },
	partially_paid: { label: 'Partially Paid', tone: 'warning', icon: IconWarning },
	failed: { label: 'Failed', tone: 'error', icon: IconDismissCircle }
};

/** Verification state of a business or charity account. */
export const VERIFICATION_STATUS: Record<string, StatusMeta> = {
	pending: { label: 'Pending', tone: 'warning' },
	verified: { label: 'Approved', tone: 'success', icon: IconCheckmarkCircle },
	rejected: { label: 'Rejected', tone: 'error', icon: IconDismissCircle }
};

/** Customer complaints about an offer or location. */
export const COMPLAINT_STATUS: Record<string, StatusMeta> = {
	open: { label: 'Open', tone: 'warning' },
	resolved: { label: 'Resolved', tone: 'success', icon: IconCheckmarkCircle }
};

export const ACCOUNT_TYPE: Record<string, StatusMeta> = {
	user: { label: 'User', tone: 'neutral' },
	business: { label: 'Business', tone: 'primary' },
	charity: { label: 'Charity', tone: 'secondary' },
	moderator: { label: 'Moderator', tone: 'accent' },
	admin: { label: 'Admin', tone: 'error' }
};

export const PAYMENT_METHOD: Record<string, StatusMeta> = {
	iban: { label: 'Bank Transfer', tone: 'primary' },
	usdt: { label: 'USDT', tone: 'accent' }
};

/** Falls back to a ghost badge with the raw value so unknown states stay visible. */
export function statusMeta(map: Record<string, StatusMeta>, status: string): StatusMeta {
	return map[status] ?? { label: status, tone: 'muted' };
}
