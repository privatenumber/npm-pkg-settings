import type { PackageSettings } from '../types.ts';

type PackageSettingsWithCsrf = PackageSettings & { csrfToken: string };

export const parsePackageAccess = (html: string): PackageSettingsWithCsrf => {
	const match = html.match(/window\.__context__\s*=\s*(\{.*?\})<\/script>/s);
	if (!match) {
		throw new Error('Could not find __context__ in page');
	}

	const { context } = JSON.parse(match[1]);

	return {
		csrfToken: context.csrftoken,
		packageName: context.package,
		repository: context.packageVersion?.repository ?? context.packument?.repository ?? null,
		publishingAccess: context.formData['package-settings'].publishingAccess.value,
		isPrivate: context.formData['package-settings'].private.value,
		provenanceEnabled: context.provenance.enabled,
		oidcConnections: (context.oidcConnections ?? []).map((c: { publisher: string;
			config: { repository_owner: string;
				repository_name: string;
				workflow: string; }; }) => ({
			publisher: c.publisher,
			repositoryOwner: c.config.repository_owner,
			repositoryName: c.config.repository_name,
			workflow: c.config.workflow,
		})),
		maintainers: context.maintainers.map((m: { permissions: string;
			user: { name: string }; }) => ({
			name: m.user.name,
			permissions: m.permissions,
		})),
	};
};
