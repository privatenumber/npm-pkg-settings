import type { NpmContext } from '../types.ts';
import { parseOtpPage } from '../parsers/otp.ts';
import { npmFetch } from './npm-fetch.ts';
import { generateOtp } from './generate-otp.ts';

export const submitWithOtp = async (
	context: NpmContext,
	path: string,
	body: URLSearchParams,
) => {
	const response = await npmFetch(context, path, {
		method: 'POST',
		body,
	});
	const responseBody = await response.text();

	if (response.status === 200 && responseBody.includes('One-time Password')) {
		const { action, csrfToken, formName } = parseOtpPage(responseBody);
		const otp = await generateOtp(context);

		const otpResponse = await npmFetch(context, action, {
			method: 'POST',
			body: new URLSearchParams({
				otp,
				formName,
				csrftoken: csrfToken,
			}),
		});

		return {
			status: otpResponse.status,
			body: await otpResponse.text(),
		};
	}

	return {
		status: response.status,
		body: responseBody,
	};
};
