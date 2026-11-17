// src/lib/server/mock/seed.spec.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createMockDatabase, type MockDatabase } from './database';
import { seedMockDatabase } from './seed';
import { DEMO_ACCOUNTS } from './demo-accounts';
import { getMockFile } from './storage';
import * as t from '../schema';

// A fixed clock keeps every relative date in the seed reproducible.
const NOW = new Date('2026-03-12T14:30:00Z');

let mock: MockDatabase;

/** Rows of a raw query; the mock database already returns postgres-js style arrays. */
async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
	return (await mock.db.execute(query)) as unknown as T[];
}

beforeAll(async () => {
	mock = await createMockDatabase();
	await seedMockDatabase(mock.db, NOW);
});

afterAll(() => mock?.close());

describe('demo seed', () => {
	it('creates every demo account with the role the sign-in screen promises', async () => {
		const accounts = await mock.db.select().from(t.accounts);
		const byId = new Map(accounts.map((a) => [a.id, a.accountType]));
		const expected: Record<keyof typeof DEMO_ACCOUNTS, string> = {
			user: 'user',
			business: 'business',
			charity: 'charity',
			moderator: 'moderator',
			admin: 'admin',
			staff: 'employee',
			charityStaff: 'employee'
		};
		for (const [role, id] of Object.entries(DEMO_ACCOUNTS)) {
			expect(byId.get(id), role).toBe(expected[role as keyof typeof DEMO_ACCOUNTS]);
		}
	});

	it('gives every business and charity account a profile', async () => {
		const missing = await rows<{ id: string }>(sql`
			select a.id from accounts a
			left join business_profiles b on b.account_id = a.id
			left join charity_profiles c on c.account_id = a.id
			where (a.account_type = 'business' and b.account_id is null)
			   or (a.account_type = 'charity' and c.account_id is null)`);
		expect(missing).toEqual([]);
	});

	it('only lists offers at a location of the same business', async () => {
		const mismatched = await rows<{ id: string }>(sql`
			select o.id from business_offers o
			join business_locations l on l.id = o.location_id
			where l.business_account_id <> o.business_account_id`);
		expect(mismatched).toEqual([]);
	});

	it('places staff at a location of their own employer', async () => {
		const mismatched = await rows<{ account_id: string }>(sql`
			select e.account_id from employees e
			join business_locations l on l.id = e.location_id
			where l.business_account_id <> e.employer_account_id`);
		expect(mismatched).toEqual([]);
	});

	it('records a payment for every reservation', async () => {
		const unpaid = await rows<{ id: string }>(sql`
			select r.id from reservations r
			left join payments p on p.reservation_id = r.id
			where p.id is null`);
		expect(unpaid).toEqual([]);
	});

	it('keeps pickup windows well-formed', async () => {
		const reservations = await mock.db.select().from(t.reservations);
		expect(reservations.length).toBeGreaterThan(20);
		for (const r of reservations) {
			expect(r.pickupUntil.getTime(), r.id).toBeGreaterThan(r.pickupFrom.getTime());
			expect(r.reservedAt.getTime(), r.id).toBeLessThanOrEqual(r.pickupUntil.getTime());
		}
	});

	it('has an upcoming pickup for the demo user, so the tickets page is never empty', async () => {
		const upcoming = await rows<{ id: string }>(sql`
			select id from reservations
			where user_account_id = ${DEMO_ACCOUNTS.user}
			  and status = 'active'
			  and pickup_until > ${NOW.toISOString()}::timestamptz`);
		expect(upcoming.length).toBeGreaterThan(0);
	});

	it('stores the artwork of every seeded file in mock storage', async () => {
		const files = await mock.db.select().from(t.files);
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const stored = getMockFile(file.key);
			expect(stored, file.key).toBeDefined();
			expect(String(stored?.body)).toContain('<svg');
		}
	});

	it('schedules the active regular gift in the future and leaves proposals unscheduled', async () => {
		const gifts = await mock.db.select().from(t.recurringGifts);
		for (const gift of gifts) {
			if (gift.status === 'active') {
				expect(gift.nextOccurrenceAt?.getTime(), gift.id).toBeGreaterThan(NOW.getTime());
			} else {
				expect(gift.nextOccurrenceAt, gift.id).toBeNull();
			}
		}
	});

	it('seeds a fresh database with the same rows every time', async () => {
		const other = await createMockDatabase();
		try {
			await seedMockDatabase(other.db, NOW);
			const ids = async (db: MockDatabase['db']) =>
				(await db.select({ id: t.reservations.id }).from(t.reservations)).map((r) => r.id).sort();
			expect(await ids(other.db)).toEqual(await ids(mock.db));
		} finally {
			await other.close();
		}
	});
});
