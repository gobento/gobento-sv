<!-- src/routes/(dock)/settings/+page.svelte -->
<script lang="ts">
	import IconUser from '~icons/fluent/person-24-regular';
</script>

settings

<a href="/profile" class="btn btn-primary gap-2">
	<IconUser class="w-5 h-5" />
	My Profile
</a>

<!-- todo: settings should be callable from profile, not this way around -->

<a href="/auth/logout" class="btn btn-secondary"> Logout </a>
