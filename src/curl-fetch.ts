import defaultSpawn from 'nano-spawn';

export type SpawnFunction = (
	command: string,
	arguments_: string[],
) => Promise<{ stdout: string }>;

type CurlFetchOptions = {
	sessionFile?: string;
	spawn?: SpawnFunction;
};

export type CurlRequestInit = {
	method?: string;
	headers?: Record<string, string>;
	body?: URLSearchParams | string;
	redirect?: 'follow' | 'manual';
};

export type CurlResponseLike = {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	ok: boolean;
	text(): Promise<string>;
	json(): Promise<unknown>;
};

const createResponse = (
	status: number,
	statusText: string,
	headers: Record<string, string>,
	body: string,
): CurlResponseLike => ({
	status,
	statusText,
	headers,
	ok: status >= 200 && status < 300,
	text: async () => body,
	json: async () => JSON.parse(body),
});

const parseResponseHeaders = (raw: string): Record<string, string> => {
	const headers: Record<string, string> = {};
	for (const line of raw.split('\r\n')) {
		const index = line.indexOf(': ');
		if (index === -1) {
			continue;
		}
		headers[line.slice(0, index).toLowerCase()] = line.slice(index + 2);
	}
	return headers;
};

export const createFetch = (options: CurlFetchOptions = {}) => {
	const { sessionFile, spawn = defaultSpawn } = options;

	return async (url: string, init?: CurlRequestInit): Promise<CurlResponseLike> => {
		const method = init?.method ?? 'GET';

		const arguments_: string[] = [
			'-s',
			'-D',
			'-',
			'-o',
			'-',
			'-X',
			method,
		];

		if (sessionFile) {
			arguments_.push('-b', sessionFile, '-c', sessionFile);
		}

		if (init?.redirect === 'follow') {
			arguments_.push('-L');
		} else {
			arguments_.push('--max-redirs', '0');
		}

		if (init?.headers) {
			for (const [key, value] of Object.entries(init.headers)) {
				arguments_.push('-H', `${key}: ${value}`);
			}
		}

		if (init?.body) {
			const bodyString = init.body instanceof URLSearchParams
				? init.body.toString()
				: init.body;
			arguments_.push(
				'-H', 'content-type: application/x-www-form-urlencoded', '-d', bodyString,
			);
		}

		arguments_.push(url);

		const result = await spawn('curl_chrome145', arguments_);

		const separator = result.stdout.indexOf('\r\n\r\n');
		if (separator === -1) {
			return createResponse(0, '', {}, result.stdout);
		}
		const headerSection = result.stdout.slice(0, separator);
		const body = result.stdout.slice(separator + 4);

		const statusMatch = headerSection.match(/^HTTP\/\S+ (\d+)\s*(.*)/);
		const status = statusMatch ? Number(statusMatch[1]) : 0;
		const statusText = statusMatch?.[2]?.trim() ?? '';

		const headers = parseResponseHeaders(headerSection);

		return createResponse(status, statusText, headers, body);
	};
};
