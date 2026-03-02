import { command } from 'cleye';
import { decodeSecretFromUrl } from './decode-url.ts';
import { readQrFromImage } from './read-qr.ts';

export const decodeSecretCommand = command({
	name: 'decode-secret',
	parameters: ['<input>'],
	help: {
		description: 'Decode TOTP secret from QR code image or otpauth-migration:// URL',
	},
}, async (argv) => {
	const { input } = argv._;

	const migrationUrl = input.startsWith('otpauth-migration://')
		? input
		: await readQrFromImage(input);

	console.log(decodeSecretFromUrl(migrationUrl));
});
