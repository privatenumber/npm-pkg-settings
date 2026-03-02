import { describe, test, expect } from 'manten';
import { createFetch, type SpawnFunction } from '../../../src/curl-fetch.ts';

const mockResponse = 'HTTP/1.1 200 OK\r\n\r\n';

const captureSpawn = () => {
	const calls: { command: string;
		arguments_: string[]; }[] = [];
	const spawn: SpawnFunction = async (command, arguments_) => {
		calls.push({
			command,
			arguments_,
		});
		return { stdout: mockResponse };
	};
	return {
		spawn,
		calls,
	};
};

describe('createFetch', () => {
	test('calls curl_chrome145', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com');
		expect(calls[0].command).toBe('curl_chrome145');
	});

	test('passes URL as last argument', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com/path');
		expect(calls[0].arguments_.at(-1)).toBe('https://example.com/path');
	});

	test('defaults to GET method', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com');
		expect(calls[0].arguments_).toContain('GET');
	});

	test('sets POST method', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com', { method: 'POST' });
		expect(calls[0].arguments_).toContain('POST');
	});

	test('adds cookie file args when provided', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({
			sessionFile: '/tmp/jar.txt',
			spawn,
		});
		await fetch('https://example.com');
		expect(calls[0].arguments_).toContain('-b');
		expect(calls[0].arguments_).toContain('/tmp/jar.txt');
		expect(calls[0].arguments_).toContain('-c');
	});

	test('omits cookie args when no sessionFile', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com');
		expect(calls[0].arguments_).not.toContain('-b');
		expect(calls[0].arguments_).not.toContain('-c');
	});

	test('adds -L for redirect follow', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com', { redirect: 'follow' });
		expect(calls[0].arguments_).toContain('-L');
	});

	test('adds --max-redirs 0 for redirect manual', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com', { redirect: 'manual' });
		expect(calls[0].arguments_).toContain('--max-redirs');
		expect(calls[0].arguments_).toContain('0');
	});

	test('passes custom headers', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com', {
			headers: {
				'x-custom': 'value',
				authorization: 'Bearer token',
			},
		});
		expect(calls[0].arguments_).toContain('x-custom: value');
		expect(calls[0].arguments_).toContain('authorization: Bearer token');
	});

	test('passes URLSearchParams body with content-type', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com', {
			method: 'POST',
			body: new URLSearchParams({ user: 'alice' }),
		});
		expect(calls[0].arguments_).toContain('-d');
		expect(calls[0].arguments_).toContain('user=alice');
		expect(calls[0].arguments_).toContain('content-type: application/x-www-form-urlencoded');
	});

	test('passes string body', async () => {
		const { spawn, calls } = captureSpawn();
		const fetch = createFetch({ spawn });
		await fetch('https://example.com', {
			method: 'POST',
			body: 'raw-body',
		});
		expect(calls[0].arguments_).toContain('-d');
		expect(calls[0].arguments_).toContain('raw-body');
	});
});
