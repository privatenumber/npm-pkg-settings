const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const bytesToBase32 = (bytes: Uint8Array): string => {
	let bits = '';
	for (const byte of bytes) {
		bits += byte.toString(2).padStart(8, '0');
	}
	let result = '';
	for (let i = 0; i < bits.length; i += 5) {
		const chunk = bits.slice(i, i + 5).padEnd(5, '0');
		result += base32Alphabet[Number.parseInt(chunk, 2)];
	}
	return result;
};

const decodeMigrationPayload = (data: string): string => {
	const url = new URL(data);
	const encoded = url.searchParams.get('data');
	if (!encoded) {
		throw new Error('No data parameter found in migration URL');
	}

	const decoded = Buffer.from(encoded, 'base64');

	// Protobuf: outer message field 1 (OtpParameters), inner field 1 (secret bytes)
	// Structure: 0a (field 1, wire 2) LEN (outer) 0a (field 1, wire 2) LEN (secret) BYTES
	if (decoded[0] !== 0x0A) {
		throw new Error('Invalid migration payload: expected outer field 1');
	}
	// decoded[1] is outer length (skipped)
	if (decoded[2] !== 0x0A) {
		throw new Error('Invalid migration payload: expected inner field 1');
	}
	const secretLength = decoded[3];
	const secretBytes = new Uint8Array(decoded.slice(4, 4 + secretLength));

	return bytesToBase32(secretBytes);
};

/**
 * Decode a TOTP secret from a Google Authenticator migration URL.
 *
 * Accepts `otpauth-migration://offline?data=...` format.
 */
export const decodeSecretFromUrl = (migrationUrl: string): string => {
	if (!migrationUrl.startsWith('otpauth-migration://')) {
		throw new Error('Expected otpauth-migration:// URL');
	}
	return decodeMigrationPayload(migrationUrl);
};
