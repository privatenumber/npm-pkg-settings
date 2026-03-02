import { describe, test, expect } from 'manten';
import { performLogin } from '../../../src/context/login.ts';
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

describe('performLogin', () => {
	test('returns skipped when already logged in', async () => {
		const context = mockContext(async () => mockResponse(
			200,
			JSON.stringify({ user: { name: 'alice' } }),
		));

		const result = await performLogin(context, {
			username: 'alice',
			password: 'pass',
		});

		expect(result.skipped).toBe(true);
	});

	test('returns not skipped when session expired', async () => {
		let callIndex = 0;
		const loginHtml = '<form><input name="csrftoken" value="csrf"></form>';

		const context = mockContext(async (_url, init) => {
			callIndex += 1;
			// 1: isLoggedIn check
			if (callIndex === 1) {
				return mockResponse(200, JSON.stringify({ user: null }));
			}
			// 2: GET /login page
			if (callIndex === 2) {
				return mockResponse(200, loginHtml);
			}
			// 3: POST /login → success (no OTP)
			if (callIndex === 3 && init?.method === 'POST') {
				return mockResponse(200, 'logged in');
			}
			return mockResponse(200, '');
		});

		const result = await performLogin(context, {
			username: 'alice',
			password: 'pass',
		});

		expect(result.skipped).toBe(false);
	});

	test('detects not logged in from non-200 response', async () => {
		let callIndex = 0;
		const loginHtml = '<form><input name="csrftoken" value="csrf"></form>';

		const context = mockContext(async (_url, init) => {
			callIndex += 1;
			// 1: isLoggedIn check — non-200
			if (callIndex === 1) {
				return mockResponse(403, '');
			}
			// 2: GET /login
			if (callIndex === 2) {
				return mockResponse(200, loginHtml);
			}
			// 3: POST /login
			if (callIndex === 3 && init?.method === 'POST') {
				return mockResponse(200, '');
			}
			return mockResponse(200, '');
		});

		const result = await performLogin(context, {
			username: 'alice',
			password: 'pass',
		});

		expect(result.skipped).toBe(false);
	});

	test('throws when login page fetch fails', async () => {
		let callIndex = 0;
		const context = mockContext(async () => {
			callIndex += 1;
			if (callIndex === 1) {
				return mockResponse(200, JSON.stringify({ user: null }));
			}
			return mockResponse(500, 'error');
		});

		await expect(performLogin(context, {
			username: 'alice',
			password: 'pass',
		})).rejects.toThrow('Failed to fetch login page');
	});

	test('handles OTP escalation during login', async () => {
		let callIndex = 0;
		const loginHtml = '<form><input name="csrftoken" value="csrf"></form>';
		const otpPage = `
			<form id="login" action="/otp-submit">
				<input name="csrftoken" value="otp-csrf">
				<input name="formName" value="totp">
			</form>
			One-time Password
		`;

		const context = mockContext(async (_url, init) => {
			callIndex += 1;
			// 1: isLoggedIn check
			if (callIndex === 1) {
				return mockResponse(200, JSON.stringify({ user: null }));
			}
			// 2: GET /login
			if (callIndex === 2) {
				return mockResponse(200, loginHtml);
			}
			// 3: POST /login → redirect to OTP
			if (callIndex === 3 && init?.method === 'POST') {
				return mockResponse(302, '', { location: '/otp' });
			}
			// 4: GET OTP page
			if (callIndex === 4) {
				return mockResponse(200, otpPage);
			}
			// 5: POST OTP → redirect (success)
			if (callIndex === 5 && init?.method === 'POST') {
				return mockResponse(302, '', { location: '/dashboard' });
			}
			return mockResponse(200, '');
		});

		const result = await performLogin(context, {
			username: 'alice',
			password: 'pass',
		});

		expect(result.skipped).toBe(false);
		expect(callIndex).toBe(5);
	});

	test('throws when OTP submission fails', async () => {
		let callIndex = 0;
		const loginHtml = '<form><input name="csrftoken" value="csrf"></form>';
		const otpPage = `
			<form id="login" action="/otp-submit">
				<input name="csrftoken" value="otp-csrf">
				<input name="formName" value="totp">
			</form>
			One-time Password
		`;

		const context = mockContext(async (_url, init) => {
			callIndex += 1;
			if (callIndex === 1) {
				return mockResponse(200, JSON.stringify({ user: null }));
			}
			if (callIndex === 2) {
				return mockResponse(200, loginHtml);
			}
			if (callIndex === 3 && init?.method === 'POST') {
				return mockResponse(302, '', { location: '/otp' });
			}
			if (callIndex === 4) {
				return mockResponse(200, otpPage);
			}
			// OTP POST fails
			if (callIndex === 5 && init?.method === 'POST') {
				return mockResponse(403, 'invalid otp');
			}
			return mockResponse(200, '');
		});

		await expect(performLogin(context, {
			username: 'alice',
			password: 'pass',
		})).rejects.toThrow('OTP submission failed');
	});

	test('throws when login POST returns error status', async () => {
		let callIndex = 0;
		const loginHtml = '<form><input name="csrftoken" value="csrf"></form>';

		const context = mockContext(async () => {
			callIndex += 1;
			if (callIndex === 1) {
				return mockResponse(200, JSON.stringify({ user: null }));
			}
			if (callIndex === 2) {
				return mockResponse(200, loginHtml);
			}
			// POST /login returns 401
			return mockResponse(401, 'unauthorized');
		});

		await expect(performLogin(context, {
			username: 'alice',
			password: 'wrong',
		})).rejects.toThrow('Login failed');
	});

	test('caches username when already logged in', async () => {
		const context = mockContext(async () => mockResponse(
			200,
			JSON.stringify({ user: { name: 'alice' } }),
		));

		await performLogin(context, {
			username: 'alice',
			password: 'pass',
		});
		expect(context.cachedUsername).toBe('alice');
	});
});
