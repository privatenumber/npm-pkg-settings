import type { NpmContext } from '../types.ts';

export const generateOtp = (context: NpmContext) => context.otpGenerator(context.otpSecret);
