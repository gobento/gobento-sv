// src/routes/welcome/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import {
	accounts,
	businessProfiles,
	charityProfiles,
	files,
	businessWallets,
	userProfiles
} from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { welcomeSchema } from './schema';
import { uploadFileFromForm } from '$lib/server/backblaze';

export const load: PageServerLoad = async () => {
	const form = await superValidate(valibot(welcomeSchema));
	return {
		form
	};
};

export const actions = {
	setup: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const form = await superValidate(formData, valibot(welcomeSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { accountType, paymentMethod, ibanNumber, tetherAddress } = form.data;

		try {
			// Update account type if needed
			if (account.accountType !== accountType) {
				await db.update(accounts).set({ accountType }).where(eq(accounts.id, account.id));
			}

			// For business and charity accounts, payment method is REQUIRED
			if (accountType === 'business' || accountType === 'charity') {
				if (!paymentMethod) {
					return fail(400, {
						form,
						message: 'Payment method is required for businesses and charities'
					});
				}

				if (paymentMethod === 'iban' && !ibanNumber) {
					return fail(400, {
						form,
						message: 'IBAN number is required'
					});
				}

				if (paymentMethod === 'tether' && !tetherAddress) {
					return fail(400, {
						form,
						message: 'Tether wallet address is required'
					});
				}

				// Validate Tether address format
				if (paymentMethod === 'tether' && tetherAddress) {
					if (!tetherAddress.startsWith('0x') || tetherAddress.length !== 42) {
						return fail(400, {
							form,
							message: 'Invalid Tether wallet address format'
						});
					}
				}

				// Validate IBAN format (basic check)
				if (paymentMethod === 'iban' && ibanNumber) {
					const cleanIban = ibanNumber.replace(/\s/g, '');
					if (cleanIban.length < 15 || cleanIban.length > 34) {
						return fail(400, {
							form,
							message: 'Invalid IBAN format'
						});
					}
				}
			}

			// Handle user account
			if (accountType === 'user') {
				// Create user profile if it doesn't exist
				await db
					.insert(userProfiles)
					.values({
						accountId: account.id
					})
					.onConflictDoNothing();

				// Redirect to home (throws redirect error)
				throw redirect(303, '/');
			}

			// Handle business/charity accounts - require profile picture and additional fields
			const pictureFile = formData.get('picture') as File;
			if (!pictureFile || pictureFile.size === 0) {
				return fail(400, {
					form,
					message: 'Profile picture is required'
				});
			}

			// Validate file
			if (!pictureFile.type.startsWith('image/')) {
				return fail(400, {
					form,
					message: 'File must be an image'
				});
			}

			if (pictureFile.size > 5 * 1024 * 1024) {
				return fail(400, {
					form,
					message: 'File size must be less than 5MB'
				});
			}

			// Validate required fields for business/charity
			if (!('name' in form.data) || !form.data.name) {
				return fail(400, {
					form,
					message: 'Name is required'
				});
			}

			if (!('description' in form.data) || !form.data.description) {
				return fail(400, {
					form,
					message: 'Description is required'
				});
			}

			if (!('country' in form.data) || !form.data.country) {
				return fail(400, {
					form,
					message: 'Country is required'
				});
			}

			// Upload to Backblaze
			const uploadResult = await uploadFileFromForm(pictureFile);

			if (!uploadResult.success) {
				return fail(500, {
					form,
					message: uploadResult.error || 'Failed to upload file'
				});
			}

			// Generate file ID and use the storage key from upload
			const fileId = randomUUID();
			const storageKey = uploadResult.key;

			// Save file record
			await db.insert(files).values({
				id: fileId,
				key: storageKey,
				fileName: pictureFile.name,
				contentType: pictureFile.type,
				sizeBytes: pictureFile.size,
				uploadedBy: account.id
			});

			// Create profile based on type
			if (accountType === 'business') {
				// Validate business type
				if (!('businessType' in form.data) || !form.data.businessType) {
					return fail(400, {
						form,
						message: 'Business type is required'
					});
				}

				await db.insert(businessProfiles).values({
					accountId: account.id,
					name: form.data.name,
					description: form.data.description,
					country: form.data.country,
					businessType: form.data.businessType,
					profilePictureId: fileId
				});

				// Create business wallet configuration (REQUIRED)
				await db
					.insert(businessWallets)
					.values({
						accountId: account.id,
						ibanNumber: paymentMethod === 'iban' ? ibanNumber : null,
						ibanEnabled: paymentMethod === 'iban',
						tetherAddress: paymentMethod === 'tether' ? tetherAddress : null,
						tetherEnabled: paymentMethod === 'tether',
						preferredPaymentMethod: paymentMethod!
					})
					.onConflictDoUpdate({
						target: [businessWallets.accountId],
						set: {
							ibanNumber: paymentMethod === 'iban' ? ibanNumber : null,
							ibanEnabled: paymentMethod === 'iban',
							tetherAddress: paymentMethod === 'tether' ? tetherAddress : null,
							tetherEnabled: paymentMethod === 'tether',
							preferredPaymentMethod: paymentMethod!,
							updatedAt: new Date()
						}
					});

				// Redirect to locations (throws redirect error)
				throw redirect(303, '/locations');
			} else if (accountType === 'charity') {
				await db.insert(charityProfiles).values({
					accountId: account.id,
					name: form.data.name,
					description: form.data.description,
					country: form.data.country,
					profilePictureId: fileId
				});

				// Create charity wallet configuration (REQUIRED)
				await db
					.insert(businessWallets)
					.values({
						accountId: account.id,
						ibanNumber: paymentMethod === 'iban' ? ibanNumber : null,
						ibanEnabled: paymentMethod === 'iban',
						tetherAddress: paymentMethod === 'tether' ? tetherAddress : null,
						tetherEnabled: paymentMethod === 'tether',
						preferredPaymentMethod: paymentMethod!
					})
					.onConflictDoUpdate({
						target: [businessWallets.accountId],
						set: {
							ibanNumber: paymentMethod === 'iban' ? ibanNumber : null,
							ibanEnabled: paymentMethod === 'iban',
							tetherAddress: paymentMethod === 'tether' ? tetherAddress : null,
							tetherEnabled: paymentMethod === 'tether',
							preferredPaymentMethod: paymentMethod!,
							updatedAt: new Date()
						}
					});

				// Redirect to dashboard (throws redirect error)
				throw redirect(303, '/dashboard');
			}
		} catch (error) {
			// SvelteKit redirects throw an error - we need to re-throw them
			if (error instanceof Response || (error as any)?.status) {
				throw error;
			}

			console.error('Setup error:', error);
			return fail(500, {
				form,
				message: 'An unexpected error occurred. Please try again.'
			});
		}
	}
} satisfies Actions;
