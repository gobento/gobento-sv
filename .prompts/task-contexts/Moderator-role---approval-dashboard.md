id: fc04cd3d-e612-4a01-b89f-6f129f13935a
sessionId: 23d55a15-2c42-4d81-97c2-27c24e335e6c
date: '2026-07-10T11:08:51.896Z'
label: Moderator role + approval dashboard for new businesses/charities
---
# Moderator role + approval dashboard

## Goal
Introduce a `moderator` account type whose members get a dashboard listing **pending new business and charity accounts**, and can **approve/reject** them (with optional notes). Also align account types with the agreed set:

`['user', 'moderator', 'charity', 'business', 'administrator']`
(i.e. add `moderator`, rename existing `admin` → `administrator`).

## Design

### 1. Schema (`src/lib/server/schema.ts`)
- `accounts.accountType` enum → `['user', 'moderator', 'charity', 'business', 'administrator']`.
- Add verification fields to `businessProfiles` (mirror the existing `charityProfiles` ones):
  - `verificationStatus` `'pending' | 'verified' | 'rejected'` default `'pending'`
  - `verificationNotes` (text, nullable)
  - `verifiedAt` (timestamptz, nullable)
  - `verifiedByAccountId` (fk → accounts.id, set null)
- `charityProfiles` already has these — no change.

### 2. Migration (`drizzle/0004_add_moderator_and_business_verification.sql` + journal entry)
- `UPDATE accounts SET account_type = 'administrator' WHERE account_type = 'admin';`
- Add the 4 business verification columns + FK constraint.
- `accountType` is a Drizzle-level text enum (not a Postgres enum), so no `ALTER TYPE` is needed — adding `moderator`/`administrator` is code-only.

### 3. Rename `admin` → `administrator` in code
- `src/routes/(authorized)/api/admin/process-payouts/+server.ts` (2 checks)
- `src/routes/(dock)/profile/+page.svelte` (`isAdmin` derived + `case 'admin'`)

### 4. Moderator dashboard route: `src/routes/(dock)/moderation/`
- `+page.server.ts`:
  - Guard: `accountType` must be `moderator` or `administrator`, else 403.
  - `load`: fetch pending (and optionally recently-reviewed) business + charity profiles with account email + profile picture.
  - Actions: `approve` / `reject` — set status, `verifiedAt`, `verifiedByAccountId`, `verificationNotes`. Reused for both entity types via a `kind` field.
- `+page.svelte`: cards grouped/badged by kind + status, approve/reject forms (follows the `complaints` page pattern + `BaseLayout`).

### 5. Navigation (`src/routes/(dock)/+layout.svelte`)
- Add `moderatorNav` (Dashboard/Moderation + Profile) and select it for `moderator` (and `administrator`).

## Confirmed decisions
- **A. Keep `admin`** as-is (no rename). Only **add `moderator`**. Enum → `['user', 'moderator', 'business', 'charity', 'admin']`.
- **B. Add business verification fields** (mirror charity) — businesses need approval too.
- **C. Gate offers**: unverified businesses are **blocked from posting offers** until a moderator approves them. Enforce server-side in `offers/new` load+action and the create action in `offers`; hide the "new offer" CTA in the UI.
- **D. Moderator creation**: out of scope (set `account_type='moderator'` in DB for now).

## Verification
- `npm run check` (svelte-check) + `npm run lint`.
- Manual: log in as a moderator, see pending list, approve/reject, confirm status changes.