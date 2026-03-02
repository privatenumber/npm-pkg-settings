import fs from 'node:fs/promises';
import { describe, test, expect } from 'manten';
import { parseLoginPage } from '../../../src/parsers/login.ts';

describe('parseLoginPage', () => {
	test('extracts CSRF token from hidden input', () => {
		const html = '<form><input name="csrftoken" value="abc123"></form>';
		const result = parseLoginPage(html);
		expect(result.csrfToken).toBe('abc123');
	});

	test('throws when CSRF input is missing', () => {
		const html = '<form><input name="other" value="x"></form>';
		expect(() => parseLoginPage(html)).toThrow('Could not find CSRF token');
	});

	test('throws when value attribute is empty', () => {
		const html = '<form><input name="csrftoken" value=""></form>';
		expect(() => parseLoginPage(html)).toThrow('Could not find CSRF token');
	});

	test('parses fixture HTML', async () => {
		const html = await fs.readFile('tests/fixtures/login-page.html', 'utf8');
		const result = parseLoginPage(html);
		expect(result.csrfToken).toBe('test-csrf-token-abc123');
	});
});
