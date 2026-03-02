export { createClient, defaultSessionFile } from './create-client.ts';
export { getUsername } from './api/get-username.ts';
export { listPackages } from './api/list-packages.ts';
export { getPackageAccess } from './api/get-package-access.ts';
export { setPublishingAccess } from './api/set-publishing-access.ts';
export { linkTrustedPublisher } from './api/link-trusted-publisher.ts';
export { addMaintainer } from './api/add-maintainer.ts';
export { validateTrustedPublisher } from './api/validate-trusted-publisher.ts';
export type {
	NpmClient,
	NpmContext,
	CreateClientOptions,
	PackageListItem,
	PackageSettings,
	OidcConnection,
	GitHubPublisher,
	GitLabPublisher,
	TrustedPublisher,
	ValidationResult,
} from './types.ts';
