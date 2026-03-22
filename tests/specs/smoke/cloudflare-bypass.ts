import { test, expect } from 'manten';
import { createFetch, defaultSessionFile } from '../../../src/create-fetch.ts';
import { npmFetch } from '../../../src/utils/npm-fetch.ts';

/**
 * Smoke test: verify the HTTP client can reach npm without being blocked
 * by Cloudflare's bot detection.
 *
 * Cloudflare fingerprints TLS handshakes (JA3/JA4) and HTTP/2 framing
 * to distinguish real browsers from automated clients. If the fetch
 * implementation uses Node.js's default TLS stack, requests will be
 * challenged with a 403 "Just a moment..." page.
 *
 * This test catches HTTP client swaps that break Cloudflare bypass.
 */
test('fetch is not blocked by Cloudflare', async () => {
	const context = {
		fetch: createFetch(defaultSessionFile),
		otpSecret: '',
		otpGenerator: async () => '',
	};

	const response = await npmFetch(context, '', {
		headers: { 'x-spiferack': '1' },
	});

	const cfMitigated = response.headers.get('cf-mitigated');
	const body = await response.text();

	expect(cfMitigated).not.toBe('challenge');
	expect(body).not.toContain('Just a moment');
	expect(response.status).not.toBe(403);
});
