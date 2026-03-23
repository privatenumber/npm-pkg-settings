import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { describe, test, expect } from 'manten';
import { createClient } from '../../src/index.ts';

/**
 * Tests that createClient's internal fetch resolves URLs correctly
 * and produces a working fetch pipeline.
 *
 * These tests create a real client and make real requests to npm
 * (unauthenticated GETs only — no credentials needed).
 */
describe('createClient fetch', () => {
	const sessionFile = path.join(os.tmpdir(), `.npm-pkg-settings-url-test-${Date.now()}.json`);

	test('resolves relative path to npm URL', async () => {
		const client = createClient({
			otpSecret: '',
			sessionFile,
		});

		// getUsername fetches '' (empty path) → should resolve to https://www.npmjs.com/
		// The response should be valid JSON (npm homepage data), not a 404 or redirect
		try {
			await client.getUsername();
		} catch (error) {
			// "Not logged in" means the fetch resolved to the right URL and got a valid response
			expect((error as Error).message).toContain('Not logged in');
		}
	});

	test('cleanup', async () => {
		await fs.rm(sessionFile, { force: true });
	});
});
