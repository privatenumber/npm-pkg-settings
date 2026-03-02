import { describe, test, expect } from 'manten';
import { decodeSecretFromUrl } from '../../../src/cli/commands/decode-secret/decode-url.ts';
import { readQrFromImage } from '../../../src/cli/commands/decode-secret/read-qr.ts';

describe('decodeSecretFromUrl', () => {
	test('decodes Google Authenticator migration URL', () => {
		// Generate a known test payload: secret bytes [0x01, 0x02, 0x03, 0x04, 0x05]
		// Protobuf: 0a 07 0a 05 01 02 03 04 05
		const payload = Buffer.from([0x0A, 0x07, 0x0A, 0x05, 0x01, 0x02, 0x03, 0x04, 0x05]).toString('base64');
		const url = `otpauth-migration://offline?data=${encodeURIComponent(payload)}`;
		const secret = decodeSecretFromUrl(url);
		expect(secret).toBe('AEBAGBAF');
	});

	test('throws on non-migration URL', () => {
		expect(() => decodeSecretFromUrl('https://example.com')).toThrow('Expected otpauth-migration:// URL');
	});

	test('throws when data parameter is missing', () => {
		expect(() => decodeSecretFromUrl('otpauth-migration://offline')).toThrow('No data parameter');
	});

	test('throws when protobuf missing outer field marker', () => {
		const payload = Buffer.from([0x0B, 0x05, 0x0A, 0x01, 0xFF]).toString('base64');
		const url = `otpauth-migration://offline?data=${encodeURIComponent(payload)}`;
		expect(() => decodeSecretFromUrl(url)).toThrow('expected outer field 1');
	});

	test('throws when protobuf missing inner field marker', () => {
		const payload = Buffer.from([0x0A, 0x05, 0x0B, 0x01, 0xFF]).toString('base64');
		const url = `otpauth-migration://offline?data=${encodeURIComponent(payload)}`;
		expect(() => decodeSecretFromUrl(url)).toThrow('expected inner field 1');
	});

	test('handles single-byte secret', () => {
		// Protobuf: 0a 03 0a 01 FF
		const payload = Buffer.from([0x0A, 0x03, 0x0A, 0x01, 0xFF]).toString('base64');
		const url = `otpauth-migration://offline?data=${encodeURIComponent(payload)}`;
		const secret = decodeSecretFromUrl(url);
		expect(secret).toBe('74');
	});
});

describe('readQrFromImage', () => {
	test('throws on non-existent file', async () => {
		await expect(readQrFromImage('/nonexistent.png')).rejects.toThrow();
	});
});
