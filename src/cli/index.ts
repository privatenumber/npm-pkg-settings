import process from 'node:process';
import { cli } from 'cleye';

import { listCommand } from './commands/list.ts';
import { viewCommand } from './commands/view.ts';
import { updateCommand } from './commands/update.ts';
import { decodeSecretCommand } from './commands/decode-secret/index.ts';
import { otpCommand } from './commands/otp.ts';

// Load .env file if it exists (Node 21.7+)
try { process.loadEnvFile(); } catch {}

// Suppress uncaught stack traces — errors are shown inline by tasuku
// or printed explicitly before throwing
process.on('uncaughtException', () => {
	process.exitCode = 1;
});

cli({
	name: 'npm-pkg-settings',
	strictFlags: true,
	commands: [
		listCommand,
		viewCommand,
		updateCommand,
		decodeSecretCommand,
		otpCommand,
	],
});
