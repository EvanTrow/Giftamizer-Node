import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Google Analytics
import ReactGA from 'react-ga4';

import { useSupabase } from './useSupabase';
import { GROUPS_QUERY_KEY } from './useGroup';
import { ItemStatus, ItemStatuses, MemberItemType } from '../types';
import { FakeDelay } from '.';

const MEMBER_ITEMS_QUERY_KEY = ['items'];
export const CLAIMED_ITEMS_QUERY_KEY = ['claimed_items'];

export const useGetMemberItems = (group_id: string, user_id: string, list_id?: string) => {
	const { client } = useSupabase();

	return useQuery({
		// disable data cacheing
		staleTime: 0,
		cacheTime: 0,

		queryKey: [...GROUPS_QUERY_KEY, group_id, user_id, ...MEMBER_ITEMS_QUERY_KEY, list_id],
		queryFn: async (): Promise<MemberItemType[]> => {
			if (list_id === undefined) {
				const { data: profile, error: profileError } = await client.from('profiles').select(`enable_lists`).eq('user_id', user_id).single();
				if (profileError) throw profileError;

				let res;
				if (profile.enable_lists) {
					res = await client
						.from('items')
						.select(
							`*,
							items_lists!inner( 
								lists!inner(
									lists_groups!inner(
										group_id
									)
								)
							),
							status:items_status(
								item_id,
								user_id,
								status
							)`
						)
						.eq('user_id', user_id)
						.eq('archived', false)
						.eq('deleted', false)
						.is('shopping_item', null)
						.eq('user_id', user_id)
						.eq('items_lists.lists.child_list', false)
						.eq('items_lists.lists.lists_groups.group_id', group_id);
				} else {
					res = await client
						.from('items')
						.select(
							`*,
							status:items_status(
								item_id,
								user_id,
								status
							)`
						)
						.eq('user_id', user_id)
						.is('shopping_item', null);
				}
				if (res.error) throw res.error;

				return res.data.map((i) => {
					// @ts-ignore
					return { ...i, image: i.image_token && `${client.supabaseUrl}/storage/v1/object/public/items/${i.id}?${i.image_token}` };
				}) as MemberItemType[];
			} else {
				var res = await client
					.from('items')
					.select(
						`*,
					items_lists!inner( 
						lists!inner(
							lists_groups!inner(
								group_id
							)
						)
					),
					status:items_status(
						item_id,
						user_id,
						status
					)`
					)
					.eq('user_id', user_id)
					.eq('archived', false)
					.eq('deleted', false)
					.is('shopping_item', null)
					.eq('items_lists.lists.id', list_id)
					.eq('items_lists.lists.lists_groups.group_id', group_id);
				if (res.error) throw res.error;

				return res.data.map((i) => {
					// @ts-ignore
					return { ...i, image: i.image_token && `${client.supabaseUrl}/storage/v1/object/public/items/${i.id}?${i.image_token}` };
				}) as MemberItemType[];
			}
		},
	});
};

export const useRefreshItem = (group_id: string, user_id: string, list_id?: string) => {
	const queryClient = useQueryClient();
	const { client } = useSupabase();

	return useMutation(
		async (item_id: string): Promise<MemberItemType> => {
			const { data } = await client
				.from('items')
				.select(
					`*,
					items_lists( 
						lists(
							lists_groups(
								group_id
							)
						)
					),
					status:items_status(
						item_id,
						user_id,
						status
					)`
				)
				.eq('id', item_id)
				.eq('archived', false)
				.eq('deleted', false)
				.is('shopping_item', null)
				.eq('items_lists.lists.id', list_id)
				.eq('items_lists.lists.lists_groups.group_id', group_id)
				.single();

			// @ts-ignore
			return { ...data, image: data.image_token && `${client.supabaseUrl}/storage/v1/object/public/items/${data.id}?${data.image_token}` } as MemberItemType;
		},
		{
			onSuccess: (update: MemberItemType) => {
				queryClient.setQueryData([...GROUPS_QUERY_KEY, group_id, user_id, ...MEMBER_ITEMS_QUERY_KEY, list_id], (prevItems: MemberItemType[] | undefined) => {
					if (prevItems) {
						var updatedItems: MemberItemType[];
						if (prevItems.find((i) => i.id === update.id)) {
							updatedItems = prevItems.map((item) => {
								return item.id === update.id ? update : item;
							});
						} else {
							updatedItems = [...prevItems, update];
						}
						return updatedItems;
					}
					return prevItems;
				});
			},
		}
	);
};

export const useUpdateItemStatus = (group_id?: string, user_id?: string, list_id?: string, shoppingItem?: boolean) => {
	const queryClient = useQueryClient();
	const { client } = useSupabase();

	return useMutation(
		async (status: ItemStatus): Promise<ItemStatus> => {
			await FakeDelay(); // fake delay

			if (status.status === ItemStatuses.available && !shoppingItem) {
				// delete row
				const { error } = await client.from('items_status').delete().eq('item_id', status.item_id);
				if (error) throw error;
			} else {
				// upsert

				// override to planned is shopping Item
				if (status.status === ItemStatuses.available && shoppingItem) status.status = ItemStatuses.planned;

				const { error } = await client.from('items_status').upsert({ item_id: status.item_id, user_id: status.user_id, status: status.status }).select();
				if (error) throw error;
			}

			return status;
		},
		{
			onSuccess: (status: ItemStatus) => {
				// Google Analytics
				ReactGA.event({
					category: 'item',
					action: `Item Status: ${status.status === ItemStatuses.available ? 'Available' : status.status === ItemStatuses.planned ? 'Planned' : 'Unavailable'}`,
				});

				queryClient.setQueryData(
					group_id ? [...GROUPS_QUERY_KEY, group_id, user_id, ...MEMBER_ITEMS_QUERY_KEY, list_id] : CLAIMED_ITEMS_QUERY_KEY,
					(prevItems: MemberItemType[] | undefined) => {
						if (prevItems) {
							var updatedItems: MemberItemType[];
							if (prevItems.find((i) => i.id === status.item_id)) {
								updatedItems = prevItems.map((item) => {
									return item.id === status.item_id
										? {
												...item,
												status: status.status === ItemStatuses.available ? undefined : status,
										  }
										: item;
								});
							} else {
								updatedItems = prevItems;
							}
							return updatedItems;
						}
						return prevItems;
					}
				);
			},
		}
	);
};

export const useClaimedItems = () => {
	const { client, user } = useSupabase();

	return useQuery({
		// disable data cacheing
		staleTime: 0,
		cacheTime: 0,

		queryKey: CLAIMED_ITEMS_QUERY_KEY,
		queryFn: async (): Promise<MemberItemType[]> => {
			const { data, error } = await client
				.from('items')
				.select(
					`*,
					items_lists( 
						lists(
							id,
							name,
							child_list,
							avatar_token,
							lists_groups(
								group_id
							)
						)
					),
					status:items_status!inner(
						item_id,
						user_id,
						status
					),
					profile:profiles!items_user_id_fkey(
						user_id,
						first_name,
						last_name,
						avatar_token
					)`
				)
				.eq('status.user_id', user.id)
				.eq('archived', false)
				.eq('deleted', false)
				.is('shopping_item', null);
			if (error) throw error;

			const { data: ShoppingItemData, error: ShoppingItemError } = await client
				.from('items')
				.select(
					`*,
					status:items_status(
						item_id,
						user_id,
						status
					),
					profile:profiles!items_shopping_item_fkey(
						user_id,
						first_name,
						last_name,
						avatar_token
					)`
				)
				.eq('user_id', user.id)
				.not('shopping_item', 'is', null);
			if (ShoppingItemError) throw ShoppingItemError;

			return [...data, ...ShoppingItemData].map((i) => {
				return {
					...i,
					// @ts-ignore
					image: i.image_token && `${client.supabaseUrl}/storage/v1/object/public/items/${i.id}?${i.image_token}`,

					profile: {
						...i.profile,
						// @ts-ignore
						image: i.profile.avatar_token && `${client.supabaseUrl}/storage/v1/object/public/avatars/${i.profile.user_id}?${i.profile.avatar_token}`,
					},
				};
			}) as MemberItemType[];
		},
	});
};
