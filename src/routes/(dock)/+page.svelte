<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { page } from '$app/state';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	import { browser } from '$app/environment';
	import { env } from '$env/dynamic/public';

	let ntfyServer = $state(env.PUBLIC_NTFY_SERVER || 'http://localhost:8080');
	let topic = $state('my-app-' + Math.random().toString(36).substring(7));
	let notificationPermission = $state('default');
	let isSubscribed = $state(false);
	let testMessage = $state('Hello from your ntfy server!');
	let testTitle = $state('Test Notification');
	let serverStatus = $state('checking...');
	let isCheckingServer = $state(false);

	let statusBadgeClass = $derived(
		serverStatus === 'connected'
			? 'badge-success'
			: serverStatus === 'error'
				? 'badge-error'
				: serverStatus === 'unreachable'
					? 'badge-error'
					: 'badge-warning'
	);

	let statusText = $derived(
		serverStatus === 'connected'
			? '✓ Connected'
			: serverStatus === 'error'
				? '✗ Server Error'
				: serverStatus === 'unreachable'
					? '✗ Cannot Reach Server'
					: '⟳ Checking...'
	);

	let permissionBadgeClass = $derived(
		notificationPermission === 'granted'
			? 'badge-success'
			: notificationPermission === 'denied'
				? 'badge-error'
				: 'badge-warning'
	);

	$effect(() => {
		if (!browser) return;

		notificationPermission = Notification.permission;

		// Check server connectivity
		checkServerStatus();

		// Register service worker
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js', {
					type: 'module'
				})
				.then((registration) => {
					console.log('Service Worker registered:', registration);
				})
				.catch((error) => {
					console.error('Service Worker registration failed:', error);
				});
		}
	});

	async function checkServerStatus() {
		isCheckingServer = true;
		try {
			const response = await fetch(`${ntfyServer}/v1/health`);
			if (response.ok) {
				serverStatus = 'connected';
			} else {
				serverStatus = 'error';
			}
		} catch (error) {
			serverStatus = 'unreachable';
			console.error('Server check failed:', error);
		}
		isCheckingServer = false;
	}

	async function requestNotificationPermission() {
		if (!browser || !('Notification' in window)) {
			alert('This browser does not support notifications');
			return;
		}

		const permission = await Notification.requestPermission();
		notificationPermission = permission;

		if (permission === 'granted') {
			console.log('Notification permission granted');
		}
	}

	async function subscribeToTopic() {
		if (notificationPermission !== 'granted') {
			await requestNotificationPermission();
			if (notificationPermission !== 'granted') return;
		}

		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				type: 'SUBSCRIBE_NTFY',
				topic: topic,
				serverUrl: ntfyServer
			});
			isSubscribed = true;
			console.log(`Subscribed to topic: ${topic} on ${ntfyServer}`);
		}
	}

	function unsubscribe() {
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({
				type: 'UNSUBSCRIBE_NTFY'
			});
			isSubscribed = false;
		}
	}

	async function sendTestNotification() {
		try {
			const response = await fetch(`${ntfyServer}/${topic}`, {
				method: 'POST',
				body: testMessage,
				headers: {
					Title: testTitle,
					Priority: 'default',
					Tags: 'white_check_mark'
				}
			});

			if (response.ok) {
				console.log('Test notification sent!');
			}
		} catch (error) {
			console.error('Error sending notification:', error);
			alert('Failed to send notification. Is your ntfy server running?');
		}
	}
</script>

DISCOVER

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<a href="/test">Test upload</a>

<div class="min-h-screen bg-base-200 px-4 py-8">
	<div class="mx-auto max-w-3xl">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold">🔔 Self-Hosted Push Notifications</h1>
			<p class="text-base-content/70">Real-time notifications with your own ntfy server</p>
		</div>

		<!-- Server Status Card -->
		<div class="card mb-6 bg-base-100">
			<div class="card-body">
				<h2 class="card-title">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
						/>
					</svg>
					Server Configuration
				</h2>

				<div class="form-control w-full">
					<label class="label">
						<span class="label-text font-semibold">ntfy Server URL</span>
						<span class="label-text-alt badge {statusBadgeClass}">{statusText}</span>
					</label>
					<div class="join w-full">
						<input
							type="text"
							bind:value={ntfyServer}
							disabled={isSubscribed}
							class="input-bordered input join-item flex-1"
							placeholder="http://localhost:8080"
						/>
						<button
							class="btn join-item btn-primary"
							onclick={checkServerStatus}
							disabled={isSubscribed || isCheckingServer}
						>
							{#if isCheckingServer}
								<span class="loading loading-sm loading-spinner"></span>
							{:else}
								Check
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Notification Permission Card -->
		<div class="card mb-6 bg-base-100">
			<div class="card-body">
				<h2 class="card-title">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
						/>
					</svg>
					Notification Permission
				</h2>

				<div class="flex items-center justify-between">
					<div>
						<span class="text-sm text-base-content/70">Permission Status:</span>
						<span class="badge {permissionBadgeClass} ml-2 badge-lg">{notificationPermission}</span>
					</div>

					{#if notificationPermission !== 'granted'}
						<button class="btn btn-primary" onclick={requestNotificationPermission}>
							Enable Notifications
						</button>
					{:else}
						<div class="badge gap-2 badge-lg badge-success">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Enabled
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Subscribe to Topic Card -->
		<div class="card mb-6 bg-base-100">
			<div class="card-body">
				<h2 class="card-title">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
						/>
					</svg>
					Topic Subscription
				</h2>

				<div class="form-control w-full">
					<label class="label">
						<span class="label-text">Topic Name</span>

						<input
							type="text"
							bind:value={topic}
							disabled={isSubscribed}
							class="input-bordered input w-full"
							placeholder="my-unique-topic"
						/>
					</label>
				</div>

				<div class="mt-4 card-actions justify-end">
					{#if !isSubscribed}
						<button
							class="btn btn-block btn-primary"
							onclick={subscribeToTopic}
							disabled={notificationPermission !== 'granted'}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="mr-2 h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
								/>
							</svg>
							Subscribe to Topic
						</button>
					{:else}
						<div role="alert" class="mb-4 alert alert-success">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6 shrink-0 stroke-current"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div>
								<div class="font-bold">Subscribed successfully!</div>
								<div class="text-sm">
									Listening to: <code class="badge badge-neutral">{topic}</code>
								</div>
							</div>
						</div>
						<button class="btn btn-ghost" onclick={unsubscribe}> Unsubscribe </button>
					{/if}
				</div>
			</div>
		</div>

		{#if isSubscribed}
			<!-- Send Test Notification Card -->
			<div class="card mb-6 bg-base-100">
				<div class="card-body">
					<h2 class="card-title">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
							/>
						</svg>
						Send Test Notification
					</h2>

					<div class="form-control w-full">
						<label class="label">
							<span class="label-text">Title</span>

							<input type="text" bind:value={testTitle} class="input-bordered input w-full" />
						</label>
					</div>

					<div class="form-control w-full">
						<label class="label">
							<span class="label-text">Message</span>

							<input type="text" bind:value={testMessage} class="input-bordered input w-full" />
						</label>
					</div>

					<div class="mt-4 card-actions justify-end">
						<button class="btn btn-primary" onclick={sendTestNotification}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="mr-2 h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
								/>
							</svg>
							Send Test
						</button>
					</div>

					<div class="divider">Integration Examples</div>

					<div class="collapse-arrow collapse bg-base-200">
						<input type="checkbox" />
						<div class="collapse-title font-medium">Send via curl</div>
						<div class="collapse-content">
							<div class="mockup-code">
								<pre><code
										>curl -d "{testMessage}" \
  -H "Title: {testTitle}" \
  {ntfyServer}/{topic}</code
									></pre>
							</div>
						</div>
					</div>

					<div class="collapse-arrow collapse mt-2 bg-base-200">
						<input type="checkbox" />
						<div class="collapse-title font-medium">Send via JavaScript</div>
						<div class="collapse-content">
							<div class="mockup-code">
								<pre><code
										>fetch('{ntfyServer}/{topic}', {`{
  method: 'POST',
  body: '${testMessage}',
  headers: {
    'Title': '${testTitle}'
  }
}`});</code
									></pre>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Architecture Info Card -->
		<div class="card bg-base-100">
			<div class="card-body">
				<h2 class="card-title">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					How It Works
				</h2>

				<div class="space-y-3">
					<div class="flex gap-3">
						<div class="badge badge-lg badge-primary">1</div>
						<p>Your own ntfy server running locally or on your infrastructure</p>
					</div>
					<div class="flex gap-3">
						<div class="badge badge-lg badge-primary">2</div>
						<p>Service worker connects via Server-Sent Events (SSE)</p>
					</div>
					<div class="flex gap-3">
						<div class="badge badge-lg badge-primary">3</div>
						<p>Real-time notifications delivered instantly</p>
					</div>
					<div class="flex gap-3">
						<div class="badge badge-lg badge-primary">4</div>
						<p>Full control over data and privacy</p>
					</div>
					<div class="flex gap-3">
						<div class="badge badge-lg badge-primary">5</div>
						<p>No third-party dependencies or API keys</p>
					</div>
				</div>

				<div class="divider"></div>

				<div class="stats stats-vertical shadow lg:stats-horizontal">
					<div class="stat">
						<div class="stat-figure text-primary">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
								/>
							</svg>
						</div>
						<div class="stat-title">Privacy</div>
						<div class="stat-value text-primary">100%</div>
						<div class="stat-desc">Your infrastructure</div>
					</div>

					<div class="stat">
						<div class="stat-figure text-secondary">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<div class="stat-title">Speed</div>
						<div class="stat-value text-secondary">Real-time</div>
						<div class="stat-desc">Instant delivery</div>
					</div>

					<div class="stat">
						<div class="stat-figure text-accent">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div class="stat-title">Cost</div>
						<div class="stat-value text-accent">$0</div>
						<div class="stat-desc">No fees</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
