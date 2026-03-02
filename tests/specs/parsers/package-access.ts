import fs from 'node:fs/promises';
import { describe, test, expect } from 'manten';
import { parsePackageAccess } from '../../../src/parsers/package-access.ts';

const makeHtml = (context: Record<string, unknown>) => `<script>window.__context__ = ${JSON.stringify({ context })}</script>`;

const baseContext = {
	csrftoken: 'csrf-abc',
	package: 'my-pkg',
	packageVersion: { repository: 'https://github.com/user/repo' },
	formData: {
		'package-settings': {
			publishingAccess: { value: 'tfa-required-unless-automation' },
			private: { value: false },
		},
	},
	provenance: { enabled: false },
	oidcConnections: [],
	maintainers: [{
		permissions: 'write',
		user: { name: 'alice' },
	}],
};

describe('parsePackageAccess', () => {
	test('extracts all fields from __context__', () => {
		const result = parsePackageAccess(makeHtml(baseContext));
		expect(result.csrfToken).toBe('csrf-abc');
		expect(result.packageName).toBe('my-pkg');
		expect(result.repository).toBe('https://github.com/user/repo');
		expect(result.publishingAccess).toBe('tfa-required-unless-automation');
		expect(result.isPrivate).toBe(false);
		expect(result.provenanceEnabled).toBe(false);
		expect(result.oidcConnections).toHaveLength(0);
		expect(result.maintainers).toEqual([{
			name: 'alice',
			permissions: 'write',
		}]);
	});

	test('falls back to packument.repository when packageVersion missing', () => {
		const context = {
			...baseContext,
			packageVersion: undefined,
			packument: { repository: 'https://github.com/fallback/repo' },
		};
		const result = parsePackageAccess(makeHtml(context));
		expect(result.repository).toBe('https://github.com/fallback/repo');
	});

	test('returns null repository when both sources missing', () => {
		const context = {
			...baseContext,
			packageVersion: undefined,
			packument: undefined,
		};
		const result = parsePackageAccess(makeHtml(context));
		expect(result.repository).toBeNull();
	});

	test('handles multiple OIDC connections', () => {
		const context = {
			...baseContext,
			oidcConnections: [
				{
					publisher: 'github',
					config: {
						repository_owner: 'user',
						repository_name: 'repo',
						workflow: 'release.yml',
					},
				},
				{
					publisher: 'gitlab',
					config: {
						repository_owner: 'group',
						repository_name: 'proj',
						workflow: '.gitlab-ci.yml',
					},
				},
			],
		};
		const result = parsePackageAccess(makeHtml(context));
		expect(result.oidcConnections).toHaveLength(2);
		expect(result.oidcConnections[0].publisher).toBe('github');
		expect(result.oidcConnections[1].publisher).toBe('gitlab');
	});

	test('throws when __context__ not found', () => {
		expect(() => parsePackageAccess('<html></html>')).toThrow('Could not find __context__');
	});

	test('parses fixture HTML', async () => {
		const html = await fs.readFile('tests/fixtures/package-access.html', 'utf8');
		const result = parsePackageAccess(html);
		expect(result.packageName).toBe('test-pkg');
		expect(result.repository).toBe('https://github.com/testuser/test-pkg');
		expect(result.publishingAccess).toBe('tfa-required-unless-automation');
		expect(result.provenanceEnabled).toBe(true);
		expect(result.oidcConnections).toHaveLength(1);
		expect(result.oidcConnections[0].workflow).toBe('release.yml');
		expect(result.maintainers).toHaveLength(2);
	});
});
