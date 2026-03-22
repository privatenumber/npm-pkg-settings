import type { NpmInternalClient } from '../types.ts';
import { submitWithOtp } from '../utils/submit-with-otp.ts';
import { getAccessPageWithCsrf } from './get-package-access.ts';

export const addMaintainer = async (
	client: NpmInternalClient,
	packageName: string,
	npmUsername: string,
) => {
	const settings = await getAccessPageWithCsrf(client, packageName);
	const accessPath = `package/${packageName}/access`;

	const result = await submitWithOtp(client, accessPath, new URLSearchParams({
		add: npmUsername,
		csrftoken: settings.csrfToken,
	}));

	if (result.status < 300 || result.status >= 400) {
		throw new Error(`Failed to add maintainer to ${packageName} (status ${result.status})`);
	}
};
