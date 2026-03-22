import type { NpmInternalClient, PackageSettings } from '../types.ts';
import { parsePackageAccess } from '../parsers/package-access.ts';
import { authenticatedGet } from '../utils/authenticated-get.ts';

export const getPackageAccess = async (
	client: NpmInternalClient,
	packageName: string,
): Promise<PackageSettings> => {
	const { csrfToken: _, ...settings } = await getAccessPageWithCsrf(client, packageName);
	return settings;
};

// Internal: returns csrfToken too (needed by mutation functions)
export const getAccessPageWithCsrf = async (
	client: NpmInternalClient,
	packageName: string,
) => {
	const response = await authenticatedGet(client, `package/${packageName}/access`);
	if (response.status !== 200) {
		throw new Error(`Failed to fetch access page for ${packageName} (status ${response.status})`);
	}
	return parsePackageAccess(response.body);
};
