import { describe, test, expect } from 'manten';
import { linkTrustedPublisher } from '../../../src/index.ts';
import type { NpmInternalClient } from '../../../src/types.ts';

const mockResponse = (status: number, body: string, headers: Record<string, string> = {}) => ({
	status,
	headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
	text: async () => body,
	json: async () => JSON.parse(body),
});

const mockClient = (handler: NpmInternalClient['fetch']): NpmInternalClient => ({
	fetch: handler,
	otpSecret: 'test',
	otpGenerator: async () => '123456',
	cachedUsername: 'test',
});

const makeAccessHtml = () => {
	const client = {
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
	return `<script>window.__context__ = ${JSON.stringify({ context: client })}</script>`;
};

describe('linkTrustedPublisher', () => {
	test('builds correct form body for GitHub publisher', async () => {
		let postBody: string | undefined;
		const client = mockClient(async (_url, init) => {
			if (init?.method === 'POST') {
				postBody = init.body?.toString();
				return mockResponse(302, '');
			}
			return mockResponse(200, makeAccessHtml());
		});

		await linkTrustedPublisher(client, 'my-pkg', {
			type: 'github',
			owner: 'myorg',
			repository: 'myrepo',
			workflow: 'release.yml',
		});

		expect(postBody).toContain('publisher=github');
		expect(postBody).toContain('selectedPublisher=github');
		expect(postBody).toContain('repositoryOwner=myorg');
		expect(postBody).toContain('repositoryName=myrepo');
		expect(postBody).toContain('workflowName=release.yml');
		expect(postBody).toContain('actionType=create');
		expect(postBody).toContain('csrftoken=csrf-token');
	});

	test('builds correct form body for GitLab publisher', async () => {
		let postBody: string | undefined;
		const client = mockClient(async (_url, init) => {
			if (init?.method === 'POST') {
				postBody = init.body?.toString();
				return mockResponse(302, '');
			}
			return mockResponse(200, makeAccessHtml());
		});

		await linkTrustedPublisher(client, 'my-pkg', {
			type: 'gitlab',
			namespace: 'my-group',
			project: 'my-project',
			ciFilePath: '.gitlab-ci.yml',
		});

		expect(postBody).toContain('publisher=gitlab');
		expect(postBody).toContain('selectedPublisher=gitlab');
		expect(postBody).toContain('namespace=my-group');
		expect(postBody).toContain('projectName=my-project');
		expect(postBody).toContain('topLevelCiFilePath=.gitlab-ci.yml');
		expect(postBody).toContain('actionType=create');
	});

	test('includes environment when provided', async () => {
		let postBody: string | undefined;
		const client = mockClient(async (_url, init) => {
			if (init?.method === 'POST') {
				postBody = init.body?.toString();
				return mockResponse(302, '');
			}
			return mockResponse(200, makeAccessHtml());
		});

		await linkTrustedPublisher(client, 'my-pkg', {
			type: 'github',
			owner: 'org',
			repository: 'repo',
			workflow: 'ci.yml',
			environment: 'production',
		});

		expect(postBody).toContain('githubEnvironmentName=production');
	});

	test('throws on failure', async () => {
		const client = mockClient(async (_url, init) => {
			if (init?.method === 'POST') {
				return mockResponse(500, 'error');
			}
			return mockResponse(200, makeAccessHtml());
		});

		await expect(linkTrustedPublisher(client, 'my-pkg', {
			type: 'github',
			owner: 'org',
			repository: 'repo',
			workflow: 'ci.yml',
		})).rejects.toThrow('Failed to link trusted publisher');
	});
});
