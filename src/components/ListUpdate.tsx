import React, { useEffect } from 'react';

import { DEFAULT_LIST_ID, useGetGroups, useSupabase, useUpdateLists } from '../lib/useSupabase/hooks';
import { GroupType, ListType } from '../lib/useSupabase/types';

import { useSnackbar } from 'notistack';

import { Dialog, DialogTitle, DialogContent, Button, TextField, DialogContentText, FormControl, FormControlLabel, Grid, Switch, Stack, useMediaQuery, useTheme } from '@mui/material';
import { Add } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import GroupSelector from './GroupSelector';
import ImageCropper from './ImageCropper';

type ListUpdateProps = {
	list: ListType | null;
	onClose: () => void;
};

export default function ListUpdate({ list, onClose }: ListUpdateProps) {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const { client } = useSupabase();
	const { data: groups } = useGetGroups();

	const [name, setName] = React.useState('');
	const [selectedGroups, setSelectedGroups] = React.useState<Omit<GroupType, 'image_token' | 'my_membership'>[]>([]);
	const [childList, setChildList] = React.useState<boolean>(false);
	const [image, setImage] = React.useState<string | undefined>();
	const [bio, setBio] = React.useState<string | undefined>();

	const updateLists = useUpdateLists();
	const handleSave = async () => {
		if (list) {
			await updateLists
				.mutateAsync({ id: list.id, name, child_list: childList, image: image, bio: bio, groups: selectedGroups })
				.then(() => {
					onClose();
				})
				.catch((err) => {
					enqueueSnackbar(`Unable to update list! ${err.message}`, { variant: 'error' });
				});
		}
	};

	useEffect(() => {
		if (list) {
			setName(list.name);
			setSelectedGroups(list.groups);
			setChildList(list.child_list);
			setImage(list.image);
			setBio(list.bio);
		}
	}, [list]);

	return (
		<Dialog open={list !== null} onClose={updateLists.isLoading ? undefined : onClose} maxWidth='sm' fullScreen={useMediaQuery(theme.breakpoints.down('md'))}>
			<DialogTitle>Edit List</DialogTitle>
			<DialogContent>
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<DialogContentText>TODO: describe what lists do...</DialogContentText>
					</Grid>
					{childList && (
						<Grid item xs={12}>
							<ImageCropper value={image} onChange={setImage} aspectRatio={1} />
						</Grid>
					)}
					<Grid item xs={12}>
						<TextField fullWidth label='Name' variant='outlined' required value={name} onChange={(e) => setName(e.target.value)} autoFocus disabled={updateLists.isLoading} />
					</Grid>
					<Grid item xs={12}>
						<GroupSelector groups={groups as Omit<GroupType, 'image_token' | 'my_membership'>[]} value={selectedGroups} onChange={setSelectedGroups} disabled={updateLists.isLoading} />
					</Grid>

					{list?.id !== DEFAULT_LIST_ID && (
						<Grid item xs={12}>
							<FormControl component='fieldset' variant='standard'>
								<FormControlLabel
									control={<Switch checked={childList} onChange={(e) => setChildList(e.target.checked)} disabled={updateLists.isLoading} />}
									label='Display Separately in Groups'
								/>
							</FormControl>
						</Grid>
					)}
					{childList && (
						<Grid item xs={12}>
							<TextField
								fullWidth
								multiline
								minRows={3}
								maxRows={7}
								label='Bio'
								variant='outlined'
								inputProps={{ maxLength: 250 }}
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								helperText={`${bio?.length} / 250`}
							/>
						</Grid>
					)}

					<Grid item xs={12}>
						<Stack direction='row' justifyContent='flex-end' spacing={2}>
							<Button color='inherit' onClick={onClose} disabled={updateLists.isLoading}>
								Cancel
							</Button>

							<LoadingButton onClick={handleSave} disabled={name.length === 0} endIcon={<Add />} loading={updateLists.isLoading} loadingPosition='end' variant='contained'>
								Save
							</LoadingButton>
						</Stack>
					</Grid>
				</Grid>
			</DialogContent>
		</Dialog>
	);
}
