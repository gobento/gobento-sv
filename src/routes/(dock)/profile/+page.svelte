<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="min-h-screen bg-base-200 px-4 py-8">
	<div class="mx-auto max-w-2xl">
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h1 class="mb-6 card-title text-3xl">Profile</h1>

				<div class="flex flex-col items-center gap-6 md:flex-row md:items-start">
					<!-- Profile Picture -->
					<div class="avatar">
						<div
							class="h-32 w-32 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100"
						>
							{#if data.user.picture}
								<!-- Use the proxy endpoint to get signed URL -->
								<img
									src="/api/image/{encodeURIComponent(data.user.picture)}"
									alt={data.user.name}
								/>
							{:else}
								<div class="flex items-center justify-center bg-neutral text-neutral-content">
									<span class="text-4xl">{data.user.name.charAt(0).toUpperCase()}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- User Information -->
					<div class="flex-1 text-center md:text-left">
						<h2 class="mb-2 text-2xl font-bold">{data.user.name}</h2>
						<p class="mb-4 text-base-content/70">{data.user.email}</p>

						<div class="divider"></div>

						<div class="grid gap-3">
							<div>
								<span class="font-semibold">Member since:</span>
								<span class="text-base-content/70">
									{new Date(data.user.createdAt).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})}
								</span>
							</div>

							{#if data.user.isAdmin}
								<div class="badge badge-primary">Admin</div>
							{/if}
						</div>

						<div class="mt-6 flex gap-2">
							<a href="/settings" class="btn btn-primary">Edit Profile</a>
							<a href="/dashboard" class="btn btn-outline">Dashboard</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
