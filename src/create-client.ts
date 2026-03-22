import { createFetch, defaultSessionFile } from './create-fetch.ts';
import { performLogin } from './context/login.ts';
import { getUsername } from './api/get-username.ts';
import { listPackages } from './api/list-packages.ts';
import { getPackageAccess } from './api/get-package-access.ts';
import { setPublishingAccess } from './api/set-publishing-access.ts';
import { linkTrustedPublisher } from './api/link-trusted-publisher.ts';
import { addMaintainer } from './api/add-maintainer.ts';
import type { CreateClientOptions, NpmClient } from './types.ts';
import { defaultOtpGenerator } from './utils/default-otp-generator.ts';

export { defaultSessionFile };

export const createClient = (options: CreateClientOptions): NpmClient => {
	const context = {
		fetch: createFetch(options.sessionFile ?? defaultSessionFile),
		otpSecret: options.otpSecret,
		otpGenerator: defaultOtpGenerator,
		cachedUsername: options.username,
	};

	return {
		login: async () => {
			if (!options.username || !options.password) {
				throw new Error('login() requires username and password in createClient options');
			}
			return performLogin(context, {
				username: options.username,
				password: options.password,
			});
		},
		listPackages: () => listPackages(context),
		getPackageAccess: packageName => getPackageAccess(context, packageName),
		setPublishingAccess: (packageName, access) => setPublishingAccess(context, packageName, access),
		linkTrustedPublisher: (packageName, publisher) => (
			linkTrustedPublisher(context, packageName, publisher)
		),
		addMaintainer: (packageName, npmUsername) => addMaintainer(context, packageName, npmUsername),
		getUsername: () => getUsername(context),
	};
};
