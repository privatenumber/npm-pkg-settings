import type { NpmContext } from '../types.ts';
import { npmFetch } from '../utils/npm-fetch.ts';

export const getUsername = async (context: NpmContext): Promise<string> => {
	if (context.cachedUsername) {
		return context.cachedUsername;
	}

	const response = await npmFetch(context, '', {
		headers: { 'x-spiferack': '1' },
	});
	if (response.status !== 200) {
		throw new Error(`Failed to fetch homepage (status ${response.status})`);
	}

	const data = await response.json() as { user?: { name?: string } };
	const username = data.user?.name;
	if (!username) {
		throw new Error('Not logged in — no user found in session');
	}

	context.cachedUsername = username;
	return username;
};
