import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { describe, test, expect } from 'manten';
import { createClient } from '../../../src/index.ts';

/**
 * Smoke tests: verify the real createClient pipeline bypasses
 * Cloudflare's bot detection on npm.
 *
 * Cloudflare fingerprints TLS handshakes (JA3/JA4) and HTTP/2 framing
 * to distinguish real browsers from automated clients. POST requests
 * to sensitive endpoints (e.g. /login) face stricter checks than GETs.
 *
 * These tests go through createClient (not bare Impit) to catch
 * misconfiguration of the browser fingerprint or cookie jar.
 */
describe('Cloudflare bypass', () => {
	const sessionFile = path.join(os.tmpdir(), `.npm-pkg-settings-test-${Date.now()}.json`);

	test('GET request is not blocked', async () => {
		const client = createClient({
			otpSecret: '',
			sessionFile,
		});

		// getUsername fetches GET / with x-spiferack header
		// Without a session it won't find a user, but the request should reach npm (not be challenged)
		try {
			await client.getUsername();
		} catch (error) {
			// "Not logged in" = npm responded with real data (not blocked)
			// "Failed to fetch homepage" with status 403 = Cloudflare blocked us
			expect((error as Error).message).toContain('Not logged in');
		}
	});

	test('POST request is not blocked', async () => {
		const client = createClient({
			otpSecret: '',
			username: 'cloudflare-bypass-test',
			password: 'not-a-real-password',
			sessionFile,
		});

		// login() POSTs to /login — with fake credentials it should fail with
		// a login error, NOT a Cloudflare 403 challenge
		try {
			await client.login();
		} catch (error) {
			const { message } = (error as Error);
			// Any of these mean npm processed the request (not blocked by Cloudflare)
			const reachedNpm = message.includes('Login failed')
				|| message.includes('Failed to fetch login page')
				|| message.includes('OTP');
			expect(reachedNpm).toBe(true);
		}
	});

	test('cleanup', async () => {
		await fs.rm(sessionFile, { force: true });
	});
});
