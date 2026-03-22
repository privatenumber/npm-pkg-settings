import type { NpmInternalClient } from '../types.ts';

export const getUsername = async (client: NpmInternalClient): Promise<string> => {
	if (client.cachedUsername) {
		return client.cachedUsername;
	}

	const response = await client.fetch('', {
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

	client.cachedUsername = username;
	return username;
};
