import type { TrustedPublisher } from '../../types.ts';

export const parseTrustedPublisher = (value: string): TrustedPublisher => {
	const colonIndex = value.indexOf(':');
	if (colonIndex === -1) {
		throw new Error(`Invalid format: "${value}". Expected github:owner/repo or gitlab:namespace/project`);
	}

	const type = value.slice(0, colonIndex);
	const rest = value.slice(colonIndex + 1);
	const [path, queryString] = rest.split('?');
	const params = new URLSearchParams(queryString ?? '');
	const [owner, repo] = path.split('/');

	if (!owner || !repo) {
		throw new Error(`Invalid format: "${value}". Must include owner/repo after ${type}:`);
	}

	if (type === 'github') {
		const workflow = params.get('workflow');
		if (!workflow) {
			throw new Error('Missing workflow parameter. Use github:owner/repo?workflow=release.yml');
		}
		return {
			type: 'github',
			owner,
			repository: repo,
			workflow,
			environment: params.get('environment') ?? undefined,
		};
	}

	if (type === 'gitlab') {
		const ciFile = params.get('ci-file');
		if (!ciFile) {
			throw new Error('Missing ci-file parameter. Use gitlab:namespace/project?ci-file=.gitlab-ci.yml');
		}
		return {
			type: 'gitlab',
			namespace: owner,
			project: repo,
			ciFilePath: ciFile,
			environment: params.get('environment') ?? undefined,
		};
	}

	throw new Error(`Unknown publisher type: "${type}". Use github: or gitlab:`);
};
