import ansis from 'ansis';
import { command } from 'cleye';
import task from 'tasuku/inline';
import { getClient } from '../utils/get-client.ts';
import { link } from '../utils/link.ts';

export const viewCommand = command({
	name: 'view',
	parameters: ['<package>'],
}, async (argv) => {
	const client = await getClient();
	if (!client) { return; }

	const settings = await task(
		`Fetching ${argv._.package} settings`,
		async ({ setTitle }) => {
			const result = await client.getPackageAccess(argv._.package);
			setTitle(`Fetched ${result.packageName} settings`);
			return result;
		},
	);

	const lines = [''];

	if (settings.repository) {
		lines.push(`  ${ansis.dim('Repository')}       ${link(settings.repository)}`);
	}

	const accessLabels: Record<string, string> = {
		'tfa-always-required': ansis.green('2FA required for all publishes'),
		'tfa-required-unless-automation': ansis.yellow('2FA required (tokens bypass)'),
	};
	const accessLabel = accessLabels[settings.publishingAccess] ?? settings.publishingAccess;
	lines.push(
		`  ${ansis.dim('Publishing')}       ${accessLabel}`,
		`  ${ansis.dim('Private')}          ${settings.isPrivate ? ansis.red('yes') : 'no'}`,
		`  ${ansis.dim('Provenance')}       ${settings.provenanceEnabled ? ansis.green('yes') : 'no'}`,
	);

	if (settings.oidcConnections.length > 0) {
		lines.push('', `  ${ansis.dim('Trusted publishers')}`);
		for (const c of settings.oidcConnections) {
			lines.push(`    ${ansis.cyan(c.publisher)}  ${c.repositoryOwner}/${c.repositoryName}  ${ansis.dim(c.workflow)}`);
		}
	}

	lines.push('', `  ${ansis.dim('Maintainers')}`);
	for (const m of settings.maintainers) {
		lines.push(`    ${m.name}  ${ansis.dim(m.permissions)}`);
	}

	console.log(lines.join('\n'));
});
