import { Impit } from 'impit';
import { test, expect } from 'manten';

/**
 * Smoke test: verify impit's Chrome TLS fingerprint bypasses
 * Cloudflare's bot detection on npm.
 *
 * Cloudflare fingerprints TLS handshakes (JA3/JA4) and HTTP/2 framing
 * to distinguish real browsers from automated clients. If the TLS
 * fingerprint doesn't match a known browser, requests are challenged
 * with a 403 "Just a moment..." page.
 *
 * This test catches upgrades or config changes that break the bypass.
 */
test('impit chrome142 is not blocked by Cloudflare', async () => {
	const impit = new Impit({
		browser: 'chrome142',
		followRedirects: false,
	});

	const response = await impit.fetch('https://www.npmjs.com/', {
		headers: { 'x-spiferack': '1' },
	});

	expect(response.headers.get('cf-mitigated')).not.toBe('challenge');
	expect(response.status).not.toBe(403);
});
