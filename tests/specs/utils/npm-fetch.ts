import { describe, test, expect } from 'manten';
import type { NpmContext } from '../../../src/types.ts';
import { npmFetch } from '../../../src/utils/npm-fetch.ts';

const mockResponse = (status: number, body: string) => ({
	status,
	statusText: 'OK',
	ok: status >= 200 && status < 300,
	headers: {} as Record<string, string>,
	text: async () => body,
	json: async () => JSON.parse(body),
});

describe('npmFetch', () => {
	test('prepends base URL for relative paths', async () => {
		let capturedUrl = '';
		const context: NpmContext = {
			fetch: async (url) => {
				capturedUrl = url;
				return mockResponse(200, '');
			},
			otpSecret: '',
			otpGenerator: async () => '',
		};

		await npmFetch(context, 'login');
		expect(capturedUrl).toBe('https://www.npmjs.com/login');
	});

	test('passes full URL unchanged for absolute paths', async () => {
		let capturedUrl = '';
		const context: NpmContext = {
			fetch: async (url) => {
				capturedUrl = url;
				return mockResponse(200, '');
			},
			otpSecret: '',
			otpGenerator: async () => '',
		};

		await npmFetch(context, 'https://custom.example.com/path');
		expect(capturedUrl).toBe('https://custom.example.com/path');
	});

	test('forwards init options to fetch', async () => {
		let capturedInit: unknown;
		const context: NpmContext = {
			fetch: async (_url, init) => {
				capturedInit = init;
				return mockResponse(200, '');
			},
			otpSecret: '',
			otpGenerator: async () => '',
		};

		await npmFetch(context, 'test', {
			method: 'POST',
			headers: { 'x-custom': 'value' },
		});

		expect(capturedInit).toEqual({
			method: 'POST',
			headers: { 'x-custom': 'value' },
		});
	});

	test('handles empty path for root URL', async () => {
		let capturedUrl = '';
		const context: NpmContext = {
			fetch: async (url) => {
				capturedUrl = url;
				return mockResponse(200, '');
			},
			otpSecret: '',
			otpGenerator: async () => '',
		};

		await npmFetch(context, '');
		expect(capturedUrl).toBe('https://www.npmjs.com/');
	});
});
