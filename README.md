# npm-pkg-settings

Programmatic access to npm package publish settings. Bulk-update publishing access, trusted publishers, and maintainers across all your packages.

## Why

npm now [requires trusted publishing via OIDC](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) and has [revoked all classic tokens](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/), enforcing 2FA and 90-day token expiry by default. Every package needs its GitHub/GitLab repo linked as a trusted publisher and its publishing access updated.

As of npm [v11.10.0](https://github.com/npm/cli/releases/tag/v11.10.0), [`npm trust`](https://docs.npmjs.com/cli/v11/commands/npm-trust) can configure trusted publishers from the CLI. However, it requires two-factor authentication (with a 5-minute skip window) and recommends adding a 2-second sleep between calls to avoid rate limiting. There's also still no CLI or API for updating publishing access settings or managing maintainers in bulk.

This package automates all of it — trusted publishers, publishing access, and maintainers — with automatic 2FA handling. Log in once, then script changes across all your packages.

> [!CAUTION]
> This package requires your TOTP secret to automatically generate 2FA codes. This fundamentally bypasses the security of two-factor authentication — anyone with access to your secret can generate valid codes. Only use this in a trusted environment, never commit your secret to version control, and understand that you are trading 2FA security for automation convenience.

## Prerequisites

1. **`curl-impersonate`** — Bypasses Cloudflare bot protection on npmjs.com. Install the [`curl-impersonate`](https://github.com/lexiforest/curl-impersonate) binary:

   ```sh
   # macOS (Apple Silicon)
   curl -L https://github.com/lexiforest/curl-impersonate/releases/latest/download/curl-impersonate-v1.5.1.arm64-macos.tar.gz | tar xz
   cp curl-impersonate curl_chrome145 /usr/local/bin/
   ```

2. **TOTP secret** — The base32 secret key used to generate your npm 2FA codes. If you already know your secret, you can use it directly. Otherwise, this package includes a helper command to extract it from a Google Authenticator QR code screenshot or migration URL:

   ```sh
   npx npm-pkg-settings decode-secret ./qr-code.png
   npx npm-pkg-settings decode-secret 'otpauth-migration://offline?data=...'
   ```

## Install

```sh
npm install npm-pkg-settings
```

## CLI

The CLI automatically loads a `.env` file from the current directory if it exists:

```sh
NPM_OTP_SECRET=YOUR_TOTP_BASE32_SECRET
NPM_USERNAME=your-npm-username
NPM_PASSWORD=your-npm-password
```

> [!TIP]
> `NPM_USERNAME` and `NPM_PASSWORD` are used to log in and create a session. Once a session exists, they can be omitted — only `NPM_OTP_SECRET` is needed for subsequent runs.

### `list`

List all packages for the authenticated user.

```sh
npx npm-pkg-settings list
npx npm-pkg-settings list --sort date
```

### `view`

View package settings (publishing access, trusted publishers, maintainers).

```sh
npx npm-pkg-settings view my-package
```

### `update`

Update package settings. Supports multiple changes in a single command.

```sh
npx npm-pkg-settings update my-package --publishing-access strict
npx npm-pkg-settings update my-package --trusted-publisher 'github:owner/repo?workflow=release.yml'
npx npm-pkg-settings update my-package --add-maintainer some-user
```

Combine multiple changes:

```sh
npx npm-pkg-settings update my-package \
    --publishing-access strict \
    --trusted-publisher 'github:owner/repo?workflow=release.yml'
```

Skip confirmation with `-y`:

```sh
npx npm-pkg-settings update my-package --publishing-access strict -y
```

> [!NOTE]
> For GitHub trusted publishers, the command validates via the GitHub API that the repository and workflow file exist before applying. If the repo is public and the workflow file is missing, it errors. Private repos show an "unverified" warning since they can't be checked without auth.

Example output:

```
$ npx npm-pkg-settings update type-flag \
    --trusted-publisher 'github:privatenumber/type-flag?workflow=release.yml' \
    --publishing-access strict

✔ Already logged in

Changes to type-flag:

  Trusted publisher
    Provider     GitHub Actions
    Repository   privatenumber/type-flag ✔
    Workflow     release.yml ✔
  Publishing access
    2FA required, disallow tokens

Apply changes? (y/N) y

✔ Linked trusted publisher
✔ Set publishing access

https://www.npmjs.com/package/type-flag/access
```

### `otp`

Generate a one-time password from your TOTP secret. Handy when using the npm website and you need to enter a 2FA code.

```sh
npx npm-pkg-settings otp
```

### `decode-secret`

Extract the TOTP secret from a Google Authenticator QR code image or migration URL.

```sh
npx npm-pkg-settings decode-secret ./qr-code.png
npx npm-pkg-settings decode-secret 'otpauth-migration://offline?data=...'
```

## Node.js API

### Create a client

```ts
import { createClient } from 'npm-pkg-settings'

const npm = createClient({
    username: process.env.NPM_USERNAME,
    password: process.env.NPM_PASSWORD,
    otpSecret: process.env.NPM_OTP_SECRET
})

// Logs in if needed, skips if session is already valid
await npm.login()
```

The session is saved to `.npm-pkg-settings.session.txt`, so subsequent runs reuse it without re-authenticating.

Store credentials in a `.env` file:

```sh
NPM_USERNAME=your-npm-username
NPM_PASSWORD=your-npm-password
NPM_OTP_SECRET=YOUR_TOTP_BASE32_SECRET
```

Then run your script with the [`--env-file`](https://nodejs.org/api/cli.html#--env-fileconfig) flag:

```sh
node --env-file=.env my-script.ts
```

### List packages

```ts
const packages = await npm.listPackages()

for (const pkg of packages) {
    console.log(pkg.name, pkg.version, pkg.lastPublishRel)
}
```

### View package settings

```ts
const settings = await npm.getPackageAccess('my-package')

console.log(settings.publishingAccess) // 'tfa-required-unless-automation'
console.log(settings.oidcConnections) // trusted publishers
console.log(settings.maintainers) // [{ name, permissions }]
```

### Update publishing access

```ts
await npm.setPublishingAccess('my-package', 'tfa-always-required')
```

### Link trusted publisher

```ts
import { validateTrustedPublisher } from 'npm-pkg-settings'

// GitHub Actions
const publisher = {
    type: 'github',
    owner: 'my-org',
    repository: 'my-package',
    workflow: 'release.yml'
}

// Optionally validate before linking (GitHub only) — uses the public GitHub API
// to check that the repo and workflow file exist. Throws if the repo is public but
// the workflow is missing. Silently passes for private/inaccessible repos.
const { repoVerified, workflowVerified } = await validateTrustedPublisher(publisher)

await npm.linkTrustedPublisher('my-package', publisher)

// GitLab CI/CD
await npm.linkTrustedPublisher('my-package', {
    type: 'gitlab',
    namespace: 'my-group',
    project: 'my-package',
    ciFilePath: '.gitlab-ci.yml'
})
```

### Add maintainer

```ts
await npm.addMaintainer('my-package', 'npm-username')
```

### Example: Enforce settings across all packages

```ts
import { setTimeout } from 'node:timers/promises'
import { createClient } from 'npm-pkg-settings'

const npm = createClient({
    username: process.env.NPM_USERNAME,
    password: process.env.NPM_PASSWORD,
    otpSecret: process.env.NPM_OTP_SECRET
})

await npm.login()
const packages = await npm.listPackages()

for (const pkg of packages) {
    // npm recommends a 2s sleep between calls to avoid rate limiting
    await setTimeout(2000)

    const settings = await npm.getPackageAccess(pkg.name)

    if (!settings.repository?.includes('github.com/my-org/')) {
        continue
    }

    const repoName = settings.repository.split('/').pop()

    if (settings.publishingAccess !== 'tfa-always-required') {
        await npm.setPublishingAccess(pkg.name, 'tfa-always-required')
    }

    const hasPublisher = settings.oidcConnections.some(
        c => c.repositoryName === repoName
    )
    if (!hasPublisher) {
        await npm.linkTrustedPublisher(pkg.name, {
            type: 'github',
            owner: 'my-org',
            repository: repoName,
            workflow: 'release.yml'
        })
    }
}
```

### `createClient(options)`

Returns an `NpmClient`.

| Option | Type | Description |
| --- | --- | --- |
| `otpSecret` | `string` | TOTP secret (base32) for 2FA |
| `username` | `string?` | npm username (required for `login()`) |
| `password` | `string?` | npm password (required for `login()`) |
| `sessionFile` | `string?` | Session file path (default: `.npm-pkg-settings.session.txt`) |

### `NpmClient`

| Method | Description |
| --- | --- |
| `login()` | Logs in if session is expired, skips if already authenticated |
| `listPackages()` | Returns all packages for the authenticated user |
| `getPackageAccess(name)` | Returns package settings (publishing access, trusted publishers, maintainers) |
| `setPublishingAccess(name, access)` | Sets publishing access (see values below) |
| `linkTrustedPublisher(name, publisher)` | Links a GitHub Actions or GitLab CI/CD trusted publisher |
| `addMaintainer(name, username)` | Adds a maintainer to the package |
| `getUsername()` | Returns the authenticated user's npm username |

### Publishing access values

| CLI flag | API value | npm UI label |
| --- | --- | --- |
| `strict` | `tfa-always-required` | Require 2FA and disallow tokens (recommended) |
| `default` | `tfa-required-unless-automation` | Require 2FA or granular token with bypass |
