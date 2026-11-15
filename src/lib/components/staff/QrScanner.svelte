<!-- Camera QR scanner: native BarcodeDetector where available, jsQR otherwise. -->
<script lang="ts">
	interface Props {
		/** Called once per distinct code; scanning pauses while `paused` is true. */
		onscan: (value: string) => void;
		paused?: boolean;
	}

	let { onscan, paused = false }: Props = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let problem = $state<string | null>(null);
	let lastValue = '';
	let lastAt = 0;

	type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

	$effect(() => {
		if (!video) return;
		let stream: MediaStream | null = null;
		let stopped = false;
		let frame = 0;
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d', { willReadFrequently: true });

		const emit = (value: string) => {
			const now = Date.now();
			// The same code stays in view for a while; report it once.
			if (value === lastValue && now - lastAt < 4000) return;
			lastValue = value;
			lastAt = now;
			navigator.vibrate?.(40);
			onscan(value);
		};

		(async () => {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' },
					audio: false
				});
			} catch {
				problem = 'Camera not available. Allow camera access, or type the 6 digits instead.';
				return;
			}
			if (stopped || !video) return;
			video.srcObject = stream;
			await video.play().catch(() => {});

			const Native = (globalThis as unknown as { BarcodeDetector?: new (o: object) => Detector })
				.BarcodeDetector;
			const detector = Native ? new Native({ formats: ['qr_code'] }) : null;
			const { default: jsQR } = detector ? { default: null } : await import('jsqr');

			const tick = async () => {
				if (stopped || !video) return;
				if (!paused && video.readyState >= 2) {
					try {
						if (detector) {
							const [hit] = await detector.detect(video);
							if (hit?.rawValue) emit(hit.rawValue);
						} else if (jsQR && context) {
							canvas.width = video.videoWidth;
							canvas.height = video.videoHeight;
							context.drawImage(video, 0, 0);
							const image = context.getImageData(0, 0, canvas.width, canvas.height);
							const hit = jsQR(image.data, image.width, image.height, {
								inversionAttempts: 'dontInvert'
							});
							if (hit?.data) emit(hit.data);
						}
					} catch {
						// A frame that can't be read is simply skipped.
					}
				}
				frame = requestAnimationFrame(tick);
			};
			tick();
		})();

		return () => {
			stopped = true;
			cancelAnimationFrame(frame);
			stream?.getTracks().forEach((track) => track.stop());
		};
	});
</script>

{#if problem}
	<p class="rounded-xl bg-base-200 p-4 text-sm text-base-content/70">{problem}</p>
{:else}
	<div class="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
		<video bind:this={video} class="h-full w-full object-cover" playsinline muted></video>
		<div
			class="pointer-events-none absolute inset-[15%] rounded-2xl border-4 border-white/80"
		></div>
	</div>
{/if}
