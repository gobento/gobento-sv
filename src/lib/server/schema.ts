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
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	fileName: text('file_name').notNull(),
	contentType: text('content_type').notNull(),
	sizeBytes: integer('size_bytes').notNull(),
	uploadedBy: text('uploaded_by')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow()
});

// User-specific data
export const userProfiles = pgTable('user_profiles', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),

	// Payment configuration - users can have optional payment methods
	ibanNumber: text('iban_number'),
	ibanEnabled: boolean('iban_enabled').notNull().default(false),
	tetherAddress: text('tether_address'),
	tetherEnabled: boolean('tether_enabled').notNull().default(false),
	preferredPaymentMethod: text('preferred_payment_method', {
		enum: ['iban', 'tether']
	}),

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
	id: text('id').primaryKey(),
	businessAccountId: text('business_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	address: text('address').notNull(),
	city: text('city').notNull(),
	province: text('province'),
	zipCode: text('zip_code').notNull(),
	country: text('country').notNull(),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	imageId: text('image_id').references(() => files.id, { onDelete: 'set null' }),
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
	id: text('id').primaryKey(),
	businessAccountId: text('business_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	locationId: text('location_id').references(() => businessLocations.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description').notNull(),
	originalValue: doublePrecision('original_value').notNull(),
	price: doublePrecision('price').notNull(),
	currency: text('currency').notNull().default('EUR'),
	isActive: boolean('is_active').notNull().default(true),
	isRecurring: boolean('is_recurring').notNull().default(false),
	validUntil: timestamp('valid_until', { withTimezone: true }),
	quantity: integer('quantity').notNull().default(1),
	pickupTimeFrom: time('pickup_time_from').notNull(),
	pickupTimeUntil: time('pickup_time_until').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Offer reservations
export const reservations = pgTable('reservations', {
	id: text('id').primaryKey(),
	offerId: text('offer_id')
		.notNull()
		.references(() => businessOffers.id, { onDelete: 'cascade' }),
	userAccountId: text('user_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	status: text('status', {
		enum: ['active', 'completed', 'expired', 'claimed']
	})
		.notNull()
		.default('active'),
	pickupFrom: timestamp('pickup_from', { withTimezone: true }).notNull(),
	pickupUntil: timestamp('pickup_until', { withTimezone: true }).notNull(),
	reservedAt: timestamp('reserved_at', { withTimezone: true }).notNull().defaultNow(),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	claimedAt: timestamp('claimed_at', { withTimezone: true }),
	claimedBy: text('claimed_by').references(() => accounts.id, { onDelete: 'set null' }),
	claimToken: text('claim_token').notNull().unique(),
	notes: text('notes')
});

// Friend invites for reservations
export const reservationInvites = pgTable('reservation_invites', {
	id: text('id').primaryKey(),
	reservationId: text('reservation_id')
		.notNull()
		.references(() => reservations.id, { onDelete: 'cascade' }),
	invitedByAccountId: text('invited_by_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	invitedAccountId: text('invited_account_id').references(() => accounts.id, {
		onDelete: 'cascade'
	}),
	userId: text('user_id').references(() => accounts.id, { onDelete: 'set null' }),
	inviteToken: text('invite_token').notNull().unique(),
	status: text('status', { enum: ['pending', 'accepted', 'declined', 'expired'] })
		.notNull()
		.default('pending'),
	invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
	acceptedAt: timestamp('accepted_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

// Reservation claims by staff
export const reservationClaims = pgTable('reservation_claims', {
	id: text('id').primaryKey(),
	reservationId: text('reservation_id')
		.notNull()
		.references(() => reservations.id, { onDelete: 'cascade' })
		.unique(),
	claimedByAccountId: text('claimed_by_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
	notes: text('notes')
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

// Admin-specific data
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
	id: text('id').primaryKey(),
	accountId: text('account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	ntfyTopic: text('ntfy_topic').notNull().unique(),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	lastNotifiedAt: timestamp('last_notified_at', { withTimezone: true })
});

// Notification log
export const notificationLog = pgTable('notification_log', {
	id: text('id').primaryKey(),
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
	id: text('id').primaryKey(),
	offerId: text('offer_id')
		.notNull()
		.references(() => businessOffers.id, { onDelete: 'cascade' }),
	userAccountId: text('user_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	businessAccountId: text('business_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	amount: doublePrecision('amount').notNull(),
	currency: text('currency').notNull(),
	paymentMethod: text('payment_method', {
		enum: ['iban', 'tether']
	}).notNull(),
	feeAmount: doublePrecision('fee_amount').notNull(),
	businessAmount: doublePrecision('business_amount').notNull(),
	status: text('status', {
		enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
	})
		.notNull()
		.default('pending'),
	ibanReference: text('iban_reference'),
	tetherTxHash: text('tether_tx_hash'),
	tetherFromAddress: text('tether_from_address'),
	isMock: boolean('is_mock').notNull().default(false),
	reservationId: text('reservation_id').references(() => reservations.id, {
		onDelete: 'set null'
	}),
	metadata: text('metadata'),
	errorMessage: text('error_message'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true })
});

// Payment wallet configurations - BUSINESSES MUST HAVE AT LEAST ONE
export const businessWallets = pgTable('business_wallets', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	// At least one must be provided and enabled
	ibanNumber: text('iban_number'),
	ibanEnabled: boolean('iban_enabled').notNull().default(false),
	tetherAddress: text('tether_address'),
	tetherEnabled: boolean('tether_enabled').notNull().default(false),
	preferredPaymentMethod: text('preferred_payment_method', {
		enum: ['iban', 'tether']
	}).notNull(),
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
