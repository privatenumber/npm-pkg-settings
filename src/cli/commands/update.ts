import readline from 'node:readline/promises';
import ansis from 'ansis';
import { command } from 'cleye';
import task from 'tasuku/inline';
import type { GitLabPublisher, TrustedPublisher } from '../../types.ts';
import { validateTrustedPublisher } from '../../api/validate-trusted-publisher.ts';
import { getClient } from '../utils/get-client.ts';
import { link } from '../utils/link.ts';
import { parseTrustedPublisher } from '../utils/parse-trusted-publisher.ts';

const confirm = async (message: string): Promise<boolean> => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stderr,
	});
	const answer = await rl.question(`${message} ${ansis.dim('(y/N)')} `);
	rl.close();
	return answer.toLowerCase() === 'y';
};

const publishingAccessMap: Record<string, string> = {
	strict: 'tfa-always-required',
	default: 'tfa-required-unless-automation',
};

export const updateCommand = command({
	name: 'update',
	parameters: ['<package>'],
	flags: {
		publishingAccess: {
			type: String,
			description: 'Set publishing access: strict (2FA only) or default (2FA + token bypass)',
		},
		addMaintainer: {
			type: String,
			description: 'Add a maintainer by npm username',
		},
		trustedPublisher: {
			type: String,
			description: 'Link trusted publisher (e.g. github:owner/repo?workflow=release.yml)',
		},
		yes: {
			type: Boolean,
			alias: 'y',
			description: 'Skip confirmation prompt',
			default: false,
		},
	},
}, async (argv) => {
	const client = await getClient();
	if (!client) { return; }
	const packageName = argv._.package;

	// Parse and validate all inputs before confirming
	let publishingAccess: string | undefined;
	if (argv.flags.publishingAccess) {
		const mapped = publishingAccessMap[argv.flags.publishingAccess];
		if (!mapped) {
			console.error(`Invalid publishing access: "${argv.flags.publishingAccess}". Use "strict" or "default".`);
			process.exitCode = 1;
			return;
		}
		publishingAccess = mapped;
	}

	let publisher: TrustedPublisher | undefined;
	if (argv.flags.trustedPublisher) {
		try {
			publisher = parseTrustedPublisher(argv.flags.trustedPublisher);
		} catch (error) {
			console.error(error instanceof Error ? error.message : error);
			process.exitCode = 1;
			return;
		}
	}

	// Validate GitHub repo and workflow
	let repoVerified: boolean | undefined;
	let workflowVerified: boolean | undefined;
	if (publisher?.type === 'github') {
		const p = publisher;
		await task('Validating GitHub repository and workflow', async ({ setTitle }) => {
			try {
				const result = await validateTrustedPublisher(p);
				repoVerified = result.repoVerified;
				workflowVerified = result.workflowVerified;
				setTitle(`Validated ${p.owner}/${p.repository} and ${p.workflow}`);
			} catch {
				// Repo exists but workflow not found — hard error with clickable link
				repoVerified = true;
				workflowVerified = false;
				const expectedPath = `https://github.com/${p.owner}/${p.repository}/blob/HEAD/.github/workflows/${p.workflow}`;
				throw new Error(`Workflow not found: ${link(expectedPath)}`);
			}

			if (!repoVerified) {
				setTitle(`${p.owner}/${p.repository} (unverified — private or not found)`);
			}
		});
	}

	// Build summary of changes (trusted publisher first to match npm UI)
	const changes: string[] = [];
	if (publisher) {
		changes.push('  Trusted publisher');
		if (publisher.type === 'github') {
			const p = publisher;
			const workflowUrl = `https://github.com/${p.owner}/${p.repository}/blob/HEAD/.github/workflows/${p.workflow}`;
			const repoLabel = repoVerified
				? ansis.green('✔')
				: ansis.yellow('unverified');
			const workflowLabel = workflowVerified
				? ansis.green('✔')
				: (repoVerified ? ansis.red('not found') : ansis.yellow('unverified'));
			changes.push(
				`    Provider     ${ansis.cyan('GitHub Actions')}`,
				`    Repository   ${link(`https://github.com/${p.owner}/${p.repository}`, `${p.owner}/${p.repository}`)} ${repoLabel}`,
				`    Workflow     ${link(workflowUrl, p.workflow)} ${workflowLabel}`,
			);
			if (p.environment) {
				changes.push(`    Environment  ${p.environment}`);
			}
		} else {
			const p = publisher as GitLabPublisher;
			changes.push(
				`    Provider     ${ansis.cyan('GitLab CI/CD')}`,
				`    Namespace    ${p.namespace}`,
				`    Project      ${p.project}`,
				`    CI file      ${p.ciFilePath}`,
			);
			if (p.environment) {
				changes.push(`    Environment  ${p.environment}`);
			}
		}
	}
	if (publishingAccess) {
		const label = argv.flags.publishingAccess === 'strict'
			? '2FA required, disallow tokens'
			: '2FA required, allow token bypass';
		changes.push(
			'  Publishing access',
			`    ${label}`,
		);
	}
	if (argv.flags.addMaintainer) {
		changes.push(
			'  Add maintainer',
			`    ${argv.flags.addMaintainer}`,
		);
	}

	if (changes.length === 0) {
		console.error('No changes specified. Use --help to see available flags.');
		process.exitCode = 1;
		return;
	}

	// Confirmation
	if (!argv.flags.yes) {
		console.log(`\nChanges to ${ansis.bold(packageName)}:\n`);
		console.log(changes.join('\n'));
		console.log();

		if (!await confirm('Apply changes?')) {
			console.log(ansis.dim('Aborted.'));
			return;
		}
		console.log();
	}

	// Apply changes (same order as summary)
	if (publisher) {
		await task('Linking trusted publisher', async ({ setTitle }) => {
			await client.linkTrustedPublisher(packageName, publisher);
			setTitle('Linked trusted publisher');
		});
	}

	if (publishingAccess) {
		await task('Setting publishing access', async ({ setTitle }) => {
			await client.setPublishingAccess(packageName, publishingAccess);
			setTitle('Set publishing access');
		});
	}

	if (argv.flags.addMaintainer) {
		await task('Adding maintainer', async ({ setTitle }) => {
			await client.addMaintainer(packageName, argv.flags.addMaintainer!);
			setTitle(`Added maintainer: ${argv.flags.addMaintainer}`);
		});
	}

	const accessUrl = `https://www.npmjs.com/package/${packageName}/access`;
	console.log(`\n${link(accessUrl, accessUrl)}`);
});
