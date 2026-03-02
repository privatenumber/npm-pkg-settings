import { describe, test, expect } from 'manten';
import { validateTrustedPublisher } from '../../../src/api/validate-trusted-publisher.ts';

const mockFetch = (handler: (url: string) => { ok: boolean }) => (
	async (url: string) => handler(url)
);

describe('validateTrustedPublisher', () => {
	test('returns both verified when repo and workflow exist', async () => {
		const result = await validateTrustedPublisher(
			{
				type: 'github',
				owner: 'my-org',
				repository: 'my-repo',
				workflow: 'release.yml',
			},
			mockFetch(() => ({ ok: true })),
		);
		expect(result.repoVerified).toBe(true);
		expect(result.workflowVerified).toBe(true);
	});

	test('throws when repo exists but workflow missing', async () => {
		await expect(validateTrustedPublisher(
			{
				type: 'github',
				owner: 'my-org',
				repository: 'my-repo',
				workflow: 'missing.yml',
			},
			mockFetch(url => ({ ok: !url.includes('/contents/') })),
		)).rejects.toThrow('Workflow file not found: .github/workflows/missing.yml in my-org/my-repo');
	});

	test('returns both unverified when repo not found', async () => {
		const result = await validateTrustedPublisher(
			{
				type: 'github',
				owner: 'my-org',
				repository: 'private-repo',
				workflow: 'release.yml',
			},
			mockFetch(() => ({ ok: false })),
		);
		expect(result.repoVerified).toBe(false);
		expect(result.workflowVerified).toBe(false);
	});

	test('fetches correct GitHub API URLs', async () => {
		const urls: string[] = [];
		await validateTrustedPublisher(
			{
				type: 'github',
				owner: 'org',
				repository: 'repo',
				workflow: 'ci.yml',
			},
			mockFetch((url) => {
				urls.push(url);
				return { ok: true };
			}),
		);
		expect(urls[0]).toBe('https://api.github.com/repos/org/repo');
		expect(urls[1]).toBe('https://api.github.com/repos/org/repo/contents/.github/workflows/ci.yml');
	});
});
