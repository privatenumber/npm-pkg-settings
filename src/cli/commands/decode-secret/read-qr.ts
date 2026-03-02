import fs from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

export const readQrFromImage = async (imagePath: string): Promise<string> => {
	const buffer = await fs.readFile(imagePath);
	const png = PNG.sync.read(buffer);

	const code = jsQR(
		new Uint8ClampedArray(png.data),
		png.width,
		png.height,
	);

	if (!code) {
		throw new Error('No QR code found in image');
	}

	return code.data;
};
