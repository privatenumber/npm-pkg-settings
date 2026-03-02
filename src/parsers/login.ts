import { parseHTML } from 'linkedom';

export const parseLoginPage = (html: string) => {
	const { document } = parseHTML(html);

	const csrfInput = document.querySelector('input[name="csrftoken"]');
	const csrfToken = csrfInput?.getAttribute('value');
	if (!csrfToken) {
		throw new Error('Could not find CSRF token on login page');
	}

	return { csrfToken };
};
