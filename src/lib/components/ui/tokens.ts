/**
 * Shared design tokens for the UI primitives in this folder.
 *
 * Every value is a literal Tailwind class string so that the Tailwind scanner
 * can see it — never build these class names through interpolation.
 */

export type Tone =
	| 'primary'
	| 'secondary'
	| 'accent'
	| 'info'
	| 'success'
	| 'warning'
	| 'error'
	| 'neutral'
	| 'muted';

export type Size = 'xs' | 'sm' | 'md' | 'lg';

/** Tinted surface + matching foreground, used by IconTile and stat tiles. */
export const TONE_SOFT: Record<Tone, string> = {
	primary: 'bg-primary/10 text-primary',
	secondary: 'bg-secondary/10 text-secondary',
	accent: 'bg-accent/10 text-accent',
	info: 'bg-info/10 text-info',
	success: 'bg-success/10 text-success',
	warning: 'bg-warning/10 text-warning',
	error: 'bg-error/10 text-error',
	neutral: 'bg-neutral/10 text-neutral',
	muted: 'bg-base-200 text-base-content/60'
};

/** Filled surface for the rare emphasis case (e.g. a completed step marker). */
export const TONE_SOLID: Record<Tone, string> = {
	primary: 'bg-primary text-primary-content',
	secondary: 'bg-secondary text-secondary-content',
	accent: 'bg-accent text-accent-content',
	info: 'bg-info text-info-content',
	success: 'bg-success text-success-content',
	warning: 'bg-warning text-warning-content',
	error: 'bg-error text-error-content',
	neutral: 'bg-neutral text-neutral-content',
	muted: 'bg-base-300 text-base-content'
};

export const TONE_BADGE: Record<Tone, string> = {
	primary: 'badge-primary',
	secondary: 'badge-secondary',
	accent: 'badge-accent',
	info: 'badge-info',
	success: 'badge-success',
	warning: 'badge-warning',
	error: 'badge-error',
	neutral: 'badge-neutral',
	muted: 'badge-ghost'
};

export const TONE_TEXT: Record<Tone, string> = {
	primary: 'text-primary',
	secondary: 'text-secondary',
	accent: 'text-accent',
	info: 'text-info',
	success: 'text-success',
	warning: 'text-warning',
	error: 'text-error',
	neutral: 'text-neutral',
	muted: 'text-base-content/60'
};

/** Icon sizes paired with a control of the same size name. */
export const ICON_SIZE: Record<Size, string> = {
	xs: 'size-3.5',
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-5'
};

/** Join conditional class lists without leaving double spaces behind. */
export function cx(...parts: (string | false | null | undefined)[]): string {
	return parts.filter(Boolean).join(' ');
}
