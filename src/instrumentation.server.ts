import { registerOTel } from '@vercel/otel';

registerOTel({
	serviceName: 'my-sveltekit-app'
});
