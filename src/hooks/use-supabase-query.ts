import { useQuery, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import supabase from '@/util/supabase/client';

// ─── Generic helpers for Supabase + React Query ────────────────────────────
//
// NOTE: These hooks use `as any` casts on `supabase.from()` because the
// Database type file currently has no tables defined. Once you run
// `npx supabase gen types typescript` after creating your tables,
// the types will populate and you can remove the `as any` casts for
// full type safety.

/**
 * Fetch all rows from a Supabase table with optional filtering.
 *
 * @example
 * const { data: events } = useSupabaseQuery('events');
 * const { data: myEvents } = useSupabaseQuery('events', {
 *   filter: (q) => q.eq('organizer_id', userId),
 * });
 */
export function useSupabaseQuery(
    table: string,
    options?: {
        filter?: (query: any) => any;
        select?: string;
        enabled?: boolean;
        queryKey?: unknown[];
    },
) {
    const select = options?.select ?? '*';
    const queryKey = options?.queryKey ?? [table, select];

    return useQuery({
        queryKey,
        queryFn: async () => {
            let query = (supabase.from as any)(table).select(select);
            if (options?.filter) query = options.filter(query);
            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: options?.enabled,
    });
}

/**
 * Insert one or more rows into a Supabase table.
 *
 * @example
 * const insert = useSupabaseInsert('events');
 * insert.mutate({ name: 'Tech Summit', date: '2025-03-01' });
 */
export function useSupabaseInsert(
    table: string,
    options?: Omit<UseMutationOptions<any[], Error, Record<string, unknown> | Record<string, unknown>[]>, 'mutationFn'>,
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (row: Record<string, unknown> | Record<string, unknown>[]) => {
            const { data, error } = await (supabase.from as any)(table)
                .insert(row)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: [table] });
            options?.onSuccess?.(...args);
        },
        ...options,
    });
}

/**
 * Update rows in a Supabase table by ID.
 *
 * @example
 * const update = useSupabaseUpdate('events');
 * update.mutate({ id: '123', changes: { name: 'New Name' } });
 */
export function useSupabaseUpdate(
    table: string,
    options?: Omit<UseMutationOptions<any[], Error, { id: string; changes: Record<string, unknown> }>, 'mutationFn'>,
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, changes }: { id: string; changes: Record<string, unknown> }) => {
            const { data, error } = await (supabase.from as any)(table)
                .update(changes)
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: [table] });
            options?.onSuccess?.(...args);
        },
        ...options,
    });
}

/**
 * Delete rows from a Supabase table by ID.
 *
 * @example
 * const remove = useSupabaseDelete('events');
 * remove.mutate('some-uuid');
 */
export function useSupabaseDelete(
    table: string,
    options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>,
) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from as any)(table)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: [table] });
            options?.onSuccess?.(...args);
        },
        ...options,
    });
}
