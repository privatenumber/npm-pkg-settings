import { describe, test, expect } from 'manten';
import type { NpmContext } from '../../../src/types.ts';
import { generateOtp } from '../../../src/utils/generate-otp.ts';

describe('generateOtp', () => {
	test('calls otpGenerator with otpSecret', async () => {
		let capturedSecret = '';
		const context: NpmContext = {
			fetch: async () => { throw new Error('should not fetch'); },
			otpSecret: 'MY_SECRET',
			otpGenerator: async (secret) => {
				capturedSecret = secret;
				return '123456';
			},
		};

		const otp = await generateOtp(context);
		expect(otp).toBe('123456');
		expect(capturedSecret).toBe('MY_SECRET');
	});
});
