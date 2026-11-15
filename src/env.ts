import { defineEnvVars } from '@sveltejs/kit/env';

// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
export const variables = defineEnvVars({
	PUBLIC_NTFY_SERVER: { public: true, schema: (input) => input ?? '' },
	TETHER_CONTRACT_ADDRESS: { static: true },
	PUBLIC_PAYMENT_FEE: { public: true, schema: (input) => input ?? '' },
	FEE_PERCENTAGE: { static: true },
	PUBLIC_APP_URL: { schema: (input) => input ?? '' },
	PAYMENT_WEBHOOK_SECRET: { static: true },
	ZARINPAL_WEBHOOK_SECRET: { static: true },
	GOOGLE_CLIENT_ID: { static: true },
	GOOGLE_CLIENT_SECRET: { static: true },
	GOOGLE_REDIRECT_URI: { static: true },
	BACKBLAZE_KEY_ID: { static: true },
	BACKBLAZE_APPLICATION_KEY: { static: true },
	BACKBLAZE_BUCKET_NAME: { static: true },
	BACKBLAZE_REGION: { static: true },
	BACKBLAZE_ENDPOINT: { static: true },
	DATABASE_URL: { static: true },
	APP_URL: { static: true },
	NTFY_SERVER: { static: true },
	ETHEREUM_RPC_URL: { static: true },
	TETHER_PRIVATE_KEY: { static: true },
	ZARINPAL_MERCHANT_ID: { static: true },
	ZARINPAL_SANDBOX: { static: true },
	MOCK: { schema: (input) => input ?? '' },
	MOCK_PAYMENTS: { schema: (input) => input ?? '' },
	MAIL_USER: { static: true },
	MAIL_PASS: { static: true }
});
