import { generate } from 'otplib';
import type { OtpGenerator } from '../types.ts';

export const defaultOtpGenerator: OtpGenerator = secret => generate({ secret });
