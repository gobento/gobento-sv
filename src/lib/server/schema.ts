// src/lib/server/schema.ts
import {
	pgTable,
	varchar,
	boolean,
	integer,
	text,
	doublePrecision,
	timestamp,
	serial,
	primaryKey,
	time
} from 'drizzle-orm/pg-core';

// Base accounts table - shared fields for all account types
export const accounts = pgTable('accounts', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	accountType: text('account_type', { enum: ['user', 'business', 'charity', 'admin'] }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Files uploaded to Backblaze
export const files = pgTable('files', {
	id: text('id').primaryKey(), // UUID
	key: text('key').notNull().unique(), // Backblaze storage key
	fileName: text('file_name').notNull(),
	contentType: text('content_type').notNull(),
	sizeBytes: integer('size_bytes').notNull(),
	uploadedBy: text('uploaded_by')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow()
});

// User-specific data (minimal, just extends base account)
export const userProfiles = pgTable('user_profiles', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),

	// Payment preferences
	preferredPaymentMethod: text('preferred_payment_method', {
		enum: ['zarinpal', 'tether']
	}),
	zarinpalMerchantId: text('zarinpal_merchant_id'),
	tetherAddress: text('tether_address'),

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Business-specific data
export const businessProfiles = pgTable('business_profiles', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description').notNull(),
	country: text('country').notNull(),
	businessType: text('business_type', {
		enum: ['bakery', 'restaurant', 'cafe', 'grocery', 'supermarket', 'hotel', 'catering', 'other']
	}).notNull(),
	profilePictureId: text('profile_picture_id')
		.notNull()
		.references(() => files.id, { onDelete: 'restrict' })
});

// Business locations
export const businessLocations = pgTable('business_locations', {
	id: text('id').primaryKey(), // UUID
	businessAccountId: text('business_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(), // e.g., "Downtown Branch", "Main Office"
	address: text('address').notNull(),
	city: text('city').notNull(),
	province: text('state'), // todo: rename to province
	zipCode: text('zip_code').notNull(),
	country: text('country').notNull(),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	imageId: text('image_id').references(() => files.id, { onDelete: 'set null' }), // Location background image
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// User favorite locations
export const favoriteLocations = pgTable(
	'favorite_locations',
	{
		accountId: text('account_id')
			.notNull()
			.references(() => accounts.id, { onDelete: 'cascade' }),
		locationId: text('location_id')
			.notNull()
			.references(() => businessLocations.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => ({
		pk: primaryKey({ columns: [table.accountId, table.locationId] })
	})
);

// Business offers
export const businessOffers = pgTable('business_offers', {
	id: text('id').primaryKey(), // UUID
	businessAccountId: text('business_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	locationId: text('location_id').references(() => businessLocations.id, { onDelete: 'cascade' }), // null = all locations
	name: text('name').notNull(),
	description: text('description').notNull(),
	originalValue: doublePrecision('original_value').notNull(), // Original retail value of the surprise bag
	price: doublePrecision('price').notNull(), // Discounted price user pays
	currency: text('currency').notNull().default('EUR'),
	isActive: boolean('is_active').notNull().default(true),
	isRecurring: boolean('is_recurring').notNull().default(false),
	validUntil: timestamp('valid_until', { withTimezone: true }),
	quantity: integer('quantity').notNull().default(1),

	pickupTimeFrom: time('pickup_time_from').notNull(), // e.g., "09:00:00"
	pickupTimeUntil: time('pickup_time_until').notNull(), // e.g., "17:00:00"
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Offer reservations
export const reservations = pgTable('reservations', {
	id: text('id').primaryKey(), // UUID
	offerId: text('offer_id')
		.notNull()
		.references(() => businessOffers.id, { onDelete: 'cascade' }),
	userAccountId: text('user_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	status: text('status', { enum: ['active', 'completed', 'expired', 'claimed'] })
		.notNull()
		.default('active'),
	pickupFrom: timestamp('pickup_from', { withTimezone: true }).notNull(),
	pickupUntil: timestamp('pickup_until', { withTimezone: true }).notNull(),
	reservedAt: timestamp('reserved_at', { withTimezone: true }).notNull().defaultNow(),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	claimedAt: timestamp('claimed_at', { withTimezone: true }),
	claimedBy: text('claimed_by').references(() => accounts.id, { onDelete: 'set null' }),
	claimToken: text('claim_token').notNull().unique(), // Token for staff to scan/swipe
	notes: text('notes')
});

// Friend invites for reservations
export const reservationInvites = pgTable('reservation_invites', {
	id: text('id').primaryKey(), // UUID
	reservationId: text('reservation_id')
		.notNull()
		.references(() => reservations.id, { onDelete: 'cascade' }),
	invitedByAccountId: text('invited_by_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	invitedAccountId: text('invited_account_id').references(() => accounts.id, {
		onDelete: 'cascade'
	}), // null if not yet accepted
	userId: text('user_id').references(() => accounts.id, { onDelete: 'set null' }), // NEW: User who claimed via this invite
	inviteToken: text('invite_token').notNull().unique(), // Token for invite link
	status: text('status', { enum: ['pending', 'accepted', 'declined', 'expired'] })
		.notNull()
		.default('pending'),
	invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
	acceptedAt: timestamp('accepted_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

// Reservation claims by staff (keeping for backwards compatibility)
export const reservationClaims = pgTable('reservation_claims', {
	id: text('id').primaryKey(), // UUID
	reservationId: text('reservation_id')
		.notNull()
		.references(() => reservations.id, { onDelete: 'cascade' })
		.unique(), // One claim per reservation
	claimedByAccountId: text('claimed_by_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }), // Staff member who claimed it
	claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
	notes: text('notes') // Optional staff notes
});

// Charity-specific data
export const charityProfiles = pgTable('charity_profiles', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description').notNull(),
	country: text('country').notNull(),
	profilePictureId: text('profile_picture_id')
		.notNull()
		.references(() => files.id, { onDelete: 'restrict' })
});

// Admin-specific data (can add permissions, roles, etc. later)
export const adminProfiles = pgTable('admin_profiles', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' })
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	accountId: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// User push notification subscriptions
export const pushSubscriptions = pgTable('push_subscriptions', {
	id: text('id').primaryKey(), // UUID
	accountId: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	ntfyTopic: text('ntfy_topic').notNull().unique(), // Unique topic per user
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true })
});

// Notification log for tracking what was sent
export const notificationLog = pgTable('notification_log', {
	id: text('id').primaryKey(), // UUID
	accountId: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	offerId: text('offer_id')
		.notNull()
		.references(() => businessOffers.id, { onDelete: 'cascade' }),
	ntfyTopic: text('ntfy_topic').notNull(),
	sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
	status: text('status', { enum: ['sent', 'failed'] }).notNull()
});

// Payment transactions
export const payments = pgTable('payments', {
	id: text('id').primaryKey(), // UUID
	offerId: text('offer_id')
		.notNull()
		.references(() => businessOffers.id, { onDelete: 'cascade' }),
	userAccountId: text('user_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	businessAccountId: text('business_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),

	// Payment details
	amount: doublePrecision('amount').notNull(),
	currency: text('currency').notNull(), // 'IRR' or 'USDT'
	paymentMethod: text('payment_method', {
		enum: ['zarinpal', 'tether']
	}).notNull(),

	// Fee information
	feeAmount: doublePrecision('fee_amount').notNull(), // 10% fee
	businessAmount: doublePrecision('business_amount').notNull(), // 90% to business

	// Payment status
	status: text('status', {
		enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
	})
		.notNull()
		.default('pending'),

	// Provider-specific data
	zarinpalAuthority: text('zarinpal_authority'), // For Zarinpal
	zarinpalRefId: text('zarinpal_ref_id'),
	tetherTxHash: text('tether_tx_hash'), // For Tether
	tetherFromAddress: text('tether_from_address'),

	// Mock mode flag
	isMock: boolean('is_mock').notNull().default(false),

	// Reservation created after successful payment
	reservationId: text('reservation_id').references(() => reservations.id, {
		onDelete: 'set null'
	}),

	// Metadata
	metadata: text('metadata'), // JSON string for additional data
	errorMessage: text('error_message'),

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true })
});

// Payment wallet configurations for businesses
export const businessWallets = pgTable('business_wallets', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),

	// Zarinpal configuration
	zarinpalMerchantId: text('zarinpal_merchant_id'),
	zarinpalEnabled: boolean('zarinpal_enabled').notNull().default(false),

	// Tether (USDT) configuration
	tetherAddress: text('tether_address'), // ERC-20 USDT address
	tetherEnabled: boolean('tether_enabled').notNull().default(false),

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Export types
export type Payment = typeof payments.$inferSelect;
export type BusinessWallet = typeof businessWallets.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NotificationLog = typeof notificationLog.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type File = typeof files.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type BusinessLocation = typeof businessLocations.$inferSelect;
export type FavoriteLocation = typeof favoriteLocations.$inferSelect;
export type BusinessOffer = typeof businessOffers.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type ReservationInvite = typeof reservationInvites.$inferSelect;
export type ReservationClaim = typeof reservationClaims.$inferSelect;
export type CharityProfile = typeof charityProfiles.$inferSelect;
export type AdminProfile = typeof adminProfiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
