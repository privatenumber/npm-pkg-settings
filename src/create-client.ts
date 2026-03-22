import { Impit } from 'impit';
import { CookieJar } from 'tough-cookie';
import FileCookieStore from 'tough-cookie-file-store';
import { performLogin } from './context/login.ts';
import { getUsername } from './api/get-username.ts';
import { listPackages } from './api/list-packages.ts';
import { getPackageAccess } from './api/get-package-access.ts';
import { setPublishingAccess } from './api/set-publishing-access.ts';
import { linkTrustedPublisher } from './api/link-trusted-publisher.ts';
import { addMaintainer } from './api/add-maintainer.ts';
import type { CreateClientOptions, NpmClient } from './types.ts';
import { defaultOtpGenerator } from './utils/default-otp-generator.ts';

export const defaultSessionFile = '.npm-pkg-settings.cookies.json';

const npmBaseUrl = 'https://www.npmjs.com/';

export const createClient = (options: CreateClientOptions): NpmClient => {
	const impit = new Impit({
		browser: 'chrome142',
		cookieJar: new CookieJar(new FileCookieStore(options.sessionFile ?? defaultSessionFile)),
		followRedirects: false,
	});

	const client = {
		fetch: (path: string, init?: Record<string, unknown>) => impit.fetch(
			new URL(path, npmBaseUrl).href,
			init,
		),
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
