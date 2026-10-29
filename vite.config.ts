// /vite.config.ts
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-auto';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './.svelte-kit/paraglide', // SvelteKit manages this folder

			strategy: ['localStorage', 'preferredLanguage', 'baseLocale']
		}),
		tailwindcss({ optimize: { minify: true } }),
		Icons({
			compiler: 'svelte',
			autoInstall: true,
			iconCustomizer(collection, icon, props) {
				props.mode = 'url';
			}
		}),
		SvelteKitPWA({
			/*	strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			registerType: 'autoUpdate',
			manifest: {
				name: 'Your App Name',
				short_name: 'App',
				description: 'Your app description',
				theme_color: '#000000',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			injectManifest: { */
			//			globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}']
			//	},
			devOptions: {
				enabled: true,
				type: 'module'
			}
		})
	],
	server: {
		allowedHosts: true,
		port: 3021,
		watch: {
			ignored: ['!**/paraglide/**'] // Force watch paraglide
		}
	}
});
