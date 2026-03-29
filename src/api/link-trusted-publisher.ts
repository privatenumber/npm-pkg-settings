import type { NpmInternalClient, TrustedPublisher } from '../types.ts';
import { httpStatusHint } from '../utils/http-status-hint.ts';
import { submitWithOtp } from '../utils/submit-with-otp.ts';
import { getAccessPageWithCsrf } from './get-package-access.ts';

export const linkTrustedPublisher = async (
	client: NpmInternalClient,
	packageName: string,
	publisher: TrustedPublisher,
) => {
	const settings = await getAccessPageWithCsrf(client, packageName);
	const accessPath = `package/${packageName}/access`;

	const body = publisher.type === 'github'
		? new URLSearchParams({
			publisher: 'github',
			selectedPublisher: 'github',
			repositoryOwner: publisher.owner,
			repositoryName: publisher.repository,
			workflowName: publisher.workflow,
			githubEnvironmentName: publisher.environment ?? '',
			actionType: 'create',
			csrftoken: settings.csrfToken,
		})
		: new URLSearchParams({
			publisher: 'gitlab',
			selectedPublisher: 'gitlab',
			namespace: publisher.namespace,
			projectName: publisher.project,
			topLevelCiFilePath: publisher.ciFilePath,
			gitlabEnvironmentName: publisher.environment ?? '',
			actionType: 'create',
			csrftoken: settings.csrfToken,
		});

	const result = await submitWithOtp(client, accessPath, body);

	if (result.status < 300 || result.status >= 400) {
		throw new Error(`Failed to link trusted publisher for ${packageName} (${httpStatusHint(result.status)})`);
	}
};
