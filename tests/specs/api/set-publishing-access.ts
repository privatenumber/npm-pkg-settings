import { describe, test, expect } from 'manten';
import { setPublishingAccess } from '../../../src/index.ts';
import type { NpmContext } from '../../../src/types.ts';

const mockResponse = (status: number, body: string, headers: Record<string, string> = {}) => ({
	status,
	headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
	text: async () => body,
	json: async () => JSON.parse(body),
});

const mockContext = (handler: NpmContext['fetch']): NpmContext => ({
	fetch: handler,
	otpSecret: 'test',
	otpGenerator: async () => '123456',
	cachedUsername: 'test',
});

const makeAccessHtml = (csrftoken = 'csrf-123') => {
	const context = {
		csrftoken,
		package: 'my-pkg',
		packageVersion: { repository: 'https://github.com/user/repo' },
		formData: {
			'package-settings': {
				publishingAccess: { value: 'public' },
				private: { value: false },
			},
		},
		provenance: { enabled: false },
		oidcConnections: [],
		maintainers: [],
	};
	return `<script>window.__context__ = ${JSON.stringify({ context })}</script>`;
};

describe('setPublishingAccess', () => {
	test('submits publishingAccess with CSRF token', async () => {
		let postBody: string | undefined;
		const context = mockContext(async (_url, init) => {
			if (init?.method === 'POST') {
				postBody = init.body?.toString();
				return mockResponse(302, '');
			}
			return mockResponse(200, makeAccessHtml('my-csrf'));
		});

		await setPublishingAccess(context, 'my-pkg', 'tfa-always-required');
		expect(postBody).toContain('publishingAccess=tfa-always-required');
		expect(postBody).toContain('csrftoken=my-csrf');
	});

	test('handles OTP escalation on POST', async () => {
		let callIndex = 0;
		const context = mockContext(async (_url, init) => {
			callIndex += 1;
			// 1: GET access page (from authenticatedGet via getAccessPageWithCsrf)
			if (callIndex === 1) {
				return mockResponse(200, makeAccessHtml());
			}
			// 2: POST settings → OTP escalation
			if (callIndex === 2 && init?.method === 'POST') {
				return mockResponse(200, '<form id="login" action="/otp"><input name="csrftoken" value="c"><input name="formName" value="totp"></form>One-time Password');
			}
			// 3: POST OTP → success
			return mockResponse(302, '');
		});

		await setPublishingAccess(context, 'my-pkg', 'tfa-always-required');
		expect(callIndex).toBe(3);
	});

	test('throws on failure status', async () => {
		const context = mockContext(async (_url, init) => {
			if (init?.method === 'POST') {
				return mockResponse(500, 'error');
			}
			return mockResponse(200, makeAccessHtml());
		});

		await expect(setPublishingAccess(context, 'my-pkg', 'tfa-always-required'))
			.rejects.toThrow('Failed to set publishing access');
	});
});
