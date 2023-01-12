import * as React from 'react';

import { TransitionProps } from '@mui/material/transitions';

import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';

import { Alert, AlertTitle, AppBar, Box, Button, Container, Dialog, Divider, Grid, IconButton, Link, ListItemIcon, MenuItem, Slide, TextField, Toolbar, Typography } from '@mui/material';
import { useSupabase } from '../lib/useSupabase';
import AvatarEditor from './AvatarEditor';
import EmailEditor from './EmailEditor';

const Transition = React.forwardRef(function Transition(
	props: TransitionProps & {
		children: React.ReactElement;
	},
	ref: React.Ref<unknown>
) {
	return <Slide direction='left' ref={ref} {...props} />;
});

export type AccountDialogProps = {
	handleCloseMenu?(): void;
};

export default function AccountDialog(props: AccountDialogProps) {
	const { user, profile, updateProfile } = useSupabase();

	const [open, setOpen] = React.useState(false);

	const [name, setName] = React.useState(profile.name);

	const handleClickOpen = () => {
		if (props.handleCloseMenu) props.handleCloseMenu();
		setName(profile.name); // update profile
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
	};
	const handleSave = async () => {
		await updateProfile({
			name: name,
		});
		setOpen(false);
	};

	return (
		<>
			<MenuItem onClick={handleClickOpen}>
				<ListItemIcon>
					<PersonIcon fontSize='small' />
				</ListItemIcon>
				<Typography textAlign='center'>My Account</Typography>
			</MenuItem>

			<Dialog onKeyDown={(e) => e.stopPropagation()} fullScreen open={open} onClose={handleClose} TransitionComponent={Transition}>
				<AppBar sx={{ position: 'relative' }} enableColorOnDark>
					<Toolbar>
						<IconButton edge='start' color='inherit' onClick={handleClose} aria-label='close'>
							<CloseIcon />
						</IconButton>
						<Typography sx={{ ml: 2, flex: 1 }} variant='h6' component='div'>
							My Account
						</Typography>
						<IconButton edge='start' color='inherit' onClick={handleSave} aria-label='close'>
							<SaveIcon />
						</IconButton>
					</Toolbar>
				</AppBar>
				<Container maxWidth='md' sx={{ marginTop: 6 }}>
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<AvatarEditor />
						</Grid>
						<Grid item xs={12}>
							<TextField fullWidth label='Display Name' variant='outlined' value={name} onChange={(e) => setName(e.target.value)} />
						</Grid>
						{user.app_metadata.provider === 'email' && (
							<Grid item xs={12}>
								<EmailEditor />
							</Grid>
						)}

						<Grid item xs={12}>
							<Divider />
						</Grid>

						<Grid item xs={12}>
							<Typography variant='h6' gutterBottom>
								Danger Zone
							</Typography>
							<Alert severity='error'>
								<AlertTitle>Delete Account</AlertTitle>

								<Grid container spacing={2}>
									<Grid item xs={12}>
										<Typography variant='body1'>
											Your account is currently an owner in these groups: <Link>Family Group</Link>
										</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant='body1'>You must remove yourself, transfer ownership, or delete these group before you can delete your account.</Typography>
									</Grid>
									<Grid item xs={12}>
										<Button variant='outlined' color='error' disabled>
											Delete Your Account
										</Button>
									</Grid>
								</Grid>
							</Alert>
						</Grid>
					</Grid>
				</Container>
			</Dialog>
		</>
	);
}
