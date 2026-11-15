// src/lib/server/mock/seed.ts
/**
 * Demo data for mock mode: one account per role plus enough businesses,
 * offers, reservations, payments and moderation work that every screen has
 * something realistic to show. All ids are stable so tests can refer to them.
 */
import bagel from '~icons/fluent-emoji-flat/bagel?raw';
import basket from '~icons/fluent-emoji-flat/basket?raw';
import bento from '~icons/fluent-emoji-flat/bento-box?raw';
import bread from '~icons/fluent-emoji-flat/bread?raw';
import croissant from '~icons/fluent-emoji-flat/croissant?raw';
import cupcake from '~icons/fluent-emoji-flat/cupcake?raw';
import curry from '~icons/fluent-emoji-flat/curry-rice?raw';
import apple from '~icons/fluent-emoji-flat/green-apple?raw';
import salad from '~icons/fluent-emoji-flat/green-salad?raw';
import hearts from '~icons/fluent-emoji-flat/heart-hands?raw';
import pancakes from '~icons/fluent-emoji-flat/pancakes?raw';
import pizza from '~icons/fluent-emoji-flat/pizza?raw';
import pot from '~icons/fluent-emoji-flat/pot-of-food?raw';
import sandwich from '~icons/fluent-emoji-flat/sandwich?raw';
import shortcake from '~icons/fluent-emoji-flat/shortcake?raw';
import type { Database } from './database';
import { DEMO_ACCOUNTS } from './demo-accounts';
import * as t from '../schema';
import { logoSvg, photoSvg, putMockFile } from './storage';
import { nextOccurrence, todayIn, type GiftSchedule } from '../../recurringGifts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const DEMO_IBAN = 'DE89370400440532013000';

export async function seedMockDatabase(db: Database, now = new Date()): Promise<void> {
	const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);
	/** Today at the given local hour — keeps "pick up today" cards realistic. */
	const todayAt = (hour: number, dayOffset = 0) => {
		const date = new Date(now);
		date.setDate(date.getDate() + dayOffset);
		date.setHours(hour, 0, 0, 0);
		return date;
	};

	// --- Accounts -----------------------------------------------------------
	const account = (id: string, accountType: t.Account['accountType'], daysAgo = 60) => ({
		id,
		email: `${id}@example.com`,
		accountType,
		createdAt: at(-daysAgo * DAY)
	});

	await db
		.insert(t.accounts)
		.values([
			account(DEMO_ACCOUNTS.user, 'user', 90),
			account('user-lena', 'user', 45),
			account('user-omid', 'user', 12),
			account(DEMO_ACCOUNTS.business, 'business', 120),
			account('biz-sakura', 'business', 80),
			account('biz-morgenrot', 'business', 70),
			account('biz-korb', 'business', 64),
			account('biz-forno', 'business', 40),
			account('biz-lindenhof', 'business', 30),
			account('biz-suppe', 'business', 2),
			account(DEMO_ACCOUNTS.charity, 'charity', 100),
			account('charity-mahlzeit', 'charity', 50),
			account('charity-alle', 'charity', 1),
			account(DEMO_ACCOUNTS.moderator, 'moderator', 150),
			account(DEMO_ACCOUNTS.admin, 'admin', 200)
		]);

	await db.insert(t.adminProfiles).values({ accountId: DEMO_ACCOUNTS.admin });

	await db.insert(t.userProfiles).values([
		{
			accountId: DEMO_ACCOUNTS.user,
			ibanNumber: DEMO_IBAN,
			ibanEnabled: true,
			ibanConfirmed: true,
			preferredPaymentMethod: 'iban'
		},
		{ accountId: 'user-lena' },
		{ accountId: 'user-omid' }
	]);

	// --- Files (placeholder artwork) ----------------------------------------
	const fileRows: (typeof t.files.$inferInsert)[] = [];
	// `?raw` icon imports are SVG strings at runtime, but the icon plugin's
	// typings describe every `~icons/*` module as a component.
	const image = (id: string, kind: 'logo' | 'photo', svg: unknown, hue: number, owner: string) => {
		const icon = svg as string;
		const key = `mock/${id}.svg`;
		const body = kind === 'logo' ? logoSvg(icon, hue) : photoSvg(icon, hue);
		putMockFile(key, { body, contentType: 'image/svg+xml' });
		fileRows.push({
			id: `file-${id}`,
			key,
			fileName: `${id}.svg`,
			contentType: 'image/svg+xml',
			sizeBytes: body.length,
			uploadedBy: owner
		});
		return `file-${id}`;
	};

	const B = DEMO_ACCOUNTS.business;
	const img = {
		kiezLogo: image('logo-kiez', 'logo', croissant, 32, B),
		kiezKreuzberg: image('loc-kiez-kreuzberg', 'photo', bread, 32, B),
		kiezPrenzl: image('loc-kiez-prenzlauer', 'photo', bagel, 22, B),
		pastryBag: image('offer-pastry-bag', 'photo', croissant, 38, B),
		breadBox: image('offer-bread-box', 'photo', bread, 28, B),
		sakuraLogo: image('logo-sakura', 'logo', bento, 345, 'biz-sakura'),
		sakuraMitte: image('loc-sakura', 'photo', bento, 345, 'biz-sakura'),
		bentoBox: image('offer-bento', 'photo', bento, 350, 'biz-sakura'),
		curryBowl: image('offer-curry', 'photo', curry, 20, 'biz-sakura'),
		morgenrotLogo: image('logo-morgenrot', 'logo', cupcake, 300, 'biz-morgenrot'),
		morgenrotLoc: image('loc-morgenrot', 'photo', shortcake, 310, 'biz-morgenrot'),
		cakeBundle: image('offer-cake', 'photo', shortcake, 320, 'biz-morgenrot'),
		korbLogo: image('logo-korb', 'logo', basket, 130, 'biz-korb'),
		korbLoc: image('loc-korb', 'photo', basket, 110, 'biz-korb'),
		veggieCrate: image('offer-veggie', 'photo', salad, 120, 'biz-korb'),
		fruitBasket: image('offer-fruit', 'photo', apple, 90, 'biz-korb'),
		fornoLogo: image('logo-forno', 'logo', pizza, 8, 'biz-forno'),
		fornoLoc: image('loc-forno', 'photo', pizza, 12, 'biz-forno'),
		pizzaBox: image('offer-pizza', 'photo', pizza, 16, 'biz-forno'),
		lindenhofLogo: image('logo-lindenhof', 'logo', pancakes, 200, 'biz-lindenhof'),
		lindenhofLoc: image('loc-lindenhof', 'photo', pancakes, 205, 'biz-lindenhof'),
		breakfastBox: image('offer-breakfast', 'photo', sandwich, 48, 'biz-lindenhof'),
		suppeLogo: image('logo-suppe', 'logo', pot, 170, 'biz-suppe'),
		tafelLogo: image('logo-tafel', 'logo', hearts, 260, DEMO_ACCOUNTS.charity),
		mahlzeitLogo: image('logo-mahlzeit', 'logo', pot, 15, 'charity-mahlzeit'),
		alleLogo: image('logo-alle', 'logo', hearts, 190, 'charity-alle')
	};
	await db.insert(t.files).values(fileRows);

	// --- Businesses ---------------------------------------------------------
	const verified = {
		verificationStatus: 'verified' as const,
		verifiedAt: at(-20 * DAY),
		verifiedByAccountId: DEMO_ACCOUNTS.moderator
	};

	await db.insert(t.businessProfiles).values([
		{
			accountId: B,
			name: 'Kiez Bäckerei',
			description:
				'Neighbourhood bakery baking sourdough, rolls and pastries fresh every morning since 1987.',
			country: 'Germany',
			businessType: 'bakery',
			profilePictureId: img.kiezLogo,
			...verified
		},
		{
			accountId: 'biz-sakura',
			name: 'Sakura Bento',
			description: 'Handmade bento boxes, sushi and warm bowls prepared daily.',
			country: 'Germany',
			businessType: 'restaurant',
			profilePictureId: img.sakuraLogo,
			...verified
		},
		{
			accountId: 'biz-morgenrot',
			name: 'Café Morgenrot',
			description: 'Cosy corner café with home-baked cakes and specialty coffee.',
			country: 'Germany',
			businessType: 'cafe',
			profilePictureId: img.morgenrotLogo,
			...verified
		},
		{
			accountId: 'biz-korb',
			name: 'Grüner Korb',
			description: 'Organic greengrocer with regional fruit and vegetables.',
			country: 'Germany',
			businessType: 'grocery',
			profilePictureId: img.korbLogo,
			...verified
		},
		{
			accountId: 'biz-forno',
			name: 'Forno Rosso',
			description: 'Wood-fired Neapolitan pizza by the slice or the pie.',
			country: 'Germany',
			businessType: 'restaurant',
			profilePictureId: img.fornoLogo,
			...verified
		},
		{
			accountId: 'biz-lindenhof',
			name: 'Hotel Lindenhof',
			description: 'Boutique hotel with a generous breakfast buffet.',
			country: 'Germany',
			businessType: 'hotel',
			profilePictureId: img.lindenhofLogo,
			...verified
		},
		{
			accountId: 'biz-suppe',
			name: 'Neue Suppenküche',
			description: 'Soup and stew catering for offices and events. Awaiting verification.',
			country: 'Germany',
			businessType: 'catering',
			profilePictureId: img.suppeLogo
		}
	]);

	await db.insert(t.businessWallets).values(
		['biz-sakura', 'biz-morgenrot', 'biz-korb', 'biz-forno', 'biz-lindenhof', B].map((id) => ({
			accountId: id,
			ibanNumber: DEMO_IBAN,
			ibanEnabled: true,
			ibanConfirmed: true,
			// USDT too, so demo mode can walk through the crypto checkout.
			tetherAddress: '0x' + '7'.repeat(40),
			tetherEnabled: true,
			preferredPaymentMethod: 'iban' as const
		}))
	);

	const location = (
		id: string,
		businessAccountId: string,
		name: string,
		address: string,
		zipCode: string,
		latitude: number,
		longitude: number,
		imageId: string
	) => ({
		id,
		businessAccountId,
		name,
		address,
		city: 'Berlin',
		province: 'Berlin',
		zipCode,
		country: 'Germany',
		latitude,
		longitude,
		imageId
	});

	await db
		.insert(t.businessLocations)
		.values([
			location(
				'loc-kiez-kreuzberg',
				B,
				'Kiez Bäckerei Kreuzberg',
				'Oranienstraße 24',
				'10999',
				52.4995,
				13.4183,
				img.kiezKreuzberg
			),
			location(
				'loc-kiez-prenzlauer',
				B,
				'Kiez Bäckerei Prenzlauer Berg',
				'Kastanienallee 71',
				'10435',
				52.5381,
				13.4094,
				img.kiezPrenzl
			),
			location(
				'loc-sakura',
				'biz-sakura',
				'Sakura Bento Mitte',
				'Rosenthaler Straße 40',
				'10178',
				52.5254,
				13.4025,
				img.sakuraMitte
			),
			location(
				'loc-morgenrot',
				'biz-morgenrot',
				'Café Morgenrot',
				'Weserstraße 58',
				'12045',
				52.4862,
				13.4352,
				img.morgenrotLoc
			),
			location(
				'loc-korb',
				'biz-korb',
				'Grüner Korb Friedrichshain',
				'Boxhagener Straße 96',
				'10245',
				52.5108,
				13.4611,
				img.korbLoc
			),
			location(
				'loc-forno',
				'biz-forno',
				'Forno Rosso',
				'Akazienstraße 12',
				'10823',
				52.4889,
				13.3541,
				img.fornoLoc
			),
			location(
				'loc-lindenhof',
				'biz-lindenhof',
				'Hotel Lindenhof',
				'Kantstraße 105',
				'10627',
				52.5063,
				13.3049,
				img.lindenhofLoc
			)
		]);

	// --- Offers -------------------------------------------------------------
	const offer = (
		id: string,
		businessAccountId: string,
		locationId: string,
		imageId: string,
		name: string,
		description: string,
		originalValue: number,
		price: number,
		pickup: [string, string],
		extra: Partial<typeof t.businessOffers.$inferInsert> = {}
	) => ({
		id,
		businessAccountId,
		locationId,
		imageId,
		name,
		description,
		originalValue,
		price,
		currency: 'EUR',
		quantity: 5,
		isRecurring: true,
		pickupTimeFrom: `${pickup[0]}:00`,
		pickupTimeUntil: `${pickup[1]}:00`,
		createdAt: at(-14 * DAY),
		...extra
	});

	await db
		.insert(t.businessOffers)
		.values([
			offer(
				'offer-pastry-bag',
				B,
				'loc-kiez-kreuzberg',
				img.pastryBag,
				'Surprise pastry bag',
				'Croissants, cinnamon rolls and whatever else is left on the counter at closing time. Usually 5–6 pieces.',
				14,
				4.5,
				['18:00', '19:30'],
				{ quantity: 8 }
			),
			offer(
				'offer-bread-box',
				B,
				'loc-kiez-prenzlauer',
				img.breadBox,
				'Bread of the day box',
				'Two loaves of sourdough or rye plus a handful of rolls from today’s bake.',
				11,
				3.9,
				['17:30', '19:00']
			),
			offer(
				'offer-old-stollen',
				B,
				'loc-kiez-kreuzberg',
				img.breadBox,
				'Weekend stollen special',
				'Paused seasonal offer.',
				18,
				6,
				['16:00', '18:00'],
				{ isActive: false, isRecurring: false, validUntil: at(-3 * DAY) }
			),
			offer(
				'offer-bento',
				'biz-sakura',
				'loc-sakura',
				img.bentoBox,
				'Bento surprise box',
				'A full bento with rice, a main, pickles and two sides — the chef picks what’s left from lunch service.',
				16.5,
				5.9,
				['20:30', '21:30'],
				{ quantity: 6 }
			),
			offer(
				'offer-curry',
				'biz-sakura',
				'loc-sakura',
				img.curryBowl,
				'Japanese curry bowl',
				'Katsu or vegetable curry with rice. Bring your own container for a bigger portion.',
				12,
				4.5,
				['21:00', '21:45'],
				{ quantity: 3, isRecurring: false, validUntil: at(2 * DAY) }
			),
			offer(
				'offer-cake',
				'biz-morgenrot',
				'loc-morgenrot',
				img.cakeBundle,
				'Cake & coffee bundle',
				'Three slices of today’s cakes and a filter coffee to go.',
				15,
				5,
				['17:00', '18:00'],
				{ quantity: 4 }
			),
			offer(
				'offer-veggie',
				'biz-korb',
				'loc-korb',
				img.veggieCrate,
				'Veggie rescue crate',
				'Around 4 kg of seasonal vegetables that are perfectly good but no longer shelf-pretty.',
				20,
				6.5,
				['18:30', '19:30'],
				{ quantity: 10 }
			),
			offer(
				'offer-fruit',
				'biz-korb',
				'loc-korb',
				img.fruitBasket,
				'Ripe fruit basket',
				'Bananas, apples and soft fruit at peak ripeness — ideal for smoothies and baking.',
				12,
				3.5,
				['18:30', '19:30'],
				{ quantity: 2 }
			),
			offer(
				'offer-pizza',
				'biz-forno',
				'loc-forno',
				img.pizzaBox,
				'Pizza slice box',
				'Six mixed slices from the evening’s pies, boxed and ready to reheat.',
				18,
				5.5,
				['22:00', '22:45'],
				{ quantity: 5 }
			),
			offer(
				'offer-breakfast',
				'biz-lindenhof',
				'loc-lindenhof',
				img.breakfastBox,
				'Breakfast buffet box',
				'Rolls, cheese, cold cuts, fruit and pastries from the morning buffet.',
				22,
				6.9,
				['10:30', '11:30'],
				{ quantity: 7 }
			)
		]);

	// --- Favourites ---------------------------------------------------------
	await db.insert(t.favoriteLocations).values([
		{ accountId: DEMO_ACCOUNTS.user, locationId: 'loc-kiez-kreuzberg' },
		{ accountId: DEMO_ACCOUNTS.user, locationId: 'loc-sakura' },
		{ accountId: DEMO_ACCOUNTS.user, locationId: 'loc-korb' },
		{ accountId: 'user-lena', locationId: 'loc-kiez-kreuzberg' },
		{ accountId: 'user-omid', locationId: 'loc-kiez-prenzlauer' }
	]);

	// --- Reservations + payments -------------------------------------------
	interface Booking {
		id: string;
		offerId: string;
		business: string;
		user: string;
		price: number;
		status: t.Reservation['status'];
		reservedAt: Date;
		pickupFrom: Date;
		pickupUntil: Date;
	}

	const bookings: Booking[] = [
		{
			id: 'res-active-today',
			offerId: 'offer-bento',
			business: 'biz-sakura',
			user: DEMO_ACCOUNTS.user,
			price: 5.9,
			status: 'active',
			reservedAt: at(-3 * HOUR),
			pickupFrom: todayAt(20),
			pickupUntil: todayAt(22)
		},
		{
			id: 'res-active-tomorrow',
			offerId: 'offer-pastry-bag',
			business: B,
			user: DEMO_ACCOUNTS.user,
			price: 4.5,
			status: 'active',
			reservedAt: at(-1 * HOUR),
			pickupFrom: todayAt(18, 1),
			pickupUntil: todayAt(20, 1)
		},
		{
			id: 'res-claimed',
			offerId: 'offer-veggie',
			business: 'biz-korb',
			user: DEMO_ACCOUNTS.user,
			price: 6.5,
			status: 'claimed',
			reservedAt: at(-2 * DAY),
			pickupFrom: todayAt(18, -2),
			pickupUntil: todayAt(20, -2)
		},
		{
			id: 'res-expired',
			offerId: 'offer-cake',
			business: 'biz-morgenrot',
			user: DEMO_ACCOUNTS.user,
			price: 5,
			status: 'expired',
			reservedAt: at(-9 * DAY),
			pickupFrom: todayAt(17, -9),
			pickupUntil: todayAt(18, -9)
		}
	];

	// A month of history for the demo business so its charts have a shape, plus
	// completed pickups for the demo user so the impact page has numbers.
	const customers = [DEMO_ACCOUNTS.user, 'user-lena', 'user-omid'];
	for (let day = 1; day <= 28; day += 1) {
		const count = 1 + ((day * 7) % 3);
		for (let n = 0; n < count; n += 1) {
			const pastry = (day + n) % 2 === 0;
			const hour = 17 + ((day + n) % 3);
			bookings.push({
				id: `res-hist-${day}-${n}`,
				offerId: pastry ? 'offer-pastry-bag' : 'offer-bread-box',
				business: B,
				user: customers[(day + n) % customers.length],
				price: pastry ? 4.5 : 3.9,
				status: day % 9 === 0 && n === 0 ? 'expired' : 'completed',
				reservedAt: todayAt(hour - 5, -day),
				pickupFrom: todayAt(hour, -day),
				pickupUntil: todayAt(hour + 1, -day)
			});
		}
	}
	const elsewhere: [string, string, number][] = [
		['offer-bento', 'biz-sakura', 5.9],
		['offer-veggie', 'biz-korb', 6.5],
		['offer-pizza', 'biz-forno', 5.5],
		['offer-breakfast', 'biz-lindenhof', 6.9],
		['offer-fruit', 'biz-korb', 3.5]
	];
	elsewhere.forEach(([offerId, business, price], index) => {
		const day = 4 + index * 6;
		bookings.push({
			id: `res-user-${index}`,
			offerId,
			business,
			user: DEMO_ACCOUNTS.user,
			price,
			status: 'completed',
			reservedAt: todayAt(12, -day),
			pickupFrom: todayAt(19, -day),
			pickupUntil: todayAt(20, -day)
		});
	});

	await db.insert(t.reservations).values(
		bookings.map((b) => ({
			id: b.id,
			offerId: b.offerId,
			userAccountId: b.user,
			status: b.status,
			pickupFrom: b.pickupFrom,
			pickupUntil: b.pickupUntil,
			reservedAt: b.reservedAt,
			claimedAt: b.status === 'claimed' || b.status === 'completed' ? b.pickupFrom : null,
			completedAt: b.status === 'completed' ? b.pickupFrom : null,
			claimToken: `claim-${b.id}`
		}))
	);

	const FEE = 0.05;
	await db.insert(t.payments).values(
		bookings.map((b) => {
			const fee = Math.round(b.price * FEE * 100) / 100;
			const old = b.reservedAt.getTime() < now.getTime() - 20 * DAY;
			return {
				id: `pay-${b.id}`,
				offerId: b.offerId,
				userAccountId: b.user,
				businessAccountId: b.business,
				amount: b.price,
				currency: 'EUR',
				amountUsdt: Math.round(b.price * 1.08 * 100) / 100,
				paymentMethod: 'iban' as const,
				feeAmount: fee,
				businessAmount: Math.round((b.price - fee) * 100) / 100,
				status: 'completed' as const,
				ibanReference: `GB-${b.id.toUpperCase()}`,
				isMock: true,
				reservationId: b.id,
				payoutStatus: old ? ('paid_out' as const) : ('pending_payout' as const),
				paidOutAt: old ? at(-5 * DAY) : null,
				createdAt: b.reservedAt,
				completedAt: b.reservedAt
			};
		})
	);

	// One abandoned checkout so "failed" states are represented too.
	await db.insert(t.payments).values({
		id: 'pay-failed',
		offerId: 'offer-pizza',
		userAccountId: 'user-lena',
		businessAccountId: 'biz-forno',
		amount: 5.5,
		currency: 'EUR',
		amountUsdt: 5.94,
		paymentMethod: 'tether',
		feeAmount: 0.28,
		businessAmount: 5.22,
		status: 'failed',
		isMock: true,
		errorMessage: 'Transfer was not confirmed in time',
		createdAt: at(-6 * HOUR)
	});

	await db.insert(t.paymentAttempts).values([
		{
			id: 'attempt-1',
			paymentId: 'pay-failed',
			offerId: 'offer-pizza',
			userAccountId: 'user-lena',
			businessAccountId: 'biz-forno',
			paymentMethod: 'tether',
			amount: 5.5,
			currency: 'EUR',
			outcome: 'failed',
			reason: 'Transfer was not confirmed in time',
			isMock: true,
			createdAt: at(-6 * HOUR)
		},
		{
			id: 'attempt-2',
			paymentId: 'pay-res-active-today',
			offerId: 'offer-bento',
			userAccountId: DEMO_ACCOUNTS.user,
			businessAccountId: 'biz-sakura',
			paymentMethod: 'iban',
			amount: 5.9,
			currency: 'EUR',
			outcome: 'completed',
			isMock: true,
			createdAt: at(-3 * HOUR)
		}
	]);

	// --- Settlements --------------------------------------------------------
	const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const monthKey = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	await db.insert(t.monthlySettlements).values([
		{
			id: 'settlement-last',
			businessAccountId: B,
			month: monthKey(lastMonth),
			year: lastMonth.getFullYear(),
			ibanTotalAmount: 142.6,
			ibanPaymentCount: 34,
			ibanCurrency: 'EUR',
			status: 'paid',
			ibanPaidAt: at(-5 * DAY),
			ibanTransactionRef: 'SEPA-2291-KIEZ'
		},
		{
			id: 'settlement-current',
			businessAccountId: B,
			month: monthKey(now),
			year: now.getFullYear(),
			ibanTotalAmount: 61.3,
			ibanPaymentCount: 15,
			ibanCurrency: 'EUR',
			status: 'pending'
		}
	]);

	// --- Charities ----------------------------------------------------------
	await db.insert(t.charityProfiles).values([
		{
			accountId: DEMO_ACCOUNTS.charity,
			name: 'Berliner Tafelrunde',
			description: 'Volunteers collecting surplus food for 40 neighbourhood distribution points.',
			country: 'Germany',
			profilePictureId: img.tafelLogo,
			registrationNumber: 'VR 20418 B',
			contactEmail: 'kontakt@tafelrunde.example',
			...verified
		},
		{
			accountId: 'charity-mahlzeit',
			name: 'Warme Mahlzeit e.V.',
			description: 'Cooks and serves hot meals to people without a home, every evening.',
			country: 'Germany',
			profilePictureId: img.mahlzeitLogo,
			registrationNumber: 'VR 31177 B',
			contactEmail: 'hallo@warme-mahlzeit.example',
			...verified
		},
		{
			accountId: 'charity-alle',
			name: 'Essen für Alle',
			description: 'New student-run initiative sharing rescued food on campus.',
			country: 'Germany',
			profilePictureId: img.alleLogo,
			registrationNumber: 'VR 40902 B',
			contactEmail: 'team@essen-fuer-alle.example'
		}
	]);

	await db.insert(t.charityFoodPreferences).values([
		{ charityAccountId: DEMO_ACCOUNTS.charity, foodType: 'bakery' },
		{ charityAccountId: DEMO_ACCOUNTS.charity, foodType: 'produce' },
		{ charityAccountId: DEMO_ACCOUNTS.charity, foodType: 'packaged_dry' },
		{ charityAccountId: 'charity-mahlzeit', foodType: 'prepared_meals' },
		{ charityAccountId: 'charity-mahlzeit', foodType: 'produce' },
		{ charityAccountId: 'charity-mahlzeit', foodType: 'dairy' }
	]);

	await db.insert(t.pickupRequests).values([
		{
			id: 'pickup-pending',
			businessAccountId: B,
			charityAccountId: DEMO_ACCOUNTS.charity,
			locationId: 'loc-kiez-kreuzberg',
			foodType: 'bakery',
			message: 'About 30 rolls and 6 loaves left after closing today. Can you collect?',
			proposedPickupFrom: todayAt(19),
			proposedPickupUntil: todayAt(20),
			createdAt: at(-2 * HOUR)
		},
		{
			id: 'pickup-accepted',
			businessAccountId: 'biz-korb',
			charityAccountId: DEMO_ACCOUNTS.charity,
			locationId: 'loc-korb',
			foodType: 'produce',
			message: 'Two crates of mixed vegetables, a little bruised but fine.',
			proposedPickupFrom: todayAt(18, 1),
			proposedPickupUntil: todayAt(19, 1),
			status: 'accepted',
			createdAt: at(-1 * DAY),
			respondedAt: at(-20 * HOUR)
		},
		{
			id: 'pickup-completed',
			businessAccountId: B,
			charityAccountId: 'charity-mahlzeit',
			locationId: 'loc-kiez-prenzlauer',
			foodType: 'bakery',
			message: 'Leftover bread from the weekend market stall.',
			proposedPickupFrom: todayAt(17, -6),
			proposedPickupUntil: todayAt(18, -6),
			status: 'completed',
			createdAt: at(-7 * DAY),
			respondedAt: at(-7 * DAY + 3 * HOUR)
		}
	]);

	// --- Regular gifts --------------------------------------------------------
	const zone = 'Europe/Berlin';
	const weeklyBread: GiftSchedule = {
		frequency: 'weekly',
		weekday: 5, // Friday
		dayOfMonth: null,
		timeFrom: '19:00',
		timeUntil: '20:00',
		timeZone: zone,
		startsOn: todayIn(zone, at(-35 * DAY))
	};
	const biweeklyVeg: GiftSchedule = {
		frequency: 'biweekly',
		weekday: 2, // Tuesday
		dayOfMonth: null,
		timeFrom: '17:30',
		timeUntil: '18:30',
		timeZone: zone,
		startsOn: todayIn(zone, now)
	};
	const giftRow = (
		id: string,
		businessAccountId: string,
		charityAccountId: string,
		locationId: string,
		foodType: t.RecurringGift['foodType'],
		message: string,
		schedule: GiftSchedule,
		status: t.RecurringGift['status']
	) => ({
		id,
		businessAccountId,
		charityAccountId,
		locationId,
		foodType,
		message,
		frequency: schedule.frequency,
		weekday: schedule.weekday,
		dayOfMonth: schedule.dayOfMonth,
		pickupTimeFrom: schedule.timeFrom,
		pickupTimeUntil: schedule.timeUntil,
		timeZone: schedule.timeZone,
		startsOn: schedule.startsOn,
		status,
		nextOccurrenceAt: status === 'active' ? (nextOccurrence(schedule, now)?.from ?? null) : null,
		createdAt: at(-36 * DAY),
		respondedAt: status === 'proposed' ? null : at(-35 * DAY)
	});
	await db.insert(t.recurringGifts).values([
		giftRow(
			'gift-kiez-weekly',
			B,
			DEMO_ACCOUNTS.charity,
			'loc-kiez-kreuzberg',
			'bakery',
			'Unsold bread and pastries from the week, usually two to three crates.',
			weeklyBread,
			'active'
		),
		giftRow(
			'gift-korb-proposed',
			'biz-korb',
			DEMO_ACCOUNTS.charity,
			'loc-korb',
			'produce',
			'Vegetables that are past their best look but perfectly fine to cook with.',
			biweeklyVeg,
			'proposed'
		)
	]);

	// Past collections of the weekly gift, for history and stats.
	const pastFridays: t.PickupRequest[] = [];
	for (let week = 1; week <= 4; week++) {
		const occurrence = nextOccurrence(weeklyBread, at(-week * 7 * DAY));
		if (!occurrence || occurrence.from > now) continue;
		pastFridays.push({
			id: `pickup-gift-week-${week}`,
			businessAccountId: B,
			charityAccountId: DEMO_ACCOUNTS.charity,
			locationId: 'loc-kiez-kreuzberg',
			offerId: null,
			foodType: 'bakery',
			message: 'Unsold bread and pastries from the week, usually two to three crates.',
			proposedPickupFrom: occurrence.from,
			proposedPickupUntil: occurrence.until,
			status: 'completed',
			reservationId: null,
			notes: null,
			recurringGiftId: 'gift-kiez-weekly',
			createdAt: new Date(occurrence.from.getTime() - 3 * DAY),
			respondedAt: new Date(occurrence.from.getTime() - 3 * DAY)
		});
	}
	if (pastFridays.length) await db.insert(t.pickupRequests).values(pastFridays);

	// --- Complaints ---------------------------------------------------------
	await db.insert(t.complaints).values([
		{
			id: 'complaint-open-1',
			reporterAccountId: 'user-lena',
			businessAccountId: 'biz-forno',
			targetType: 'offer',
			offerId: 'offer-pizza',
			category: 'unavailable',
			message: 'I arrived inside the pickup window but was told the boxes were already gone.',
			createdAt: at(-5 * HOUR)
		},
		{
			id: 'complaint-open-2',
			reporterAccountId: DEMO_ACCOUNTS.user,
			businessAccountId: 'biz-morgenrot',
			targetType: 'location',
			locationId: 'loc-morgenrot',
			category: 'incorrect_info',
			message: 'The address pin is on the wrong side of the street.',
			createdAt: at(-2 * DAY)
		},
		{
			id: 'complaint-resolved',
			reporterAccountId: 'user-omid',
			businessAccountId: B,
			targetType: 'offer',
			offerId: 'offer-bread-box',
			category: 'quality',
			message: 'One of the loaves was quite dry.',
			status: 'resolved',
			resolutionNote: 'Business apologised and offered a replacement bag.',
			resolvedByAccountId: DEMO_ACCOUNTS.moderator,
			createdAt: at(-10 * DAY),
			resolvedAt: at(-9 * DAY)
		}
	]);
}
