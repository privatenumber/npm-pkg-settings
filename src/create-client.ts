import { existsSync } from 'node:fs';
import { Koon, koonFetch } from 'koonjs';
import { performLogin } from './context/login.ts';
import { getUsername } from './api/get-username.ts';
import { listPackages } from './api/list-packages.ts';
import { getPackageAccess } from './api/get-package-access.ts';
import { setPublishingAccess } from './api/set-publishing-access.ts';
import { linkTrustedPublisher } from './api/link-trusted-publisher.ts';
import { addMaintainer } from './api/add-maintainer.ts';
import type { CreateClientOptions, NpmClient, NpmInternalClient } from './types.ts';
import { defaultOtpGenerator } from './utils/default-otp-generator.ts';

export const defaultSessionFile = '.npm-pkg-settings.cookies.json';

const npmBaseUrl = 'https://www.npmjs.com/';

export const createClient = (options: CreateClientOptions): NpmClient => {
	const sessionFile = options.sessionFile ?? defaultSessionFile;

	// koon keeps cookies in memory, so the session is loaded and saved here.
	const koon = new Koon({ browser: 'chrome' });

	if (existsSync(sessionFile)) {
		try {
			koon.loadSessionFromFile(sessionFile);
		} catch {
			// An old-format (e.g. tough-cookie JSON) or unreadable session
			// starts fresh; the user logs in again
		}
	}

	const cookieSnapshot = () => JSON.stringify(
		koon.cookies().sort((a, b) => a.name.localeCompare(b.name)),
	);

	const koonRequest = koonFetch(koon);

	const request = async (url: string, init?: RequestInit) => {
		try {
			return await koonRequest(url, init);
		} catch (error) {
			// koonFetch reports transport failures as "fetch failed", with the detail on the cause
			const detail = error instanceof Error && error.cause instanceof Error
				? `: ${error.cause.message}`
				: '';
			throw new Error(`Fetch failed${detail}`, { cause: error });
		}
	};

	const fetch: NpmInternalClient['fetch'] = async (path, init) => {
		const cookiesBefore = cookieSnapshot();

		// Redirects are followed manually via the location header (see context/login.ts)
		const response = await request(new URL(path, npmBaseUrl).href, {
			...init,
			redirect: 'manual',
		});

		// Persist after a response that changes the session (login, OTP) so the next run can reuse it
		if (cookieSnapshot() !== cookiesBefore) {
			koon.saveSessionToFile(sessionFile);
		}

		return response;
	};

	const client = {
		fetch,
		otpSecret: options.otpSecret,
		otpGenerator: defaultOtpGenerator,
		cachedUsername: options.username,
	};

	return {
		login: async () => {
			if (!options.username || !options.password) {
				throw new Error('login() requires username and password in createClient options');
			}
			return performLogin(client, {
				username: options.username,
				password: options.password,
			});
		},
		listPackages: () => listPackages(client),
		getPackageAccess: packageName => getPackageAccess(client, packageName),
		setPublishingAccess: (packageName, access) => setPublishingAccess(client, packageName, access),
		linkTrustedPublisher: (packageName, publisher) => (
			linkTrustedPublisher(client, packageName, publisher)
		),
		addMaintainer: (packageName, npmUsername) => addMaintainer(client, packageName, npmUsername),
		getUsername: () => getUsername(client),
	};
};
