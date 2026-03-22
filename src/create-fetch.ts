import { Impit } from 'impit';
import { CookieJar } from 'tough-cookie';
import FileCookieStore from 'tough-cookie-file-store';

export const defaultSessionFile = '.npm-pkg-settings.cookies.json';

export const createFetch = (sessionFile: string) => {
	const impit = new Impit({
		browser: 'chrome142',
		cookieJar: new CookieJar(new FileCookieStore(sessionFile)),
		followRedirects: false,
	});

	return (url: string, options?: Record<string, unknown>) => impit.fetch(url, options);
};
