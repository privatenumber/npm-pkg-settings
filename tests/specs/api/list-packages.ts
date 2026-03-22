import { describe, test, expect } from 'manten';
import { listPackages } from '../../../src/index.ts';
import type { NpmInternalClient } from '../../../src/types.ts';

const mockResponse = (status: number, body: string, headers: Record<string, string> = {}) => ({
	status,
	headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
	text: async () => body,
	json: async () => JSON.parse(body),
});

const mockClient = (handler: NpmInternalClient['fetch']): NpmInternalClient => ({
	fetch: handler,
	otpSecret: 'test',
	otpGenerator: async () => '123456',
	cachedUsername: 'alice',
});

const makePackage = (name: string, overrides: Record<string, unknown> = {}) => ({
	name,
	version: '1.0.0',
	description: `${name} description`,
	private: false,
	is_high_impact: false,
	date: {
		ts: 1000,
		rel: '1 day ago',
	},
	publisher: { name: 'testuser' },
	created: { rel: '2 days ago' },
	updated: { rel: '1 day ago' },
	...overrides,
});

describe('listPackages', () => {
	test('fetches single page of packages', async () => {
		const client = mockClient(async () => mockResponse(
			200,
			JSON.stringify({
				packagesCounts: { all: 2 },
				packages: { objects: [makePackage('pkg-a'), makePackage('pkg-b', { private: true })] },
			}),
		));

		const packages = await listPackages(client);
		expect(packages).toHaveLength(2);
		expect(packages[0].name).toBe('pkg-a');
		expect(packages[0].isPrivate).toBe(false);
		expect(packages[1].name).toBe('pkg-b');
		expect(packages[1].isPrivate).toBe(true);
	});

	test('paginates across multiple pages', async () => {
		let callCount = 0;
		const client = mockClient(async (url) => {
			callCount += 1;
			const objects = url.includes('page=0')
				? [makePackage('a')]
				: [makePackage('b')];
			return mockResponse(
				200,
				JSON.stringify({
					packagesCounts: { all: 2 },
					packages: { objects },
				}),
			);
		});

		const packages = await listPackages(client);
		expect(packages).toHaveLength(2);
		expect(callCount).toBe(2);
	});

	test('maps all fields correctly', async () => {
		const client = mockClient(async () => mockResponse(
			200,
			JSON.stringify({
				packagesCounts: { all: 1 },
				packages: {
					objects: [makePackage('my-pkg', {
						version: '3.2.1',
						private: true,
						is_high_impact: true,
						date: {
							ts: 9999,
							rel: 'just now',
						},
						publisher: { name: 'GitHub Actions' },
						created: { rel: '5 years ago' },
						updated: { rel: 'today' },
					})],
				},
			}),
		));

		const [package_] = await listPackages(client);
		expect(package_.name).toBe('my-pkg');
		expect(package_.version).toBe('3.2.1');
		expect(package_.isPrivate).toBe(true);
		expect(package_.isHighImpact).toBe(true);
		expect(package_.lastPublishTs).toBe(9999);
		expect(package_.lastPublishRel).toBe('just now');
		expect(package_.publisher).toBe('GitHub Actions');
		expect(package_.createdRel).toBe('5 years ago');
		expect(package_.updatedRel).toBe('today');
	});

	test('handles missing fields with fallback defaults', async () => {
		const client = mockClient(async () => mockResponse(
			200,
			JSON.stringify({
				packagesCounts: { all: 1 },
				packages: {
					objects: [{
						name: 'empty-pkg',
						// All other fields missing — simulates placeholder/unpublished package
					}],
				},
			}),
		));

		const [package_] = await listPackages(client);
		expect(package_.name).toBe('empty-pkg');
		expect(package_.version).toBe('');
		expect(package_.description).toBe('');
		expect(package_.isPrivate).toBe(false);
		expect(package_.isHighImpact).toBe(false);
		expect(package_.lastPublishTs).toBe(0);
		expect(package_.lastPublishRel).toBe('');
		expect(package_.publisher).toBe('');
		expect(package_.createdRel).toBe('');
		expect(package_.updatedRel).toBe('');
	});

	test('throws on non-200 response', async () => {
		const client = mockClient(async () => mockResponse(500, 'error'));

		await expect(listPackages(client)).rejects.toThrow('Failed to fetch packages');
	});
});
