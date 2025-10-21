// src/lib/server/schema.ts
import {
	pgTable,
	varchar,
	boolean,
	integer,
	text,
	doublePrecision,
	timestamp,
	serial
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
		.references(() => accounts.id, { onDelete: 'cascade' })
});

// Business-specific data
export const businessProfiles = pgTable('business_profiles', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description').notNull(),
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
	state: text('state'),
	zipCode: text('zip_code'),
	country: text('country').notNull(),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Business offers
export const businessOffers = pgTable('business_offers', {
	id: text('id').primaryKey(), // UUID
	businessAccountId: text('business_account_id')
		.notNull()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	locationId: text('location_id').references(() => businessLocations.id, { onDelete: 'cascade' }), // null = all locations
	name: text('name').notNull(),
	description: text('description').notNull(),
	price: doublePrecision('price').notNull(),
	currency: text('currency').notNull().default('EUR'),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Charity-specific data
export const charityProfiles = pgTable('charity_profiles', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description').notNull(),
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

// Type exports
export type Account = typeof accounts.$inferSelect;
export type File = typeof files.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type BusinessLocation = typeof businessLocations.$inferSelect;
export type BusinessOffer = typeof businessOffers.$inferSelect;
export type CharityProfile = typeof charityProfiles.$inferSelect;
export type AdminProfile = typeof adminProfiles.$inferSelect;
export type Session = typeof sessions.$inferSelect;
