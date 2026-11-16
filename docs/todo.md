# TODO: reach Too Good To Go parity

Gap analysis against the current codebase (verified 2026-11-14). Grouped by priority; each item says what's missing and where.

## P0 — core flow is incomplete without these

- [ ] **Offer management for businesses.** Only create (`offers/new`) and hard delete (`deleteOffer` in `src/routes/(dock)/offers/+page.server.ts`) exist. Add: edit offer, pause/activate (`isActive` toggle), "mark sold out", duplicate offer, per-day quantity editing. (`src/routes/(dock)/offers/`, `businessOffers.isActive`)
- [ ] **Cancel reservation + refund flow.** Users cannot cancel; `payments.status` has an unused `'refunded'` value. Add `cancelReservation` action, refund paths per method (IBAN/Tether/ZarinPal), keep fee handling consistent with `src/lib/server/payments/handler.ts`. (`src/routes/(dock)/reservations/[id]/+page.server.ts`)
- [ ] **Scheduler for expiring things.** Nothing cleans up: offers past `validUntil` stay active, reservations past `pickupUntil` stay `active` (quantity never released), invites past `expiresAt` stay `pending`, `payments.expiresAt` intents never expire. Add cron (Vercel cron or GitHub Actions like `.github/workflows/monthly_payments.yml`) hitting `/api/.../expire` endpoints.
- [ ] **Business pickup queue.** `claimReservation` lets the _user_ self-claim; businesses have no "today's pickups" list, no code verification, no no-show marking. Add business view + verify flow around `reservations.claimToken` / `reservationClaims`. (`src/routes/(dock)/dashboard/`, new route e.g. `(dock)/pickups`)
- [ ] **Targeted new-offer notifications.** `notifyNewOffer`/`notifyNewOfferAllLocations` broadcast to _all_ subscribers regardless of favorites/location. TGT notifies per favorite/area. Wire `favoriteLocations` + radius into `src/lib/server/notifications.ts`.

## P1 — TGT features users expect

- [ ] **Text search + richer filters on discover.** Search box only geocodes addresses (Nominatim). Add name/description search, price range, distance radius, dietary/allergen filters, pagination/infinite scroll (currently loads every active offer). (`src/routes/(dock)/discover/+page.server.ts`)
- [ ] **Allergens & dietary tags.** No data model at all. Add `offer_allergens` / `offer_dietary_tags` (vegan, vegetarian, gluten-free, nuts…) + user dietary preferences in `userProfiles` used for filtering. Migration + `offers/new` form.
- [ ] **Ratings & reviews.** Nothing exists. Add `business_reviews` (rating + text, only users with a completed reservation can review), show avg on offer/location pages, moderation queue.
- [ ] **Pickup reminders & lifecycle notifications.** Reservation confirmed, pickup reminder, "offer about to expire", sold out, refund issued — none exist. Extend `src/lib/server/notifications.ts` + client scheduler (`src/lib/client/notificationScheduler.ts`).
- [ ] **Transactional emails.** `src/lib/server/mail/sendMailWithAttachments.ts` is unused. Send booking confirmation, pickup reminder, refund, verification result (approve/reject), payout summary.
- [ ] **Business alerts.** Notify business on new reservation, cancellation, complaint, payout sent, offer about to sell out.
- [ ] **In-app messaging user ↔ business.** At minimum "I'm running late" / "bag not as described" threads tied to a reservation. New `messages` table + UI in reservation detail.
- [ ] **Multi-bag checkout.** TGT lets you combine bags from several businesses in one order. Currently 1 reservation = 1 payment. Add cart + grouped payment, or at least document the 1:1 limitation.
- [ ] **Location opening hours.** `businessLocations` has no hours; offer pickup windows aren't validated against real opening times. Add hours schema + validation.
- [ ] **Waitlist / "notify me"** for sold-out offers, and auto-reopen when quantity is released.
- [ ] **Card payment option.** TGT pays in-app by card; today only IBAN/Tether/ZarinPal (`src/lib/server/payments/`). Add a card provider + refund API.

## P2 — polish & parity extras

- [ ] **Email/password auth** (+ reset, verification) — Google OAuth only today (`src/lib/server/auth.ts`).
- [ ] **Account controls:** delete account, data export (GDPR), notification preferences, push via FCM/APNs instead of ntfy-only.
- [ ] **Referral program / promo credits.**
- [ ] **Tipping / extra donation at checkout** (distinct from charity donations flow).
- [ ] **Waitlist-free "Magic bag" curation:** TGT-style editorial categories/collections on discover.
- [ ] **SEO/PWA:** sitemap.xml, OG meta tags, install prompt, offline fallback (`static/manifest.json` + `src/service-worker.js` exist).
- [ ] **i18n coverage check** for `messages/{en,de,fa}.json` on all new UI.

## Cleanup / tech debt (unblocks the above)

- [ ] Finish SvelteKit 3 migration tasks in `docs/MIGRATION_TASKS.md` (goto options, `refreshAll`, `handleError`, deprecated `json()`).
- [ ] Remove debug `console.log('result', result)` in `src/routes/(dock)/offers/[id]/+page.server.ts:163`.
- [ ] Resolve `// todo: rethink validUntil, recurring and quantity` in `src/routes/(dock)/offers/new/+page.svelte:565`.
- [ ] Reduce `@ts-nocheck` / `@ts-ignore` suppression; get `bun run check` clean.
- [ ] Tests: only `complaints.spec.ts`, `iban.spec.ts`, `rest-mock.spec.ts` exist. Add coverage for payment handler, reservation lifecycle, expiration jobs, notification targeting. Add CI workflow running `check`/`lint`/`test`/`build` (only `monthly_payments.yml` exists).
- [ ] Admin data protection: confirm IBAN/Tether masking policy in admin views (open question from `Admin-dashboard--account-payment.md` task context).

## Verify-before-building (may already work)

- [ ] QR rendering in `CollectFoodModal.svelte` — confirm it draws a real QR of `claimToken`, not just the icon/text.
- [ ] `payments/zarinpal.ts` + webhook idempotency — confirm duplicate callback handling.
- [ ] ntfy topics per user vs shared — confirm `pushSubscriptions.ntfyTopic` isolation.
