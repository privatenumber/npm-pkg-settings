import fs from 'node:fs/promises';
import { describe, test, expect } from 'manten';
import { parseOtpPage } from '../../../src/parsers/otp.ts';

describe('parseOtpPage', () => {
	test('extracts action, csrfToken, and formName', () => {
		const html = `
			<form id="login" action="/login/otp?next=%2F">
				<input name="csrftoken" value="otp-csrf">
				<input name="formName" value="totp">
			</form>
		`;
		const result = parseOtpPage(html);
		expect(result.action).toBe('/login/otp?next=%2F');
		expect(result.csrfToken).toBe('otp-csrf');
		expect(result.formName).toBe('totp');
	});

	test('defaults formName to totp when input missing', () => {
		const html = `
			<form id="login" action="/otp">
				<input name="csrftoken" value="csrf">
			</form>
		`;
		const result = parseOtpPage(html);
		expect(result.formName).toBe('totp');
	});

	test('throws when form#login is missing', () => {
		const html = '<form id="other" action="/x"></form>';
		expect(() => parseOtpPage(html)).toThrow('Could not find OTP form action');
	});

	test('throws when csrftoken input is missing', () => {
		const html = '<form id="login" action="/x"></form>';
		expect(() => parseOtpPage(html)).toThrow('Could not find CSRF token');
	});

	test('parses fixture HTML', async () => {
		const html = await fs.readFile('tests/fixtures/otp-page.html', 'utf8');
		const result = parseOtpPage(html);
		expect(result.action).toBe('/login/otp?next=%2F');
		expect(result.csrfToken).toBe('otp-csrf-xyz789');
		expect(result.formName).toBe('totp');
	});

	test('parses escalation page with custom action', async () => {
		const html = await fs.readFile('tests/fixtures/escalation-page.html', 'utf8');
		const result = parseOtpPage(html);
		expect(result.action).toBe('/package/my-pkg/access');
		expect(result.csrfToken).toBe('escalation-csrf-456');
	});
});
