import { describe, test, expect } from 'manten';
import { createFetch, type SpawnFunction } from '../../../src/curl-fetch.ts';

const mockSpawn = (raw: string): SpawnFunction => async () => ({ stdout: raw });

describe('response header parsing', () => {
	test('parses standard HTTP headers', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nSet-Cookie: sid=abc\r\n\r\nbody'),
		});
		const response = await fetch('http://example.com');
		expect(response.headers['content-type']).toBe('text/html');
		expect(response.headers['set-cookie']).toBe('sid=abc');
	});

	test('lowercases header names', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\nX-Custom-Header: value\r\n\r\n'),
		});
		const response = await fetch('http://example.com');
		expect(response.headers['x-custom-header']).toBe('value');
	});

	test('handles colons in header values', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\nLocation: https://example.com:443/path\r\n\r\n'),
		});
		const response = await fetch('http://example.com');
		expect(response.headers.location).toBe('https://example.com:443/path');
	});

	test('skips status line (no colon-space separator)', async () => {
		const fetch = createFetch({
			spawn: mockSpawn('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n'),
		});
		const response = await fetch('http://example.com');
		expect(response.headers['content-type']).toBe('text/html');
		expect(Object.keys(response.headers)).toHaveLength(1);
	});
});
