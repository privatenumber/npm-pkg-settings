import { describe, test, expect } from 'manten';
import { getPackageAccess } from '../../../src/index.ts';
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
	cachedUsername: 'test',
});

const makeAccessHtml = (overrides: Record<string, unknown> = {}) => {
	const client = {
		csrftoken: 'csrf-123',
		package: 'my-pkg',
		packageVersion: { repository: 'https://github.com/user/repo' },
		formData: {
			'package-settings': {
				publishingAccess: { value: 'tfa-required-unless-automation' },
				private: { value: false },
			},
		},
		provenance: { enabled: false },
		oidcConnections: [],
		maintainers: [{
			permissions: 'write',
			user: { name: 'alice' },
		}],
		...overrides,
	};
	return `<script>window.__context__ = ${JSON.stringify({ context: client })}</script>`;
};

const otpPageHtml = `
	<form id="login" action="/otp">
		<input name="csrftoken" value="otp-csrf">
		<input name="formName" value="totp">
	</form>
	One-time Password
`;

describe('getPackageAccess', () => {
	test('returns settings for direct 200 response', async () => {
		const client = mockClient(async () => mockResponse(200, makeAccessHtml()));

		const settings = await getPackageAccess(client, 'my-pkg');
		expect(settings.packageName).toBe('my-pkg');
		expect(settings.repository).toBe('https://github.com/user/repo');
		expect(settings.publishingAccess).toBe('tfa-required-unless-automation');
		expect(settings.maintainers).toEqual([{
			name: 'alice',
			permissions: 'write',
		}]);
	});

	test('strips csrfToken from public result', async () => {
		const client = mockClient(async () => mockResponse(200, makeAccessHtml()));

		const settings = await getPackageAccess(client, 'my-pkg');
		expect('csrfToken' in settings).toBe(false);
	});

	test('follows redirect and handles OTP escalation', async () => {
		let callIndex = 0;
		const client = mockClient(async (_url, init) => {
			callIndex += 1;
			// 1: GET access page → redirect to escalation
			if (callIndex === 1) {
				return mockResponse(302, '', { location: '/escalate' });
			}
			// 2: GET escalation page → OTP form
			if (callIndex === 2) {
				return mockResponse(200, otpPageHtml);
			}
			// 3: POST OTP → redirect back to access page
			if (callIndex === 3 && init?.method === 'POST') {
				return mockResponse(302, '', { location: '/package/my-pkg/access' });
			}
			// 4: GET access page → success
			return mockResponse(200, makeAccessHtml());
		});

		const settings = await getPackageAccess(client, 'my-pkg');
		expect(settings.packageName).toBe('my-pkg');
		expect(callIndex).toBe(4);
	});

	test('throws on non-200 after all retries', async () => {
		const client = mockClient(async () => mockResponse(429, 'rate limited'));

		await expect(getPackageAccess(client, 'my-pkg')).rejects.toThrow('Failed to fetch access page');
	});
});
