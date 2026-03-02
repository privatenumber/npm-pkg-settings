import task from 'tasuku/inline';
import { createClient } from '../../create-client.ts';
import type { NpmClient } from '../../types.ts';

let cached: NpmClient | undefined;

export const getClient = async () => {
	if (cached) {
		return cached;
	}

	const { NPM_USERNAME, NPM_PASSWORD, NPM_OTP_SECRET } = process.env;
	if (!NPM_OTP_SECRET) {
		console.error('Missing NPM_OTP_SECRET. Set it in .env or your environment.');
		console.error('');
		console.error('  echo \'NPM_OTP_SECRET=YOUR_BASE32_SECRET\' > .env');
		console.error('');
		console.error('Use `npm-pkg-settings decode-secret` to extract it from a QR code.');
		process.exitCode = 1;
		return;
	}

	const client = createClient({
		username: NPM_USERNAME,
		password: NPM_PASSWORD,
		otpSecret: NPM_OTP_SECRET,
	});

	if (NPM_USERNAME && NPM_PASSWORD) {
		await task('Logging in', async ({ setTitle }) => {
			const { skipped } = await client.login();
			setTitle(skipped ? 'Already logged in' : 'Logged in');
		});
	}

	cached = client;
	return client;
};
