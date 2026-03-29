import type { NpmInternalClient } from '../types.ts';
import { httpStatusHint } from '../utils/http-status-hint.ts';
import { submitWithOtp } from '../utils/submit-with-otp.ts';
import { getAccessPageWithCsrf } from './get-package-access.ts';

export const setPublishingAccess = async (
	client: NpmInternalClient,
	packageName: string,
	access: string,
) => {
	const settings = await getAccessPageWithCsrf(client, packageName);
	const accessPath = `package/${packageName}/access`;

	const result = await submitWithOtp(client, accessPath, new URLSearchParams({
		publishingAccess: access,
		csrftoken: settings.csrfToken,
	}));

	if (result.status < 300 || result.status >= 400) {
		throw new Error(`Failed to set publishing access for ${packageName} (${httpStatusHint(result.status)})`);
	}
};
