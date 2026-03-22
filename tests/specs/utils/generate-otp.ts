import { describe, test, expect } from 'manten';
import type { NpmInternalClient } from '../../../src/types.ts';
import { generateOtp } from '../../../src/utils/generate-otp.ts';

describe('generateOtp', () => {
	test('calls otpGenerator with otpSecret', async () => {
		let capturedSecret = '';
		const client: NpmInternalClient = {
			fetch: async () => { throw new Error('should not fetch'); },
			otpSecret: 'MY_SECRET',
			otpGenerator: async (secret) => {
				capturedSecret = secret;
				return '123456';
			},
		};

		const otp = await generateOtp(client);
		expect(otp).toBe('123456');
		expect(capturedSecret).toBe('MY_SECRET');
	});
});
