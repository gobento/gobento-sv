<!-- src/routes/(dock)/team/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import BaseLayout from '#lib/components/BaseLayout.svelte';
	import SectionCard from '#lib/components/ui/SectionCard.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import IconPeople from '~icons/fluent/people-team-24-regular';
	import IconPersonAdd from '~icons/fluent/person-add-24-regular';
	import IconDelete from '~icons/fluent/delete-24-regular';
	import IconCheck from '~icons/fluent/checkmark-circle-24-regular';
	import IconInfo from '~icons/fluent/info-24-regular';
	import IconShield from '~icons/fluent/shield-24-regular';
	import IconKey from '~icons/fluent/key-24-regular';
	import CopyField from '#lib/components/account/CopyField.svelte';

	let { data }: { data: PageData } = $props();

	let adding = $state(false);
	let savingSso = $state(false);
	let busyId = $state<string | null>(null);
	const isBusiness = $derived(data.ownerType === 'business');
</script>

<BaseLayout
	title="Team"
	description={isBusiness
		? 'Staff who work the counter at one of your locations'
		: 'Volunteers and staff who collect food for you'}
	icon={IconPeople}
>
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
		<div class="space-y-6 lg:col-span-3">
			{#if page.form?.team?.error}
				<div class="alert alert-error">
					<IconInfo class="size-5 shrink-0" /><span>{page.form.team.error}</span>
				</div>
			{/if}

			{#if data.team.length === 0}
				<EmptyState
					icon={IconPeople}
					title="No team members yet"
					description="Add the people who {isBusiness
						? 'hand out orders at your locations'
						: 'collect donations for you'}."
				/>
			{:else}
				<ul class="space-y-2">
					{#each data.team as member (member.accountId)}
						<li>
							<Card padding="sm" class="flex flex-wrap items-center gap-3">
								<div class="avatar avatar-placeholder">
									<div class="w-10 rounded-full bg-primary/10 text-primary">
										<span class="font-bold">{member.name.slice(0, 1).toUpperCase()}</span>
									</div>
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold">{member.name}</p>
									<p class="truncate text-xs text-base-content/60">{member.email}</p>
								</div>
								{#if isBusiness}
									<form method="POST" action="?/move" use:enhance>
										<input type="hidden" name="accountId" value={member.accountId} />
										<select
											name="locationId"
											class="select-bordered select select-sm"
											value={member.locationId ?? ''}
											onchange={(e) => e.currentTarget.form?.requestSubmit()}
											aria-label="Location of {member.name}"
										>
											{#each data.locations as loc (loc.id)}
												<option value={loc.id}>{loc.name}</option>
											{/each}
										</select>
									</form>
								{/if}
								<form
									method="POST"
									action="?/remove"
									use:enhance={({ cancel }) => {
										if (!confirm(`Remove ${member.name}? They are signed out immediately.`)) {
											cancel();
											return;
										}
										busyId = member.accountId;
										return async ({ update }) => {
											busyId = null;
											await update();
										};
									}}
								>
									<input type="hidden" name="accountId" value={member.accountId} />
									<button
										class="btn btn-square btn-ghost btn-sm"
										aria-label="Remove {member.name}"
										disabled={busyId === member.accountId}
									>
										<IconDelete class="size-4" />
									</button>
								</form>
							</Card>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="space-y-6 lg:col-span-2">
			<SectionCard title="Add someone" icon={IconPersonAdd} bodyClass="gap-4">
				{#if isBusiness && data.locations.length === 0}
					<p class="text-sm text-base-content/70">
						Add a location first — staff always work at one location.
					</p>
				{:else}
					<form
						method="POST"
						action="?/add"
						class="space-y-3"
						use:enhance={() => {
							adding = true;
							return async ({ update }) => {
								adding = false;
								await update();
							};
						}}
					>
						<label class="block">
							<span class="mb-1 block text-sm font-medium">Name</span>
							<input
								name="name"
								class="input-bordered input w-full"
								required
								minlength="2"
								disabled={adding}
							/>
						</label>
						<label class="block">
							<span class="mb-1 block text-sm font-medium">Email address</span>
							<input
								name="email"
								type="email"
								class="input-bordered input w-full"
								required
								disabled={adding}
							/>
						</label>
						{#if isBusiness}
							<label class="block">
								<span class="mb-1 block text-sm font-medium">Works at</span>
								<select
									name="locationId"
									class="select-bordered select w-full"
									required
									disabled={adding}
								>
									{#each data.locations as loc (loc.id)}
										<option value={loc.id}>{loc.name} — {loc.city}</option>
									{/each}
								</select>
							</label>
						{/if}
						{#if page.form?.add?.error}
							<div class="alert text-sm alert-error">
								<IconInfo class="size-5 shrink-0" /><span>{page.form.add.error}</span>
							</div>
						{:else if page.form?.add?.success}
							<div class="alert text-sm alert-success">
								<IconCheck class="size-5 shrink-0" />
								<span>Added. They can now sign in with Google as {page.form.add.email}.</span>
							</div>
						{/if}
						<button class="btn btn-block gap-2 btn-primary" disabled={adding}>
							<IconPersonAdd class="size-4" /> Add to team
						</button>
					</form>
				{/if}
			</SectionCard>

			<SectionCard
				title="Company sign-in (SSO)"
				description="Let staff sign in with your company accounts via OpenID Connect"
				icon={IconKey}
				tone="secondary"
				bodyClass="gap-4"
			>
				{#if !data.ssoAvailable}
					<p class="text-sm text-base-content/70">
						Company sign-in is not available on this server yet.
					</p>
				{:else}
					<details class="group">
						<summary class="cursor-pointer text-sm font-semibold text-primary">
							{data.sso ? 'Edit provider settings' : 'Set up company sign-in'}
						</summary>
						<div class="space-y-1 pt-4 text-sm text-base-content/70">
							<p>
								Register Go Bento as a web app in your identity provider (Microsoft Entra ID, Okta,
								Google Workspace, Keycloak, …) with this redirect URI:
							</p>
							<CopyField value={data.ssoRedirectUri} label="Redirect URI" />
							<p>
								Staff then choose <strong>Company sign-in</strong> and use the email you added them with.
								Their first sign-in links the company identity to their staff account.
							</p>
						</div>
						<form
							method="POST"
							action="?/saveSso"
							class="space-y-3"
							use:enhance={() => {
								savingSso = true;
								return async ({ update }) => {
									await update({ reset: false });
									savingSso = false;
								};
							}}
						>
							<label class="block">
								<span class="mb-1 block text-sm font-medium">Issuer URL</span>
								<input
									name="issuer"
									type="url"
									class="input-bordered input w-full"
									placeholder="https://login.microsoftonline.com/<tenant-id>/v2.0"
									value={data.sso?.issuer ?? ''}
									required
								/>
							</label>
							<label class="block">
								<span class="mb-1 block text-sm font-medium">Client ID</span>
								<input
									name="clientId"
									class="input-bordered input w-full"
									value={data.sso?.clientId ?? ''}
									required
								/>
							</label>
							<label class="block">
								<span class="mb-1 block text-sm font-medium">Client secret</span>
								<input
									name="clientSecret"
									type="password"
									autocomplete="off"
									class="input-bordered input w-full"
									placeholder={data.sso ? 'Saved — leave empty to keep' : ''}
									required={!data.sso}
								/>
							</label>
							<label class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									name="enabled"
									class="toggle toggle-sm"
									checked={data.sso?.enabled ?? true}
								/>
								Enabled
							</label>
							<label class="flex items-start gap-2 text-sm">
								<input
									type="checkbox"
									name="requireSso"
									class="toggle mt-0.5 toggle-sm"
									checked={data.sso?.requireSso ?? false}
								/>
								<span>
									Require company sign-in
									<span class="block text-xs text-base-content/60">
										Staff can't use Google or Telegram, so removing someone in your provider ends
										their access.
									</span>
								</span>
							</label>
							{#if page.form?.sso?.error}
								<div class="alert text-sm alert-error">
									<IconInfo class="size-5 shrink-0" /><span>{page.form.sso.error}</span>
								</div>
							{:else if page.form?.sso?.success}
								<div class="alert text-sm alert-success">
									<IconCheck class="size-5 shrink-0" /><span>Saved.</span>
								</div>
							{/if}
							<button class="btn btn-block btn-secondary" disabled={savingSso}>
								{data.sso ? 'Save changes' : 'Connect provider'}
							</button>
						</form>
						{#if data.sso}
							<form
								method="POST"
								action="?/removeSso"
								use:enhance={({ cancel }) => {
									if (
										!confirm('Disconnect company sign-in? Staff will need another way to sign in.')
									)
										cancel();
								}}
							>
								<button class="btn btn-block btn-ghost btn-sm">Disconnect</button>
							</form>
						{/if}
					</details>
				{/if}
			</SectionCard>

			<div class="rounded-2xl bg-base-200/60 p-4 text-sm text-base-content/70">
				<p class="mb-1 flex items-center gap-2 font-semibold text-base-content">
					<IconShield class="size-4" /> What staff can do
				</p>
				{#if isBusiness}
					<p>
						Staff only see their own location: what to pack, today's and tomorrow's orders and
						charity pickups. They scan customers' pickup codes to hand orders over. No prices,
						payments, offers or settings.
					</p>
				{:else}
					<p>
						Staff see the pickups for the next 7 days with addresses, show pickup codes at the
						counter and mark pickups as collected. They can't accept or decline donations.
					</p>
				{/if}
			</div>
		</div>
	</div>
</BaseLayout>
