import type { NpmInternalClient } from '../types.ts';

export const generateOtp = (client: NpmInternalClient) => client.otpGenerator(client.otpSecret);
