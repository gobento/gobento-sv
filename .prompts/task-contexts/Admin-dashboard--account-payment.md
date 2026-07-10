id: 85d8cf1c-8471-4140-bdf6-fa486a0ef6b3
sessionId: 53467326-8fe2-4dc4-9702-bd8bcee74e9d
date: '2026-07-10T11:16:56.754Z'
label: Admin dashboard, account/payment details & payment attempt log
---
# Admin Panel: Dashboard, Account/Payment Details & Payment Log

## Goal
Give `admin` accounts:
1. **Account & payment details view** — browse all accounts with email (mail address) and their configured payment details (user IBAN/Tether, business wallet).
2. **Admin dashboard** — platform-wide stats: currently active users, account counts, transaction volume/fees/payouts, status & method breakdowns, pending settlements.
3. **Full payment log** — every payment option a user or business attempted, including failed/cancelled attempts and method switches.

## Existing building blocks
- Role gating pattern: `src/routes/(dock)/moderation/+page.server.ts` (`assertModerator`). Mirror as `assertAdmin`.
- `accounts.accountType` already supports `'admin'`; `adminProfiles` table exists.
- Nav: `src/routes/(dock)/+layout.svelte` — `admin` currently falls through to `moderatorNav`. Need a dedicated `adminNav`.
- Data: `payments` (method, status incl. `failed`, `errorMessage`, `isMock`, amounts, fees, user/business ids), `userProfiles`/`businessWallets` (IBAN/Tether), `sessions` (active users), `monthlySettlements`.
- UI: `src/lib/components/DataTable.svelte`, existing dashboard/analytics/transactions pages.

## Design

### Authorization
- New helper `assertAdmin(accountType)` throwing `error(403)` if not `'admin'`. Placed inline per-page (matching existing convention) or in a small shared module `src/lib/server/admin.ts`.

### Routes (under `src/routes/(dock)/admin/`)
- `admin/+page.server.ts` + `+page.svelte` — Dashboard stats.
- `admin/accounts/+page.server.ts` + `+page.svelte` — Accounts list with email + payment details + search.
- `admin/payments/+page.server.ts` + `+page.svelte` — Full payment/attempt log with filters.

### Navigation
- Add `adminNav` in `(dock)/+layout.svelte`: Admin Dashboard, Accounts, Payments Log, Moderation, Profile. Switch `case 'admin'` to use it.

### Dashboard metrics
- Currently active users: distinct `sessions.accountId` where `expiresAt > now` (optionally split by account type).
- Account counts by type.
- Transaction totals (all-time + last 30d): gross volume, platform fees, business payout amounts, counts by `status` and by `paymentMethod`.
- Pending settlement/payout totals from `monthlySettlements`.

### Payment log (requirement #3) — DECISION PENDING
- **Option A (no migration):** Render existing `payments` rows as the log. Each row has method + status (incl. `failed`) + errorMessage. Fast, no schema change; but Tether→IBAN fallback currently orphans the original Tether row as `pending`, so switches/cancellations aren't cleanly labelled.
- **Option B (with migration):** Add a dedicated `payment_attempts` table + instrument `PaymentHandler` to record each attempt (method, outcome, reason, actor). Most complete "full log"; requires a Drizzle migration + handler changes.

## Verification
- `assertAdmin` blocks non-admins (403) on all three pages.
- Admin nav renders for admin accounts.
- Dashboard numbers reconcile with DB.
- Type-check / lint / build pass; add/adjust tests where feasible.

## Open questions (confirm before building)
1. Payment log: Option A (existing `payments`) or Option B (new `payment_attempts` table + handler instrumentation)?
2. "Payment details" sensitivity: OK to show full IBAN/Tether addresses to admins, or mask (e.g. last 4)?
3. "Currently active users" definition: non-expired sessions (my default) or active reservations / recent activity?
