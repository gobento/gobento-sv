// src/lib/server/mock/storage.ts
/**
 * In-memory object storage used instead of the S3 bucket while mocking.
 * Seeded placeholder artwork and anything uploaded during the session live
 * here and are served by `/api/mock-file/[...key]`.
 */

export interface MockFile {
	body: Uint8Array | string;
	contentType: string;
}

const KEY = Symbol.for('gobento.mock.storage');
const globalStore = globalThis as typeof globalThis & { [KEY]?: Map<string, MockFile> };

// Kept on globalThis so dev-server module reloads don't drop uploaded files.
const store = (globalStore[KEY] ??= new Map<string, MockFile>());

export function putMockFile(key: string, file: MockFile): void {
	store.set(key, file);
}

export function getMockFile(key: string): MockFile | undefined {
	return store.get(key);
}

export function mockFileUrl(key: string): string {
	return `/api/mock-file/${key}`;
}

/** Strip the outer <svg> wrapper so an icon can be nested and positioned. */
function iconBody(svg: string): string {
	return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

/** Square logo: soft tinted tile with the icon centred. */
export function logoSvg(icon: string, hue: number): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
<rect width="96" height="96" fill="hsl(${hue} 80% 92%)"/>
<svg x="20" y="20" width="56" height="56" viewBox="0 0 32 32">${iconBody(icon)}</svg>
</svg>`;
}

/** Wide "photo": warm gradient, a few soft blobs and a large tilted icon. */
export function photoSvg(icon: string, hue: number): string {
	const hue2 = (hue + 40) % 360;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="800" height="480">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 85% 86%)"/>
<stop offset="1" stop-color="hsl(${hue2} 80% 74%)"/>
</linearGradient>
</defs>
<rect width="800" height="480" fill="url(#g)"/>
<circle cx="120" cy="90" r="150" fill="hsl(${hue2} 90% 92%)" opacity="0.5"/>
<circle cx="700" cy="420" r="190" fill="hsl(${hue} 90% 95%)" opacity="0.45"/>
<circle cx="640" cy="70" r="46" fill="#fff" opacity="0.35"/>
<ellipse cx="400" cy="392" rx="150" ry="18" fill="hsl(${hue2} 50% 30%)" opacity="0.18"/>
<g transform="rotate(-8 400 240)">
<svg x="270" y="110" width="260" height="260" viewBox="0 0 32 32">${iconBody(icon)}</svg>
</g>
</svg>`;
}
