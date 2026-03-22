import type { NpmContext } from '../types.ts';
import { parseOtpPage } from '../parsers/otp.ts';
import { npmFetch } from './npm-fetch.ts';
import { generateOtp } from './generate-otp.ts';

const handleOtpEscalation = async (
	context: NpmContext,
	body: string,
): Promise<{ status: number;
	body: string; } | undefined> => {
	if (!body.includes('One-time Password')) {
		return;
	}

	const { action, csrfToken, formName } = parseOtpPage(body);
	const otp = await generateOtp(context);

	const otpResponse = await npmFetch(context, action, {
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
			const finalResponse = await npmFetch(context, location);
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
	context: NpmContext,
	path: string,
): Promise<{ status: number;
	body: string; }> => {
	let response = await npmFetch(context, path);

	// Follow redirect (escalation or login)
	if (response.status >= 300 && response.status < 400) {
		const location = response.headers.get('location');
		if (location) {
			response = await npmFetch(context, location);
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
	const otpResult = await handleOtpEscalation(context, body);
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
