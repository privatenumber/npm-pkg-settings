import { describe, test, expect } from 'manten';
import { getUsername } from '../../../src/index.ts';
import type { NpmInternalClient } from '../../../src/types.ts';

const mockResponse = (status: number, body: string, headers: Record<string, string> = {}) => ({
	status,
	headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
	text: async () => body,
	json: async () => JSON.parse(body),
});

const mockClient = (handler: NpmInternalClient['fetch']): NpmInternalClient => ({
	fetch: handler,
	otpSecret: 'test',
	otpGenerator: async () => '123456',
});

describe('getUsername', () => {
	test('fetches from session when not cached', async () => {
		const client = mockClient(async () => mockResponse(
			200,
			JSON.stringify({ user: { name: 'sessionuser' } }),
		));

		const username = await getUsername(client);
		expect(username).toBe('sessionuser');
	});

	test('caches after first fetch', async () => {
		let callCount = 0;
		const client = mockClient(async () => {
			callCount += 1;
			return mockResponse(200, JSON.stringify({ user: { name: 'cached' } }));
		});

		await getUsername(client);
		await getUsername(client);
		expect(callCount).toBe(1);
		expect(client.cachedUsername).toBe('cached');
	});

	test('throws when not logged in', async () => {
		const client = mockClient(async () => mockResponse(
			200,
			JSON.stringify({ user: null }),
		));

		await expect(getUsername(client)).rejects.toThrow('Not logged in');
	});

	test('throws on non-200 response', async () => {
		const client = mockClient(async () => mockResponse(500, ''));

		await expect(getUsername(client)).rejects.toThrow('Failed to fetch homepage');
	});
});
