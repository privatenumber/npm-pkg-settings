import type { NpmContext } from '../types.ts';
import { submitWithOtp } from '../utils/submit-with-otp.ts';
import { getAccessPageWithCsrf } from './get-package-access.ts';

export const setPublishingAccess = async (
	context: NpmContext,
	packageName: string,
	access: string,
) => {
	const settings = await getAccessPageWithCsrf(context, packageName);
	const accessPath = `package/${packageName}/access`;

	const result = await submitWithOtp(context, accessPath, new URLSearchParams({
		publishingAccess: access,
		csrftoken: settings.csrfToken,
	}));

	if (result.status < 300 || result.status >= 400) {
		throw new Error(`Failed to set publishing access for ${packageName} (status ${result.status})`);
	}
};
