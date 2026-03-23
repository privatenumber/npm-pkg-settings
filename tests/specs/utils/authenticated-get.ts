import { describe, test, expect } from 'manten';
import type { NpmInternalClient } from '../../../src/types.ts';
import { authenticatedGet } from '../../../src/utils/authenticated-get.ts';

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

describe('authenticatedGet', () => {
	test('returns body directly when no escalation', async () => {
		const validPage = '<script>window.__context__ = {}</script>';
		const client = mockClient(async () => mockResponse(200, validPage));

		const result = await authenticatedGet(client, 'some/path');
		expect(result.status).toBe(200);
		expect(result.body).toBe(validPage);
	});

	test('returns non-200 status without escalation', async () => {
		const client = mockClient(async () => mockResponse(429, 'rate limited'));

		const result = await authenticatedGet(client, 'some/path');
		expect(result.status).toBe(429);
		expect(result.body).toBe('rate limited');
	});

	test('follows 302 redirect', async () => {
		let callIndex = 0;
		const redirectedPage = '<script>window.__context__ = {"formData":{}}</script>';
		const client = mockClient(async () => {
			callIndex += 1;
			if (callIndex === 1) {
				return mockResponse(302, '', { location: '/redirected' });
			}
			return mockResponse(200, redirectedPage);
		});

		const result = await authenticatedGet(client, 'original');
		expect(result.status).toBe(200);
		expect(result.body).toBe(redirectedPage);
	});

	test('handles OTP escalation page', async () => {
		let callIndex = 0;
		const otpPage = `
			<form id="login" action="/otp-submit">
				<input name="csrftoken" value="csrf-abc">
				<input name="formName" value="totp">
			</form>
			One-time Password
		`;

		const client = mockClient(async (_url, init) => {
			callIndex += 1;
			// 1: GET page → OTP escalation
			if (callIndex === 1) {
				return mockResponse(200, otpPage);
			}
			// 2: POST OTP → redirect
			if (callIndex === 2 && init?.method === 'POST') {
				return mockResponse(302, '', { location: '/final-page' });
			}
			// 3: GET final page
			return mockResponse(200, 'actual content');
		});

		const result = await authenticatedGet(client, 'protected/path');
		expect(result.status).toBe(200);
		expect(result.body).toBe('actual content');
		expect(callIndex).toBe(3);
	});

	test('submits correct OTP form data', async () => {
		let capturedBody: string | undefined;
		const otpPage = `
			<form id="login" action="/otp-action">
				<input name="csrftoken" value="my-csrf">
				<input name="formName" value="totp">
			</form>
			One-time Password
		`;

		const client = mockClient(async (_url, init) => {
			if (init?.method === 'POST') {
				capturedBody = init.body?.toString();
				return mockResponse(200, 'done');
			}
			return mockResponse(200, otpPage);
		});

		await authenticatedGet(client, 'path');
		expect(capturedBody).toContain('otp=123456');
		expect(capturedBody).toContain('csrftoken=my-csrf');
		expect(capturedBody).toContain('formName=totp');
	});

	test('returns OTP response when no redirect after OTP', async () => {
		let callIndex = 0;
		const otpPage = `
			<form id="login" action="/otp">
				<input name="csrftoken" value="c">
				<input name="formName" value="totp">
			</form>
			One-time Password
		`;

		const client = mockClient(async () => {
			callIndex += 1;
			if (callIndex === 1) {
				return mockResponse(200, otpPage);
			}
			// OTP response is 200 (no redirect)
			return mockResponse(200, 'otp result');
		});

		const result = await authenticatedGet(client, 'path');
		expect(result.status).toBe(200);
		expect(result.body).toBe('otp result');
	});

	test('throws when session expired (redirected to login)', async () => {
		let callIndex = 0;
		const loginPage = '<html><title>npm | Sign In</title><form>Sign In</form></html>';

		const client = mockClient(async () => {
			callIndex += 1;
			if (callIndex === 1) {
				return mockResponse(302, '', { location: '/login?next=%2Fpackage%2Ftsx%2Faccess' });
			}
			return mockResponse(200, loginPage);
		});

		await expect(authenticatedGet(client, 'package/tsx/access'))
			.rejects.toThrow('Session expired');
	});
});
