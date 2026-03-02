import { describe, test, expect } from 'manten';
import { createFetch, type SpawnFunction } from '../../../src/curl-fetch.ts';

const mockSpawn = (raw: string): SpawnFunction => async () => ({ stdout: raw });

describe('response parsing', () => {
	test('splits headers and body on double CRLF', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>hello</html>'),
		});
		const response = await fetch('http://example.com');
		expect(response.status).toBe(200);
		expect(response.ok).toBe(true);
		expect(response.statusText).toBe('OK');
		expect(response.headers['content-type']).toBe('text/html');
		expect(await response.text()).toBe('<html>hello</html>');
	});

	test('parses 302 redirect', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/2 302 Found\r\nLocation: /otp\r\n\r\n'),
		});
		const response = await fetch('http://example.com');
		expect(response.status).toBe(302);
		expect(response.ok).toBe(false);
		expect(response.headers.location).toBe('/otp');
	});

	test('parses 403 status', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 403 Forbidden\r\n\r\nblocked'),
		});
		const response = await fetch('http://example.com');
		expect(response.status).toBe(403);
		expect(response.statusText).toBe('Forbidden');
		expect(await response.text()).toBe('blocked');
	});

	test('returns status 0 for malformed input', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('garbage\r\n\r\nbody'),
		});
		const response = await fetch('http://example.com');
		expect(response.status).toBe(0);
	});

	test('handles missing header-body separator', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('raw output with no separator'),
		});
		const response = await fetch('http://example.com');
		expect(response.status).toBe(0);
		expect(response.statusText).toBe('');
		expect(await response.text()).toBe('raw output with no separator');
	});

	test('handles empty output', async () => {
		const fetch = createFetch({
			spawn: mockSpawn(''),
		});
		const response = await fetch('http://example.com');
		expect(response.status).toBe(0);
		expect(await response.text()).toBe('');
	});

	test('json() parses body as JSON', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\n\r\n{"key":"value"}'),
		});
		const response = await fetch('http://example.com');
		expect(await response.json()).toEqual({ key: 'value' });
	});

	test('json() throws on invalid JSON', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\n\r\n{invalid json}'),
		});
		const response = await fetch('http://example.com');
		await expect(response.json()).rejects.toThrow();
	});

	test('ok is true for 2xx status', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 201 Created\r\n\r\n'),
		});
		const response = await fetch('http://example.com');
		expect(response.ok).toBe(true);
		expect(response.status).toBe(201);
	});

	test('ok is false for non-2xx status', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 500 Internal Server Error\r\n\r\n'),
		});
		const response = await fetch('http://example.com');
		expect(response.ok).toBe(false);
	});

	test('handles duplicate headers (last value wins)', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\nX-Val: first\r\nX-Val: second\r\n\r\n'),
		});
		const response = await fetch('http://example.com');
		expect(response.headers['x-val']).toBe('second');
	});
});
