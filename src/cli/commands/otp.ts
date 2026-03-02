import ansis from 'ansis';
import { generate } from 'otplib';
import { command } from 'cleye';

const totpPeriod = 30;

export const otpCommand = command({
	name: 'otp',
	help: {
		description: 'Generate a one-time password from NPM_OTP_SECRET',
	},
}, async () => {
	const { NPM_OTP_SECRET } = process.env;
	if (!NPM_OTP_SECRET) {
		console.error('Missing NPM_OTP_SECRET. Set it in .env or your environment.');
		process.exitCode = 1;
		return;
	}

	const code = await generate({ secret: NPM_OTP_SECRET });
	const secondsRemaining = totpPeriod - (Math.floor(Date.now() / 1000) % totpPeriod);

	console.log(code);
	console.log(ansis.dim(`expires in ${secondsRemaining}s`));
});
