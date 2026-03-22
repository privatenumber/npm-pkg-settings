import { parseLoginPage } from '../parsers/login.ts';
import { parseOtpPage } from '../parsers/otp.ts';
import type { NpmContext } from '../types.ts';
import { generateOtp } from '../utils/generate-otp.ts';
import { npmFetch } from '../utils/npm-fetch.ts';

const isLoggedIn = async (context: NpmContext): Promise<boolean> => {
	const response = await npmFetch(context, '', {
		headers: { 'x-spiferack': '1' },
	});
	if (response.status !== 200) {
		return false;
	}
	const data = await response.json() as { user?: { name?: string } };
	if (data.user?.name) {
		context.cachedUsername = data.user.name;
		return true;
	}
	return false;
};

export const performLogin = async (
	context: NpmContext,
	credentials: { username: string;
		password: string; },
): Promise<{ skipped: boolean }> => {
	if (await isLoggedIn(context)) {
		return { skipped: true };
	}

	// GET /login to get CSRF token
	const loginPage = await npmFetch(context, 'login');
	if (loginPage.status !== 200) {
		throw new Error(`Failed to fetch login page (status ${loginPage.status})`);
	}

	const { csrfToken } = parseLoginPage(await loginPage.text());

	// POST /login with credentials
	const loginResponse = await npmFetch(context, 'login', {
		method: 'POST',
		body: new URLSearchParams({
			username: credentials.username,
			password: credentials.password,
			csrftoken: csrfToken,
		}),
	});

	// Follow redirect to OTP page
	if (loginResponse.status >= 300 && loginResponse.status < 400) {
		const location = loginResponse.headers.get('location');
		if (location) {
			const otpPage = await npmFetch(context, location);
			const otpPageBody = await otpPage.text();
			if (otpPage.status === 200 && otpPageBody.includes('One-time Password')) {
				const { action, csrfToken: otpCsrf, formName } = parseOtpPage(otpPageBody);
				const otp = await generateOtp(context);

				const otpResponse = await npmFetch(context, action, {
					method: 'POST',
					body: new URLSearchParams({
						otp,
						formName,
						csrftoken: otpCsrf,
					}),
				});

				if (otpResponse.status < 300 || otpResponse.status >= 400) {
					throw new Error(`OTP submission failed (status ${otpResponse.status})`);
				}
			}
		}
	} else if (loginResponse.status !== 200) {
		throw new Error(`Login failed (status ${loginResponse.status})`);
	}

	return { skipped: false };
};
