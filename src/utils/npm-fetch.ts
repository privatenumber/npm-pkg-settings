import type { NpmContext } from '../types.ts';

const baseUrl = 'https://www.npmjs.com';

export const npmFetch = (
	context: NpmContext,
	path: string,
	init?: Parameters<NpmContext['fetch']>[1],
) => context.fetch(
	path.startsWith('http') ? path : `${baseUrl}/${path}`,
	init,
);
