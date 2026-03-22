import { describe } from 'manten';

describe('npm-pkg-settings', () => {
	describe('parsers', () => {
		import('./specs/parsers/login.ts');
		import('./specs/parsers/otp.ts');
		import('./specs/parsers/package-access.ts');
	});

	describe('utils', () => {
		import('./specs/utils/npm-fetch.ts');
		import('./specs/utils/generate-otp.ts');
		import('./specs/utils/authenticated-get.ts');
		import('./specs/utils/submit-with-otp.ts');
	});

	describe('api', () => {
		import('./specs/api/get-username.ts');
		import('./specs/api/list-packages.ts');
		import('./specs/api/get-package-access.ts');
		import('./specs/api/set-publishing-access.ts');
		import('./specs/api/link-trusted-publisher.ts');
		import('./specs/api/add-maintainer.ts');
		import('./specs/api/validate-trusted-publisher.ts');
	});

	describe('context', () => {
		import('./specs/context/perform-login.ts');
	});

	describe('create-client', () => {
		import('./specs/create-client.ts');
	});

	describe('smoke', () => {
		import('./specs/smoke/cloudflare-bypass.ts');
	});

	describe('cli', () => {
		import('./specs/cli/parse-trusted-publisher.ts');
		import('./specs/cli/decode-secret.ts');
	});
});
