import ky from 'ky';
import { CookieJar } from 'tough-cookie';
import FileCookieStore from 'tough-cookie-file-store';
import { withCookies } from 'ky-cookies';

export const defaultSessionFile = '.npm-pkg-settings.cookies.json';

export const createFetch = (sessionFile: string) => ky.create({
	throwHttpErrors: false,
	redirect: 'manual',
	...withCookies(new CookieJar(new FileCookieStore(sessionFile))),
});
