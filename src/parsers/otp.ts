import { parseHTML } from 'linkedom';

export const parseOtpPage = (html: string) => {
	const { document } = parseHTML(html);

	const form = document.querySelector('form#login');
	const action = form?.getAttribute('action');
	if (!action) {
		throw new Error('Could not find OTP form action');
	}

	const csrfInput = document.querySelector('input[name="csrftoken"]');
	const csrfToken = csrfInput?.getAttribute('value');
	if (!csrfToken) {
		throw new Error('Could not find CSRF token on OTP page');
	}

	const formNameInput = document.querySelector('input[name="formName"]');
	const formName = formNameInput?.getAttribute('value') ?? 'totp';

	return {
		action,
		csrfToken,
		formName,
	};
};
