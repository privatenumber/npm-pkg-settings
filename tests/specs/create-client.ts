import { describe, test, expect } from 'manten';
import { createClient } from '../../src/index.ts';

describe('createClient', () => {
	test('returns client with all methods', () => {
		const client = createClient({ otpSecret: 'SECRET' });
		expect(typeof client.login).toBe('function');
		expect(typeof client.listPackages).toBe('function');
		expect(typeof client.getPackageAccess).toBe('function');
		expect(typeof client.setPublishingAccess).toBe('function');
		expect(typeof client.linkTrustedPublisher).toBe('function');
		expect(typeof client.addMaintainer).toBe('function');
		expect(typeof client.getUsername).toBe('function');
	});

	test('login throws when username missing', async () => {
		const client = createClient({
			otpSecret: 'SECRET',
			password: 'pass',
		});
		await expect(client.login()).rejects.toThrow('requires username and password');
	});

	test('login throws when password missing', async () => {
		const client = createClient({
			otpSecret: 'SECRET',
			username: 'user',
		});
		await expect(client.login()).rejects.toThrow('requires username and password');
	});
});
