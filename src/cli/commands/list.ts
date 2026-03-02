import ansis from 'ansis';
import { command } from 'cleye';
import task from 'tasuku/inline';
import type { PackageListItem } from '../../types.ts';
import { getClient } from '../utils/get-client.ts';

export const listCommand = command({
	name: 'list',
	flags: {
		sort: {
			type: String,
			description: 'Sort by: name, date (default: name)',
			default: 'name',
		},
	},
}, async (argv) => {
	const client = await getClient();
	if (!client) { return; }

	const packages: PackageListItem[] = await task(
		'Fetching packages',
		async ({ setTitle }) => {
			const result = await client.listPackages();
			setTitle(`Fetched ${result.length} packages`);
			return result;
		},
	);

	console.log();

	if (argv.flags.sort === 'date') {
		packages.sort((a, b) => b.lastPublishTs - a.lastPublishTs);
	} else {
		packages.sort((a, b) => (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)));
	}

	const col = (items: string[], header: string) => Math.max(
		header.length, ...items.map(s => s.length),
	);

	const nameW = col(packages.map(p => p.name), 'Package');
	const versionW = col(packages.map(p => p.version), 'Version');
	const pubW = col(packages.map(p => p.publisher), 'Publisher');
	const dateW = col(packages.map(p => p.lastPublishRel), 'Published');

	const header = `  ${'Package'.padEnd(nameW)}  ${'Version'.padEnd(versionW)}  ${'Publisher'.padEnd(pubW)}  ${'Published'.padEnd(dateW)}`;
	console.log(ansis.dim(header));
	console.log(ansis.dim(`  ${'─'.repeat(nameW)}  ${'─'.repeat(versionW)}  ${'─'.repeat(pubW)}  ${'─'.repeat(dateW)}`));

	for (const p of packages) {
		const name = ansis.bold(p.name.padEnd(nameW));
		const version = ansis.dim(p.version.padEnd(versionW));
		const publisher = p.publisher === 'GitHub Actions'
			? ansis.cyan(p.publisher.padEnd(pubW))
			: ansis.dim(p.publisher.padEnd(pubW));
		const published = ansis.dim(p.lastPublishRel.padEnd(dateW));
		const tags = [
			p.isHighImpact ? ansis.yellow(' high-impact') : '',
			p.isPrivate ? ansis.red(' private') : '',
		].filter(Boolean).join('');

		console.log(`  ${name}  ${version}  ${publisher}  ${published}${tags}`);
	}
});
