import { describe, test, expect } from 'manten';
import { addMaintainer } from '../../../src/index.ts';
import type { NpmContext } from '../../../src/types.ts';

const mockResponse = (status: number, body: string, headers: Record<string, string> = {}) => ({
	status,
	headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
	text: async () => body,
	json: async () => JSON.parse(body),
});

const mockContext = (handler: NpmContext['fetch']): NpmContext => ({
	fetch: handler,
	otpSecret: 'test',
	otpGenerator: async () => '123456',
	cachedUsername: 'test',
});

const makeAccessHtml = () => {
	const context = {
		csrftoken: 'csrf-token',
		package: 'my-pkg',
		formData: {
			'package-settings': {
				publishingAccess: { value: 'public' },
				private: { value: false },
			},
		},
		provenance: { enabled: false },
		oidcConnections: [],
		maintainers: [],
	};
	return `<script>window.__context__ = ${JSON.stringify({ context })}</script>`;
};

describe('addMaintainer', () => {
	test('submits add field with username', async () => {
		let postBody: string | undefined;
		const context = mockContext(async (_url, init) => {
			if (init?.method === 'POST') {
				postBody = init.body?.toString();
				return mockResponse(302, '');
			}
			return mockResponse(200, makeAccessHtml());
		});

		await addMaintainer(context, 'my-pkg', 'newuser');
		expect(postBody).toContain('add=newuser');
		expect(postBody).toContain('csrftoken=csrf-token');
	});

	test('throws on failure', async () => {
		const context = mockContext(async (_url, init) => {
			if (init?.method === 'POST') {
				return mockResponse(500, 'error');
			}
			return mockResponse(200, makeAccessHtml());
		});

		await expect(addMaintainer(context, 'my-pkg', 'newuser'))
			.rejects.toThrow('Failed to add maintainer');
	});
});
