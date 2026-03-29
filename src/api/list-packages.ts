import type { NpmInternalClient, PackageListItem } from '../types.ts';
import { httpStatusHint } from '../utils/http-status-hint.ts';
import { getUsername } from './get-username.ts';

export const listPackages = async (client: NpmInternalClient): Promise<PackageListItem[]> => {
	const username = await getUsername(client);
	const perPage = 100;
	const allPackages: PackageListItem[] = [];
	let page = 0;
	let total = Infinity;

	while (allPackages.length < total) {
		const response = await client.fetch(
			`settings/${username}/packages?page=${page}&perPage=${perPage}`,
			{ headers: { 'x-spiferack': '1' } },
		);

		if (response.status !== 200) {
			throw new Error(`Failed to fetch packages (${httpStatusHint(response.status)})`);
		}

		const data = await response.json() as {
			packagesCounts: { all: number };
			packages: { objects: Record<string, unknown>[] };
		};
		total = data.packagesCounts.all;

		for (const package_ of data.packages.objects) {
			const date = package_.date as {
				ts: number;
				rel: string;
			} | undefined;
			const created = package_.created as { rel: string } | undefined;
			const updated = package_.updated as { rel: string } | undefined;
			const publisher = package_.publisher as { name: string } | undefined;
			allPackages.push({
				name: package_.name as string,
				version: (package_.version as string) ?? '',
				description: (package_.description as string) ?? '',
				isPrivate: (package_.private as boolean) ?? false,
				isHighImpact: (package_.is_high_impact as boolean) ?? false,
				lastPublishTs: date?.ts ?? 0,
				lastPublishRel: date?.rel ?? '',
				publisher: publisher?.name ?? '',
				createdRel: created?.rel ?? '',
				updatedRel: updated?.rel ?? '',
			});
		}

		page += 1;
	}

	return allPackages;
};
