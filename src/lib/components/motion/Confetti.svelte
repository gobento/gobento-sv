<!-- src/lib/components/motion/Confetti.svelte -->
<script lang="ts">
	interface Props {
		/** Set to true to fire a burst. */
		show: boolean;
		/** Pieces of confetti in the burst. */
		count?: number;
	}

	let { show, count = 160 }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		w: number;
		h: number;
		color: string;
		rotation: number;
		spin: number;
		circle: boolean;
	}

	// daisyUI theme colours, with a festive fallback when they can't be read.
	function palette(): string[] {
		const names = [
			'--color-primary',
			'--color-secondary',
			'--color-accent',
			'--color-success',
			'--color-warning',
			'--color-error'
		];
		const fromTheme = names
			.map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim())
			.filter(Boolean);
		return fromTheme.length >= 4
			? fromTheme
			: ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#facc15'];
	}

	function burst() {
		const element = canvas;
		if (!element) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const ctx = element.getContext('2d');
		if (!ctx) return;

		const width = window.innerWidth;
		const height = window.innerHeight;
		const dpr = window.devicePixelRatio || 1;
		element.width = width * dpr;
		element.height = height * dpr;
		ctx.scale(dpr, dpr);

		const colors = palette();
		const particles: Particle[] = [];
		// Two cannons from the bottom corners, spraying upwards and inwards.
		const cannons = [
			{ x: width * 0.1, angle: -Math.PI / 3 },
			{ x: width * 0.9, angle: -(2 * Math.PI) / 3 }
		];
		for (let i = 0; i < count; i += 1) {
			const cannon = cannons[i % cannons.length];
			const angle = cannon.angle + (Math.random() - 0.5) * 0.7;
			const speed = 10 + Math.random() * 9;
			particles.push({
				x: cannon.x,
				y: height + 10,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				w: 6 + Math.random() * 6,
				h: 8 + Math.random() * 8,
				color: colors[i % colors.length],
				rotation: Math.random() * Math.PI * 2,
				spin: (Math.random() - 0.5) * 0.3,
				circle: Math.random() < 0.25
			});
		}

		const gravity = 0.22;
		const drag = 0.985;
		const frame = () => {
			ctx.clearRect(0, 0, width, height);
			let alive = false;
			for (const p of particles) {
				p.vy += gravity;
				p.vx *= drag;
				p.vy *= drag;
				p.x += p.vx;
				p.y += p.vy;
				p.rotation += p.spin;
				if (p.y < height + 40) alive = true;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rotation);
				ctx.fillStyle = p.color;
				if (p.circle) {
					ctx.beginPath();
					ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
					ctx.fill();
				} else {
					ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				}
				ctx.restore();
			}
			if (alive) {
				requestAnimationFrame(frame);
			} else {
				ctx.clearRect(0, 0, width, height);
			}
		};
		requestAnimationFrame(frame);
	}

	$effect(() => {
		if (show) burst();
	});
</script>

<canvas
	bind:this={canvas}
	class="pointer-events-none fixed inset-0 z-[2200] h-full w-full"
	aria-hidden="true"
></canvas>
