import { describe, test, expect } from 'manten';
import { parseTrustedPublisher } from '../../../src/cli/utils/parse-trusted-publisher.ts';

describe('parseTrustedPublisher', () => {
	test('parses github publisher', () => {
		const result = parseTrustedPublisher('github:my-org/my-repo?workflow=release.yml');
		expect(result).toEqual({
			type: 'github',
			owner: 'my-org',
			repository: 'my-repo',
			workflow: 'release.yml',
			environment: undefined,
		});
	});

	test('parses github publisher with environment', () => {
		const result = parseTrustedPublisher('github:org/repo?workflow=ci.yml&environment=production');
		expect(result).toEqual({
			type: 'github',
			owner: 'org',
			repository: 'repo',
			workflow: 'ci.yml',
			environment: 'production',
		});
	});

	test('parses gitlab publisher', () => {
		const result = parseTrustedPublisher('gitlab:my-group/my-project?ci-file=.gitlab-ci.yml');
		expect(result).toEqual({
			type: 'gitlab',
			namespace: 'my-group',
			project: 'my-project',
			ciFilePath: '.gitlab-ci.yml',
			environment: undefined,
		});
	});

	test('parses gitlab publisher with environment', () => {
		const result = parseTrustedPublisher('gitlab:ns/proj?ci-file=ci.yml&environment=staging');
		expect(result).toEqual({
			type: 'gitlab',
			namespace: 'ns',
			project: 'proj',
			ciFilePath: 'ci.yml',
			environment: 'staging',
		});
	});

	test('throws on missing colon separator', () => {
		expect(() => parseTrustedPublisher('invalid')).toThrow('Invalid format');
	});

	test('throws on missing owner/repo', () => {
		expect(() => parseTrustedPublisher('github:onlyowner')).toThrow('Must include owner/repo');
	});

	test('throws on missing github workflow', () => {
		expect(() => parseTrustedPublisher('github:org/repo')).toThrow('Missing workflow parameter');
	});

	test('throws on missing gitlab ci-file', () => {
		expect(() => parseTrustedPublisher('gitlab:ns/proj')).toThrow('Missing ci-file parameter');
	});

	test('throws on unknown publisher type', () => {
		expect(() => parseTrustedPublisher('bitbucket:org/repo')).toThrow('Unknown publisher type');
	});
});
