import { describe, test, expect } from 'manten';
import type { NpmContext } from '../../../src/types.ts';
import { submitWithOtp } from '../../../src/utils/submit-with-otp.ts';

const mockResponse = (status: number, body: string, headers: Record<string, string> = {}) => ({
	status,
	headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
	text: async () => body,
	json: async () => JSON.parse(body),
});

const mockContext = (handler: NpmContext['fetch']): NpmContext => ({
	fetch: handler,
	otpSecret: 'test',
	otpGenerator: async () => '654321',
});

describe('submitWithOtp', () => {
	test('posts body and returns response when no escalation', async () => {
		let capturedBody: string | undefined;
		const context = mockContext(async (_url, init) => {
			capturedBody = init?.body?.toString();
			return mockResponse(302, '');
		});

		const result = await submitWithOtp(
			context,
			'some/path',
			new URLSearchParams({
				key: 'value',
				csrftoken: 'csrf',
			}),
		);

		expect(result.status).toBe(302);
		expect(capturedBody).toContain('key=value');
	});

	test('handles OTP escalation on 200 response', async () => {
		let callIndex = 0;
		const otpPage = `
			<form id="login" action="/otp-action">
				<input name="csrftoken" value="otp-csrf">
				<input name="formName" value="totp">
			</form>
			One-time Password
		`;

		const context = mockContext(async () => {
			callIndex += 1;
			// 1: POST form → escalation page
			if (callIndex === 1) {
				return mockResponse(200, otpPage);
			}
			// 2: POST OTP → success
			return mockResponse(302, '');
		});

		const result = await submitWithOtp(
			context,
			'path',
			new URLSearchParams({ data: 'test' }),
		);

		expect(result.status).toBe(302);
		expect(callIndex).toBe(2);
	});

	test('submits correct OTP form data during escalation', async () => {
		let otpBody: string | undefined;
		let callIndex = 0;
		const otpPage = `
			<form id="login" action="/escalate">
				<input name="csrftoken" value="esc-csrf">
				<input name="formName" value="totp">
			</form>
			One-time Password
		`;

		const context = mockContext(async (_url, init) => {
			callIndex += 1;
			if (callIndex === 1) {
				return mockResponse(200, otpPage);
			}
			otpBody = init?.body?.toString();
			return mockResponse(302, '');
		});

		await submitWithOtp(context, 'path', new URLSearchParams({ x: '1' }));
		expect(otpBody).toContain('otp=654321');
		expect(otpBody).toContain('csrftoken=esc-csrf');
		expect(otpBody).toContain('formName=totp');
	});

	test('returns error status without escalation', async () => {
		const context = mockContext(async () => mockResponse(500, 'server error'));

		const result = await submitWithOtp(
			context,
			'path',
			new URLSearchParams({ x: '1' }),
		);

		expect(result.status).toBe(500);
		expect(result.body).toBe('server error');
	});

	test('does not escalate on non-200 with OTP text', async () => {
		let callCount = 0;
		const context = mockContext(async () => {
			callCount += 1;
			return mockResponse(403, 'One-time Password forbidden');
		});

		const result = await submitWithOtp(
			context,
			'path',
			new URLSearchParams({ x: '1' }),
		);

		expect(result.status).toBe(403);
		expect(callCount).toBe(1);
	});
});
