const hints: Record<number, string> = {
	401: 'Session expired — try logging in again',
	403: 'Insufficient permissions',
	404: 'Package not found',
	429: 'Rate limited by npm — wait a moment and try again',
};

export const httpStatusHint = (status: number) => {
	const hint = hints[status];
	return hint ? `${status} ${hint}` : `status ${status}`;
};
