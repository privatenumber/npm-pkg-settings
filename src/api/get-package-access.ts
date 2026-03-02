import type { NpmContext, PackageSettings } from '../types.ts';
import { parsePackageAccess } from '../parsers/package-access.ts';
import { authenticatedGet } from '../utils/authenticated-get.ts';

export const getPackageAccess = async (
	context: NpmContext,
	packageName: string,
): Promise<PackageSettings> => {
	const { csrfToken: _, ...settings } = await getAccessPageWithCsrf(context, packageName);
	return settings;
};

// Internal: returns csrfToken too (needed by mutation functions)
export const getAccessPageWithCsrf = async (
	context: NpmContext,
	packageName: string,
) => {
	const response = await authenticatedGet(context, `package/${packageName}/access`);
	if (response.status !== 200) {
		throw new Error(`Failed to fetch access page for ${packageName} (status ${response.status})`);
	}
	return parsePackageAccess(response.body);
};
