// Renders the branded social card (static/og.png) with headless Chromium.
// Run with: bun scripts/og-image.mjs
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const icon = readFileSync(join(root, 'static/icon-512.png')).toString('base64');
const nunito = readFileSync(join(root, 'static/fonts/Nunito-latin.woff2')).toString('base64');

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
@font-face {
	font-family: 'Nunito';
	src: url(data:font/woff2;base64,${nunito}) format('woff2');
	font-weight: 100 1000;
	font-display: block;
}
* { margin: 0; box-sizing: border-box; }
body {
	width: 1200px; height: 630px; overflow: hidden; position: relative;
	font-family: 'Nunito', system-ui, sans-serif;
	background: #f8f5f0; color: #171421;
	font-synthesis: none;
}
.blob { position: absolute; border-radius: 50%; }
.blob.purple { width: 560px; height: 560px; right: -140px; top: -190px;
	background: radial-gradient(circle at 40% 40%, rgba(91,63,214,.20), rgba(91,63,214,.05) 70%); }
.blob.green { width: 430px; height: 430px; left: -170px; bottom: -190px;
	background: radial-gradient(circle at 60% 60%, rgba(22,163,74,.16), rgba(22,163,74,.04) 70%); }
.ring { position: absolute; left: 62px; top: 52px; width: 110px; height: 110px;
	border: 3px solid rgba(91,63,214,.16); border-radius: 50%; }
.card { position: absolute; left: 72px; top: 92px; display: flex; gap: 56px; align-items: center; }
.tile { width: 232px; height: 232px; background: #fff; border-radius: 56px;
	box-shadow: 0 24px 48px rgba(23,20,33,.12); display: flex; align-items: center; justify-content: center; }
.tile img { width: 164px; height: 164px; }
.copy { max-width: 680px; }
.eyebrow { display: inline-flex; align-items: center; gap: 12px; background: #ede9fe; color: #5b3fd6;
	font-weight: 800; font-size: 19px; letter-spacing: .14em; text-transform: uppercase;
	padding: 10px 20px; border-radius: 999px; }
.eyebrow i { width: 10px; height: 10px; border-radius: 50%; background: #16a34a; display: block; }
h1 { font-size: 102px; font-weight: 800; letter-spacing: -.02em; line-height: 1.02; margin: 26px 0 16px; }
h1 .accent { color: #5b3fd6; }
.lede { font-size: 29px; line-height: 1.35; color: #57534e; font-weight: 600; max-width: 640px; }
.chips { display: flex; gap: 14px; margin-top: 28px; }
.chip { background: #fff; border: 1px solid #e7e0d4; color: #44403c; font-size: 20px; font-weight: 700;
	padding: 11px 20px; border-radius: 999px; display: flex; gap: 10px; align-items: center; }
.chip i { width: 9px; height: 9px; border-radius: 50%; display: block; }
.chip:nth-child(1) i { background: #5b3fd6; }
.chip:nth-child(2) i { background: #16a34a; }
.chip:nth-child(3) i { background: #e7a13c; }
.band { position: absolute; left: 0; right: 0; bottom: 0; height: 84px; background: #5b3fd6; color: #fff;
	display: flex; align-items: center; gap: 14px; padding: 0 72px; font-size: 26px; font-weight: 700; }
.band i { width: 12px; height: 12px; border-radius: 50%; background: #fff; display: block; }
</style>
</head>
<body>
	<div class="blob purple"></div>
	<div class="blob green"></div>
	<div class="ring"></div>
	<div class="card">
		<div class="tile"><img src="data:image/png;base64,${icon}" alt="" /></div>
		<div class="copy">
			<span class="eyebrow"><i></i>Surplus food, rescued</span>
			<h1>Go<span class="accent">Bento</span></h1>
			<p class="lede">Rescue surplus food from local businesses and save money.</p>
			<div class="chips">
				<span class="chip"><i></i>Fresh daily</span>
				<span class="chip"><i></i>Local shops</span>
				<span class="chip"><i></i>Big savings</span>
			</div>
		</div>
	</div>
	<div class="band"><i></i>Save food, one bento at a time.</div>
</body>
</html>`;

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
const page = await browser.newPage({
	viewport: { width: 1200, height: 630 },
	deviceScaleFactor: 1
});
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// Report whether the bundled woff2 carries multiple weights (variable font).
const widths = await page.evaluate(() => {
	const measure = (weight) => {
		const s = document.createElement('span');
		s.style.cssText = `font: ${weight} 40px Nunito; position:absolute; visibility:hidden; white-space:nowrap;`;
		s.textContent = 'GoBento';
		document.body.appendChild(s);
		const width = s.getBoundingClientRect().width;
		s.remove();
		return width;
	};
	return [measure(400), measure(800)];
});
console.log(
	'Nunito 400/800 widths:',
	widths,
	'variable font:',
	Math.abs(widths[0] - widths[1]) > 0.5
);

const shot = await page.screenshot();
// 1200x630 is the size (and 1.91:1 ratio) link previews expect; resizing to
// 640x360 squashed the card into 16:9.
await sharp(shot)
	.png({ quality: 90, compressionLevel: 9, palette: true })
	.toFile(join(root, 'static/og.png'));
console.log('wrote static/og.png');
await browser.close();
