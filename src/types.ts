export type OtpGenerator = (secret: string) => Promise<string>;

export type NpmFetchResponse = {
	status: number;
	headers: { get(name: string): string | null };
	text(): Promise<string>;
	json(): Promise<unknown>;
};

export type NpmFetch = (
	url: string,
	options?: Record<string, unknown>,
) => Promise<NpmFetchResponse>;

// Internal session state
export type NpmContext = {
	fetch: NpmFetch;
	otpSecret: string;
	otpGenerator: OtpGenerator;
	cachedUsername?: string;
};

// Public client returned by createClient
export type NpmClient = {
	login: () => Promise<{ skipped: boolean }>;
	listPackages: () => Promise<PackageListItem[]>;
	getPackageAccess: (packageName: string) => Promise<PackageSettings>;
	setPublishingAccess: (packageName: string, access: string) => Promise<void>;
	linkTrustedPublisher: (packageName: string, publisher: TrustedPublisher) => Promise<void>;
	addMaintainer: (packageName: string, npmUsername: string) => Promise<void>;
	getUsername: () => Promise<string>;
};

export type CreateClientOptions = {
	otpSecret: string;
	username?: string;
	password?: string;
	sessionFile?: string;
};

export type PackageListItem = {
	name: string;
	version: string;
	description: string;
	isPrivate: boolean;
	isHighImpact: boolean;
	lastPublishTs: number;
	lastPublishRel: string;
	publisher: string;
	createdRel: string;
	updatedRel: string;
};

export type PackageSettings = {
	packageName: string;
	repository: string | null;
	publishingAccess: string;
	isPrivate: boolean;
	provenanceEnabled: boolean;
	oidcConnections: OidcConnection[];
	maintainers: { name: string;
		permissions: string; }[];
};

export type OidcConnection = {
	publisher: string;
	repositoryOwner: string;
	repositoryName: string;
	workflow: string;
};

export type GitHubPublisher = {
	type: 'github';
	owner: string;
	repository: string;
	workflow: string;
	environment?: string;
};

export type GitLabPublisher = {
	type: 'gitlab';
	namespace: string;
	project: string;
	ciFilePath: string;
	environment?: string;
};

export type TrustedPublisher = GitHubPublisher | GitLabPublisher;

export type ValidationResult = {
	repoVerified: boolean;
	workflowVerified: boolean;
};
