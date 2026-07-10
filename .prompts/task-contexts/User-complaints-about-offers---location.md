id: 89c6a73a-6e28-4e0c-a3f1-692144b4db61
sessionId: 9e3841b8-b784-49ab-94e3-83efca7508bb
date: '2026-07-10T10:32:44.684Z'
label: User complaints about offers & locations
---
# Feature: User complaints about offers/locations with company notification

## Goal
Let a **user** file a complaint about a specific **offer** or **location**. The **company** (business account that owns the offer/location) receives a notification and can view and **resolve** complaints.

## Design

### Data model — new `complaints` table (`src/lib/server/schema.ts`)
- `id` (pk)
- `reporterAccountId` → accounts (the user)
- `businessAccountId` → accounts (the company that must resolve it)
- `targetType` enum: `offer` | `location`
- `offerId` → businessOffers (nullable)
- `locationId` → businessLocations (nullable)
- `category` enum: quality / expired / unavailable / incorrect_info / hygiene / other
- `message` text
- `status` enum: `open` | `resolved` (default `open`)
- `resolutionNote` text (nullable)
- `resolvedByAccountId` → accounts (nullable)
- `createdAt`, `resolvedAt`

### Notifications (`src/lib/server/notifications.ts`)
- `notifyAccount(accountId, payload)` — sends ntfy to a specific account's active push subscriptions (mirrors existing `notifyAllSubscribers`).
- `notifyComplaint({...})` — builds the payload and calls `notifyAccount(businessAccountId, ...)` with a click link to `/complaints`.

### Shared validation (`src/lib/complaints.ts`)
- `COMPLAINT_CATEGORIES` list + labels
- `complaintSchema` (valibot): category picklist + message (10–1000 chars)

### UI
- Reusable `src/lib/components/ComplaintModal.svelte` (uses existing `Modal` + `Alert`), posts to `?/submitComplaint`.
- "Report a problem" button on:
  - Offer detail page `(dock)/offers/[id]/+page.svelte`
  - Location detail page `(dock)/locations/[id]/+page.svelte`
- Both `+page.server.ts` gain a `submitComplaint` action (valibot-validated) that inserts a complaint and calls `notifyComplaint`.

### Company management
- New route `(dock)/complaints/` (`+page.server.ts` + `+page.svelte`), business-only.
  - Lists complaints for the business, `resolveComplaint` action.
- Add "Complaints" item to `businessNav` in `(dock)/+layout.svelte`.

## Verification
- `npm run check` (svelte-check / typecheck)
- `npm run lint`
- `npm run build`
