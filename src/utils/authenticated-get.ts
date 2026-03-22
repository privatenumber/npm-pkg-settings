import type { NpmInternalClient } from '../types.ts';
import { parseOtpPage } from '../parsers/otp.ts';

import { generateOtp } from './generate-otp.ts';

const handleOtpEscalation = async (
	client: NpmInternalClient,
	body: string,
): Promise<{ status: number;
	body: string; } | undefined> => {
	if (!body.includes('One-time Password')) {
		return;
	}

	const { action, csrfToken, formName } = parseOtpPage(body);
	const otp = await generateOtp(client);

	const otpResponse = await client.fetch(action, {
		method: 'POST',
		body: new URLSearchParams({
			otp,
			formName,
			csrftoken: csrfToken,
		}),
	});

	if (otpResponse.status >= 300 && otpResponse.status < 400) {
		const location = otpResponse.headers.get('location');
		if (location) {
			const finalResponse = await client.fetch(location);
			return {
				status: finalResponse.status,
				body: await finalResponse.text(),
			};
		}
	}

	return {
		status: otpResponse.status,
		body: await otpResponse.text(),
	};
};

export const authenticatedGet = async (
	client: NpmInternalClient,
	path: string,
): Promise<{ status: number;
	body: string; }> => {
	let response = await client.fetch(path);

	// Follow redirect (escalation or login)
	if (response.status >= 300 && response.status < 400) {
		const location = response.headers.get('location');
		if (location) {
			response = await client.fetch(location);
		}
	}

	const body = await response.text();

	if (response.status !== 200) {
		return {
			status: response.status,
			body,
		};
	}

	// Handle OTP escalation page
	const otpResult = await handleOtpEscalation(client, body);
	if (otpResult) {
		return otpResult;
	}

	// If we landed on a login page, the session expired
	if (!body.includes('formData') && !body.includes('__context__')) {
		throw new Error('Session expired. Run login() to re-authenticate.');
	}

	return {
		status: response.status,
		body,
	};
};
