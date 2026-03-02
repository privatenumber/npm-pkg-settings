import type { GitHubPublisher, ValidationResult } from '../types.ts';

type FetchLike = (url: string) => Promise<{ ok: boolean }>;

export const validateTrustedPublisher = async (
	publisher: GitHubPublisher,
	fetchFunction: FetchLike = fetch,
): Promise<ValidationResult> => {
	const repoResponse = await fetchFunction(
		`https://api.github.com/repos/${publisher.owner}/${publisher.repository}`,
	);

	if (!repoResponse.ok) {
		return {
			repoVerified: false,
			workflowVerified: false,
		};
	}

	const workflowResponse = await fetchFunction(
		`https://api.github.com/repos/${publisher.owner}/${publisher.repository}/contents/.github/workflows/${publisher.workflow}`,
	);

	if (!workflowResponse.ok) {
		throw new Error(`Workflow file not found: .github/workflows/${publisher.workflow} in ${publisher.owner}/${publisher.repository}`);
	}

	return {
		repoVerified: true,
		workflowVerified: true,
	};
};
