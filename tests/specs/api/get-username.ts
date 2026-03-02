import { describe, test, expect } from 'manten';
import { getUsername } from '../../../src/index.ts';
import type { NpmContext } from '../../../src/types.ts';

const mockResponse = (status: number, body: string, headers: Record<string, string> = {}) => ({
	status,
	statusText: 'OK',
	ok: status >= 200 && status < 300,
	headers,
	text: async () => body,
	json: async () => JSON.parse(body),
});

const mockContext = (handler: NpmContext['fetch']): NpmContext => ({
	fetch: handler,
	otpSecret: 'test',
	otpGenerator: async () => '123456',
});

describe('getUsername', () => {
	test('fetches from session when not cached', async () => {
		const context = mockContext(async () => mockResponse(
			200,
			JSON.stringify({ user: { name: 'sessionuser' } }),
		));

		const username = await getUsername(context);
		expect(username).toBe('sessionuser');
	});

	test('caches after first fetch', async () => {
		let callCount = 0;
		const context = mockContext(async () => {
			callCount += 1;
			return mockResponse(200, JSON.stringify({ user: { name: 'cached' } }));
		});

		await getUsername(context);
		await getUsername(context);
		expect(callCount).toBe(1);
		expect(context.cachedUsername).toBe('cached');
	});

	test('throws when not logged in', async () => {
		const context = mockContext(async () => mockResponse(
			200,
			JSON.stringify({ user: null }),
		));

		await expect(getUsername(context)).rejects.toThrow('Not logged in');
	});

	test('throws on non-200 response', async () => {
		const context = mockContext(async () => mockResponse(500, ''));

		await expect(getUsername(context)).rejects.toThrow('Failed to fetch homepage');
	});
});
