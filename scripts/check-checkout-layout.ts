// Walks the phone checkout (method choice → USDT payment page) and checks that
// the fixed action bar sits above the tab bar and never covers the last card.
// Needs a dev server in offline mock mode, e.g. `DATABASE_URL= MOCK=true bun run dev`.
// Run with: bun scripts/check-checkout-layout.ts [base-url]
import { chromium, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3021';

// Use the newest cached headless Chromium, whatever build number it carries.
const browserCache =
	process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache', 'ms-playwright');
const shell = readdirSync(browserCache)
	.filter((name) => /^chromium_headless_shell-/.test(name))
	.sort()
	.at(-1);
const browser = await chromium.launch({
	executablePath: shell
		? join(browserCache, shell, 'chrome-headless-shell-linux64', 'chrome-headless-shell')
		: undefined
});
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true,
	deviceScaleFactor: 2
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

const problems: string[] = [];

/** Bottom of the fixed action bar vs. tab bar and the content above it, scrolled to the end. */
async function checkLayout(page: Page, label: string) {
	// Let the view transition finish before measuring.
	await page.waitForTimeout(1500);
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await page.waitForTimeout(300);
	const geometry = await page.evaluate(() => {
		const tabbar = document.querySelector('nav.tabbar')?.getBoundingClientRect();
		const bar = [...document.querySelectorAll<HTMLElement>('div.fixed')]
			.filter((d) => d.querySelector('button') && getComputedStyle(d).position === 'fixed')
			.map((d) => d.getBoundingClientRect())
			.find((r) => r.bottom > window.innerHeight / 2);
		// Leaves only: wrappers carry bottom padding on purpose to clear the bar.
		const content = [...document.querySelectorAll('main *')]
			.filter(
				(el) =>
					el.children.length === 0 && !el.closest('.fixed') && el.getBoundingClientRect().height > 0
			)
			.reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0);
		return { tabbarTop: tabbar?.top ?? null, barTop: bar?.top, barBottom: bar?.bottom, content };
	});
	console.log(label, JSON.stringify(geometry));
	if (geometry.barTop === undefined || geometry.barBottom === undefined) {
		problems.push(`${label}: no fixed action bar found`);
		return;
	}
	if (geometry.tabbarTop !== null && geometry.barBottom > geometry.tabbarTop + 1) {
		problems.push(`${label}: action bar overlaps the tab bar`);
	}
	if (geometry.content > geometry.barTop + 1) {
		problems.push(`${label}: content ends under the action bar`);
	}
}

await page.goto(`${base}/auth/login/demo?as=user`);
await page.goto(`${base}/discover`);
await page.waitForSelector('a[href*="/offers/"]', { timeout: 30_000 });
const offers = await page.evaluate(() => [
	...new Set(
		[...document.querySelectorAll('a[href*="/offers/"]')].map((a) => (a as HTMLAnchorElement).href)
	)
]);

let reachedPayment = false;
for (const offer of offers) {
	await page.goto(offer);
	await page.waitForLoadState('networkidle');
	const payLink = page.locator('a[href*="/payment?"]');
	if (!(await payLink.count())) continue;
	await page.goto(new URL((await payLink.first().getAttribute('href'))!, page.url()).href);
	await page.waitForLoadState('networkidle');

	const change = page.locator('button:has-text("Change")');
	if (await change.count()) await change.first().click();
	const tether = page.locator('text=Tether (USDT)');
	if (!(await tether.count())) continue;
	await tether.first().click();
	await checkLayout(page, 'checkout');

	await page.click('button:has-text("Pay")');
	await page.waitForURL('**/tether/**', { timeout: 30_000 });
	await page.waitForLoadState('networkidle');
	await checkLayout(page, 'usdt payment');
	reachedPayment = true;
	break;
}

await browser.close();

if (!reachedPayment) problems.push('no offer with a USDT checkout found');
if (problems.length) {
	console.error(problems.map((p) => `✗ ${p}`).join('\n'));
	process.exit(1);
}
console.log('✓ checkout action bars clear the tab bar and the content');
