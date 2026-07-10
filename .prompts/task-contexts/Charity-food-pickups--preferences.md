nt workid: 665a73bf-2767-4afe-b042-667d0a01d14d
sessionId: 769b92e4-61f9-4629-9c45-196821ec2ebb
date: '2026-07-10T11:17:17.560Z'
label: 'Charity food pickups: preferences, business search & pickup workflow'
---

# Charity Food Pickups

Let businesses find charities to collect surplus food, let charities declare which
food types they accept, support an in-app pickup-request workflow, and let charities
reserve/collect offers from business locations much like a normal user (free — it's a
donation, so the payment step is skipped).

## Domain notes (existing)

- SvelteKit + Drizzle (postgres-js). Schema in `src/lib/server/schema.ts`.
- Route group `(dock)` is the authed app; nav in `(dock)/+layout.svelte` switches by `accountType`.
- `charityNav` already links to `/dashboard`, `/donations`, `/impact`, `/profile` (mostly stubs / business-only today).
- Reservations carry a `claimToken`; today they are only created by the paid flow in `PaymentHandler`.
- Notifications: `notifyAccount(accountId, payload)` in `src/lib/server/notifications.ts`.
- Migrations are hand-authored SQL under `drizzle/` + an entry in `drizzle/meta/_journal.json`.

## Design

### 1. Shared taxonomy — `src/lib/foodTypes.ts`

`FOOD_TYPES` tuple + `FoodType` type + `FOOD_TYPE_LABELS`.
Values: `bakery, produce, dairy, prepared_meals, packaged_dry, frozen, beverages, other`.

### 2. Schema (`src/lib/server/schema.ts`) + migration `drizzle/0005_add_charity_pickups.sql`

- `charity_food_preferences (charity_account_id fk→accounts cascade, food_type)` PK(both).
- `pickup_requests`:
  - id pk, business_account_id fk, charity_account_id fk (both cascade),
  - location_id fk→business_locations set null (nullable),
  - offer_id fk→business_offers set null (nullable),
  - food_type (nullable), message text,
  - proposed_pickup_from / proposed_pickup_until timestamptz (nullable),
  - status `['pending','accepted','declined','cancelled','completed']` default pending,
  - reservation_id fk→reservations set null (nullable, filled on accept),
  - notes, created_at, responded_at.
- Add `$inferSelect` type exports.

### 3. Charity preferences UI — `(dock)/profile/edit`

- `+page.server.ts`: for charity, load current preferences; in `updateProfile` action, read `foodTypes` (multi) and replace rows in `charity_food_preferences`.
- `+page.svelte`: charity-only card with a checkbox per food type (hidden inputs `foodTypes`).

### 4. Business → find charities — new `(dock)/charities`

- Business-only. `load` filters verified charities by `foodType` + `country` query params, returns charity cards (logo, description, contact email, accepted food types) + the business's locations/offers for the request form.
- Action `requestPickup`: insert `pickup_requests` (pending) + `notifyAccount(charity)`.
- Add `Charities` item to `businessNav` in `(dock)/+layout.svelte`.

### 5. Charity → donations inbox — new `(dock)/donations`

- Charity-only. Lists incoming pickup requests (business + location + logo) and the charity's pickups (reservations where `user_account_id` = charity id).
- Actions: `acceptRequest` (status accepted, create free reservation w/ claim token when an offer is attached, notify business) and `declineRequest` (status declined, notify business).

### 6. Charity-initiated free pickup — `(dock)/offers/[id]`

- `+page.server.ts`: add `isCharity`; add `reservePickup` action (charity-only, checks availability, creates a free reservation + claim token, no payment).
- `+page.svelte`: charity sees a "Reserve for free pickup" button instead of the pay flow.
- Allow charity in `(dock)/reservations` load (or surface via `/donations`).

## Verification

- `npm run check` (svelte-check) and `npm run lint` clean.
- Add unit tests for `foodTypes` + pickup-request helpers where practical.
