<!-- /src/lib/components/DataTable.svelte -->
<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import IconSort from '~icons/fluent/arrow-sort-24-regular';
	import IconSortUp from '~icons/fluent/chevron-up-24-regular';
	import IconSortDown from '~icons/fluent/chevron-down-24-regular';

	type SortDirection = 'asc' | 'desc';
	type SortableValue = string | number | boolean | Date | null | undefined;

	interface Column {
		/** Unique identifier for the column, also used as the default value accessor key. */
		key: string;
		/** Header label shown to the user. */
		label: string;
		/** Whether the column can be sorted. Defaults to false. */
		sortable?: boolean;
		/** Horizontal alignment of the header/cells. Defaults to 'left'. */
		align?: 'left' | 'center' | 'right';
		/** Extra classes applied to the header cell. */
		class?: string;
		/** Custom accessor used for sorting. Falls back to `row[key]`. */
		sortValue?: (row: T) => SortableValue;
	}

	interface Props {
		columns: Column[];
		rows: T[];
		/** Renders the cells (`<td>` elements) for a single row. */
		row: Snippet<[T, number]>;
		/** Optional content shown when there are no rows. */
		empty?: Snippet;
		/** Stable key accessor used for keyed `{#each}` iteration. */
		rowKey?: (row: T, index: number) => string | number;
		/** Initial column key to sort by. */
		defaultSortKey?: string;
		/** Initial sort direction. Defaults to 'asc'. */
		defaultSortDirection?: SortDirection;
		/** Extra classes applied to the `<table>` element. */
		class?: string;
	}

	let {
		columns,
		rows,
		row,
		empty,
		rowKey,
		defaultSortKey,
		defaultSortDirection = 'asc',
		class: className = 'table w-full table-sm'
	}: Props = $props();

	let sortKey = $state<string | null>(defaultSortKey ?? null);
	let sortDirection = $state<SortDirection>(defaultSortDirection);

	const alignClass = {
		left: 'text-left',
		center: 'text-center',
		right: 'text-right'
	};

	function getSortValue(item: T, column: Column): SortableValue {
		if (column.sortValue) return column.sortValue(item);
		return (item as Record<string, unknown>)[column.key] as SortableValue;
	}

	function compare(a: SortableValue, b: SortableValue): number {
		if (a == null && b == null) return 0;
		if (a == null) return 1;
		if (b == null) return -1;
		if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
		if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
		return a < b ? -1 : a > b ? 1 : 0;
	}

	function toggleSort(column: Column) {
		if (!column.sortable) return;
		if (sortKey === column.key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = column.key;
			sortDirection = 'asc';
		}
	}

	const sortedRows = $derived.by(() => {
		if (!sortKey) return rows;
		const column = columns.find((c) => c.key === sortKey);
		if (!column) return rows;
		const direction = sortDirection === 'asc' ? 1 : -1;
		return [...rows].sort(
			(a, b) => compare(getSortValue(a, column), getSortValue(b, column)) * direction
		);
	});
</script>

<table class={className}>
	<thead>
		<tr class="border-base-300">
			{#each columns as column (column.key)}
				<th
					class="text-sm font-medium tracking-wide text-base-content/60 uppercase sm:text-xs {alignClass[
						column.align ?? 'left'
					]} {column.class ?? ''}"
					aria-sort={sortKey === column.key
						? sortDirection === 'asc'
							? 'ascending'
							: 'descending'
						: 'none'}
				>
					{#if column.sortable}
						<button
							type="button"
							class="inline-flex items-center gap-1 uppercase transition-colors hover:text-base-content"
							class:text-base-content={sortKey === column.key}
							onclick={() => toggleSort(column)}
						>
							<span>{column.label}</span>
							{#if sortKey === column.key}
								{#if sortDirection === 'asc'}
									<IconSortUp class="size-3.5" />
								{:else}
									<IconSortDown class="size-3.5" />
								{/if}
							{:else}
								<IconSort class="size-3.5 opacity-40" />
							{/if}
						</button>
					{:else}
						{column.label}
					{/if}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#if sortedRows.length === 0}
			<tr>
				<td colspan={columns.length} class="text-center text-base-content/50">
					{#if empty}
						{@render empty()}
					{:else}
						No data available
					{/if}
				</td>
			</tr>
		{:else}
			{#each sortedRows as item, index (rowKey ? rowKey(item, index) : index)}
				{@render row(item, index)}
			{/each}
		{/if}
	</tbody>
</table>
